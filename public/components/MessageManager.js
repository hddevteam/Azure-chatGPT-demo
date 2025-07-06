// components/MessageManager.js - Updated to use modular architecture
import swal from "sweetalert";
import LinkHandler from "../utils/linkHandler.js";
import DocumentManager from "./DocumentManager.js";
// Import from new modules
import MessageUIHandler from "../modules/message/MessageUIHandler.js";
import FollowUpQuestionHandler from "../modules/message/FollowUpQuestionHandler.js";
import MessageProcessorFactory from "../modules/message/MessageProcessorFactory.js";
import { generateTitle } from "../utils/apiClient.js";

class MessageManager {
    constructor(uiManager) {
        // Initialize basic dependencies
        this.uiManager = uiManager;
        this.linkHandler = new LinkHandler(uiManager);
        this.documentManager = new DocumentManager(uiManager);
        
        // Initialize state
        this.searchResults = null;
        this.webSearchEnabled = false;
        this.isDeleting = false;
        
        // Initialize associated handlers
        this.uiHandler = new MessageUIHandler(this);
        this.followUpHandler = new FollowUpQuestionHandler(this);
        this.processorFactory = new MessageProcessorFactory(this);
    }

    // Toggle web search function
    toggleWebSearch() {
        this.webSearchEnabled = !this.webSearchEnabled;
        const button = document.getElementById("web-search-toggle");
        button.classList.toggle("active", this.webSearchEnabled);
    }

    // Modify addMessage method, remove chain of thought processing
    async addMessage(sender, message, messageId, isActive = true, position = "bottom", isError = false, attachmentUrls = "") {
        return this.uiHandler.addMessage(sender, message, messageId, isActive, position, isError, attachmentUrls);
    }

    // Main method for sending messages
    async sendMessage(inputMessage = "", attachments = [], isRetry = false) {
        console.log("[MessageManager] Processing message:", { 
            inputMessage: inputMessage.substring(0, 100) + "...", 
            attachmentsCount: attachments.length, 
            isRetry 
        });
        
        // Clear follow-up questions
        this.followUpHandler.clearFollowUpQuestions();
        
        // Initialize submit button state
        this.uiManager.initSubmitButtonProcessing();

        try {
            // Select appropriate message processor
            const processor = this.processorFactory.getProcessor(inputMessage, attachments);
            
            // Process message
            await processor.process(inputMessage, attachments);
            
            // Complete processing
            this.uiManager.finishSubmitProcessing();
            
            // Generate follow-up questions
            await this.followUpHandler.generateAndShowFollowUpQuestions();
            
        } catch (error) {
            console.error("Error in sendMessage:", error);
            this.uiManager.finishSubmitProcessing();
            
            // Handle network error retry
            if (!isRetry && error.message === "Failed to fetch") {
                await this.retryMessage(inputMessage, attachments);
            } else {
                // Show error message
                let errorMessage = error.message;
                if (!navigator.onLine) {
                    errorMessage = "You are currently offline, please check your network connection.";
                }
                swal("Request Error", errorMessage, { icon: "error" });
            }
        }
    }

    // Message input validation
    async validateInput(message, attachments = [], isRetry = false) {
        const validationResult = await this.uiManager.validateMessage(message);
        message = validationResult.message;
        let reEdit = validationResult.reEdit;
        let attachmentUrls = "";

        if (attachments.length > 0 && !isRetry) {
            attachmentUrls = await this.uiManager.uploadAttachments(attachments);
            if (attachmentUrls === "") {
                this.uiManager.finishSubmitProcessing();
                return false;
            }
        }

        if (reEdit) {
            this.uiManager.messageInput.value = message;
            this.uiManager.messageInput.focus();
            this.uiManager.finishSubmitProcessing();
            return false;
        }

        const timestamp = new Date().toISOString();
        const messageId = this.uiManager.generateId();
        const newMessage = { 
            role: "user", 
            content: message, 
            messageId: messageId, 
            isActive: true, 
            attachmentUrls: attachmentUrls,
            timestamp: timestamp,
            createdAt: timestamp
        };

        // Add user message to interface
        this.addMessage(
            newMessage.role,
            newMessage.content,
            newMessage.messageId,
            newMessage.isActive,
            "bottom",
            false,
            newMessage.attachmentUrls
        );

        // Save to storage and sync
        this.uiManager.app.prompts.addPrompt(newMessage);
        this.uiManager.storageManager.saveMessage(this.uiManager.currentChatId, newMessage);
        this.uiManager.syncManager.syncMessageCreate(this.uiManager.currentChatId, newMessage);
        this.uiManager.chatHistoryManager.updateChatHistory(this.uiManager.currentChatId);

        validationResult.attachmentUrls = attachmentUrls;
        return validationResult;
    }

    // Retry message
    async retryMessage(messageId) {
        const messageElem = document.querySelector(`[data-message-id="${messageId}"]`);
        if (!messageElem) {
            console.error("Message element not found:", messageId);
            return;
        }

        try {
            // Extract original message data
            const originalMessage = this.extractMessageData(messageElem);
            console.log("Retrying message:", originalMessage);

            // Determine if this is the last message and handle accordingly
            const lastMessageId = this.getLastMessageId();
            if (messageId === lastMessageId) {
                await this.deleteMessageInStorage(messageId);
            } else {
                this.inactiveMessage(messageId);
            }

            // Prepare attachment data (if any)
            let attachments = [];
            if (originalMessage.attachmentUrls) {
                attachments = originalMessage.attachmentUrls.split(";")
                    .filter(url => url.trim())
                    .map(url => ({
                        fileName: url,
                        isExistingAttachment: true
                    }));
            }

            // Resend message
            await this.sendMessage(originalMessage.content, attachments, true);

        } catch (error) {
            console.error("Error retrying message:", error);
            swal("Error", "Message retry failed: " + error.message, "error");
        }
    }

    // Get the last message ID
    getLastMessageId() {
        const messages = document.querySelectorAll(".message");
        return messages.length > 0 ? messages[messages.length - 1].dataset.messageId : null;
    }

    // Extract message data from DOM element
    extractMessageData(messageElem) {
        return {
            role: messageElem.dataset.sender,
            content: messageElem.dataset.message,
            attachmentUrls: messageElem.dataset.attachmentUrls || "",
            searchResults: this.searchResults
        };
    }

    // Mark message as inactive
    inactiveMessage(messageId) {
        this.uiHandler.inactiveMessage(messageId);
    }

    // Edit message
    editMessage(message, messageId) {
        this.inactiveMessage(messageId);
        
        // Mark subsequent messages as inactive too
        const messages = document.querySelectorAll(".message");
        let isFollowing = false;
        for (let i = 0; i < messages.length; i++) {
            if (messages[i].dataset.messageId === messageId) {
                isFollowing = true;
            }
            if (isFollowing) {
                const msgId = messages[i].dataset.messageId;
                this.inactiveMessage(msgId);
            }
        }

        // Fill message into input box
        this.uiManager.messageInput.value = message;
        this.uiManager.messageInput.focus();
    }

    // Delete message
    deleteMessage(messageId, isMute = false) {
        this.uiHandler.deleteMessage(messageId, isMute);
    }

    // Delete message from storage
    async deleteMessageInStorage(messageId) {
        try {
            this.isDeleting = true;
            
            // Remove message from DOM
            const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
            if (messageElement) {
                messageElement.remove();
            }
            
            // Remove from prompt array
            this.uiManager.app.prompts.removePrompt(messageId);
            
            // Sync delete with cloud storage and remove from local storage
            await this.uiManager.syncManager.syncMessageDelete(this.uiManager.currentChatId, messageId);
            
            // Check if all messages were deleted
            const remainingMessages = document.querySelectorAll(".message");
            if (remainingMessages.length === 0) {
                this.uiManager.showWelcomeMessage();
            }
        } catch (error) {
            console.error("Failed to delete message:", error);
            swal("Failed to delete message", error.message, "error");
        } finally {
            this.isDeleting = false;
        }
    }

    // Delete all active messages
    deleteActiveMessages() {
        const activeMessages = document.querySelectorAll(".message.active");
        for (let i = activeMessages.length - 1; i >= 0; i--) {
            const message = activeMessages[i];
            this.deleteMessage(message.dataset.messageId, true);
        }
    }

    // Delete all inactive messages
    deleteInactiveMessages() {
        const inactiveMessages = document.querySelectorAll(".message:not(.active)");
        for (let i = inactiveMessages.length - 1; i >= 0; i--) {
            const message = inactiveMessages[i];
            this.deleteMessage(message.dataset.messageId, true);
        }
    }

    // Delete all messages
    deleteAllMessages() {
        const allMessages = document.querySelectorAll(".message");
        for (let i = allMessages.length - 1; i >= 0; i--) {
            const message = allMessages[i];
            this.deleteMessage(message.dataset.messageId, true);
        }
    }

    // Load more messages
    loadMoreMessages() {
        if (this.isDeleting) {
            return;
        }

        const messagesContainer = document.querySelector("#messages");
        const savedMessages = this.uiManager.storageManager.getMessages(this.uiManager.currentChatId);
        const currentMessagesCount = messagesContainer.children.length;
        const messageLimit = this.uiManager.messageLimit;
        const startingIndex = savedMessages.length - currentMessagesCount - messageLimit > 0 ? 
            savedMessages.length - currentMessagesCount - messageLimit : 0;
        
        // Record current scroll position
        const currentScrollPosition = messagesContainer.scrollHeight - messagesContainer.scrollTop;

        // Get current message ID list
        const currentMessageIds = Array.from(messagesContainer.children).map(message => message.dataset.messageId);

        // Load more messages
        savedMessages.slice(startingIndex, savedMessages.length - currentMessagesCount)
            .reverse()
            .forEach(message => {
            // Check if message already exists
                if (!currentMessageIds.includes(message.messageId)) {
                    let isActive = message.isActive || false;
                    this.addMessage(message.role, message.content, message.messageId, isActive, "top", false, message.attachmentUrls);
                }
            });

        // Restore scroll position
        messagesContainer.scrollTop = messagesContainer.scrollHeight - currentScrollPosition;
    }

    // Toggle message collapse state
    toggleCollapseMessage(messageElement, forceCollapse) {
        this.uiHandler.toggleCollapseMessage(messageElement, forceCollapse);
    }

    // Add proxy method to forward calls to followUpHandler
    clearFollowUpQuestions() {
        this.followUpHandler.clearFollowUpQuestions();
    }

    // Load messages for a specific chat
    async loadMessages(chatId) {
        const messagesContainer = document.querySelector("#messages");
        const savedMessages = this.uiManager.storageManager.getMessages(chatId);
        
        // Clear existing messages
        messagesContainer.innerHTML = "";

        // Load the most recent messages up to the limit
        const startIndex = Math.max(0, savedMessages.length - this.uiManager.messageLimit);
        savedMessages.slice(startIndex)
            .forEach(message => {
                let isActive = message.isActive || false;
                this.addMessage(
                    message.role,
                    message.content,
                    message.messageId,
                    isActive,
                    "bottom",
                    false,
                    message.attachmentUrls
                );
            });

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Move message and all subsequent messages to a new topic
    async moveToNewTopic(messageId) {
        try {
            const currentChatId = this.uiManager.currentChatId;
            const currentProfile = this.uiManager.storageManager.getCurrentProfile();
            
            if (!currentProfile) {
                swal("Error", "No active profile found", "error");
                return;
            }

            // Get all messages from current chat
            const allMessages = this.uiManager.storageManager.getMessages(currentChatId);
            
            // Find the index of the target message
            const messageIndex = allMessages.findIndex(msg => msg.messageId === messageId);
            
            if (messageIndex === -1) {
                swal("Error", "Message not found", "error");
                return;
            }

            // Get messages from the target message onwards
            const messagesToMove = allMessages.slice(messageIndex);
            
            if (messagesToMove.length === 0) {
                swal("Info", "No messages to move", "info");
                return;
            }

            // Show confirmation dialog
            const result = await swal({
                title: "Move to new topic?",
                text: `This will move ${messagesToMove.length} message(s) to a new chat topic. Continue?`,
                icon: "warning",
                buttons: {
                    cancel: "Cancel",
                    confirm: "Move"
                }
            });

            if (!result) return;

            // Generate new chat ID
            const newChatId = this.uiManager.chatHistoryManager.generateChatId(
                this.uiManager.storageManager.getCurrentUsername(), 
                currentProfile.name
            );

            // Create new chat history entry
            const newChatHistory = {
                id: newChatId,
                title: "untitled",
                profileName: currentProfile.name,
                timestamp: Date.now(),
                updatedAt: new Date().toISOString()
            };

            // Create the new chat history
            this.uiManager.chatHistoryManager.createChatHistory(newChatHistory);

            // Move messages to new chat
            for (const message of messagesToMove) {
                // Update message chat ID
                const updatedMessage = { ...message, chatId: newChatId };
                
                // Save to new chat
                this.uiManager.storageManager.saveMessage(newChatId, updatedMessage);
                
                // Remove from old chat
                this.uiManager.storageManager.deleteMessage(currentChatId, message.messageId);
            }

            // Remove moved messages from current chat context
            for (const message of messagesToMove) {
                this.uiManager.messageContextManager.removeMessageFromContext(message.messageId);
            }

            // Update the current chat's updatedAt timestamp
            const currentChatHistory = this.uiManager.chatHistoryManager.getChatHistory().find(
                chat => chat.id === currentChatId
            );
            if (currentChatHistory) {
                await this.uiManager.chatHistoryManager.updateChatHistory(currentChatId, false);
            }

            // Generate title for new chat based on first message
            const firstMessage = messagesToMove[0];
            if (firstMessage && firstMessage.content) {
                try {
                    const title = await generateTitle(firstMessage.content);
                    await this.uiManager.chatHistoryManager.updateChatHistory(newChatId, false, title);
                } catch (error) {
                    console.error("Error generating title:", error);
                    // Use first few words as fallback title
                    const fallbackTitle = firstMessage.content.substring(0, 30) + "...";
                    await this.uiManager.chatHistoryManager.updateChatHistory(newChatId, false, fallbackTitle);
                }
            }

            // Refresh current chat UI to remove moved messages
            await this.loadMessages(currentChatId);

            // Show success message and offer to switch to new topic
            const switchResult = await swal({
                title: "Messages moved successfully!",
                text: "Would you like to switch to the new topic?",
                icon: "success",
                buttons: {
                    stay: "Stay here",
                    switch: "Switch to new topic"
                }
            });

            if (switchResult === "switch") {
                // Switch to the new chat topic
                await this.uiManager.changeChatTopic(newChatId, false);
            }

            // Refresh chat history UI
            await this.uiManager.refreshChatHistoryUI();

            // Sync changes to cloud storage
            try {
                await this.uiManager.syncManager.syncChatHistoryCreateOrUpdate(newChatHistory);
                for (const message of messagesToMove) {
                    const updatedMessage = { ...message, chatId: newChatId };
                    // Use syncMessageCreate for messages in the new chat
                    this.uiManager.syncManager.syncMessageCreate(newChatId, updatedMessage);
                }
            } catch (error) {
                console.error("Error syncing to cloud storage:", error);
            }

        } catch (error) {
            console.error("Error moving messages to new topic:", error);
            swal("Error", "Failed to move messages to new topic", "error");
        }
    }
}

export default MessageManager;
