// UIManager.js
import DOMManager from "./DOMManager.js";
import EventManager from "./EventManager.js";
import MessageManager from "./MessageManager.js";
import StorageManager from "./StorageManager.js";
import ChatHistoryManager from "./ChatHistoryManager.js";
import { getTts } from "../utils/api.js";
import swal from "sweetalert";
import SyncManager from "./SyncManager.js";
import ProfileFormManager from "./ProfileFormManager.js";
import { getPromptRepo, uploadAttachment } from "../utils/api.js";
import fileUploader from "../utils/fileUploader.js";



class UIManager {
    constructor(app) {
        this.app = app;
        this.messageLimit = 15;
        this.isDeleting = false;
        this.profiles = [];
        this.clientLanguage = "en-US";
        const messagesContainer = document.querySelector("#messages");
        messagesContainer.addEventListener("scroll", () => {
            if (messagesContainer.scrollTop === 0 && messagesContainer.innerHTML!=="") {
                this.messageManager.loadMoreMessages();
            }
        });
        this.messageInput = document.getElementById("message-input");
        this.domManager = new DOMManager(
            this.deleteChatHistory.bind(this),
            this.editChatHistoryItem.bind(this)
        );
        this.eventManager = new EventManager(this);
        this.messageManager = new MessageManager(this);
        this.storageManager = new StorageManager(this);
        this.syncManager = new SyncManager(this);
        this.chatHistoryManager = new ChatHistoryManager(this);
        this.chatHistoryManager.subscribe(this.handleChatHistoryChange.bind(this));
        this.setupChatHistoryListClickHandler();
        this.setupUploadFunctionality();
        this.boundHideAIActorOnOutsideClick = this.hideAIActorOnOutsideClick.bind(this);
        this.handleClickOutsideCreateAIActorModal = this.handleClickOutsideCreateAIActorModal.bind(this);
        this.profileFormManager = new ProfileFormManager(this.storageManager, 
            async (updatedProfile, isNewProfile) => { 
                await this.refreshProfileList(); // 使用await等待refreshProfileList完成
                if (isNewProfile) {
                    // 如果是新Profile，需要创建新的Chat History并切换到该Chat History
                    const chatId = this.chatHistoryManager.generateChatId(this.storageManager.getCurrentUsername(), updatedProfile.name);
                    this.currentChatId = chatId;
                    this.changeChatTopic(chatId, true); // 第二个参数设置为true表示这是一个新的话题
                }
            },async (data) => { // 处理Profile的删除
                await this.renderMenuList(data);
                swal("Profile deleted successfully.", {icon: "success", button: false, timer: 1500})
                    .then(() => {
                        if (window.innerWidth <= 768) {
                            const actorSettingsWrapper = document.getElementById("ai-actor-settings-wrapper");
                            this.hiddenElement(actorSettingsWrapper);
                        }
                    });
            },() => {
                // 这里，我们通过隐藏元素的ID来调用隐藏逻辑，
                const actorSettingsWrapper = document.getElementById("ai-actor-settings-wrapper");
                this.hiddenElement(actorSettingsWrapper); 
            });
        document.getElementById("new-ai-actor").addEventListener("click", this.showNewAIActorModal.bind(this));
    }

    // 确保refreshProfileList返回一个Promise
    refreshProfileList() {
        const username = this.storageManager.getCurrentUsername();
        // 将整个操作包裹在一个新的Promise中，并在操作完成时调用resolve或reject
        return new Promise((resolve, reject) => {
            getPromptRepo(username)
                .then(data => {
                    this.profiles = data.profiles;
                    // 更新AI Actor列表和Profile下拉菜单
                    this.populateAIActorList(this.storageManager.getCurrentProfile(), this.profiles);
                    this.populateProfileList(this.profiles);
                    // 关闭Modal Dialog
                    this.hideNewAIActorModal();
                    resolve(); // 如果一切正常，则完成Promise
                })
                .catch(error => {
                    console.error("Error refreshing profile list:", error);
                    swal("Failed to refresh profile list.", {icon: "error"});
                    reject(error); // 如果发生错误，则拒绝Promise
                });
        });
    }

    populateProfileList(profiles) {
        let profileNameList = [];
        const profileListElement = document.getElementById("profile-list");
        profileNameList = profiles.map(profile => profile.displayName);
        profileListElement.innerHTML = "";
        for (let name of profileNameList) {
            let li = document.createElement("li");
            li.textContent = name;
            profileListElement.appendChild(li);
        }
    }

    populateAIActorList(currentProfile, profiles) {
        //empty aiActorlist
        const aiActorList = document.querySelector("#ai-actor-list");
        aiActorList.innerHTML = "";
        profiles.forEach(item => {
            this.createListItem(item, currentProfile, aiActorList, true);
        });
    }

    setCurrentSystemPrompt(prompt) {
        this.app.prompts.setSystemPrompt(prompt);
    }

    setupUploadFunctionality() {
        const uploadContainer = document.querySelector("#upload-container");
        const fileInput = document.createElement("input");

        fileInput.type = "file";
        fileInput.accept = ".md";
        this.hiddenElement(fileInput); // 隐藏 file input 控件

        uploadContainer.addEventListener("click", () => {
            fileInput.value = null; // 清空文件选择，这会触发浏览器重新检查文件
            fileInput.click(); // 触发文件选择
            console.log("fileInput click event");
        });
        

        fileInput.addEventListener("change", (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const mdContent = e.target.result;
                    this.importChatHistory(mdContent);
                };
                reader.readAsText(file);
            }
        });

        document.body.appendChild(fileInput);
    }

    importChatHistory(mdContent) {

        const messages = [];
        const blocks = mdContent.split(/\n*(###\s(user|assistant))\n+/);
    
        for (let i = 1; i < blocks.length; i += 3) {
            const sender = blocks[i + 1].trim();
            const messageBlock = blocks[i + 2].trim();
            let message = messageBlock.split(/\n*(###\s(?:user|assistant))\n+/)[0];
    
            if (sender !== "user" && sender !== "assistant") {
                console.error(`Invalid message sender: ${sender}`);
                continue; // 跳过这个无效的消息
            }
            messages.push({ sender, message });
        }
        
        console.log("messages: ", messages);
        if (messages.length === 0) {
            swal("Error!", "No valid messages found in file.", "error");
            return;
        }
        
        this.messageManager.clearFollowUpQuestions();
        
        messages.forEach(({ sender, message }) => {
            const active = true; 
            const messageId = this.generateId();
            const newMessage = {
                role: sender,
                content: message,
                messageId: messageId,
                isActive: active,
                createdAt: new Date().toISOString(),
            };
            this.messageManager.addMessage(newMessage.role, newMessage.content, newMessage.messageId, newMessage.isActive);
            this.app.prompts.addPrompt(newMessage);
            this.storageManager.saveMessage(this.currentChatId,newMessage);
            this.syncManager.syncMessageCreate(this.currentChatId, newMessage);
            this.chatHistoryManager.updateChatHistory(this.currentChatId);
        });
    }
    

    async refreshChatHistoryUI() {
        console.log("refreshChatHistoryUI");
        await this.showChatHistory();
    }

    refreshMessagesUI(chatId) {
        console.log("refreshMessagesUI");
        if (this.currentChatId === chatId) {
            this.loadMessagesByChatId(chatId, false);
        }
    }

    setClientLanguage(language) {
        this.clientLanguage = language || "en-US";
    }

    clearMessageInput() {
        this.messageInput.value = "";
    }

    // generate unique id
    generateId() {
        return Math.random().toString(36).slice(2, 10);
    }

    showToast(message) {
        var toast = document.getElementById("toast");
        toast.innerHTML = message;
        toast.style.display = "block";
        setTimeout(function () {
            toast.style.display = "none";
        }, 3000);
    }

    turnOnPracticeMode() {
        const practiceMode = document.querySelector("#practice-mode");
        const practiceModeIcon = document.querySelector("#practice-mode-icon");
        practiceMode.innerText = "Auto";
        practiceModeIcon.classList.remove("fa-volume-off");
        practiceModeIcon.classList.add("fa-volume-up");
        this.app.setTtsPracticeMode(true);
    }

    turnOffPracticeMode() {
        const practiceMode = document.querySelector("#practice-mode");
        const practiceModeIcon = document.querySelector("#practice-mode-icon");
        practiceMode.innerText = "Man.";
        practiceModeIcon.classList.remove("fa-volume-up");
        practiceModeIcon.classList.add("fa-volume-off");
        this.app.setTtsPracticeMode(false);
    }
    
    
    updateSlider() {
        const messageCount = document.querySelectorAll(".message").length;
        document.querySelector("#maxValue").textContent = messageCount;

        const counversationCount = this.app.prompts.length - 1;
        //slider.max will be 10 or the number of messages in the conversation, whichever is greater
        const maxSliderValue = Math.max(this.messageLimit, counversationCount);
        const slider = document.querySelector("#slider");
        slider.max = maxSliderValue;
    }

    getLastAssistantMessage() {
        const messagesDiv = document.getElementById("messages");
        const assistantMessages = messagesDiv.querySelectorAll(".assistant-message");
        return assistantMessages[assistantMessages.length - 1];
    }

    getLastLine(text) {
        const lines = text.split("\n");
        return lines[lines.length - 1];
    }

    async uploadAttachments(attachments) {
        let attachmentUrls = "";
        let urlArray = [];
        // 对于每个附件，转换内容并上传，然后收集URL
        for (const attachment of attachments) {
            try {
                // 将Base64编码转换为Blob对象
                const binaryContent = this.base64ToBlob(attachment.content);
                // 假设uploadAttachment函数已经能够处理Blob类型的content
                const attachmentUrl = await uploadAttachment(binaryContent, attachment.fileName);
                urlArray.push(attachmentUrl);
            } catch (error) {
                console.error("Attachment upload failed:", error);
                swal("Failed to upload attachment. Please try again.", { icon: "error" });
                return false;
            }
        }
        if (urlArray.length > 0) {
            attachmentUrls = urlArray.join(";");
        }
        return attachmentUrls;
    }
    
    // 辅助函数：将Base64编码的数据转换为Blob对象
    base64ToBlob(base64Data) {
        const contentTypeMatch = base64Data.match(/^data:(.*);base64,/);
        let contentType = "";
        if (contentTypeMatch && contentTypeMatch.length > 1) {
            contentType = contentTypeMatch[1];
        }
        const sliceSize = 512;
        const byteCharacters = atob(base64Data.split(",")[1]);
        const byteArrays = [];
    
        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            const slice = byteCharacters.slice(offset, offset + sliceSize);
            const byteNumbers = new Array(slice.length);
    
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
    
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }
    
        const blob = new Blob(byteArrays, {type: contentType});
        return blob;
    }
    

    async validateMessage(message) {
        if (message.startsWith("@") && !message.substring(0, 50).includes(":")) {
            const firstColonIndex = message.indexOf("："); // Find the index of the first Chinese colon
            const firstSpaceIndex = message.indexOf(" "); // Find the index of the first space
            const firstNewLineIndex = message.indexOf("\n"); // Find the index of the first newline
            let correctedMessage;
            let minIndex = Math.min(
                firstColonIndex !== -1 ? firstColonIndex : Infinity,
                firstSpaceIndex !== -1 ? firstSpaceIndex : Infinity,
                firstNewLineIndex !== -1 ? firstNewLineIndex : Infinity
            );
            if (minIndex < 50) {
                correctedMessage = message.substring(0, minIndex) + ":" + message.substring(minIndex + 1);
            } else {
                correctedMessage = message; // Keep the original message
            }
            const option = await swal({
                title: "Incorrect format",
                text: `The format should be @Role: Message. \n Would you like me to correct it to \n${correctedMessage.substring(0, 50)} ...?`,
                icon: "warning",
                buttons: {
                    continue: {
                        text: "Continue",
                        value: "continue",
                    },
                    edit: {
                        text: "Edit",
                        value: "edit",
                    },
                    correct: {
                        text: "Correct",
                        value: "correct",
                    }
                },
            });

            if (option === "correct") {
                return { message: correctedMessage, isSkipped: false, reEdit: false };
            }

            if (option === "edit") {
                return { message: "", isSkipped: false, reEdit: true };
            }

            if (option === "continue") {
                return { message, isSkipped: true, reEdit: false };
            }
        }

        return { message, isSkipped: false, reEdit: false };
    }

    finishSubmitProcessing() {
        const submitButton = document.getElementById("submitButton");
        const buttonIcon = document.getElementById("submit-button-icon");
        const loader = document.getElementById("submit-loader");
        submitButton.disabled = false;
        buttonIcon.classList.remove("hidden");
        loader.classList.add("hidden");
    }

    initSubmitButtonProcessing() {
        const submitButton = document.getElementById("submitButton");
        const buttonIcon = document.getElementById("submit-button-icon");
        const loader = document.getElementById("submit-loader");
        // 设置按钮为处理中状态
        submitButton.disabled = true;
        buttonIcon.classList.add("hidden");
        loader.classList.remove("hidden");
        return { submitButton, buttonIcon, loader };
    }
    createListItem(item, currentProfile, parentElement,isNewTopic=false) {
        let li = document.createElement("li");
        li.dataset.profile = item.name;
        if (item.name === currentProfile.name) {
            li.classList.add("active");
        }
        let icon = document.createElement("i");
        icon.className = `${item.icon}`;
        let span = document.createElement("span");
        span.textContent = item.displayName;
        li.appendChild(icon);
        li.appendChild(span);
        parentElement.appendChild(li);

        const self = this;
        // add click event listener
        li.addEventListener("click", function () {
            const profileName = li.dataset.profile;
            if  (isNewTopic) {
                const chatId = self.chatHistoryManager.generateChatId(self.storageManager.getCurrentUsername(), profileName);
                self.changeChatTopic(chatId, true);
            } else {
                const chatHistory = self.chatHistoryManager.getChatHistory();
                const latestChat = chatHistory.find(history => history.profileName === profileName);
                if (latestChat) {
                    const chatId = latestChat.id;
                    self.changeChatTopic(chatId);
                } else {
                    const chatId = self.chatHistoryManager.generateChatId(self.storageManager.getCurrentUsername(), profileName);
                    self.changeChatTopic(chatId, true);
                }
            }
        });

    }

    // render menu list from data
    // it only happens when user submit the username or the page is loaded
    async renderMenuList(data) {
        this.profiles = data.profiles;
        this.storageManager.setCurrentUsername(data.username);
        await this.showChatHistory();
        const userBtn = document.querySelector("#user");
        userBtn.title = this.storageManager.getCurrentUsername();
        await this.syncManager.syncChatHistories();
        const chatHistory = await this.chatHistoryManager.getChatHistory();
        let savedCurrentProfile = this.storageManager.getCurrentProfile();
        // Check if savedCurrentProfile's name is within data.profiles
        const profileNames = new Set(this.profiles.map(profile => profile.name));
        if (!savedCurrentProfile || !profileNames.has(savedCurrentProfile.name)) {
            savedCurrentProfile = this.profiles[0];
            this.storageManager.setCurrentProfile(savedCurrentProfile);
        }
        
        const currentProfile = this.storageManager.getCurrentProfile();
        const aiProfile = document.querySelector("#ai-profile");
        aiProfile.innerHTML = `<i class="${currentProfile.icon}"></i> ${currentProfile.displayName}`;

        this.populateAIActorList(currentProfile, this.profiles);
        this.populateProfileList(this.profiles);

        let latestChat;
        latestChat = chatHistory.find(history => history.profileName === currentProfile.name);
        if (!latestChat) {
            const chatId = this.chatHistoryManager.generateChatId(this.storageManager.getCurrentUsername(), currentProfile.name);
            this.currentChatId = chatId;
            this.changeChatTopic(chatId, true);
        } else {
            const chatId = latestChat.id;
            this.currentChatId = chatId;
            this.changeChatTopic(chatId);
        }
    }

    changeChatTopic(chatId, isNewTopic = false) {
        // check if chatId is current chatId
        if (this.currentChatId !== chatId) {
            const currentChatHisory = this.storageManager.readChatHistory(this.currentChatId);
            // check if messages are empty and currentChatHisory is not empty
            if (this.storageManager.getMessages(this.currentChatId).length === 0 && currentChatHisory && !currentChatHisory.timestamp) {
                // delete current chat history
                this.chatHistoryManager.deleteChatHistory(this.currentChatId);
            }
        }
        this.currentChatId = chatId;

        const profileName = chatId.split("_")[1];

        // Update current profile and chat ID
        this.storageManager.setCurrentProfile(this.profiles.find(p => p.name === profileName));
        
        const currentProfile = this.storageManager.getCurrentProfile();

        this.profileFormManager.bindProfileData(currentProfile);
        this.profileFormManager.oldName = currentProfile.name;

        console.log("profileName: ", profileName);

        //Set active profile aiActor item
        document.querySelector("#ai-actor-list li.active")?.classList.remove("active");
        document.querySelector(`#ai-actor-list li[data-profile="${profileName}"]`).classList.add("active");

        // Set active chat history item
        document.querySelector("#chat-history-list li.active")?.classList.remove("active");
        document.querySelector(`#chat-history-list li[data-id="${chatId}"]`)?.classList.add("active");

        // Reset practice mode and setup it based on the current profile
        this.turnOffPracticeMode();
        this.setupPracticeMode();

        // Update UI
        const aiProfile = document.querySelector("#ai-profile");
        aiProfile.innerHTML = `<i class="${this.storageManager.getCurrentProfile().icon}"></i> ${this.storageManager.getCurrentProfile().displayName}`;

        // Clear current chat messages and prompts
        this.app.prompts.clear();

        if (isNewTopic) {
            document.querySelector("#messages").innerHTML = "";
            this.chatHistoryManager.createChatHistory(chatId);
        } else {
            this.syncManager.syncMessages(chatId);
            // Load chat messages by chatId
            this.loadMessagesByChatId(this.currentChatId);
        }
    }

    loadMessagesByChatId(chatId, sendFollowUpQuestions = false) {
        this.app.prompts.clear();
        console.log("loadMessagesByChatId start", this.app.prompts);
        // clear messages container
        document.querySelector("#messages").innerHTML = "";
        // load chat messages by chatId
        const savedMessages = this.storageManager.getMessages(chatId);
        const startingIndex = savedMessages.length > this.messageLimit ? savedMessages.length - this.messageLimit : 0;
        savedMessages.slice(startingIndex).forEach((message, index, arr) => {
            let isActive = message.isActive || false;
            if (isActive) {
                this.app.prompts.addPrompt(message);
            }
            this.messageManager.addMessage(message.role, message.content, message.messageId, isActive, "bottom", false, message.attachmentUrls);
        });
        if (sendFollowUpQuestions) {
            this.messageManager.sendFollowUpQuestions();
        }
        console.log("loadMessagesByChatId", this.app.prompts);
    }

    setupPracticeMode() {
        const ttsContainer = document.querySelector("#tts-container");
        if (this.storageManager.getCurrentProfile() && this.storageManager.getCurrentProfile().tts === "enabled") {
            // if ttsContainer is not display, then display it
            ttsContainer.style.display = "inline-block";
        } else {
            // if ttsContainer is display, then hide it
            ttsContainer.style.display = "none";
        }
    }

    // play the message with tts
    async playMessage(speaker) {
        // if the speaker is playing, stop it and return
        if (speaker.classList.contains("fa-volume-up")) {
            //if the audio is playing, stop it
            this.app.audio.pause();
            this.domManager.toggleSpeakerIcon(speaker);
            this.app.currentPlayingSpeaker = null;
            return;
        }
        // If there is a speaker currently playing, stop it and reset its icon
        if (this.app.currentPlayingSpeaker && this.app.currentPlayingSpeaker !== speaker) {
            this.app.audio.pause();
            this.toggleSpeakerIcon(this.app.currentPlayingSpeaker); // Reset the icon of the previous speaker
        }

        // Update the currentPlayingSpeaker variable
        this.app.setCurrentPlayingSpeaker(speaker);

        //get message from parent element dataset message attribute
        const message = speaker.parentElement.parentElement.dataset.message;

        try {
            this.domManager.toggleSpeakerIcon(speaker);
            const blob = await getTts(message);
            console.log("ready to play...");
            this.app.audio.src = URL.createObjectURL(blob);
            await this.playAudio(speaker);
        } catch (error) {
            this.domManager.toggleSpeakerIcon(speaker);
            console.error(error);
        }
    }

    async playAudio(speaker) {
        return new Promise((resolve, reject) => {
            this.app.audio.onerror = () => {
                this.domManager.toggleSpeakerIcon(speaker);
                this.app.currentPlayingSpeaker = null;
                console.error("Error playing audio.");
                reject(new Error("Error playing audio."));
            };
            this.app.audio.onended = () => {
                this.domManager.toggleSpeakerIcon(speaker);
                this.app.currentPlayingSpeaker = null;
                resolve();
            };
            this.app.audio.onabort = () => {
                console.error("Audio play aborted.");
                resolve();
            };
            this.app.audio.play();
        });
    }

    async handleMessageFormSubmit(messageInput) {
        event.preventDefault(); // Prevent form submission
    
        const message = messageInput.value.trim(); // Get the input message
        // Prepare the attachments array
        const attachments = [];
        const attachmentPreviewList = document.getElementById("attachment-preview-list");
        const attachmentItems = attachmentPreviewList.querySelectorAll(".attachment-preview-item");

        attachmentItems.forEach(item => {
            const fileName = item.querySelector(".attachment-file-name").textContent;
            const content = item.querySelector(".attachment-thumbnail").style.backgroundImage.slice(5, -2); // Extract file content (remove 'url(' and ')')
            attachments.push({ fileName, content });
        });
    
        // If both message and attachments are empty, return
        if (!message && attachments.length === 0) return;
    
        // Call sendMessage, passing in message and attachments
        await this.messageManager.sendMessage(message, attachments);
    
        // Clean up the UI
        this.clearMessageInput();
        fileUploader.clearPreview();
        messageInput.blur();
    }

    handleProfileListMenuClick(event) {
        if (event.target.tagName.toLowerCase() === "li") {
            const selectedName = event.target.textContent;
            this.messageManager.addProfileToMessageInput(selectedName);
            this.clearProfileListMenu();
        }
    }

    async showChatHistory() {
        const username = this.storageManager.getCurrentUsername();
        if (!localStorage.getItem(this.chatHistoryManager.chatHistoryKeyPrefix + username)) {
            this.chatHistoryManager.generateChatHistory();
        } else {
            const chatHistory = this.chatHistoryManager.getChatHistory();
            this.domManager.renderChatHistoryList(chatHistory, this.profiles);
        }
    }

    handleChatHistoryChange(action, chatHistoryItem) {
        console.log("chatHistoryItem: ", chatHistoryItem, " action: ", action);
        const profile = this.profiles.find(profile => profile.name === chatHistoryItem.profileName);
        if (!profile) return;
        if (action === "create") {
            // no need to sync chat history create for now because it is empty.
            this.domManager.appendChatHistoryItem(chatHistoryItem, this.storageManager.getCurrentProfile());
        } else if (action === "update") {
            this.domManager.updateChatHistoryItem(chatHistoryItem, profile);
            this.syncManager.syncChatHistoryCreateOrUpdate(chatHistoryItem);
        } else if (action === "delete") {
            this.domManager.removeChatHistoryItem(chatHistoryItem.id);
            this.storageManager.removeMessagesByChatId(chatHistoryItem.id);
            this.syncManager.syncChatHistoryDelete(chatHistoryItem.id);
        }

        // Set active chat history item
        document.querySelector("#chat-history-list li.active")?.classList.remove("active");
        document.querySelector(`#chat-history-list li[data-id="${this.currentChatId}"]`)?.classList.add("active");
    }

    setupChatHistoryListClickHandler() {
        const chatHistoryListElement = document.querySelector("#chat-history-list");
        chatHistoryListElement.addEventListener("click", this.handleChatHistoryItemClick.bind(this));
    }

    handleAddTopicClick() {
        const profileName = this.storageManager.getCurrentProfile().name;
        const username = this.storageManager.getCurrentUsername();
        const chatId = this.chatHistoryManager.generateChatId(username, profileName);

        // Change the current chat topic to the newly created chat ID
        this.changeChatTopic(chatId, true);
    }


    handleChatHistoryItemClick(e) {
        const listItemElement = e.target.closest(".chat-history-item");
        if (listItemElement) {
            this.changeChatTopic(listItemElement.dataset.id);
            // Hide the chat history list if it's a mobile device
            if (window.innerWidth <= 768) {
                const chatHistoryContainer = document.getElementById("chat-history-container");
                this.hiddenElement(chatHistoryContainer);
            }
        }
    }

    deleteChatHistory(chatId) {
        const chatHistory = this.chatHistoryManager.getChatHistory();
        const chatHistoryToDelete = chatHistory.find(history => history.id === chatId);
        swal({
            title: "Are you sure?",
            text: `You will not be able to recover the chat history for \n "${chatHistoryToDelete.title}"!`,
            icon: "warning",
            buttons: {
                cancel: "Cancel",
                confirm: {
                    text: "Delete",
                    value: "delete",
                }
            },
            dangerMode: true,
        }).then((value) => {
            if (value === "delete") {
                this.chatHistoryManager.deleteChatHistory(chatId);
                if (this.currentChatId === chatId) {
                    const chatHistory = this.chatHistoryManager.getChatHistory();
                    const currentProfile = this.storageManager.getCurrentProfile();
                    let latestChat;
                    latestChat = chatHistory.find(history => history.profileName === currentProfile.name);
                    if (!latestChat) {
                        const chatId = this.chatHistoryManager.generateChatId(this.storageManager.getCurrentUsername(), currentProfile.name);
                        this.changeChatTopic(chatId, true);
                    } else {
                        const chatId = latestChat.id;
                        this.changeChatTopic(chatId);
                    }
                }
            }
        });
    }

    editChatHistoryItem(chatId) {
        const chatHistory = this.chatHistoryManager.getChatHistory();
        const chatHistoryToUpdate = chatHistory.find(history => history.id === chatId);
        swal({
            text: "Please enter a new title:",
            content: {
                element: "input",
                attributes: {
                    placeholder: "Title",
                    value: chatHistoryToUpdate.title,
                },
            },
            buttons: {
                cancel: "Cancel",
                confirm: {
                    text: "Update",
                    value: "update",
                }
            },
        }).then((newTitle) => {
            chatHistoryToUpdate.title = newTitle;
            this.chatHistoryManager.updateChatHistory(chatId, false, newTitle);

        });
    }
   

    async moveToNewTopic(messageId) {
        // 1. 从messages容器中得到当前消息，以及后续的消息
        // 这里 assumes 在消息列表中找到当前的消息后，其后面所有的消息都是后续的消息
        const allMessages = document.querySelectorAll(".message");
        let followingMessages = [];
        let found = false;
        allMessages.forEach(msg => {
            if ((msg.dataset.messageId == messageId) || found) {
                found = true;
                followingMessages.push(msg);
            }
        });
        
        const chatId = this.currentChatId;

        await new Promise((resolve) => {
            // 显示列表
            this.showAIActorList();
    
            const handleActorListHidden = () => {
                document.removeEventListener("aiActorListHidden", handleActorListHidden);
                resolve();
            };
    
            // 监听 ai-actor-container 被隐藏的事件
            document.addEventListener("aiActorListHidden", handleActorListHidden);
        });

        if (this.currentChatId == chatId) {
            return;
        } else {
            // 2. 在之前的话题中删除当前消息以及后续的消息
            followingMessages.forEach(msg => {
                messageId = msg.dataset.messageId;
                this.app.prompts.removePrompt(messageId);
                this.storageManager.deleteMessage(chatId, messageId);
                this.syncManager.syncMessageDelete(chatId, messageId);
            });
        }
        console.log("before add message storage:", this.storageManager.getMessages(this.currentChatId));

        // 5. 将当前消息以及后续的消息移动到新的话题中
        followingMessages.forEach(msg => {
            const newMessageItem = {
                role: msg.dataset.sender,
                content: msg.dataset.message,
                messageId: msg.dataset.messageId,
                isActive: msg.classList.contains("active"),
            };
            let isActive = newMessageItem.isActive || false;
            if (isActive) {
                this.app.prompts.addPrompt(newMessageItem);
            }
            this.messageManager.addMessage(newMessageItem.role, newMessageItem.content, newMessageItem.messageId, newMessageItem.isActive);
            this.storageManager.saveMessage(this.currentChatId, newMessageItem);
            this.syncManager.syncMessageCreate(this.currentChatId, newMessageItem);
        });
        // console.log("after movie prompts",this.app.prompts);

        this.chatHistoryManager.updateChatHistory(this.currentChatId, true);
    }

    toggleAIActorList() {
        const aiActorList = document.getElementById("ai-actor-container");
        if (aiActorList.getAttribute("data-visible") === "true") {
            this.hideAIActorList();
        } else {
            this.showAIActorList();
        }
    }

    showAIActorList() {
        const aiActorWrapper = document.getElementById("ai-actor-wrapper");
        const aiActorList = document.getElementById("ai-actor-container");
        const activeItem = aiActorList.querySelector(".active");
        const overlay = document.querySelector(".modal-overlay");
        this.visibleElement(aiActorWrapper);
        aiActorWrapper.setAttribute("data-visible", "true");
        this.visibleElement(overlay);
        
        // Scroll to active item
        if (activeItem) {
            activeItem.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
                inline: "start"
            });
        }
        
        setTimeout(() => {
            document.addEventListener("click", this.boundHideAIActorOnOutsideClick);
        }, 0); 
    }
    
    
    hideAIActorList() {
        const aiActorWrapper = document.getElementById("ai-actor-wrapper");
        const overlay = document.querySelector(".modal-overlay");
    
        if (aiActorWrapper.getAttribute("data-visible") === "true") {
            this.hiddenElement(aiActorWrapper);
            aiActorWrapper.setAttribute("data-visible", "false");
            this.hiddenElement(overlay);
    
            const event = new Event("aiActorListHidden");
            document.dispatchEvent(event);
    
            document.removeEventListener("click", this.boundHideAIActorOnOutsideClick);
        }
    }
    
    hideAIActorOnOutsideClick(event) {
        const aiActorWrapper = document.getElementById("ai-actor-wrapper"); // 修改为新的外层容器ID
        const profileListAIActor = document.getElementById("new-chat-button"); 
    
        if (event.target !== aiActorWrapper && event.target !== profileListAIActor) {
            this.hideAIActorList(); // 调用方法来隐藏列表并处理后续操作
        }
    } 
    
    showNewAIActorModal() {
        this.hideAIActorList();
        this.profileFormManager.resetForm();
        this.profileFormManager.oldName = "";
        const modalOverlay = document.querySelector(".modal-overlay");
        const aiActorSettingsWrapper = document.getElementById("ai-actor-settings-wrapper");
        this.visibleElement(aiActorSettingsWrapper);
        this.visibleElement(modalOverlay);
        if (!aiActorSettingsWrapper.classList.contains("modal-mode")) {
            aiActorSettingsWrapper.classList.add("modal-mode");
        }
    
        setTimeout(() => {
            document.addEventListener("click", this.handleClickOutsideCreateAIActorModal);
        }, 0);
    }
    
    hideNewAIActorModal() {
        const modalOverlay = document.querySelector(".modal-overlay");
        const aiActorSettingsInnerFormWrapper = document.getElementById("ai-actor-settings-wrapper");
        this.hiddenElement(modalOverlay);
        if (aiActorSettingsInnerFormWrapper.classList.contains("modal-mode")) {
            aiActorSettingsInnerFormWrapper.classList.remove("modal-mode");
        }
    }
    
    handleClickOutsideCreateAIActorModal(event) {
        const chatSettingsSidebar = document.getElementById("ai-actor-settings-wrapper");
        // 检查点击是否在ai-actor-settings-inner-form-wrapper或其子元素之外
        if (!chatSettingsSidebar.contains(event.target)) {
            // 如果是，则隐藏模态框和覆盖层
            this.hideNewAIActorModal();
            // 移除此事件监听器以避免不必要的检查
            document.removeEventListener("click", this.handleClickOutsideCreateAIActorModal);
            event.stopPropagation(); // 防止事件进一步传播
        }
    }
    
    toggleVisibility(element) {
        if (element.classList.contains("visible")) {
            element.classList.remove("visible", "active");
            element.classList.add("hidden");
        } else {
            element.classList.remove("hidden");
            element.classList.add("visible", "active");
        }
        // 调整按钮的活动状态
        this.updateButtonActiveState(element.id, element.classList.contains("visible"));
    }

    hiddenElement(element) {
        element.classList.remove("visible", "active");
        element.classList.add("hidden");
        this.updateButtonActiveState(element.id, false);
    }

    visibleElement(element) {
        element.classList.remove("hidden");
        element.classList.add("visible", "active");
        this.updateButtonActiveState(element.id, true);
    }

    setElementVisibility(element, isVisible) {
        if (isVisible) {
            this.visibleElement(element);
        } else {
            this.hiddenElement(element);
        }
    }    
    
    updateButtonActiveState(elementId, isVisible) {
        // 根据提供的元素ID更新对应的按钮状态。
        let button;
        switch(elementId) {
        case "chat-history-container":
            button = document.getElementById("toggle-chat-topic");
            break;
        case "ai-actor-settings-wrapper":
            button = document.getElementById("ai-profile");
            break;
            // 添加更多的case来处理其他按钮
        }
        if(button) {
            if(isVisible) {
                button.classList.add("active");
            } else {
                button.classList.remove("active");
            }
        }
    }
}

export default UIManager;

