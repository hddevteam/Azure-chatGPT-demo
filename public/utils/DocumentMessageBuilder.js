class DocumentMessageBuilder {
    constructor(uiManager) {
        this.uiManager = uiManager;
    }

    createDocumentMessage(documentContents, question) {
        // 生成消息ID
        const messageId = this.uiManager.generateId();
        const timestamp = new Date().toISOString();

        // 创建包含所有文档内容的消息
        const docs = documentContents.map(doc => ({
            fileName: doc.fileName,
            content: doc.content,
            processedFileName: doc.processedFileName
        }));

        // 构建完整的消息对象
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
        const lines = content.split('\n');
        let formattedContent = [];
        formattedContent.push('```');
        formattedContent.push(...lines);
        formattedContent.push('```');
        return formattedContent.join('\n');
    }
}

export default DocumentMessageBuilder;