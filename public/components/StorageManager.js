// StorageManager.js

class StorageManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.currentUserData = JSON.parse(localStorage.getItem("currentUserData")) || { username: "guest", currentProfile: null };
        this.chatHistoryKeyPrefix = "chatHistory_";
    }

    createChatHistory(chatHistoryItem) {
        const username = this.getCurrentUsername();
        let chatHistories = this.getChatHistory(username);
        chatHistories.unshift(chatHistoryItem);
        this.saveChatHistory(username, chatHistories);
    }

    readChatHistory(chatId) {
        const username = this.getCurrentUsername();
        return this.getChatHistory(username).find(history => history.id === chatId);
    }

    updateChatHistory(chatHistoryItem) {
        console.log("updateChatHistory: ", chatHistoryItem);
        const username = this.getCurrentUsername();
        let localHistories = this.getChatHistory(username);
        const historyIndex = localHistories.findIndex(h => h.id === chatHistoryItem.id);
        console.log("updateChatHistory: ", historyIndex);
        if (historyIndex !== -1) {
            // To keep the same behavior as updateChatHistory, merge the properties
            localHistories[historyIndex] = chatHistoryItem;
            console.log("updateChatHistory: ", localHistories[historyIndex]);
        }
        this.saveChatHistory(username, localHistories);
    }

    deleteChatHistory(chatId) {
        const username = this.getCurrentUsername();
        let chatHistories = this.getChatHistory(username);
        chatHistories = chatHistories.filter(history => history.id !== chatId);
        this.saveChatHistory(username, chatHistories);
    }

    // 添加这个方法来更新聊天历史记录的timestamp
    updateChatHistoryTimestamp(chatId, timestamp) {
        console.log("updateChatHistoryTimestamp: ", chatId, timestamp);
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
    
    saveMessageActiveStatus(messageId, isActive) {
        console.log("saveMessageActiveStatus: ", messageId, isActive);
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

    getMessage(messageId) {
        const savedMessages = this.getMessages(this.uiManager.currentChatId);
        return savedMessages.find(savedMessage => savedMessage.messageId === messageId);
    }

    deleteMessage(messageId) {
        const savedMessages = this.getMessages(this.uiManager.currentChatId);
        const updatedMessages = savedMessages.filter(savedMessage => savedMessage.messageId !== messageId);

        this.saveMessages(this.uiManager.currentChatId, updatedMessages);
    }

    // create or update a message
    saveMessage(chatId, message) {
        let messages = this.getMessages(chatId);
        const index = messages.findIndex(m => m.messageId === message.messageId);
    

        if (index > -1) {
            // Merge existing message with new data
            messages[index] = { ...messages[index], ...message };
            messages[index].createdAt = messages[index].createdAt || new Date().toISOString();
        } else {
            // Add createdAt field
            message.createdAt = message.createdAt || new Date().toISOString();
            // Save new message
            messages.push(message);
        }
        this.saveMessages(chatId, messages);
    }
    

    // 更新 getMessages 方法，在确保所有消息都有 createdAt 属性并完成排序后保存回LocalStorage
    getMessages(chatId) {
        let messages = JSON.parse(localStorage.getItem(chatId) || "[]");

        // 确保每条消息都有 createdAt 属性
        let updated = false; // 标识是否更新了消息数组
        messages = messages.map(message => {
            if (!message.createdAt) {
                updated = true;
                return { ...message, createdAt: new Date().toISOString() };
            }
            return message;
        });

        if (updated) {
            // 如果有更新, 再次保存回LocalStorage
            this.saveMessages(chatId, messages);
        }

        // 根据 createdAt 排序，确保消息顺序
        messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        return messages;
    }

    updateMessageTimestamp(chatId, messageId, timestamp) {
        console.log("updateMessageTimestamp: ", messageId, timestamp);
        let messages = this.getMessages(chatId);

        const messageIndex = messages.findIndex(m => m.messageId === messageId);
        if (messageIndex >= 0) {
            messages[messageIndex].timestamp = timestamp;
            this.saveMessages(chatId, messages);
        } else {
            console.error(`Message with messageId: ${messageId} not found in chatId: ${chatId}`);
        }
    }

    removeMessagesByChatId(chatId) {
        localStorage.removeItem(chatId);
    }

    saveMessages(chatId, messages) {
        localStorage.setItem(chatId, JSON.stringify(messages));
    }


    // StorageManager.js

    getLocalStorageUsage() {
        let total = 0;
        for (let x in localStorage) {
            let amount = (localStorage[x].length * 2) / 1024 / 1024;
            // check if it's a number
            if (!isNaN(amount)) {
                total += amount;
            }
        }
        return total.toFixed(2); // 返回以MB为单位的总使用量
    }

    cleanUpUserChatHistories(username) {
        console.log("cleanUpUserChatHistories: ", username);
        let localStorageUsage = this.getLocalStorageUsage();
        console.log("localStorageUsage: ", localStorageUsage);
        let chatHistories = this.getChatHistory(username);
        console.log("chatHistories: ", chatHistories);

        // 过滤出已经同步的记录（即包含时间戳的记录）
        chatHistories = chatHistories.filter(history => history.timestamp);

        if (!chatHistories.length) {
        // 如果没有同步的记录，不再继续清理工作
            return;
        }
        // 按时间戳升序排序，确定最旧的记录
        chatHistories.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        // 确保LocalStorage使用低于安全水平，这里我们设定的是4.5MB的安全阈值，5MB为上限
        while (localStorageUsage > 4.5) {
        // 聊天记录已按时间戳排序，最旧的在前面
            for (let i = 0; i < chatHistories.length; i++) {
                const chatHistory = chatHistories[i];
                // 删除对应的消息
                let messages = this.getMessages(chatHistory.id);
                console.log("Before cleanUpUserChatHistories: ", chatHistory.id, messages.length);
                // 过滤出没有时间戳的消息
                messages = messages.filter(message => !message.timestamp); 
                this.saveMessages(chatHistory.id, messages); // 更新LocalStorage的消息记录
                console.log("After cleanUpUserChatHistories: ", chatHistory.id, messages.length);
                if (!messages.length) {
                // 如果删除所有消息后，这个聊天历史记录没有任何消息，则移除这个聊天的消息记录
                    localStorage.removeItem(chatHistory.id);
                }
            }
            localStorageUsage = this.getLocalStorageUsage();
            console.log("localStorageUsage: ", localStorageUsage);
        }
    }
}


export default StorageManager;

