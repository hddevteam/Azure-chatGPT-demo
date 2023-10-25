// UIManager.js
import DOMManager from "./DOMManager.js";
import EventManager from "./EventManager.js";
import MessageManager from "./MessageManager.js";
import StorageManager from "./StorageManager.js";
import ChatHistoryManager from "./ChatHistoryManager.js";
import { getCurrentUsername, getCurrentProfile, setCurrentUsername, setCurrentProfile, getMessages } from "../utils/storage.js";
import { textToImage, getTts } from "../utils/api.js";
import swal from "sweetalert";


class UIManager {
    constructor(app) {
        this.app = app;
        this.messageLimit = 15;
        this.isDeleting = false;
        this.profiles = [];
        const messagesContainer = document.querySelector("#messages");
        messagesContainer.addEventListener("scroll", () => {
            if (messagesContainer.scrollTop === 0) {
                this.messageManager.loadMoreMessages();
            }
        });
        this.messageInput = document.getElementById("message-input");
        this.domManager = new DOMManager();
        this.eventManager = new EventManager(this);
        this.messageManager = new MessageManager(this);
        this.storageManager = new StorageManager(this);
        this.chatHistoryManager = new ChatHistoryManager();
        this.chatHistoryManager.subscribe(this.handleChatHistoryChange.bind(this));
        this.setupChatHistoryListClickHandler();
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

    // text to image
    async generateImage(caption) {
        try {
            const data = await textToImage(caption);
            const imageUrl = data.imageUrl;
            const messageId = this.generateId();
            // Set width and height attributes for the image
            const thumbnailWidth = 300;
            const thumbnailHeight = 300;
            // Wrap the <img> tag and caption text in a <div>
            this.messageManager.addMessage(
                "assistant",
                `<div>
           <img src="${imageUrl}" alt="${caption}" width="${thumbnailWidth}" height="${thumbnailHeight}" style="object-fit: contain;" />
           <p style="margin-top: 4px;">${caption}</p>
         </div>`,
                messageId
            );
            this.storageManager.saveCurrentProfileMessages();
        } catch (error) {
            console.error(error);
            let messageId = this.generateId();
            this.messageManager.addMessage("assistant", error.message, messageId);
        } finally {
            this.finishSubmitProcessing();
        }
    }

    setSystemMessage(message) {
        // 获取显示系统消息的元素
        this.app.prompts.setSystemPrompt(message);
        const systemMessageElement = document.querySelector("#system-message");
        systemMessageElement.innerHTML = `${message}<button id="edit-system-message"><i class="fas fa-edit"></i></button>`;

        // 定义编辑按钮的点击事件
        const editButton = document.querySelector("#edit-system-message");
        editButton.addEventListener("click", () => {
            // 使用window.open可以在新标签页中打开，并将当前的profile name传递过去
            window.open(`profile-manager.html?profileName=${getCurrentProfile().name}`, "_blank");
        });
    }


    updateSlider() {
        const messageCount = document.querySelectorAll(".message").length;
        document.querySelector("#maxValue").textContent = messageCount;

        const counversationCount = this.app.prompts.length - 1;
        //slider.max will be 10 or the number of messages in the conversation, whichever is greater
        const maxSliderValue = Math.max(10, counversationCount);
        const slider = document.querySelector("#slider");
        slider.max = maxSliderValue;
    }


    // Clear message input except the first message
    clearMessage() {
        const messagesContainer = document.getElementById("messages");
        // clear messages in DOM except the first message
        messagesContainer.innerHTML = "";
        this.storageManager.saveCurrentProfileMessages();
        const messageInput = document.getElementById("message-input");
        messageInput.value = "";
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


    // render menu list from data
    // it only happens when user submit the username or the page is loaded
    async renderMenuList(data) {
        this.profiles = data.profiles;
        setCurrentUsername(data.username);
        await this.showChatHistory();
        const usernameLabel = document.querySelector("#username-label");
        usernameLabel.textContent = getCurrentUsername();
        const savedCurrentProfile = getCurrentProfile();
        const chatHistory = this.chatHistoryManager.getChatHistory();
        let currentProfileName = savedCurrentProfile ? savedCurrentProfile.name : this.profiles[0].name;
        let latestChat;
        latestChat = chatHistory.find(history => history.profileName === currentProfileName);
        this.currentChatId = latestChat?.id || this.chatHistoryManager.generateChatId(getCurrentUsername(), currentProfileName);

        //empty menu list
        const menuList = document.querySelector("#menu-list");
        menuList.innerHTML = "";
        const aiProfile = document.querySelector("#ai-profile");
        aiProfile.innerHTML = `<i class="${getCurrentProfile().icon}"></i> ${getCurrentProfile().displayName}`;
        //add menu items
        this.profiles.forEach(item => {
            let li = document.createElement("li");
            li.dataset.profile = item.name;
            // set current selected menu item to active
            if (item.name === currentProfileName) {
                li.classList.add("active");
            }
            let icon = document.createElement("i");
            icon.className = `${item.icon}`;
            let span = document.createElement("span");
            span.textContent = item.displayName;
            li.appendChild(icon);
            li.appendChild(span);
            menuList.appendChild(li);
            // Capture the 'this' of UIManager instance
            const self = this;
            //add click event listener
            li.addEventListener("click", function () {
                const profileName = li.dataset.profile;
                const latestChat = chatHistory.find(history => history.profileName === profileName);
                self.currentChatId = latestChat?.id || self.chatHistoryManager.generateChatId(getCurrentUsername(), profileName);
                self.changeChatTopic(self.currentChatId);
            });
        });

        this.changeChatTopic(this.currentChatId);

    }

    changeChatTopic(chatId) {
        const profileName = chatId.split("_")[1];

        // Update current profile and chat ID
        setCurrentProfile(this.profiles.find(p => p.name === profileName));
        this.setSystemMessage(getCurrentProfile().prompt);
        console.log("profileName: ", profileName);
        
        // Set active profile menu item
        document.querySelector("#menu-list li.active")?.classList.remove("active");
        document.querySelector(`#menu-list li[data-profile="${profileName}"]`).classList.add("active");

        // Reset practice mode and setup it based on the current profile
        this.turnOffPracticeMode();
        this.setupPracticeMode();

        // Update UI
        const aiProfile = document.querySelector("#ai-profile");
        aiProfile.innerHTML = `<i class="${getCurrentProfile().icon}"></i> ${getCurrentProfile().displayName}`;

        // Clear current chat messages and prompts
        document.querySelector("#messages").innerHTML = "";
        this.app.prompts.clear();

        // Load chat messages by chatId
        this.loadChatById(this.currentChatId);
    }


    loadChatById(chatId) {
        // load chat messages by chatId
        const chatMessages = getMessages(chatId);
        chatMessages.forEach((message, index, arr) => {
            let isActive = message.isActive || false;
            if (isActive) {
                this.app.prompts.addPrompt(message);
            }
            this.messageManager.addMessage(message.role, message.content, message.messageId, isActive);
        });
    }

    setupPracticeMode() {
        const ttsContainer = document.querySelector("#tts-container");
        if (getCurrentProfile() && getCurrentProfile().tts === "enabled") {
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

    handleMessageFormSubmit(messageInput) {
        // Prevent form submission
        event.preventDefault();

        // Get the message from the input field
        const message = messageInput.value.trim();

        // If the message is not empty, send it
        if (message) {
            this.messageManager.sendMessage(message);
        }

        // Clear the input field and handle the UI
        this.clearMessageInput();
        this.messageInput.blur();
        this.handleInput();
    }

    handleProfileListMenuClick(event) {
        if (event.target.tagName.toLowerCase() === "li") {
            const selectedName = event.target.textContent;
            this.messageManager.addProfileToMessageInput(selectedName);
            this.clearProfileListMenu();
        }
    }

    handleInput(initFocusHeight, halfScreenHeight) {
        // 判断messageInput是否失去焦点
        if (!this.messageInput.matches(":focus")) {
            if (this.messageInput.value === "") {
                this.messageInput.style.height = "";
            }
            return;
        }
        // 如果输入框的内容为空，将高度恢复为初始高度
        if (this.messageInput.value === "") {
            this.messageInput.style.height = `${initFocusHeight}px`;
        } else {
            // 然后设为scrollHeight，但不超过屏幕的一半
            this.messageInput.style.height = `${Math.min(this.messageInput.scrollHeight, halfScreenHeight)}px`;
            if (this.messageInput.scrollHeight < initFocusHeight) {
                this.messageInput.style.height = `${initFocusHeight}px`;
            }
        }

    }

    async showChatHistory() {
        const chatHistoryManager = new ChatHistoryManager();
        const username = getCurrentUsername();
        if (!localStorage.getItem(chatHistoryManager.chatHistoryKeyPrefix + username)) {
            await chatHistoryManager.generateChatHistory();
        }
        const chatHistory = chatHistoryManager.getChatHistory();
        this.domManager.renderChatHistoryList(chatHistory, this.profiles);
    }

    handleChatHistoryChange(action, chatHistoryItem) {
        if (action === "create") {
            this.domManager.appendChatHistoryItem(chatHistoryItem, getCurrentProfile());
        } else if (action === "update") {
            this.domManager.updateChatHistoryItem(chatHistoryItem, getCurrentProfile());
        } else if (action === "delete") {
            this.domManager.removeChatHistoryItem(chatHistoryItem.id);
        }
    }

    setupChatHistoryListClickHandler() {
        const chatHistoryListElement = document.querySelector("#chat-history-list");
        chatHistoryListElement.addEventListener("click", this.handleChatHistoryItemClick.bind(this));
    }

    handleChatHistoryItemClick(e) {
        const listItemElement = e.target.closest(".chat-history-item");
        if (listItemElement) {
            this.currentChatId = listItemElement.dataset.id;
            this.changeChatTopic(this.currentChatId);
        }
    }
}

export default UIManager;

