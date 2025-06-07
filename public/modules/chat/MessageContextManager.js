// MessageContextManager.js
// Responsible for managing chat message context, ensuring proper recovery after page refresh

class MessageContextManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
    }

    /**
     * Initialize chat context, including setting system prompts and restoring active messages
     * @param {Object} profile - Configuration profile containing system prompts
     * @param {Array} messages - Array of messages
     */
    initializeContext(profile, messages) {
        // Clear existing prompts
        this.uiManager.app.prompts.clear();

        // Set system prompt
        if (profile?.prompt) {
            this.uiManager.app.prompts.setSystemPrompt(profile.prompt);
        }

        // Restore active messages
        if (messages && messages.length > 0) {
            this.restoreActiveMessages(messages);
        }
    }

    /**
     * Restore active messages to context
     * @param {Array} messages - Array of messages
     */
    restoreActiveMessages(messages) {
        // Sort messages by time order first
        const sortedMessages = [...messages].sort((a, b) => {
            const aTime = new Date(a.createdAt || a.timestamp || 0);
            const bTime = new Date(b.createdAt || b.timestamp || 0);
            return aTime - bTime;
        });

        // Add active messages to prompt context
        sortedMessages.forEach(message => {
            if (message.isActive) {
                // Build complete message object, ensuring search results are included
                const promptMessage = {
                    role: message.role,
                    content: message.content,
                    messageId: message.messageId,
                    attachmentUrls: message.attachmentUrls || "",
                    searchResults: message.searchResults || null
                };
                
                this.uiManager.app.prompts.addPrompt(promptMessage);
            }
        });

        console.log("Restored active messages to context:", 
            this.uiManager.app.prompts.length, 
            "messages");
    }

    /**
     * Add message to context
     * @param {Object} message - Message object
     */
    addMessageToContext(message) {
        if (message.isActive) {
            this.uiManager.app.prompts.addPrompt(message);
        }
    }

    /**
     * Remove message from context
     * @param {String} messageId - Message ID
     */
    removeMessageFromContext(messageId) {
        this.uiManager.app.prompts.removePrompt(messageId);
    }

    /**
     * Update message status in context
     * @param {String} messageId - Message ID
     * @param {Boolean} isActive - Whether active
     * @param {Object} message - Message object (optional)
     */
    updateMessageActiveState(messageId, isActive, message = null) {
        if (isActive) {
            // If message becomes active, add to context
            if (message) {
                this.addMessageToContext(message);
            } else {
                // Get message from storage
                const storedMessage = this.uiManager.storageManager.getMessage(
                    this.uiManager.currentChatId, messageId);
                if (storedMessage) {
                    this.addMessageToContext(storedMessage);
                }
            }
        } else {
            // If message becomes inactive, remove from context
            this.removeMessageFromContext(messageId);
        }
    }

    /**
     * Get the number of active messages in current context
     */
    getActiveMessagesCount() {
        return this.uiManager.app.prompts.length;
    }

    /**
     * Print current context state (for debugging)
     */
    logCurrentContext() {
        console.log("Current context:", this.uiManager.app.prompts);
    }
}

export default MessageContextManager;