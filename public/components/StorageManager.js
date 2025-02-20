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

    updateCurrentUserInfo(username) {
        if (username) {
            // Replace the _ character with - to prevent chatId parsing errors
            username = username.replace(/_/g, "-");
        }
        this.currentUserData.username = username || "";
        this.saveCurrentUserData();
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
        const message = savedMessages.find(m => m.messageId === messageId);
        if (!message) {
            console.debug(`Message ${messageId} not found in chat ${chatId}`); // 改为 debug 级别，因为这是预期的情况
            return null;
        }
        
        // 确保搜索结果中的日期是正确的日期对象字符串
        if (message.searchResults) {
            message.searchResults = message.searchResults.map(result => ({
                ...result,
                date: result.date ? new Date(result.date).toISOString() : null,
                type: result.type || "webpage",
                provider: result.provider || new URL(result.url).hostname
            }));
        }
        
        return message;
    }

    deleteMessage(chatId, messageId) {
        const savedMessages = this.getMessages(chatId);
        const updatedMessages = savedMessages.filter(savedMessage => savedMessage.messageId !== messageId);

        this.saveMessages(chatId, updatedMessages);
    }

    // create or update a message
    saveMessage(chatId, message) {
        let messages = this.getMessages(chatId);
        const existingMessage = messages.find(m => m.messageId === message.messageId);
        
        // 处理搜索结果，确保它们是可序列化的
        let processedSearchResults = null;
        if (message.searchResults) {
            processedSearchResults = message.searchResults.map(result => ({
                title: result.title || "",
                url: result.url || "",
                snippet: result.snippet || "",
                date: result.date ? new Date(result.date).toISOString() : null,
                type: result.type || "webpage",
                provider: result.provider || new URL(result.url).hostname
            }));
        }

        const now = new Date().toISOString();
        const messageToSave = {
            ...message,
            createdAt: existingMessage?.createdAt || now,
            timestamp: message.timestamp || existingMessage?.timestamp || now,
            lastUpdated: now,
            searchResults: processedSearchResults
        };

        if (existingMessage) {
            messages = messages.map(m => 
                m.messageId === message.messageId ? messageToSave : m
            );
        } else {
            messages.push(messageToSave);
        }

        // 确保按时间戳排序
        messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        this.saveMessages(chatId, messages);
        
        return messageToSave; // 返回保存的消息以便确认
    }

    // 更新 getMessages 方法，在确保所有消息都有 createdAt 属性并完成排序后保存回LocalStorage
    getMessages(chatId) {
        const key = `messages_${chatId}`;
        const messages = JSON.parse(localStorage.getItem(key) || "[]");
        
        // 确保所有消息都有必要的属性
        messages.forEach(message => {
            if (!message.createdAt) {
                message.createdAt = new Date().toISOString();
            }
            if (!message.timestamp) {
                message.timestamp = message.createdAt;
            }
            // 恢复搜索结果的完整性
            if (message.searchResults) {
                message.searchResults = message.searchResults.map(result => ({
                    ...result,
                    date: result.date ? new Date(result.date).toISOString() : null,
                    type: result.type || "webpage",
                    provider: result.provider || new URL(result.url).hostname
                }));
            }
        });

        // 按时间戳排序
        messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // 保存回 localStorage 以确保数据一致性
        localStorage.setItem(key, JSON.stringify(messages));
        
        return messages;
    }

    async updateMessageTimestamp(chatId, messageId, timestamp) {
        console.log("updateMessageTimestamp:", { chatId, messageId, timestamp });
        
        // 首先检查消息是否存在
        if (!this.messageExists(chatId, messageId)) {
            // 等待消息出现
            const messageAppeared = await this.waitForMessage(chatId, messageId);
            if (!messageAppeared) {
                console.warn(`Gave up waiting for message ${messageId} in chat ${chatId}`);
                return;
            }
        }

        let messages = this.getMessages(chatId);
        const messageIndex = messages.findIndex(m => m.messageId === messageId);
        
        if (messageIndex >= 0) {
            messages[messageIndex] = {
                ...messages[messageIndex],
                timestamp: timestamp,
                lastUpdated: new Date().toISOString()
            };
            this.saveMessages(chatId, messages);
            console.log(`Successfully updated timestamp for message ${messageId}`);
        } else {
            console.error(`Failed to update timestamp for message ${messageId} - not found after waiting`);
        }
    }

    removeMessagesByChatId(chatId) {
        localStorage.removeItem(chatId);
    }

    saveMessages(chatId, messages) {
        const key = `messages_${chatId}`;
        // 在保存之前确保所有消息都有必要的时间属性
        const processedMessages = messages.map(message => ({
            ...message,
            createdAt: message.createdAt || new Date().toISOString(),
            timestamp: message.timestamp || message.createdAt || new Date().toISOString()
        }));
        localStorage.setItem(key, JSON.stringify(processedMessages));
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

    messageExists(chatId, messageId) {
        const messages = this.getMessages(chatId);
        return messages.some(m => m.messageId === messageId);
    }

    waitForMessage(chatId, messageId, maxAttempts = 10, interval = 100) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            
            const checkMessage = () => {
                if (this.messageExists(chatId, messageId)) {
                    resolve(true);
                    return;
                }
                
                attempts++;
                if (attempts >= maxAttempts) {
                    console.warn(`Message ${messageId} not found in chat ${chatId} after ${maxAttempts} attempts`);
                    resolve(false);
                    return;
                }
                
                setTimeout(checkMessage, interval);
            };
            
            checkMessage();
        });
    }
}


export default StorageManager;

