// UIManager.js
import DOMManager from "./DOMManager.js";
import EventManager from "./EventManager.js";
import MessageManager from "./MessageManager.js";
import StorageManager from "./StorageManager.js";
import ChatHistoryManager from "./ChatHistoryManager.js";
import SyncManager from "./SyncManager.js";
import ProfileFormManager from "./ProfileFormManager.js";
import IntercomModal from "./IntercomModal.js";
import UIEventHandler from "./UIEventHandler.js";
import TtsAudioManager from "./TtsAudioManager.js";
import UIStateManager from "./UIStateManager.js";
import AIProfileManager from "./AIProfileManager.js";
import MessageContextManager from "../modules/chat/MessageContextManager.js";
import { getPromptRepo, uploadAttachment } from "../utils/apiClient.js";
import fileUploader from "../utils/fileUploader.js";
import swal from "sweetalert";

class UIManager {
    constructor(app) {
        this.app = app;
        this.messageLimit = 15;
        this.isDeleting = false;
        this.profiles = [];
        this.clientLanguage = "en-US";
        this.showAllChatHistories = true;
        this.aiActorFilterModal = null;
        this.filteredActors = null;

        // Initialize message input and container
        const messagesContainer = document.querySelector("#messages");
        messagesContainer.addEventListener("scroll", () => {
            if (messagesContainer.scrollTop === 0 && messagesContainer.innerHTML!=="") {
                this.messageManager.loadMoreMessages();
            }
        });
        this.messageInput = document.getElementById("message-input");

        // Initialize managers
        this.initializeManagers();
        
        // Setup components
        this.setupComponents();
    }

    initializeManagers() {
        this.domManager = new DOMManager(
            this.deleteChatHistory.bind(this),
            this.editChatHistoryItem.bind(this)
        );
        this.eventManager = new EventManager(this);
        this.messageManager = new MessageManager(this);
        this.storageManager = new StorageManager(this);
        this.syncManager = new SyncManager(this);
        this.chatHistoryManager = new ChatHistoryManager(this);
        this.eventHandler = new UIEventHandler(this);
        this.audioManager = new TtsAudioManager(this);
        this.uiStateManager = new UIStateManager(this);
        this.aiProfileManager = new AIProfileManager(this);
        this.messageContextManager = new MessageContextManager(this);
    }

    setupComponents() {
        this.chatHistoryManager.subscribe(this.handleChatHistoryChange.bind(this));
        this.profileFormManager = new ProfileFormManager(this, 
            async (updatedProfile, isNewProfile) => { 
                await this.refreshProfileList();
                if (isNewProfile) {
                    const chatId = this.chatHistoryManager.generateChatId(this.storageManager.getCurrentUsername(), updatedProfile.name);
                    this.currentChatId = chatId;
                    this.changeChatTopic(chatId, true);
                }
            },
            async (data) => {
                await this.renderMenuList(data);
                swal("Profile deleted successfully.", {icon: "success", button: false, timer: 1500})
                    .then(() => {
                        if (window.innerWidth <= 768) {
                            const actorSettingsWrapper = document.getElementById("ai-actor-settings-wrapper");
                            this.uiStateManager.hiddenElement(actorSettingsWrapper);
                        }
                    });
            },
            () => {
                const actorSettingsWrapper = document.getElementById("ai-actor-settings-wrapper");
                this.uiStateManager.hiddenElement(actorSettingsWrapper);
            }
        );

        this.intercomModal = new IntercomModal();
        this.intercomModal.setUIManager(this);

        // Setup event listeners
        this.eventHandler.setupEventListeners();
    }

    // Profile and Menu Management
    async refreshProfileList() {
        const username = this.storageManager.getCurrentUsername();
        return new Promise((resolve, reject) => {
            getPromptRepo(username)
                .then(data => {
                    this.profiles = data.profiles;
                    this.aiProfileManager.updateProfiles(this.profiles);
                    this.populateProfileList(this.profiles);
                    this.uiStateManager.hideNewAIActorModal();
                    resolve();
                })
                .catch(error => {
                    console.error("Error refreshing profile list:", error);
                    swal("Failed to refresh profile list.", {icon: "error"});
                    reject(error);
                });
        });
    }

    populateProfileList(profiles) {
        const profileListElement = document.getElementById("profile-list");
        const profileNames = profiles.map(profile => profile.displayName);
        profileListElement.innerHTML = "";
        for (let name of profileNames) {
            let li = document.createElement("li");
            li.textContent = name;
            profileListElement.appendChild(li);
        }
    }

    // Chat History Management
    async renderMenuList(data) {
        this.profiles = data.profiles;
        this.storageManager.setCurrentUsername(data.username);
        await this.showChatHistory();
        
        const userBtn = document.querySelector("#user");
        userBtn.title = this.storageManager.getCurrentUsername();
        
        await this.syncManager.syncChatHistories();
        const chatHistory = await this.chatHistoryManager.getChatHistory();
        
        // Get the cached profile and ensure it's valid
        let savedCurrentProfile = this.storageManager.getCurrentProfile();
        let validProfile = this.ensureValidProfile(savedCurrentProfile);
        
        // If we have no valid profile but some profiles exist, use the first one
        if (!validProfile && this.profiles.length > 0) {
            validProfile = this.profiles[0];
        }
        
        // Update the storage with the valid profile
        if (validProfile) {
            this.storageManager.setCurrentProfile(validProfile);
        }
        
        // 初始化 AIProfileManager with the validated profile
        this.aiProfileManager.initialize(validProfile, this.profiles);
        
        // Get the current valid profile
        const currentProfile = this.storageManager.getCurrentProfile();
        const latestChat = chatHistory.find(history => history.profileName === currentProfile.name);
        const chatId = latestChat ? 
            latestChat.id : 
            this.chatHistoryManager.generateChatId(this.storageManager.getCurrentUsername(), currentProfile.name);
        
        this.currentChatId = chatId;
        this.changeChatTopic(chatId, !latestChat);
    }

    async showChatHistory() {
        const username = this.storageManager.getCurrentUsername();
        let chatHistory = this.chatHistoryManager.getChatHistory();
        
        // 根据过滤条件筛选聊天历史
        if (!this.showAllChatHistories) {
            if (this.filteredActors && this.filteredActors.length > 0) {
                // 如果有选择的 AI Actors，显示这些 actors 的聊天记录
                chatHistory = chatHistory.filter(history => 
                    this.filteredActors.includes(history.profileName));
            } else {
                // 如果没有选择任何 actor，但不是显示全部，则只显示当前 profile 的聊天记录
                const currentProfile = this.storageManager.getCurrentProfile();
                if (currentProfile) {
                    chatHistory = chatHistory.filter(history => 
                        history.profileName === currentProfile.name);
                }
            }
        }
        
        if (!localStorage.getItem(this.chatHistoryManager.chatHistoryKeyPrefix + username)) {
            await this.chatHistoryManager.generateChatHistory();
        }
        
        // 更新聊天历史列表显示
        this.domManager.renderChatHistoryList(chatHistory, this.profiles);
    }

    handleChatHistoryChange(action, chatHistoryItem) {
        const profile = this.profiles.find(profile => profile.name === chatHistoryItem.profileName);
        if (!profile) return;

        switch (action) {
        case "create":
            this.domManager.appendChatHistoryItem(chatHistoryItem, this.storageManager.getCurrentProfile());
            break;
        case "update":
            this.domManager.updateChatHistoryItem(chatHistoryItem, profile);
            this.syncManager.syncChatHistoryCreateOrUpdate(chatHistoryItem);
            break;
        case "delete":
            this.domManager.removeChatHistoryItem(chatHistoryItem.id);
            this.storageManager.removeMessagesByChatId(chatHistoryItem.id);
            this.syncManager.syncChatHistoryDelete(chatHistoryItem.id);
            break;
        }

        document.querySelector("#chat-history-list li.active")?.classList.remove("active");
        document.querySelector(`#chat-history-list li[data-id="${this.currentChatId}"]`)?.classList.add("active");
    }

    async deleteChatHistory(chatId) {
        if (this.isDeleting) return;
        this.isDeleting = true;

        try {
            const result = await swal({
                title: "Are you sure?",
                text: "Once deleted, you will not be able to recover this chat history!",
                icon: "warning",
                buttons: true,
                dangerMode: true,
            });

            if (result) {
                const chatHistory = this.chatHistoryManager.getChatHistory();
                const chatToDelete = chatHistory.find(history => history.id === chatId);
                
                if (chatToDelete) {
                    this.chatHistoryManager.deleteChatHistory(chatId);
                    
                    // If we're deleting the current chat, enter the most recent remaining chat
                    if (chatId === this.currentChatId) {
                        const remainingHistory = this.chatHistoryManager.getChatHistory();
                        if (remainingHistory.length > 0) {
                            // Since getChatHistory returns chats sorted by updatedAt, first one is most recent
                            const mostRecentChat = remainingHistory[0];
                            const profile = this.aiProfileManager.getProfileByName(mostRecentChat.profileName);
                            if (profile) {
                                await this.aiProfileManager.switchToProfile(profile, false);
                                await this.changeChatTopic(mostRecentChat.id, false);
                            }
                        } else {
                            this.showWelcomeMessage();
                        }
                    }
                    
                    swal("Chat history has been deleted!", {
                        icon: "success",
                        button: false,
                        timer: 1500,
                    });
                }
            }
        } catch (error) {
            console.error("Error deleting chat history:", error);
            swal("Failed to delete chat history.", {
                icon: "error",
                button: false,
                timer: 1500,
            });
        } finally {
            this.isDeleting = false;
        }
    }

    async editChatHistoryItem(chatId, newTitle) {
        const chatHistory = this.chatHistoryManager.getChatHistory();
        const chatToEdit = chatHistory.find(history => history.id === chatId);
        
        if (chatToEdit) {
            // 将标题作为第三个参数传递给 updateChatHistory
            await this.chatHistoryManager.updateChatHistory(chatId, false, newTitle);
        }
    }

    // Message Management
    clearMessageInput() {
        this.messageInput.value = "";
    }

    generateId() {
        return Math.random().toString(36).slice(2, 10);
    }

    showToast(message) {
        var toast = document.getElementById("toast");
        toast.innerHTML = message;
        toast.style.display = "block";
        setTimeout(() => {
            toast.style.display = "none";
        }, 3000);
    }

    async validateMessage(message) {
        if (message.startsWith("@") && !message.substring(0, 50).includes(":")) {
            const firstColonIndex = message.indexOf("：");
            const firstSpaceIndex = message.indexOf(" ");
            const firstNewLineIndex = message.indexOf("\n");
            let correctedMessage;
            let minIndex = Math.min(
                firstColonIndex !== -1 ? firstColonIndex : Infinity,
                firstSpaceIndex !== -1 ? firstSpaceIndex : Infinity,
                firstNewLineIndex !== -1 ? firstNewLineIndex : Infinity
            );
            
            if (minIndex < 50) {
                correctedMessage = message.substring(0, minIndex) + ":" + message.substring(1);
            } else {
                correctedMessage = message;
            }
            
            const option = await swal({
                title: "Incorrect format",
                text: `The format should be @Role: Message. \n Would you like me to correct it to \n${correctedMessage.substring(0, 50)} ...?`,
                icon: "warning",
                buttons: {
                    continue: { text: "Continue", value: "continue" },
                    edit: { text: "Edit", value: "edit" },
                    correct: { text: "Correct", value: "correct" }
                },
            });

            switch (option) {
            case "correct":
                return { message: correctedMessage, isSkipped: false, reEdit: false };
            case "edit":
                return { message: "", isSkipped: false, reEdit: true };
            case "continue":
                return { message, isSkipped: true, reEdit: false };
            default:
                return { message, isSkipped: false, reEdit: false };
            }
        }

        return { message, isSkipped: false, reEdit: false };
    }

    async handleMessageFormSubmit(messageInput, event) {
        if (event) {
            event.preventDefault(); // Prevent form submission if event is provided
        }
    
        const message = messageInput.value.trim(); // Get the input message
        // Prepare the attachments array
        const attachments = [];
        const attachmentPreviewList = document.getElementById("attachment-preview-list");
        const attachmentItems = attachmentPreviewList.querySelectorAll(".attachment-preview-item");

        // 在发送新消息前清除之前的follow-up questions
        this.messageManager.clearFollowUpQuestions();

        attachmentItems.forEach(item => {
            // 使用 dataset 属性来获取文件名和内容
            const fileName = item.dataset.fileName;
            const content = item.dataset.content;
            if (fileName && content) {
                attachments.push({ fileName, content });
            }
        });

        // Clean up the UI
        this.clearMessageInput(); // Clear the message input
        fileUploader.clearPreview();
        messageInput.blur();
    
        // If both message and attachments are empty, return
        if (!message && attachments.length === 0) return;
    
        // Call sendMessage, passing in message and attachments
        await this.messageManager.sendMessage(message, attachments);
    }

    // UI State Management Methods - delegated to UIStateManager
    toggleVisibility(element) {
        this.uiStateManager.toggleVisibility(element);
    }

    hiddenElement(element) {
        this.uiStateManager.hiddenElement(element);
    }

    visibleElement(element) {
        this.uiStateManager.visibleElement(element);
    }

    showWelcomeMessage() {
        this.uiStateManager.showWelcomeMessage();
    }

    updateButtonActiveState(elementId, isVisible) {
        this.uiStateManager.updateButtonActiveState(elementId, isVisible);
    }

    async refreshChatHistoryUI() {
        const chatHistory = this.chatHistoryManager.getChatHistory();
        this.domManager.renderChatHistoryList(chatHistory, this.profiles);
    }

    hideAIActorList() {
        this.uiStateManager.hideAIActorList();
    }

    showAIActorList() {
        // 显示 AI Actor 列表前确保列表内容已更新
        const aiActorList = document.getElementById("ai-actor-list");
        if (aiActorList) {
            // 先清空列表
            aiActorList.innerHTML = "";
            
            // 获取当前配置文件列表和当前使用的配置文件
            const profiles = this.profiles;
            const currentProfile = this.storageManager.getCurrentProfile();
            
            // 填充列表
            if (profiles && profiles.length > 0) {
                profiles.forEach(profile => {
                    let li = document.createElement("li");
                    li.dataset.profile = profile.name;
                    if (currentProfile && profile.name === currentProfile.name) {
                        li.classList.add("active");
                    }

                    let icon = document.createElement("i");
                    icon.className = profile.icon;
                    
                    let span = document.createElement("span");
                    span.textContent = profile.displayName;
                    
                    li.appendChild(icon);
                    li.appendChild(span);
                    aiActorList.appendChild(li);
                });
            }
            
            // 调用 UIStateManager 显示列表
            this.uiStateManager.showAIActorList();
        }
    }

    showNewAIActorModal() {
        this.uiStateManager.showNewAIActorModal();
    }

    hideNewAIActorModal() {
        this.uiStateManager.hideNewAIActorModal();
    }

    initSubmitButtonProcessing() {
        const progressBar = document.querySelector(".progress-bar");
        const submitButton = document.getElementById("submitButton");
        const buttonIcon = document.getElementById("submit-button-icon");
        const loader = document.getElementById("submit-loader");
        
        // 激活进度条
        progressBar.classList.add("active");
        
        // 禁用提交按钮
        submitButton.disabled = true;
        
        // 使用 opacity 过渡来避免尺寸变化
        buttonIcon.classList.add("hidden");
        
        // 使用 setTimeout 创建平滑过渡
        setTimeout(() => {
            loader.classList.remove("hidden");
        }, 150);
    }
    
    finishSubmitProcessing() {
        const progressBar = document.querySelector(".progress-bar");
        const submitButton = document.getElementById("submitButton");
        const buttonIcon = document.getElementById("submit-button-icon");
        const loader = document.getElementById("submit-loader");
        
        // 完成进度条动画
        progressBar.classList.remove("active");
        progressBar.classList.add("complete");
        
        // 使用 opacity 过渡来避免尺寸变化
        loader.classList.add("hidden");
        
        // 使用 setTimeout 创建平滑过渡
        setTimeout(() => {
            buttonIcon.classList.remove("hidden");
        }, 150);
        
        // 重置按钮状态
        submitButton.disabled = false;
        
        // 短暂延迟后移除完成状态
        setTimeout(() => {
            progressBar.classList.remove("complete");
        }, 500);
    }

    // Audio Management Methods - delegated to AudioManager
    turnOnPracticeMode() {
        this.audioManager.turnOnPracticeMode();
    }

    turnOffPracticeMode() {
        this.audioManager.turnOffPracticeMode();
    }

    setupPracticeMode() {
        this.audioManager.setupPracticeMode();
    }

    async playMessage(speaker) {
        await this.audioManager.playMessage(speaker);
    }

    setClientLanguage(language) {
        this.clientLanguage = language || "en-US";
    }

    getClientLanguage() {
        return this.clientLanguage;
    }

    setElementVisibility(element, isVisible) {
        if (isVisible) {
            this.visibleElement(element);
        } else {
            this.hiddenElement(element);
        }
    }

    async changeChatTopic(chatId, isNewTopic = false) {
        // 清空现有消息并显示加载指示器
        const messagesContainer = document.querySelector("#messages");
        messagesContainer.innerHTML = `
            <div id="chat-loading-indicator" class="chat-loading-indicator">
                <div class="loading-spinner"></div>
                <div class="loading-text">正在加载对话内容...</div>
            </div>
        `;
        
        // 立即更新当前聊天ID
        this.currentChatId = chatId;

        // 立即更新UI活动状态
        document.querySelector("#chat-history-list li.active")?.classList.remove("active");
        document.querySelector(`#chat-history-list li[data-id="${chatId}"]`)?.classList.add("active");

        // 获取当前聊天的配置文件
        let currentProfile = this.storageManager.getCurrentProfile();
        
        // 异步执行数据加载过程
        this.loadChatTopicData(chatId, isNewTopic, currentProfile).catch(error => {
            console.error("Error loading chat topic:", error);
            // 在加载失败时显示错误信息
            const loadingIndicator = document.getElementById("chat-loading-indicator");
            if (loadingIndicator) {
                loadingIndicator.innerHTML = `
                    <div class="loading-error">
                        <i class="fas fa-exclamation-circle"></i>
                        <div>加载对话内容时出错</div>
                        <button class="retry-button">重试</button>
                    </div>
                `;
                
                // 添加重试按钮事件处理
                const retryButton = loadingIndicator.querySelector(".retry-button");
                if (retryButton) {
                    retryButton.addEventListener("click", () => this.changeChatTopic(chatId, isNewTopic));
                }
            }
        });
    }
    
    // 新方法：用于处理聊天话题数据加载的异步过程
    async loadChatTopicData(chatId, isNewTopic, currentProfile) {
        // 如果不是新话题，根据现有的聊天历史更新当前的 Profile
        if (!isNewTopic) {
            const chatHistory = this.chatHistoryManager.getChatHistory();
            const currentChat = chatHistory.find(history => history.id === chatId);
            if (currentChat) {
                const profile = this.profiles.find(p => p.name === currentChat.profileName);
                
                if (profile) {
                    // 找到了对应的profile，正常切换
                    if (profile.name !== currentProfile?.name) {
                        await this.aiProfileManager.switchToProfile(profile, false);
                        currentProfile = this.aiProfileManager.getCurrentProfile();
                    }
                } else if (this.profiles.length > 0) {
                    // 如果没有找到对应的profile，但有其他profiles可用，切换到第一个profile
                    console.log(`Profile ${currentChat.profileName} not found, switching to first available profile: ${this.profiles[0].name}`);
                    await this.aiProfileManager.switchToProfile(this.profiles[0], false);
                    currentProfile = this.aiProfileManager.getCurrentProfile();
                }
            }
        }

        // If it's a new topic, create new chat history
        if (isNewTopic) {
            const newChatHistory = {
                id: chatId,
                title: "untitled",
                profileName: currentProfile.name,
                timestamp: Date.now(),
                updatedAt: new Date().toISOString()
            };
            this.chatHistoryManager.createChatHistory(newChatHistory);
            
            // 对于新话题，确保更新表单数据
            this.profileFormManager.bindProfileData(currentProfile);
        } else {
            // 如果不是新话题，从Azure Storage同步消息
            try {
                await this.syncManager.updateToken(); // 确保token有效
                await this.syncManager.syncMessages(chatId);
                console.log(`Synced messages from Azure Storage for chat ${chatId}`);
            } catch (error) {
                console.error(`Error syncing messages from Azure Storage: ${error.message}`);
                // 继续加载本地消息，即使同步失败
            }
        }

        // 获取此聊天的所有消息
        const messages = this.storageManager.getMessages(chatId);
        
        // 初始化上下文（设置系统提示和恢复活跃消息）
        this.messageContextManager.initializeContext(currentProfile, messages);

        // 清除加载指示器
        const loadingIndicator = document.getElementById("chat-loading-indicator");
        if (loadingIndicator) {
            loadingIndicator.remove();
        }

        // 清空消息容器，以便重新加载消息
        document.querySelector("#messages").innerHTML = "";

        // 加载此聊天的消息
        await this.messageManager.loadMessages(chatId);

        // 如果没有消息，显示欢迎信息
        if (document.querySelector("#messages").innerHTML === "") {
            this.showWelcomeMessage();
        }
    }

    toggleAIActorList() {
        const aiActorWrapper = document.getElementById("ai-actor-wrapper");
        
        if (aiActorWrapper.getAttribute("data-visible") === "true") {
            this.uiStateManager.hideAIActorList();
        } else {
            this.uiStateManager.showAIActorList();
        }
    }

    base64ToBlob(base64Data) {
        try {
            // Decode base64 string and handle data URL format
            const [header, content] = base64Data.split(",");
            const actualData = content || header; // If no comma found, use the whole string
            
            // Get mime type from header or default to application/octet-stream
            let mimeType = "application/octet-stream";
            if (header && header.includes("data:") && content) {
                mimeType = header.split(":")[1].split(";")[0];
            }

            // Convert base64 to binary
            const byteCharacters = atob(actualData);
            const byteArrays = [];

            for (let offset = 0; offset < byteCharacters.length; offset += 512) {
                const slice = byteCharacters.slice(offset, offset + 512);
                const byteNumbers = new Array(slice.length);
                
                for (let i = 0; i < slice.length; i++) {
                    byteNumbers[i] = slice.charCodeAt(i);
                }
                
                byteArrays.push(new Uint8Array(byteNumbers));
            }

            return new Blob(byteArrays, { type: mimeType });
        } catch (error) {
            console.error("Error converting base64 to blob:", error);
            throw new Error("Failed to convert file data");
        }
    }

    // Message UI Management
    async refreshMessagesUI(chatId) {
        // Only refresh if this is the current chat
        if (chatId === this.currentChatId) {
            await this.messageManager.loadMessages(chatId);
            console.log(`Refreshed messages UI for chat ${chatId}`);
        }
    }

    /**
     * Ensures that a valid profile is selected
     * If the provided profile doesn't exist, it falls back to the first available profile
     * @param {Object} profile - The profile to validate
     * @returns {Object} A valid profile object
     */
    ensureValidProfile(profile) {
        // If no profile is provided or profiles list is empty, return null
        if (!profile || this.profiles.length === 0) {
            console.log("No profile provided or no profiles available");
            return null;
        }
        
        // Check if the profile exists in the current profiles list
        const profileExists = this.profiles.some(p => p.name === profile.name);
        
        // If profile exists, return it; otherwise return the first available profile
        if (profileExists) {
            return profile;
        } else {
            console.log(`Profile ${profile.name} not found, switching to first available profile: ${this.profiles[0].name}`);
            return this.profiles[0];
        }
    }

    async initializeActorFilterModal() {
        const { AIActorFilterModal } = await import("./AIActorFilterModal.js");
        this.aiActorFilterModal = new AIActorFilterModal(this);
    }

    showActorFilterModal() {
        if (this.aiActorFilterModal) {
            this.aiActorFilterModal.show();
        }
    }

    async uploadAttachments(attachments) {
        if (!attachments || attachments.length === 0) return "";
        
        const uploadedUrls = [];
        
        try {
            for (const attachment of attachments) {
                try {
                    // 如果是已经存在的附件，直接使用其文件名
                    if (attachment.isExistingAttachment) {
                        uploadedUrls.push(attachment.fileName);
                        continue;
                    }
                    
                    // 否则上传新附件
                    const response = await uploadAttachment(attachment.content, attachment.fileName);
                    if (response) {
                        uploadedUrls.push(response);
                    }
                } catch (error) {
                    console.error(`Failed to upload attachment ${attachment.fileName}:`, error);
                    swal("Upload Failed", `Failed to upload ${attachment.fileName}: ${error.message}`, "error");
                    return "";
                }
            }
            
            return uploadedUrls.join(";");
        } catch (error) {
            console.error("Error uploading attachments:", error);
            swal("Upload Failed", "Failed to upload attachments", "error");
            return "";
        }
    }
}

export default UIManager;