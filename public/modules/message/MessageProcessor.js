// MessageProcessor.js - Base class for message processors
class MessageProcessor {
    constructor(messageManager) {
        this.messageManager = messageManager;
        this.uiManager = messageManager.uiManager;
    }

    // Abstract method for processing messages, must be implemented by subclasses
    async process(message, attachments = []) {
        throw new Error("Method 'process' must be implemented by subclasses");
    }

    // Validate message input
    async validateInput(message, attachments = [], isRetry = false) {
        return this.messageManager.validateInput(message, attachments, isRetry);
    }

    // Save and display user message
    async saveAndDisplayUserMessage(message, attachmentUrls = "") {
        const timestamp = new Date().toISOString();
        const messageId = this.uiManager.generateId();
        
        const newMessage = { 
            role: "user", 
            content: message, 
            messageId: messageId, 
            isActive: true, 
            attachmentUrls: attachmentUrls,
            createdAt: timestamp  // Only set createdAt, not timestamp
        };

        // Add user message to the interface
        this.messageManager.addMessage(
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
        
        // Force generate title
        await this.uiManager.chatHistoryManager.updateChatHistory(this.uiManager.currentChatId, true);

        return { message: newMessage, messageId };
    }

    // Process AI response and display
    async handleAIResponse(data, timestamp) {
        const responseTimestamp = new Date().toISOString(); // New timestamp representing actual response time
        
        // Extract content from various response formats
        let content = "";
        if (data.message) {
            content = data.message;
        } else if (data.content) {
            content = data.content;
        } else if (data.choices && data.choices[0]) {
            // Handle direct API response format (for GPT-5, O-series, etc.)
            const choice = data.choices[0];
            if (choice.message && choice.message.content) {
                content = choice.message.content;
            } else if (choice.text) {
                content = choice.text;
            }
        }
        
        if (!content) {
            console.error("Unable to extract content from response:", data);
            throw new Error("Invalid response format: no content found");
        }
        
        // Check for warnings from backend (e.g., finish_reason issues)
        if (data.warning) {
            console.warn("⚠️  Backend warning:", data.warning);
            // Prepend warning to content so user is aware
            if (data.finishReason === "length") {
                content = `⚠️ **注意**: 响应因 token 限制被截断。建议增加 max_completion_tokens 参数。\n\n${content}`;
            } else if (data.finishReason === "content_filter") {
                content = `⚠️ **注意**: 部分内容因内容策略被过滤。\n\n${content}`;
            }
        }
        
        const newMessage = {
            role: "assistant",
            content: content,
            messageId: data.messageId || this.uiManager.generateId(),
            isActive: true,
            searchResults: data.searchResults,
            metadata: data.metadata,
            attachmentUrls: data.attachmentUrls || "",
            createdAt: responseTimestamp  // Use new response time as creation time
        };

        this.messageManager.addMessage(
            newMessage.role, 
            newMessage.content, 
            newMessage.messageId, 
            newMessage.isActive, 
            "bottom", 
            false, 
            newMessage.attachmentUrls
        );

        this.uiManager.storageManager.saveMessage(this.uiManager.currentChatId, newMessage);
        this.uiManager.syncManager.syncMessageCreate(this.uiManager.currentChatId, newMessage);
        this.uiManager.app.prompts.addPrompt(newMessage);
        
        // Force generate title
        await this.uiManager.chatHistoryManager.updateChatHistory(this.uiManager.currentChatId, true);
        
        return data;
    }
    
    // Process search results - ensure uniqueness and sorting
    processSearchResults(searchResults) {
        return searchResults
            .filter((result, index, self) => 
                index === self.findIndex(r => r.url === result.url))
            .sort((a, b) => {
                if (a.type === "news" && b.type !== "news") return -1;
                if (b.type === "news" && a.type !== "news") return 1;
                return new Date(b.date || "") - new Date(a.date || "");
            });
    }
}

export default MessageProcessor;    