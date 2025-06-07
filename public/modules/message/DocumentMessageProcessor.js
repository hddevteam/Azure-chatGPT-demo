// DocumentMessageProcessor.js - Handles document-related messages
import MessageProcessor from "./MessageProcessor.js";

class DocumentMessageProcessor extends MessageProcessor {
    constructor(messageManager) {
        super(messageManager);
        this.documentManager = messageManager.documentManager;
    }

    async process(message, attachments = []) {
        const timestamp = new Date().toISOString();
        
        try {
            // For document processing, we don't use the standard validation flow
            // Document processing requires special handling, no need to immediately show user message
            console.log("Processing document message:", message, attachments);
            
            // Process documents and create messages containing document content
            const documentMessage = await this.documentManager.processDocuments(attachments, message);
            
            // Add document message to conversation
            this.messageManager.addMessage(
                documentMessage.role,
                documentMessage.content,
                documentMessage.messageId,
                documentMessage.isActive,
                "bottom",
                false,
                ""
            );

            // Save and sync document message
            this.uiManager.app.prompts.addPrompt(documentMessage);
            this.uiManager.storageManager.saveMessage(this.uiManager.currentChatId, documentMessage);
            this.uiManager.syncManager.syncMessageCreate(this.uiManager.currentChatId, documentMessage);
            
            // Update chat history and possibly generate title
            this.uiManager.chatHistoryManager.updateChatHistory(this.uiManager.currentChatId);

            // Parse document information and generate document query response
            const documents = JSON.parse(documentMessage.documents);
            const response = await this.documentManager.generateQuery(documents, message);
            
            // Process response and display
            return await this.handleAIResponse(response, timestamp);
        } catch (error) {
            console.error("Error in DocumentMessageProcessor:", error);
            throw error;
        }
    }
    
    // Check if this is a document processing request
    static isDocumentRequest(attachments) {
        return attachments && attachments.length > 0 && 
               attachments.some(att => {
                   // For new attachments with content
                   if (att.content) {
                       return !att.content.startsWith("data:image/");
                   }
                   // For existing attachments with fileName
                   if (att.fileName) {
                       return !att.fileName.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i);
                   }
                   return false;
               });
    }
}

export default DocumentMessageProcessor;