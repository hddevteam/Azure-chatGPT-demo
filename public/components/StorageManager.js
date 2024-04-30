// StorageManager.js

class StorageManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.currentUserData = JSON.parse(localStorage.getItem("currentUserData")) || { username: "guest", currentProfile: null, uiState: {} };
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
        console.log("setCurrentProfile: ", profile);
        this.currentUserData.currentProfile = profile;
        this.uiManager.setCurrentSystemPrompt(profile.prompt);
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

    getCurrentUserData() {
        return this.currentUserData;
    }
    
    getChatHistory(username) {
        return JSON.parse(localStorage.getItem(this.chatHistoryKeyPrefix + username) || "[]");
    }
    
    saveChatHistory(username, chatHistory) {
        localStorage.setItem(this.chatHistoryKeyPrefix + username, JSON.stringify(chatHistory));
    }
    
    saveMessageActiveStatus(chatId, messageId, isActive) {
        console.log("saveMessageActiveStatus: ", messageId, isActive);
        const savedMessages = this.getMessages(chatId);

        const updatedMessages = savedMessages.map(savedMessage => {
            if (savedMessage.messageId === messageId) {
                // 更新信息的isActive状态
                return { ...savedMessage, isActive: isActive };
            } else {
                return savedMessage;
            }
        });
        this.saveMessages(chatId, updatedMessages);
    }

    getMessage(chatId, messageId) {
        const savedMessages = this.getMessages(chatId);
        return savedMessages.find(savedMessage => savedMessage.messageId === messageId);
    }

    deleteMessage(chatId, messageId) {
        const savedMessages = this.getMessages(chatId);
        const updatedMessages = savedMessages.filter(savedMessage => savedMessage.messageId !== messageId);

        this.saveMessages(chatId, updatedMessages);
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

    // Optimized function to compute local storage usage
    getLocalStorageUsage() {
        let total = 0;
        Object.keys(localStorage).forEach(key => {
            let amount = localStorage[key].length * 2;
            // It's safe to assume localStorage contains strings, so no isNaN check needed
            total += amount;
        });
        // Convert the total size to MB outside the loop
        total = total / 1024 / 1024;
        return total.toFixed(2);
    }

    parseChatId(chatId) {
        const parts = chatId.split("_");
        if (parts.length !== 3) {
            throw new Error("Invalid chatId format. Expected format: username_profileName_uuid, but got: " + chatId);
        }
        const [username, profileName, uuid] = parts;
        if(!username.trim() || !profileName.trim() || !uuid.trim()) {
            console.log("Invalid chatId format: ", chatId);
            throw new Error("Invalid chatId format. All components must be non-empty.");
        }
        return { username, profileName, uuid };
    }


    cleanUpUserChatHistories(username) {
        console.log("cleanUpUserChatHistories: ", username);
        let localStorageUsage = parseFloat(this.getLocalStorageUsage());
        console.log("localStorageUsage: ", localStorageUsage);
        let chatHistories = this.getChatHistory(username);
        // console.log("chatHistories: ", chatHistories);

        if (!chatHistories.length) {
            return;
        }

        // 准备一个容器存放要被删除的聊天记录ID
        let chatIdsToDelete = [];

        // 筛选出有效的聊天记录，并记录下来无效记录的ID
        chatHistories = chatHistories.filter(history => {
            try {
                const { profileName } = this.parseChatId(history.id);
                if (profileName.trim() === "") {
                    chatIdsToDelete.push(history.id); // 记录下来需要删除的聊天ID
                    return false; // 对于profileName为空的聊天记录进行过滤
                }
                return true;
            } catch (error) {
                console.error("Error parsing chatId: ", error.message);
                chatIdsToDelete.push(history.id);   
                return false; // 解析出错的记录也标记为无效
            }
        });

        // 遍历需要删除的聊天记录ID并从localStorage中移除
        chatIdsToDelete.forEach(chatId => {
            console.log(`Removing chat history and messages for chatId: ${chatId}`);
            this.deleteChatHistory(chatId); // 删除整个聊天历史记录
            this.removeMessagesByChatId(chatId); // 删除相关的消息记录
        });


        chatHistories = chatHistories.filter(history => history.timestamp);
        // Sort by timestamp, assumed to be a number for efficiency
        chatHistories.sort((a, b) => a.timestamp - b.timestamp);

        for (let i = 0; i < chatHistories.length && localStorageUsage > 4.5; i++) {
            const historyId = chatHistories[i].id;
            // Check if the history exists in localStorage
            if(localStorage.getItem(historyId)) {
                let historySize = localStorage[historyId].length * 2 / 1024 / 1024;
                let messages = this.getMessages(historyId).filter(message => !message.timestamp);
                this.saveMessages(historyId, messages);
        
                // It's prudent to recheck here if the item still exists after saveMessages operation
                if(localStorage.getItem(historyId)) {
                    const remainedSize = localStorage[historyId].length * 2 / 1024 / 1024;
                    const removedSize = historySize - remainedSize;
                    localStorageUsage -= removedSize; 
                } else {
                    // The item doesn't exist anymore, so assume its size is now 0
                    localStorageUsage -= historySize;
                }
        
                if (!messages.length) {
                    // Now we are certain that historyId exists before trying to remove it
                    localStorage.removeItem(historyId);
                }
        
                console.log(`localStorageUsage after cleanup of ${historyId}: `, localStorageUsage);
            } else {
                console.warn(`History with id ${historyId} does not exist in localStorage.`);
            }
        }
        
        if (localStorageUsage < 4.5) {
            console.log("cleanUpUserChatHistories: LocalStorage usage is below 4.5MB, cleanup done.");
        }
        
    }
}


export default StorageManager;

