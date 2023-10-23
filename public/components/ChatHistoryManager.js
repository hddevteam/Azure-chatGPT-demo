import { getCurrentUsername, getMessages } from "../utils/storage.js";
import { generateTitle } from "../utils/api.js";
import { v4 as uuidv4 } from "uuid";

class ChatHistoryManager {
    constructor() {
        this.chatHistoryKeyPrefix = "chatHistory_";
    }

    // 生成唯一的chat ID
    generateChatId(username, profileName) {
        return `${username}_${profileName}_${uuidv4()}`;
    }

    // 获取聊天历史记录列表
    getChatHistory() {
        const username = getCurrentUsername();
        return JSON.parse(localStorage.getItem(this.chatHistoryKeyPrefix + username) || "[]");
    }

    // 保存聊天历史记录列表到本地存储
    saveChatHistory(chatHistory) {
        const username = getCurrentUsername();
        localStorage.setItem(this.chatHistoryKeyPrefix + username, JSON.stringify(chatHistory));
    }

    async generateChatHistory() {
        const username = getCurrentUsername();
    
        // 获取所有的localStorage keys
        const keys = Object.keys(localStorage);
    
        // 过滤出当前用户的聊天记录keys
        const chatKeys = keys.filter(key => key.startsWith(username + "_"));
    
        // 对于每一个聊天记录，生成一个聊天历史记录
        for (let key of chatKeys) {
            const profileName = key.split("_")[1];
            await this.createChatHistory(profileName, key);
        }
    }
    
    // 创建新的聊天历史记录
    async createChatHistory(profileName, chatId) {
        const username = getCurrentUsername();
        chatId = chatId || this.generateChatId(username, profileName);
        const messages = getMessages(username, profileName);
        if (!messages.length) return;
    
        const title = await generateTitle(messages[0].content);
        const chatHistory = this.getChatHistory();
    
        const newChatHistory = {
            id: chatId,
            title: title,
            profileName: profileName,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        chatHistory.unshift(newChatHistory);
    
        this.saveChatHistory(chatHistory);
    }
    

    // 更新聊天历史记录
    updateChatHistory(chatId, title, updatedAt) {
        const chatHistory = this.getChatHistory();
        const chatHistoryToUpdate = chatHistory.find(history => history.id === chatId);
        if (chatHistoryToUpdate) {
            chatHistoryToUpdate.title = title;
            chatHistoryToUpdate.updatedAt = updatedAt;
            this.saveChatHistory(chatHistory);
        }
    }

    // 删除聊天历史记录
    deleteChatHistory(chatId) {
        const chatHistory = this.getChatHistory();
        const updatedChatHistory = chatHistory.filter(history => history.id !== chatId);
        this.saveChatHistory(updatedChatHistory);
    }
}

export default ChatHistoryManager;
