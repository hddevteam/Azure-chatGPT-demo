//components/ChatHistoryManager.js
import { generateTitle } from "../utils/apiClient.js";
import { generateExcerpt } from "../utils/textUtils.js";
import { v4 as uuidv4 } from "uuid";

class ChatHistoryManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.chatHistoryKeyPrefix = "chatHistory_";
        this.subscribers = [];
    }

    subscribe(callback) {
        this.subscribers.push(callback);
    }

    notifySubscribers(action, chatHistoryItem) {
        this.subscribers.forEach(callback => callback(action, chatHistoryItem));
    }

    // 生成唯一的chat ID
    generateChatId(username, profileName) {
        return `${username}_${profileName}_${uuidv4()}`;
    }

    // Use these functions like this
    getChatHistory() {
        const username = this.uiManager.storageManager.getCurrentUsername();
        const chatHistory = this.uiManager.storageManager.getChatHistory(username);
        
        return chatHistory.sort((a, b) => {
            return new Date(b.updatedAt) - new Date(a.updatedAt);
        });
    }

    async generateChatHistory() {
        const username = this.uiManager.storageManager.getCurrentUsername();

        // 获取所有的localStorage keys
        const keys = Object.keys(localStorage);

        // 过滤出当前用户的聊天记录keys
        const chatKeys = keys.filter(key => key.startsWith(username + "_"));

        // 对于每一个聊天记录，生成一个聊天历史记录
        for (let key of chatKeys) {
            await this.createChatHistory(key);
        }
    }

    // 创建新的聊天历史记录
    async createChatHistory(data) {
        // Handle when data is passed as an object directly
        if (typeof data === "object") {
            const chatHistoryItem = {
                ...data,
                createdAt: data.createdAt || new Date().toISOString(),
                updatedAt: data.updatedAt || new Date().toISOString()
            };
            this.uiManager.storageManager.createChatHistory(chatHistoryItem);
            this.notifySubscribers("create", chatHistoryItem);
            return;
        }

        // Handle when data is a chatId string
        const chatId = data;
        const profileName = chatId.split("_")[1];
        const messages = this.uiManager.storageManager.getMessages(chatId);
        let title = "untitled";
        if (messages.length) {
            // 使用第一条消息生成标题
            title = await this.generateChatTitle(messages[0].content);
        }
        const newChatHistory = {
            id: chatId,
            title: title,
            profileName: profileName,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.uiManager.storageManager.createChatHistory(newChatHistory);
        this.notifySubscribers("create", newChatHistory);
    }

    // 更新聊天历史记录
    async updateChatHistory(chatId, forceGenerateTitle = false, title = "") {
        const chatHistory = this.getChatHistory();
        // Handle the case where chatId is an object (backward compatibility)
        const id = typeof chatId === "object" ? chatId.id : chatId;
        const chatHistoryToUpdate = chatHistory.find(history => history.id === id);
        
        if (!chatHistoryToUpdate) {
            console.error("Chat history not found:", id);
            return;
        }

        // 获取消息以生成标题
        const messages = this.uiManager.storageManager.getMessages(id);
        
        // 如果有消息存在
        if (messages && messages.length > 0) {
            // 如果提供了标题，直接使用
            if (title) {
                chatHistoryToUpdate.title = title;
            } 
            // 否则，在以下情况下生成标题：
            // 1. 强制生成标题
            // 2. 当前标题为默认值且消息数量足够
            else if (forceGenerateTitle || 
                    (chatHistoryToUpdate.title === "untitled" && messages.length >= 2)) {
                try {
                    // 生成对话上下文
                    const context = this.generateConversationContext(messages);
                    
                    // 使用生成的上下文获取标题
                    const generatedTitle = await this.generateChatTitle(context);
                    if (this.isValidTitle(generatedTitle)) {
                        chatHistoryToUpdate.title = generatedTitle.trim();
                    }
                } catch (error) {
                    console.error("Error generating title:", error);
                }
            }
        }

        // 更新时间戳
        chatHistoryToUpdate.updatedAt = new Date().toISOString();
        
        // 保存更新
        this.uiManager.storageManager.updateChatHistory(chatHistoryToUpdate);
        
        // 通知订阅者
        this.notifySubscribers("update", chatHistoryToUpdate);
    }

    // 删除聊天历史记录
    deleteChatHistory(chatId) {
        const chatHistoryToDelete = this.uiManager.storageManager.readChatHistory(chatId);
        this.uiManager.storageManager.deleteChatHistory(chatId);
        this.notifySubscribers("delete", chatHistoryToDelete);
    }

    // 辅助方法：生成对话上下文以优化标题生成
    generateConversationContext(messages) {
        // 获取关键的对话内容
        const keyMessages = this.selectKeyMessages(messages);
        
        // 将消息组合成上下文
        return keyMessages
            .map(msg => msg.content)
            .join("\n")
            .slice(0, 2000); // 限制长度以提高响应速度
    }

    // 辅助方法：选择关键消息用于生成标题
    selectKeyMessages(messages) {
        if (!messages || messages.length === 0) return [];

        // 如果消息数量小于等于3，使用所有消息
        if (messages.length <= 3) return messages;

        // 否则，选择第一条用户消息和第一条助手回复，以及最后一条有意义的消息
        const firstUserMsg = messages.find(m => m.role === "user");
        const firstAssistantMsg = messages.find(m => m.role === "assistant");
        const lastMeaningfulMsg = [...messages]
            .reverse()
            .find(m => m.content && m.content.trim().length > 30);

        return [firstUserMsg, firstAssistantMsg, lastMeaningfulMsg]
            .filter(Boolean) // 移除undefined
            .filter((msg, index, self) => 
                // 去重
                index === self.findIndex(m => m.messageId === msg.messageId)
            );
    }

    // 辅助方法：生成聊天标题
    async generateChatTitle(content) {
        try {
            const title = await generateTitle(content);
            return this.isValidTitle(title) ? title : "untitled";
        } catch (error) {
            console.error("Error in generateChatTitle:", error);
            return "untitled";
        }
    }

    // 辅助方法：验证标题是否有效
    isValidTitle(title) {
        return title && 
               title !== "undefined" && 
               title !== "null" &&
               title.trim() !== "" &&
               title !== "untitled";
    }
}

export default ChatHistoryManager;
