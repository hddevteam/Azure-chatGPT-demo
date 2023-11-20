//components/ChatHistoryManager.js
import { generateTitle } from "../utils/api.js";
import { v4 as uuidv4 } from "uuid";
import StorageManager from "./StorageManager.js";



class ChatHistoryManager {
    constructor() {
        this.storageManager = new StorageManager(this);
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
    async getChatHistory() {
        const username = this.storageManager.getCurrentUsername();
        const chatHistory = await this.storageManager.getChatHistory(username);
        
        return chatHistory.sort((a, b) => {
            return new Date(b.updatedAt) - new Date(a.updatedAt);
        });
    }    

    saveChatHistory(chatHistory) {
        const username = this.storageManager.getCurrentUsername();
        this.storageManager.saveChatHistory(username, chatHistory);
    }

    async generateChatHistory() {
        const username = this.storageManager.getCurrentUsername();

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
    async createChatHistory(chatId) {
        const profileName = chatId.split("_")[1];
        const messages = this.storageManager.getMessages(chatId);
        let title = "untitled";
        if (messages.length) {
            title = await generateTitle(messages[0].content);
        }

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
        this.notifySubscribers("create", newChatHistory);
    }


    // 更新聊天历史记录
    async updateChatHistory(chatId, forceGenerateTitle=false, title="") {
        const chatHistory = this.getChatHistory();
        const chatHistoryToUpdate = chatHistory.find(history => history.id === chatId);
        const messages = this.storageManager.getMessages(chatId);
        if (!messages.length) return;
        if (chatHistoryToUpdate) {
            if (title) chatHistoryToUpdate.title = title;
            if ((messages.length === 1) || forceGenerateTitle) {
                title = await generateTitle(messages[0].content.length>5000?messages[0].content.slice(0,5000)+"...":messages[0].content);
                chatHistoryToUpdate.title = title;
            }
            chatHistoryToUpdate.updatedAt = new Date().toISOString();
            this.saveChatHistory(chatHistory);
            this.notifySubscribers("update", chatHistoryToUpdate);
        } else {
            await this.createChatHistory(chatId);
        }
    }

    // 删除聊天历史记录
    deleteChatHistory(chatId) {
        const chatHistoryToDelete = this.getChatHistory().find(history => history.id === chatId);
        const chatHistory = this.getChatHistory();
        const updatedChatHistory = chatHistory.filter(history => history.id !== chatId);
        this.saveChatHistory(updatedChatHistory);
        this.notifySubscribers("delete", chatHistoryToDelete);
    }


}

export default ChatHistoryManager;
