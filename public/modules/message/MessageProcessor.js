// MessageProcessor.js - 消息处理器基类
class MessageProcessor {
    constructor(messageManager) {
        this.messageManager = messageManager;
        this.uiManager = messageManager.uiManager;
    }

    // 处理消息的抽象方法，子类需要实现
    async process(message, attachments = []) {
        throw new Error("Method 'process' must be implemented by subclasses");
    }

    // 验证消息输入
    async validateInput(message, attachments = [], isRetry = false) {
        return this.messageManager.validateInput(message, attachments, isRetry);
    }

    // 保存和显示用户消息
    async saveAndDisplayUserMessage(message, attachmentUrls = "") {
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

        // 添加用户消息到界面
        this.messageManager.addMessage(
            newMessage.role,
            newMessage.content,
            newMessage.messageId,
            newMessage.isActive,
            "bottom",
            false,
            newMessage.attachmentUrls
        );

        // 保存到存储并同步
        this.uiManager.app.prompts.addPrompt(newMessage);
        this.uiManager.storageManager.saveMessage(this.uiManager.currentChatId, newMessage);
        this.uiManager.syncManager.syncMessageCreate(this.uiManager.currentChatId, newMessage);
        
        // 强制生成标题
        await this.uiManager.chatHistoryManager.updateChatHistory(this.uiManager.currentChatId, true);

        return { message: newMessage, messageId };
    }

    // 处理 AI 响应并显示
    async handleAIResponse(data, timestamp) {
        if (!data) {
            return null;
        }

        const messageId = this.uiManager.generateId();
        
        // 处理搜索结果
        const searchResults = data.searchResults && Array.isArray(data.searchResults) 
            ? this.processSearchResults(data.searchResults)
            : null;
        
        const newMessage = { 
            role: "assistant", 
            content: data.message, 
            messageId: messageId, 
            isActive: true, 
            attachmentUrls: data.attachmentUrls || "",
            searchResults: searchResults,
            timestamp: timestamp || new Date().toISOString(),
            createdAt: timestamp || new Date().toISOString()
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
        
        // 强制生成标题
        await this.uiManager.chatHistoryManager.updateChatHistory(this.uiManager.currentChatId, true);
        
        return data;
    }
    
    // 处理搜索结果 - 确保唯一性并排序
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