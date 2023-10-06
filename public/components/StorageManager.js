// StorageManager.js
import { getCurrentUsername, getCurrentProfile, saveMessages, getMessages } from "../utils/storage.js";

class StorageManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
    }

    // save the current message content to local storage by username and profile name
    saveCurrentProfileMessages() {
        const messages = document.querySelectorAll(".message");
        const savedMessages = getMessages(getCurrentUsername(), getCurrentProfile().name);
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

        // Merge loaded messages with saved messages
        const updatedMessages = savedMessages.filter(savedMessage => {
            return !loadedMessages.find(loadedMessage => loadedMessage.messageId === savedMessage.messageId);
        }).concat(loadedMessages);

        saveMessages(getCurrentUsername(), getCurrentProfile().name, updatedMessages);
    }

    saveMessageActiveStatus(messageId, isActive) {
        const currentUsername = getCurrentUsername();
        const currentProfileName = getCurrentProfile().name;
        const savedMessages = getMessages(currentUsername, currentProfileName);

        const updatedMessages = savedMessages.map(savedMessage => {
            if (savedMessage.messageId === messageId) {
                // Update the isActive status of the message
                return { ...savedMessage, isActive: isActive };
            } else {
                return savedMessage;
            }
        });
        saveMessages(currentUsername, currentProfileName, updatedMessages);
    }

    deleteMessageFromStorage(messageId) {
        const currentUsername = getCurrentUsername();
        const currentProfileName = getCurrentProfile().name;
        const savedMessages = getMessages(currentUsername, currentProfileName);
        const updatedMessages = savedMessages.filter(savedMessage => savedMessage.messageId !== messageId);

        saveMessages(currentUsername, currentProfileName, updatedMessages);
    }
}

export default StorageManager;
