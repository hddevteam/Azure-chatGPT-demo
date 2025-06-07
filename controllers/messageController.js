// controllers/messageController.js
const { getTableClient } = require("../services/azureTableStorage");
const { uploadTextToBlob, getTextFromBlob, deleteBlob, checkBlobExists, uploadFileToBlob } = require("../services/azureBlobStorage");
const multer = require("multer");
const { processDocument, SUPPORTED_EXTENSIONS } = require("../services/documentProcessor");
const path = require("path");

exports.uploadAttachment = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
    }

    const fileContent = req.file.buffer;
    const originalFileName = req.body.originalFileName || req.file.originalname;
    const username = req.body.username;
    const containerName = "messageattachments";

    try {
        // Use timestamp to create unique filename to avoid conflicts
        const timestamp = Date.now();
        const extension = path.extname(originalFileName);
        const timestampedFileName = `${timestamp}-${originalFileName}`;

        const blobResponse = await uploadFileToBlob(containerName, timestampedFileName, fileContent, username);
        console.log("Attachment uploaded successfully:", blobResponse);
        res.status(201).json(blobResponse.url);
    } catch (error) {
        console.error(`Failed to upload attachment: ${error.message}`);
        res.status(500).json({
            error: "Failed to upload attachment",
            message: error.message
        });
    }
};

exports.uploadAttachmentAndUpdateMessage = async (req, res) => {
    const { chatId, messageId } = req.params;
    const { fileContent, originalFileName } = req.body; // fileContent is a Base64 encoded string

    try {
        const containerName = "messageattachments"; // Attachments are stored in this container
        const uploadResponse = await uploadFileToBlob(containerName, originalFileName, Buffer.from(fileContent, "base64"));
        console.log(uploadResponse);
        // Update the message's attachmentUrls field
        const tableClient = getTableClient("Messages");
        const entity = await tableClient.getEntity(chatId, messageId);

        let newAttachmentUrls = entity.attachmentUrls ? entity.attachmentUrls.split(";") : [];
        newAttachmentUrls.push(uploadResponse.url);
        entity.attachmentUrls = newAttachmentUrls.join(";");

        await tableClient.updateEntity(entity, "Merge");

        res.status(201).json({ data: uploadResponse });
    } catch (error) {
        console.error(`Failed to upload attachment: ${error.message}`);
        res.status(500).send(error.message);
    }
};

exports.deleteAttachment = async (req, res) => {
    const { chatId, messageId } = req.params;
    const attachmentUrl = req.body.attachmentUrl; // Get complete attachment URL from request body
    const containerName = "messageattachments"; // Container where attachments are stored

    try {
        const blobUrl = new URL(attachmentUrl);
        const blobName = blobUrl.pathname.substring(blobUrl.pathname.lastIndexOf("/") + 1);

        await deleteBlob(containerName, blobName);

        // Remove attachment URL from message
        const tableClient = getTableClient("Messages");
        const entity = await tableClient.getEntity(chatId, messageId);
        
        let attachmentUrls = entity.attachmentUrls ? entity.attachmentUrls.split(";") : [];
        attachmentUrls = attachmentUrls.filter(url => url !== attachmentUrl);
        entity.attachmentUrls = attachmentUrls.join(";");

        await tableClient.updateEntity(entity, "Merge");

        res.status(204).send();
    } catch (error) {
        console.error(`Failed to delete attachment: ${error.message}`);
        res.status(500).send(error.message);
    }
};

exports.getCloudMessages = async (req, res) => {
    const chatId = req.params.chatId;
    const lastTimestamp = req.query.lastTimestamp;

    try {
        const tableClient = getTableClient("Messages");
        let queryOptions = { filter: `PartitionKey eq '${chatId}'` };

        if (lastTimestamp) {
            const timeStampFilter = `Timestamp gt datetime'${lastTimestamp}'`;
            queryOptions.filter = `(${queryOptions.filter}) and (${timeStampFilter})`;
        }

        const iterator = tableClient.listEntities({
            queryOptions: queryOptions
        });
        
        const messages = [];
        for await (const entity of iterator) {
            // Process content retrieval from Blob storage
            if (entity.isContentInBlob) {
                try {
                    entity.content = await getTextFromBlob(entity.content);
                } catch (blobError) {
                    console.warn(`Blob for message ${entity.rowKey} not found:`, blobError);
                    entity.content = null;
                }
            }

            // Deserialize JSON data
            if (entity.searchResults) {
                try {
                    entity.searchResults = JSON.parse(entity.searchResults);
                } catch (e) {
                    console.warn(`Failed to parse searchResults for message ${entity.rowKey}:`, e);
                    entity.searchResults = null;
                }
            }

            if (entity.metadata) {
                try {
                    entity.metadata = JSON.parse(entity.metadata);
                } catch (e) {
                    console.warn(`Failed to parse metadata for message ${entity.rowKey}:`, e);
                    entity.metadata = null;
                }
            }

            messages.push(entity);
        }

        res.json({ data: messages });
    } catch (error) {
        console.error(`Failed to get messages: ${error.message}`);
        res.status(500).send(error.message);
    }
};

exports.createCloudMessage = async (req, res) => {
    const chatId = req.params.chatId;
    const message = req.body;
    console.log("Creating message:", message);
    try {
        const tableClient = getTableClient("Messages");

        // Pre-process message data to ensure all fields are supported by Azure Table Storage
        const processedMessage = {
            ...message,
            // Ensure searchResults is serialized as string
            searchResults: message.searchResults ? JSON.stringify(message.searchResults) : null,
            // Ensure other possible object types are also serialized
            metadata: message.metadata ? JSON.stringify(message.metadata) : null
        };

        // Check message content size and handle blob storage
        if (Buffer.byteLength(processedMessage.content, "utf16le") > 32 * 1024) {
            const blobName = `${chatId}_${message.messageId}`;
            const blobUrl = await uploadTextToBlob("messagecontents", blobName, processedMessage.content);
            processedMessage.content = blobUrl;
            processedMessage.isContentInBlob = true;
        } else {
            processedMessage.isContentInBlob = false;
        }

        const entity = {
            partitionKey: chatId,
            rowKey: message.messageId,
            ...processedMessage
        };

        await tableClient.createEntity(entity);
        console.log("Message created successfully:", entity);

        // Get created entity and process data before returning
        const createdEntity = await tableClient.getEntity(chatId, message.messageId);
        
        // Deserialize stored JSON data
        if (createdEntity.searchResults) {
            try {
                createdEntity.searchResults = JSON.parse(createdEntity.searchResults);
            } catch (e) {
                console.warn("Failed to parse searchResults:", e);
                createdEntity.searchResults = null;
            }
        }
        
        if (createdEntity.metadata) {
            try {
                createdEntity.metadata = JSON.parse(createdEntity.metadata);
            } catch (e) {
                console.warn("Failed to parse metadata:", e);
                createdEntity.metadata = null;
            }
        }

        res.status(201).json({ data: createdEntity });
    } catch (error) {
        console.error(`Failed to create message: ${error.message}`);
        res.status(500).send(error.message);
    }
};

exports.updateCloudMessage = async (req, res) => {
    const chatId = req.params.chatId;
    const message = req.body;
    const messageId = message.messageId;
    console.log("Updating message:", { chatId, messageId });
    
    try {
        const tableClient = getTableClient("Messages");
        // Get current entity
        const entity = await tableClient.getEntity(chatId, messageId);

        // If message content is in Blob and there's new content, delete the old Blob
        if (message.content && entity.isContentInBlob) {
            const blobUrl = new URL(entity.content);
            const blobName = blobUrl.pathname.substring(blobUrl.pathname.lastIndexOf("/") + 1);
            await deleteBlob("messagecontents", blobName);
        }

        // Process new message data
        const processedMessage = {
            ...message,
            // Serialize complex data types
            searchResults: message.searchResults ? JSON.stringify(message.searchResults) : entity.searchResults,
            metadata: message.metadata ? JSON.stringify(message.metadata) : entity.metadata
        };

        // Check if new content needs to be stored in Blob
        let blobUrl;
        if (message.content && Buffer.byteLength(message.content, "utf16le") > 32 * 1024) {
            const blobName = `${chatId}_${messageId}`;
            blobUrl = await uploadTextToBlob("messagecontents", blobName, message.content);
            processedMessage.content = blobUrl;
            processedMessage.isContentInBlob = true;
        } else if (message.content) {
            processedMessage.content = message.content;
            processedMessage.isContentInBlob = false;
        }

        // Update entity
        await tableClient.updateEntity({
            partitionKey: chatId,
            rowKey: messageId,
            ...processedMessage
        }, "Merge");

        // Get updated entity and process return data
        const updatedEntity = await tableClient.getEntity(chatId, messageId);
        
        // Deserialize data for return
        if (updatedEntity.searchResults) {
            try {
                updatedEntity.searchResults = JSON.parse(updatedEntity.searchResults);
            } catch (e) {
                console.warn("Failed to parse searchResults:", e);
                updatedEntity.searchResults = null;
            }
        }
        
        if (updatedEntity.metadata) {
            try {
                updatedEntity.metadata = JSON.parse(updatedEntity.metadata);
            } catch (e) {
                console.warn("Failed to parse metadata:", e);
                updatedEntity.metadata = null;
            }
        }

        // If content is in Blob, get actual content
        if (updatedEntity.isContentInBlob) {
            try {
                updatedEntity.content = await getTextFromBlob(updatedEntity.content);
            } catch (e) {
                console.warn("Failed to get content from blob:", e);
                updatedEntity.content = null;
            }
        }

        res.status(200).json({ data: updatedEntity });
    } catch (error) {
        console.error(`Failed to update message: ${error.message}`);
        res.status(500).send(error.message);
    }
};

exports.deleteCloudMessage = async (req, res) => {
    const chatId = req.params.chatId;
    const messageId = req.params.messageId;
    console.log("deleteCloudMessage", chatId, messageId);

    try {
        const tableClient = getTableClient("Messages");

        // Retrieve message entity
        const entity = await tableClient.getEntity(chatId, messageId);
    
        // 1. If message content is in Blob, delete Blob
        if (entity.isContentInBlob) {
            console.log("Deleting message content from Blob storage");
            const blobName = entity.content.substring(entity.content.lastIndexOf("/") + 1);
            try {
                await deleteBlob("messagecontents", blobName);
                console.log("blob deleted");
            } catch (error) {
                console.warn(`Failed to delete blob ('messagecontents', ${blobName}): ${error.message}`);
            }
        }

        // 2. Delete related attachments
        if (entity.attachmentUrls) {
            console.log("Deleting message-related attachments");
            const attachments = entity.attachmentUrls.split(";");
            for (const url of attachments) {
                if (!url) continue; // Skip empty URLs
                const blobName = url.split("/").pop();
                try {
                    await deleteBlob("messageattachments", blobName);
                    console.log(`Attachment ${blobName} deleted`);
                } catch (error) {
                    console.warn(`Failed to delete attachment (${blobName}): ${error.message}`);
                }
            }
        }

        // 3. Delete message entity from Table Storage
        await tableClient.deleteEntity(chatId, messageId);
        console.log("Message entity deleted");
        
        res.status(204).send();
    } catch (error) {
        console.error(`Failed to delete message: ${error.message}`);
        res.status(500).send(error.message);
    }
};

exports.uploadDocument = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
    }

    const fileContent = req.file.buffer;
    const originalFileName = req.body.originalFileName || req.file.originalname;
    const username = req.body.username;
    const containerName = "documents";
    const extension = path.extname(originalFileName);
    const baseName = path.basename(originalFileName, extension);

    try {
        // Create filename with timestamp
        const timestampedFileName = `${Date.now()}-${originalFileName}`;
        // Upload original file
        const blobOriginal = await uploadFileToBlob(containerName, timestampedFileName, fileContent, username);
        
        // Process document and generate processed version
        try {
            const processedContent = await processDocument(fileContent, originalFileName);
            // Use the same timestamp to create processed filename
            const processedFileName = `${Date.now()}-${baseName}_processed.md`;
            const processedBlob = await uploadFileToBlob(
                containerName, 
                processedFileName, 
                Buffer.from(processedContent), 
                username
            );

            res.status(201).json({
                originalUrl: blobOriginal.url,
                processedUrl: processedBlob.url,
                originalFileName: timestampedFileName,
                processedFileName: processedFileName
            });
        } catch (processingError) {
            // If processing fails, still return original file info with error message
            res.status(422).json({
                originalUrl: blobOriginal.url,
                originalFileName: timestampedFileName,
                error: {
                    message: processingError.message,
                    type: "ProcessingError"
                }
            });
        }
    } catch (error) {
        console.error(`Failed to upload document: ${error.message}`);
        res.status(500).json({
            error: "Internal server error",
            message: error.message
        });
    }
};

exports.getDocumentStatus = async (req, res) => {
    const { id } = req.params;
    const containerName = "documents";

    try {
        const processedBlobName = `processed_${id}`;
        const exists = await checkBlobExists(containerName, processedBlobName);
        
        if (exists) {
            const processedContent = await getTextFromBlob(`${containerName}/${processedBlobName}`);
            res.json({
                status: "completed",
                processedContent
            });
        } else {
            res.json({
                status: "processing"
            });
        }
    } catch (error) {
        console.error(`Failed to get document status: ${error.message}`);
        res.status(500).json({
            error: "Internal server error",
            message: error.message
        });
    }
};

exports.getDocumentContent = async (req, res) => {
    const fileName = req.params.fileName;
    const containerName = "documents";

    try {
        const content = await getTextFromBlob(`${containerName}/${fileName}`);
        if (!content) {
            return res.status(404).json({
                error: "Document not found",
                message: `Could not find document: ${fileName}`
            });
        }
        res.json(content);
    } catch (error) {
        console.error(`Failed to get document content: ${error.message}`);
        if (error.message.includes("Blob not found")) {
            return res.status(404).json({
                error: "Document not found",
                message: `Could not find document: ${fileName}`
            });
        }
        res.status(500).json({
            error: "Failed to retrieve document content",
            message: error.message
        });
    }
};