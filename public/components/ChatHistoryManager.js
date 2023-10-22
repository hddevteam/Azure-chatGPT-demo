import { getCurrentUsername, getMessages } from "../utils/storage.js";
import { generateTitle } from "../utils/api.js";

class ChatHistoryManager {
    constructor() {
        this.chatHistoryKeyPrefix = "chatHistory_";
        const username = getCurrentUsername();
        if (!localStorage.getItem(this.chatHistoryKeyPrefix + username)) {
            this.generateChatHistory();
        }
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

    // 为新的聊天记录添加聊天历史记录
    async addChatHistory(profileName) {
        const username = getCurrentUsername();
        const messages = getMessages(username, profileName);
        if (!messages.length) return;

        const title = await generateTitle(messages[0].content);
        const chatHistory = this.getChatHistory();

        // 如果这个聊天记录已经在历史记录列表中，那么就更新它
        const existingChatHistory = chatHistory.find(history => history.profileName === profileName);
        if (existingChatHistory) {
            existingChatHistory.title = title;
            existingChatHistory.updatedAt = new Date().toISOString();
        } else {
            // 否则，创建一个新的历史记录，并添加到列表中
            const newChatHistory = {
                title: title,
                profileName: profileName,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            chatHistory.unshift(newChatHistory);
        }

        this.saveChatHistory(chatHistory);
    }

    // 在初始化时，生成聊天历史记录列表
    async generateChatHistory() {
        const username = getCurrentUsername();

        // 获取所有的localStorage keys
        const keys = Object.keys(localStorage);

        // 过滤出当前用户的聊天记录keys
        const chatKeys = keys.filter(key => key.startsWith(username + "_"));

        // 对于每一个聊天记录，生成一个聊天历史记录
        for (let key of chatKeys) {
            const profileName = key.split("_")[1];
            await this.addChatHistory(profileName);
        }
    }
}

export default ChatHistoryManager;
