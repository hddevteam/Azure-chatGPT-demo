class DocumentMessageBuilder {
    constructor(uiManager) {
        this.uiManager = uiManager;
    }

    createDocumentMessage(documentContents, question) {
        // Generate message ID
        const messageId = this.uiManager.generateId();
        const timestamp = new Date().toISOString();

        // Create message containing all document content
        const docs = documentContents.map(doc => ({
            fileName: doc.fileName,
            content: doc.content,
            processedFileName: doc.processedFileName
        }));

        // Build complete message object
        return {
            role: "user",
            messageId: messageId,
            content: question || "Please analyze these documents.",
            documents: docs,
            isActive: true,
            timestamp: timestamp,
            createdAt: timestamp,
            isDocumentMessage: true
        };
    }

    formatDocumentContent(content) {
        const lines = content.split("\n");
        const formattedContent = [];
        formattedContent.push("```");
        formattedContent.push(...lines);
        formattedContent.push("```");
        return formattedContent.join("\n");
    }
}

export default DocumentMessageBuilder;