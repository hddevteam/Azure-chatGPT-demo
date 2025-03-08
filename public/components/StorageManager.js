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
        console.debug("readChatHistory for chatId:", chatId, "username:", username);
        const histories = this.getChatHistory(username);
        console.debug("All chat histories for user:", histories);
        const history = histories.find(history => history.id === chatId);
        console.debug("Found chat history:", history);
        return history;
    }

    updateChatHistory(chatHistoryItem) {
        console.log("updateChatHistory: ", chatHistoryItem);
        const username = this.getCurrentUsername();
        let localHistories = this.getChatHistory(username);
        const historyIndex = localHistories.findIndex(h => h.id === chatHistoryItem.id);
        console.log("updateChatHistory: ", historyIndex);

        // 如果历史记录被标记为删除，从本地存储中移除
        if (chatHistoryItem.isDeleted) {
            localHistories = localHistories.filter(history => history.id !== chatHistoryItem.id);
            // 同时清理相关的消息数据
            this.removeMessagesByChatId(chatHistoryItem.id);
            this.cleanupChatData(chatHistoryItem.id);
        } else if (historyIndex !== -1) {
            // To keep the same behavior as updateChatHistory, merge the properties
            localHistories[historyIndex] = {
                ...localHistories[historyIndex],
                ...chatHistoryItem
            };
            console.log("updateChatHistory: ", localHistories[historyIndex]);
        } else {
            // 如果不存在且未被标记为删除，则添加新记录
            localHistories.push(chatHistoryItem);
        }
        
        this.saveChatHistory(username, localHistories);
        return chatHistoryItem.isDeleted ? null : (historyIndex !== -1 ? localHistories[historyIndex] : chatHistoryItem);
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
        if (!profile) return;
        
        console.log("setCurrentProfile: ", profile);
        
        // Always update the profile to ensure all properties (including tts) are saved
        this.currentUserData.currentProfile = {...profile};
        
        // Update system prompt if available
        if (profile.prompt && this.uiManager.app.prompts) {
            this.uiManager.app.prompts.setSystemPrompt(profile.prompt);
        }
        
        // Make sure we configure Text to Speech display
        this.updateTtsVisibility();
        
        // Save the updated profile data to local storage
        this.saveCurrentUserData();
    }
    
    updateTtsVisibility() {
        const ttsContainer = document.querySelector("#tts-container");
        if (!ttsContainer) return;
        
        const currentProfile = this.getCurrentProfile();
        if (currentProfile && currentProfile.tts === "enabled") {
            ttsContainer.style.display = "inline-block";
        } else {
            ttsContainer.style.display = "none";
        }
    }
    
    getCurrentUsername() {
        return this.currentUserData.username;
    }
    
    getCurrentProfile() {
        const cachedProfile = this.currentUserData.currentProfile;
        
        // We don't do the full validation here since this method can be called before profiles are loaded
        // Instead, we just return the cached profile, and validation will be done by UIManager's ensureValidProfile method
        return cachedProfile;
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
        try {
            console.log(`Deleting message ${messageId} from chat ${chatId}`);
            const savedMessages = this.getMessages(chatId);
            const updatedMessages = savedMessages.filter(savedMessage => savedMessage.messageId !== messageId);
            
            // 保存更新后的消息列表
            this.saveMessages(chatId, updatedMessages);
            
            // 如果删除后没有消息了，可以考虑清理其他相关数据
            if (updatedMessages.length === 0) {
                this.cleanupChatData(chatId);
            }
            
            console.log(`Message ${messageId} deleted successfully`);
            return true;
        } catch (error) {
            console.error(`Failed to delete message ${messageId}:`, error);
            return false;
        }
    }

    // create or update a message
    saveMessage(chatId, message) {
        let messages = this.getMessages(chatId);
        const existingMessage = messages.find(m => m.messageId === message.messageId);
        
        // 处理搜索结果，确保它们是可序列化的
        let processedSearchResults = null;
        if (message.searchResults) {
            try {
                processedSearchResults = message.searchResults.map(result => ({
                    title: result.title || "",
                    url: result.url || "",
                    snippet: result.snippet || "",
                    date: result.date ? new Date(result.date).toISOString() : null,
                    type: result.type || "webpage",
                    provider: result.provider || (result.url ? new URL(result.url).hostname : "unknown")
                }));
            } catch (e) {
                console.warn("Failed to process search results while saving:", e);
                processedSearchResults = [];
            }
        }

        const now = new Date().toISOString();
        const messageToSave = {
            ...message,
            createdAt: existingMessage?.createdAt || message.createdAt || now,
            timestamp: existingMessage?.timestamp || message.timestamp || null,
            lastUpdated: now,
            searchResults: processedSearchResults || message.searchResults || null,
            isActive: message.isActive ?? existingMessage?.isActive ?? true
        };

        if (existingMessage) {
            messages = messages.map(m => 
                m.messageId === message.messageId ? messageToSave : m
            );
        } else {
            messages.push(messageToSave);
        }

        this.saveMessages(chatId, messages);
        return messageToSave;
    }

    // 获取消息列表时不再自动设置timestamp
    getMessages(chatId) {
        const key = `messages_${chatId}`;
        const messages = JSON.parse(localStorage.getItem(key) || "[]");
        
        // 确保所有消息都有必要的属性并且搜索结果格式正确
        messages.forEach(message => {
            if (!message.createdAt) {
                message.createdAt = message.timestamp || new Date().toISOString();
            }

            // 确保搜索结果的完整性和一致性
            if (message.searchResults) {
                try {
                    message.searchResults = Array.isArray(message.searchResults) ? 
                        message.searchResults.map(result => ({
                            ...result,
                            date: result.date ? new Date(result.date).toISOString() : null,
                            type: result.type || "webpage",
                            provider: result.provider ? result.provider : (result.url ? new URL(result.url).hostname : "unknown")
                        })) : [];
                } catch (e) {
                    console.warn("Failed to process search results for message:", message.messageId, e);
                    message.searchResults = [];
                }
            }
        });

        // 按创建时间排序
        messages.sort((a, b) => {
            const aTime = new Date(a.createdAt);
            const bTime = new Date(b.createdAt);
            if (aTime.getTime() === bTime.getTime()) {
                return new Date(a.timestamp || a.createdAt) - new Date(b.timestamp || b.createdAt);
            }
            return aTime - bTime;
        });
        
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
        
        // 如果存储空间小于阈值，不需要清理
        if (localStorageUsage <= 4.5) {
            console.log("cleanUpUserChatHistories: LocalStorage usage is below 4.5MB, no cleanup needed.");
            return;
        }

        let chatHistories = this.getChatHistory(username);
        if (!chatHistories.length) {
            return;
        }

        // 按时间戳排序，优先清理旧的聊天记录
        chatHistories.sort((a, b) => {
            const aTime = new Date(a.timestamp || a.updatedAt || 0);
            const bTime = new Date(b.timestamp || b.updatedAt || 0);
            return aTime - bTime;
        });

        for (let i = 0; i < chatHistories.length && localStorageUsage > 4.5; i++) {
            const historyId = chatHistories[i].id;
            const messagesKey = `messages_${historyId}`;
            
            // 只处理确实存在的聊天记录
            if (localStorage.getItem(messagesKey)) {
                const historySize = localStorage[messagesKey].length * 2 / 1024 / 1024;
                // 只保留没有时间戳的消息（未同步的消息）
                let messages = this.getMessages(historyId).filter(message => !message.timestamp);
                
                // 保存过滤后的消息
                this.saveMessages(historyId, messages);
                
                // 更新存储使用量
                if (messages.length === 0) {
                    localStorage.removeItem(messagesKey);
                    localStorageUsage -= historySize;
                } else {
                    const newSize = localStorage[messagesKey].length * 2 / 1024 / 1024;
                    localStorageUsage -= (historySize - newSize);
                }
                
                console.log(`Cleaned up chat history ${historyId}, new storage usage: ${localStorageUsage.toFixed(2)}MB`);
            }
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

    cleanupChatData(chatId) {
        try {
            console.log(`Cleaning up data for chat ${chatId}`);
            // 清除此聊天相关的其他数据，比如搜索结果缓存等
            const cleanupKeys = [
                `messages_${chatId}`,
                `searchResults_${chatId}`,
                `metadata_${chatId}`
            ];
            
            cleanupKeys.forEach(key => {
                if (localStorage.getItem(key)) {
                    localStorage.removeItem(key);
                    console.log(`Cleaned up ${key}`);
                }
            });
            
            console.log(`Cleanup completed for chat ${chatId}`);
        } catch (error) {
            console.error(`Failed to cleanup chat data for ${chatId}:`, error);
        }
    }
}


export default StorageManager;

