// MessageManager.js - Refactored message manager
import swal from "sweetalert";
import LinkHandler from "../utils/linkHandler.js";
import DocumentManager from "../components/DocumentManager.js";
import MessageProcessorFactory from "./message/MessageProcessorFactory.js";
import MessageUIHandler from "./message/MessageUIHandler.js";
import FollowUpQuestionHandler from "./message/FollowUpQuestionHandler.js";
import { ConversationSummaryHelper } from "../../utils/ConversationSummaryHelper.js";

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
        this.currentSummary = null;
        
        // Initialize associated processors
        this.uiHandler = new MessageUIHandler(this);
        this.followUpHandler = new FollowUpQuestionHandler(this);
        this.processorFactory = new MessageProcessorFactory(this);
    }

    // Toggle network search functionality
    toggleWebSearch() {
        this.webSearchEnabled = !this.webSearchEnabled;
        const button = document.getElementById("web-search-toggle");
        button.classList.toggle("active", this.webSearchEnabled);
    }

    // Add message to DOM - delegate to UIHandler
    addMessage(sender, message, messageId, isActive = true, position = "bottom", isError = false, attachmentUrls = "") {
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
            
            // Handle network error retries
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

        if (attachments.length > 0) {
            if (!isRetry) {
                // For new messages, upload attachments
                attachmentUrls = await this.uiManager.uploadAttachments(attachments);
                if (attachmentUrls === "") {
                    this.uiManager.finishSubmitProcessing();
                    return false;
                }
            } else {
                // For retry messages, use existing attachment URLs
                attachmentUrls = attachments
                    .filter(att => att.isExistingAttachment && att.fileName)
                    .map(att => att.fileName)
                    .join(";");
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
        this.uiManager.messageContextManager.addMessageToContext(newMessage);
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

            // Check if it's the last message and handle it
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
            swal("Error", "Failed to retry message: " + error.message, "error");
        }
    }

    // Get the ID of the last message
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
        
        // Remove from context
        this.uiManager.messageContextManager.removeMessageFromContext(messageId);

        // Update storage
        this.uiManager.storageManager.saveMessageActiveStatus(
            this.uiManager.currentChatId,
            messageId,
            false
        );

        // Sync to server
        const updatedMessage = this.uiManager.storageManager.getMessage(
            this.uiManager.currentChatId,
            messageId
        );
        if (updatedMessage) {
            this.uiManager.syncManager.syncMessageUpdate(
                this.uiManager.currentChatId,
                updatedMessage
            );
        }
    }

    // Edit message
    editMessage(message, messageId) {
        this.inactiveMessage(messageId);
        
        // Mark subsequent messages as inactive
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
            
            // Remove from context
            this.uiManager.messageContextManager.removeMessageFromContext(messageId);
            
            // Delete local data first to ensure local consistency even if cloud sync fails
            const chatId = this.uiManager.currentChatId;
            const result = this.uiManager.storageManager.deleteMessage(chatId, messageId);
            if (!result) {
                console.warn(`Message ${messageId} not found in local storage or deletion failed`);
            }
            
            try {
                // Try to sync deletion with cloud
                const cloudDeleteResult = await this.uiManager.syncManager.syncMessageDelete(chatId, messageId);
                if (!cloudDeleteResult) {
                    console.warn(`Cloud deletion failed for message ${messageId}, but local deletion completed successfully`);
                }
            } catch (cloudError) {
                // Cloud deletion failed, but won't affect user experience since local data is already deleted
                console.error("Error during cloud message deletion:", cloudError);
                // Don't show error message as it has minimal impact on user experience
            }
            
            // Check if all messages have been deleted
            const remainingMessages = document.querySelectorAll(".message");
            if (remainingMessages.length === 0) {
                this.uiManager.showWelcomeMessage();
            }
            
            return true; // Local deletion successful
            
        } catch (error) {
            console.error("Failed to delete message:", error);
            swal("Delete Message Failed", "Unable to complete message deletion operation, please refresh and try again", "error");
            return false;
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
                    
                    // Save search results (if any)
                    if (message.searchResults && message.role === "assistant") {
                        this.searchResults = message.searchResults;
                    }
                }
            });

        // Restore scroll position
        messagesContainer.scrollTop = messagesContainer.scrollHeight - currentScrollPosition;
    }

    // Load messages for a specific chat
    async loadMessages(chatId) {
        const savedMessages = this.uiManager.storageManager.getMessages(chatId);
        const messagesContainer = document.querySelector("#messages");
        
        // Clear existing messages
        messagesContainer.innerHTML = "";

        // Load the most recent messages up to the limit
        const startIndex = Math.max(0, savedMessages.length - this.uiManager.messageLimit);
        savedMessages.slice(startIndex).forEach(message => {
            const isActive = message.isActive || false;
            
            // Add message to UI
            this.addMessage(
                message.role,
                message.content,
                message.messageId,
                isActive,
                "bottom",
                false,
                message.attachmentUrls
            );
            
            // Save search results (if any)
            if (message.searchResults && message.role === "assistant") {
                this.searchResults = message.searchResults;
            }
        });

        // Log some message loading statistics
        console.log(`Loaded ${savedMessages.length} messages for chat ${chatId}`);
        console.log("Active messages in context:", 
            this.uiManager.messageContextManager.getActiveMessagesCount());

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Get the latest summary
    async getLatestSummary(messages) {
        const activeMessages = messages.filter(msg => msg.isActive);
        if (activeMessages.length === 0) return null;

        return await ConversationSummaryHelper.generateSummary(activeMessages, this.currentSummary);
    }

    // Toggle message collapse state
    toggleCollapseMessage(messageElement, forceCollapse) {
        this.uiHandler.toggleCollapseMessage(messageElement, forceCollapse);
    }
    
    // Clear follow-up questions
    clearFollowUpQuestions() {
        this.followUpHandler.clearFollowUpQuestions();
    }
}

export default MessageManager;