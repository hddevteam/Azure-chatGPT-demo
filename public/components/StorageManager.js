// StorageManager.js

class StorageManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.currentUserData = JSON.parse(localStorage.getItem("currentUserData")) || { username: "guest", currentProfile: null };
        this.chatHistoryKeyPrefix = "chatHistory_";
    }

    updateLocalChatHistory(cloudChatHistory) {
        const username = this.getCurrentUsername();
        let localHistories = this.getChatHistory(username);
  
        const historyIndex = localHistories.findIndex(h => h.id === cloudChatHistory.id);
        if (historyIndex !== -1) {
            localHistories[historyIndex] = cloudChatHistory;
        } else {
            localHistories.push(cloudChatHistory);
        }
        this.saveChatHistory(username, localHistories);
    }

    insertLocalChatHistory(cloudChatHistory) {
        const username = this.getCurrentUsername();
        let localHistories = this.getChatHistory(username);

        localHistories.push(cloudChatHistory);
        this.saveChatHistory(username, localHistories);
    }

    deleteLocalChatHistory(chatId) {
        const username = this.getCurrentUsername();
        let localHistories = this.getChatHistory(username);

        const historyIndex = localHistories.findIndex(h => h.id === chatId);
        if (historyIndex !== -1) {
            localHistories.splice(historyIndex, 1);
        }
        this.saveChatHistory(username, localHistories);
    }

    // 添加这个方法来更新聊天历史记录的timestamp
    updateChatHistoryTimestamp(chatId, timestamp) {
        const username = this.getCurrentUsername();
        let histories = this.getChatHistory(username);

        const historyIndex = histories.findIndex(h => h.id === chatId);
        if (historyIndex >= 0) {
            histories[historyIndex].timestamp = timestamp;
            this.saveChatHistory(username, histories);
        }
    }

    setCurrentUsername(username) {
        this.currentUserData.username = username;
        this.saveCurrentUserData();
    }
    
    setCurrentProfile(profile) {
        this.currentUserData.currentProfile = profile;
        this.saveCurrentUserData();
    }
    
    getCurrentUsername() {
        return this.currentUserData.username;
    }
    
    getCurrentProfile() {
        return this.currentUserData.currentProfile;
    }
    
    saveCurrentUserData() {
        localStorage.setItem("currentUserData", JSON.stringify(this.currentUserData));
    }
    
    saveMessages(chatId, messages) {
        localStorage.setItem(chatId, JSON.stringify(messages));
    }
    
    getMessages(chatId) {
        return JSON.parse(localStorage.getItem(chatId) || "[]");
    }

    getLocalChatHistory(chatId) {
        // Assuming username can be determined from chatId
        const username = this.extractUsernameFromChatId(chatId);
        const localChatHistories = JSON.parse(localStorage.getItem(this.chatHistoryKeyPrefix + username) || "[]");
        return localChatHistories.find(history => history.id === chatId);
    }

    // Helper function to extract username from the chatId, which is assumed to be the first part before '_'
    extractUsernameFromChatId(chatId) {
        // We need to make sure that chatId includes the username and follows the pattern "username_profileName_uuid"
        if (!chatId.includes("_")) {
            console.error("Invalid chatId format", chatId);
            return null;
        }
        return chatId.split("_")[0];
    }
     
    getChatHistory(username) {
        return JSON.parse(localStorage.getItem(this.chatHistoryKeyPrefix + username) || "[]");
    }
    
    saveChatHistory(username, chatHistory) {
        localStorage.setItem(this.chatHistoryKeyPrefix + username, JSON.stringify(chatHistory));
    }
    
    removeMessagesByChatId(chatId) {
        localStorage.removeItem(chatId);
    }

    // 保存当前聊天的信息到本地存储
    saveCurrentProfileMessages() {
        const messages = document.querySelectorAll(".message");
        const savedMessages = this.getMessages(this.uiManager.currentChatId);
        const loadedMessages = [];

        messages.forEach(message => {
            if (message.dataset.sender === "user" || message.dataset.sender === "assistant") {
                if (message.dataset.messageId === "undefined") {
                    loadedMessages.push({ role: message.dataset.sender, content: message.dataset.message, messageId: this.uiManager.generateId(), isActive: message.classList.contains("active") });
                } else {
                    loadedMessages.push({ role: message.dataset.sender, content: message.dataset.message, messageId: message.dataset.messageId, isActive: message.classList.contains("active") });
                }
            }
        });

        // 合并已载入的信息和已保存的信息
        const updatedMessages = savedMessages.filter(savedMessage => {
            return !loadedMessages.find(loadedMessage => loadedMessage.messageId === savedMessage.messageId);
        }).concat(loadedMessages);

        this.saveMessages(this.uiManager.currentChatId, updatedMessages);
    }

    saveMessageActiveStatus(messageId, isActive) {
        const savedMessages = this.getMessages(this.uiManager.currentChatId);

        const updatedMessages = savedMessages.map(savedMessage => {
            if (savedMessage.messageId === messageId) {
                // 更新信息的isActive状态
                return { ...savedMessage, isActive: isActive };
            } else {
                return savedMessage;
            }
        });
        this.saveMessages(this.uiManager.currentChatId, updatedMessages);
    }

    deleteMessageFromStorage(messageId) {
        const savedMessages = this.getMessages(this.uiManager.currentChatId);
        const updatedMessages = savedMessages.filter(savedMessage => savedMessage.messageId !== messageId);

        this.saveMessages(this.uiManager.currentChatId, updatedMessages);
    }
}

export default StorageManager;

