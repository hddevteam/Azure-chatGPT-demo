// DocumentMessageProcessor.js - 处理文档相关消息
import MessageProcessor from "./MessageProcessor.js";

class DocumentMessageProcessor extends MessageProcessor {
    constructor(messageManager) {
        super(messageManager);
        this.documentManager = messageManager.documentManager;
    }

    async process(message, attachments = []) {
        const timestamp = new Date().toISOString();
        
        try {
            // 对于文档处理，我们不使用标准验证流程
            // 文档处理需要特殊处理，不需要立即显示用户消息
            
            // 处理文档和创建包含文档内容的消息
            const documentMessage = await this.documentManager.processDocuments(attachments, message);
            
            // 将文档消息添加到对话中
            this.messageManager.addMessage(
                documentMessage.role,
                documentMessage.content,
                documentMessage.messageId,
                documentMessage.isActive,
                "bottom",
                false,
                ""
            );

            // 保存并同步文档消息
            this.uiManager.app.prompts.addPrompt(documentMessage);
            this.uiManager.storageManager.saveMessage(this.uiManager.currentChatId, documentMessage);
            this.uiManager.syncManager.syncMessageCreate(this.uiManager.currentChatId, documentMessage);
            
            // 更新聊天历史并可能生成标题
            this.uiManager.chatHistoryManager.updateChatHistory(this.uiManager.currentChatId);

            // 解析文档信息并生成文档查询响应
            const documents = JSON.parse(documentMessage.documents);
            const response = await this.documentManager.generateQuery(documents, message);
            
            // 处理响应并显示
            return await this.handleAIResponse(response, timestamp);
        } catch (error) {
            console.error("Error in DocumentMessageProcessor:", error);
            throw error;
        }
    }
    
    // 检查是否是文档处理请求
    static isDocumentRequest(attachments) {
        return attachments && attachments.length > 0 && 
               attachments.some(att => !att.content.startsWith("data:image/"));
    }
}

export default DocumentMessageProcessor;