//components/ChatHistoryManager.js
import { generateTitle } from "../utils/api.js";
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
    async createChatHistory(chatId) {
        const profileName = chatId.split("_")[1];
        const messages = this.uiManager.storageManager.getMessages(chatId);
        let title = "untitled";
        if (messages.length) {
            title = await generateTitle(messages[0].content);
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
        const chatHistoryToUpdate = chatHistory.find(history => history.id === chatId);
        const messages = this.uiManager.storageManager.getMessages(chatId);
    
        if (!messages.length) return;
    
        // 合并所有消息，并用换行符隔开
        const combinedMessages = messages.map(msg => msg.content).join("\n");
    
        if (chatHistoryToUpdate) {
            if (title) {
                chatHistoryToUpdate.title = title;
            }
            // 如果forceGenerateTitle为true，或者标题为"untitled"并且合并后的消息长度不小于50字符
            if (forceGenerateTitle || ((chatHistoryToUpdate.title === "untitled" || chatHistoryToUpdate.title==="") && combinedMessages.length >= 50)) {
                // 假设generateExcerpt函数可以处理较长文本并生成合适的摘要
                const titleExcerpt = generateExcerpt(combinedMessages, 1000, 500, 1000);
                const generatedTitle = await generateTitle(titleExcerpt);
                chatHistoryToUpdate.title = generatedTitle;
            }
            chatHistoryToUpdate.updatedAt = new Date().toISOString();
            this.uiManager.storageManager.updateChatHistory(chatHistoryToUpdate);
            this.notifySubscribers("update", chatHistoryToUpdate);
        } else {
            await this.createChatHistory(chatId);
        }
    }
    

    // 删除聊天历史记录
    deleteChatHistory(chatId) {
        const chatHistoryToDelete = this.uiManager.storageManager.readChatHistory(chatId);
        this.uiManager.storageManager.deleteChatHistory(chatId);
        this.notifySubscribers("delete", chatHistoryToDelete);
    }

}

export default ChatHistoryManager;
