// DocumentManager.js
import { uploadDocument, generateDocumentQuery, getDocumentContent } from "../utils/apiClient.js";
import swal from "sweetalert";
import DocumentAnalysisProgress from "./DocumentAnalysisProgress.js";
import DocumentUtils from "../utils/DocumentUtils.js";

class DocumentManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.progressTracker = new DocumentAnalysisProgress();
    }

    async processDocuments(attachments, question) {
        if (!attachments || attachments.length === 0) {
            throw new Error("No documents provided for processing");
        }

        this.progressTracker.show();
        const results = [];
        const errors = [];
        const documentContents = [];

        try {
            for (const attachment of attachments) {
                this.progressTracker.updateProgress(attachment.fileName, "processing");
                try {
                    // Create blob from base64 content
                    const blob = this.uiManager.base64ToBlob(attachment.content);
                    
                    // Calculate and display file size
                    const fileSizeFormatted = DocumentUtils.formatFileSize(blob.size);
                    this.progressTracker.updateProgress(
                        attachment.fileName, 
                        "processing", 
                        `Size: ${fileSizeFormatted}`
                    );

                    // Upload file and get result
                    const uploadResult = await uploadDocument(blob, attachment.fileName);
                    
                    // Get document content
                    const content = await getDocumentContent(uploadResult.processedFileName);
                    documentContents.push({
                        fileName: attachment.fileName,
                        content: content,
                        processedFileName: uploadResult.processedFileName
                    });

                    results.push(uploadResult);
                    this.progressTracker.updateProgress(attachment.fileName, "complete");
                } catch (error) {
                    console.error(`Error processing ${attachment.fileName}:`, error);
                    errors.push({ fileName: attachment.fileName, error: error.message });
                    this.progressTracker.updateProgress(
                        attachment.fileName, 
                        "error", 
                        `Error: ${error.message}`
                    );
                }
            }

            // Wait a moment before hiding progress
            await new Promise(resolve => setTimeout(resolve, 1000));
            this.progressTracker.hide();

            if (results.length === 0) {
                throw new Error(`Failed to process all documents: ${errors.map(e => `${e.fileName}: ${e.error}`).join(", ")}`);
            }

            if (errors.length > 0) {
                const warningMessage = `Some documents could not be processed: ${errors.map(e => e.fileName).join(", ")}`;
                swal("Warning", warningMessage, "warning");
            }

            // Build user message object containing question and document content
            const timestamp = new Date().toISOString();
            const messageId = this.uiManager.generateId();
            
            let messageContent = question || "Please analyze these documents.";
            messageContent += "\n\nAttached Documents:\n";
            
            for (const doc of documentContents) {
                messageContent += `\n📄 ${doc.fileName}\n\`\`\`\n${doc.content}\n\`\`\`\n`;
            }

            // Serialize documents property to string
            const serializedDocuments = documentContents.map(doc => ({
                ...doc,
                content: doc.content || "",
                processedFileName: doc.processedFileName || "",
                fileName: doc.fileName || ""
            }));

            return {
                role: "user",
                content: messageContent,
                messageId: messageId,
                isActive: true,
                timestamp: timestamp,
                createdAt: timestamp,
                documents: JSON.stringify(serializedDocuments) // Serialize to string
            };

        } catch (error) {
            this.progressTracker.hide();
            throw error;
        }
    }

    async uploadDocument(blob, fileName) {
        try {
            return await uploadDocument(blob, fileName);
        } catch (error) {
            console.error("Error uploading document:", error);
            throw error;
        }
    }

    async generateQuery(documents, question) {
        if (!documents || !Array.isArray(documents)) {
            throw new Error("No documents provided for query generation");
        }

        try {
            // Ensure parsing from string back to object
            const parsedDocuments = typeof documents === "string" ? JSON.parse(documents) : documents;
            
            return await generateDocumentQuery(
                parsedDocuments.map(doc => doc.processedFileName), 
                question || "Please analyze these documents."
            );
        } catch (error) {
            console.error("Error generating query response:", error);
            throw error;
        }
    }

    formatDocumentContent(content) {
        // Add Markdown formatting for document content
        const lines = content.split("\n");
        let formattedContent = [];
        
        // Add code block markers to preserve formatting
        formattedContent.push("```");
        formattedContent.push(...lines);
        formattedContent.push("```");

        return formattedContent.join("\n");
    }
}

export default DocumentManager;