// StorageManager.js
import { saveMessages, getMessages } from "../utils/storage.js";

class StorageManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
    }

    // 保存当前聊天的信息到本地存储
    saveCurrentProfileMessages() {
        const messages = document.querySelectorAll(".message");
        const savedMessages = getMessages(this.uiManager.currentChatId);
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

        saveMessages(this.uiManager.currentChatId, updatedMessages);
    }

    saveMessageActiveStatus(messageId, isActive) {
        const savedMessages = getMessages(this.uiManager.currentChatId);

        const updatedMessages = savedMessages.map(savedMessage => {
            if (savedMessage.messageId === messageId) {
                // 更新信息的isActive状态
                return { ...savedMessage, isActive: isActive };
            } else {
                return savedMessage;
            }
        });
        saveMessages(this.uiManager.currentChatId, updatedMessages);
    }

    deleteMessageFromStorage(messageId) {
        const savedMessages = getMessages(this.uiManager.currentChatId);
        const updatedMessages = savedMessages.filter(savedMessage => savedMessage.messageId !== messageId);

        saveMessages(this.uiManager.currentChatId, updatedMessages);
    }
}

export default StorageManager;

