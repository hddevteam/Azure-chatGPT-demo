// controllers/messageController.js
const { getTableClient } = require("../services/azureTableStorage");
const { uploadTextToBlob, getTextFromBlob, deleteBlob } = require("../services/azureBlobStorage");

// controllers/messageController.js
const { uploadFileToBlob } = require("../services/azureBlobStorage");

exports.uploadAttachment = async (req, res) => {
    const fileContent = req.file.buffer; // 文件的二进制内容
    // 尝试从req.body中获取客户端提供的文件名，如果不存在，则使用原始文件名
    const originalFileName = req.body.originalFileName || req.file.originalname;
    const containerName = "messageattachments"; // 附件存储在这个容器中

    try {
        const attachment = await uploadFileToBlob(containerName, originalFileName, fileContent);
        console.log("attachment", attachment);

        res.status(201).json(attachment.url);
    } catch (error) {
        console.error(`Failed to upload attachment: ${error.message}`);
        res.status(500).send(error.message);
    }
};

exports.uploadAttachmentAndUpdateMessage = async (req, res) => {
    const { chatId, messageId } = req.params;
    const { fileContent, originalFileName } = req.body; // fileContent是一个Base64编码的字符串

    try {
        const containerName = "messageattachments"; // 附件存储在这个容器中
        const uploadResponse = await uploadFileToBlob(containerName, originalFileName, Buffer.from(fileContent, "base64"));
        console.log(uploadResponse);
        // 更新消息的attachmentUrls字段
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
    const attachmentUrl = req.body.attachmentUrl; // 通过请求体获取附件的完整URL
    const containerName = "messageattachments"; // 附件所在的容器

    try {
        const blobUrl = new URL(attachmentUrl);
        const blobName = blobUrl.pathname.substring(blobUrl.pathname.lastIndexOf("/") + 1);

        await deleteBlob(containerName, blobName);

        // 从消息中移除附件URL
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
    const lastTimestamp = req.query.lastTimestamp; // Obtained from query parameter if it exists

    try {
        const tableClient = getTableClient("Messages");
        let queryOptions = { filter: `PartitionKey eq '${chatId}'` };

        // If lastTimestamp is specified, modify the query to include a time filter.
        if (lastTimestamp) {
            const timeStampFilter = `Timestamp gt datetime'${lastTimestamp}'`;
            queryOptions.filter = `(${queryOptions.filter}) and (${timeStampFilter})`;
        }

        const iterator = tableClient.listEntities({
            queryOptions: queryOptions
        });
        
        const messages = [];
        for await (const entity of iterator) {
            messages.push(entity);
        }
      
        // Fetch content from Blob Storage if necessary
        for (const message of messages) {
            if (message.isContentInBlob) {
                try {
                    message.content = await getTextFromBlob(message.content);
                } catch (blobError) {
                    console.warn(`Blob for message ${message.RowKey} not found`);
                    // Handle the missing blob as needed:
                    // e.g., set the message content to null or a placeholder text
                    message.content = null; // Or a placeholder value like 'Content not available'
                    
                }
            }
        }

        res.json({ data: messages });
    } catch (error) {
        console.error(`Failed to get messages: ${error.message}`);
        res.status(500).send(error.message);
    }
};

exports.createCloudMessage = async (req, res) => {
    const chatId = req.params.chatId; // You may need to update this line based on your front-end implementation
    const message = req.body;
    console.log(message);
    try {
        const tableClient = getTableClient("Messages");

        // Check message content size and handle blob storage if necessary
        if (Buffer.byteLength(message.content, "utf16le") > 32 * 1024) {
            const blobName = `${chatId}_${message.messageId}`;
            const blobUrl = await uploadTextToBlob("messagecontents", blobName, message.content);
            message.content = blobUrl; // Save Blob URL to Table Storage
            message.isContentInBlob = true; // Mark that content is stored in Blob
        } else {
            message.isContentInBlob = false;
        }

        const entity = {
            partitionKey: chatId,
            rowKey: message.messageId,
            ...message
        };

        await tableClient.createEntity(entity);
        console.log(entity);
        console.log("message created");
        // Assume the structure of chatHistory is correct and includes PartitionKey and RowKey
        const createdEntity = await tableClient.getEntity(chatId, message.messageId);
        res.status(201).json({ data: createdEntity });

    } catch (error) {
        console.error(`Failed to create message: ${error.message}`);
        res.status(500).send(error.message);
    }
};

exports.updateCloudMessage = async (req, res) => {
    const chatId = req.params.chatId;
    const message = req.body;
    const messageId = message.messageId; // Extract messageId from the messageContent
    console.log("updateCloudMessage", chatId, messageId, message);
    try {
        const tableClient = getTableClient("Messages");
        // Retrieve the current entity from the table
        const entity = await tableClient.getEntity(chatId, messageId);

        // if message.content is not empty, check if the content is in Blob Storage and delete it
        if (message.content && entity.isContentInBlob) {
            // Assume that we have stored the blob URL in the entity.content and the container name is 'messagecontents'
            // We need to extract the blob name from the URL
            const blobUrl = new URL(entity.content);
            const blobName = blobUrl.pathname.substring(blobUrl.pathname.lastIndexOf("/") + 1);
            await deleteBlob("messagecontents", blobName);
        }

        // Check if large content needs to be moved to Blob Storage
        let blobUrl;
        if (Buffer.byteLength(message.content, "utf16le") > 32 * 1024) {
            const blobName = `${chatId}_${messageId}`;
            // Update Blob Storage with new content
            blobUrl = await uploadTextToBlob("messagecontents", blobName, message.content);
        }

        // Update with new Blob URL or the actual text content
        entity.content = blobUrl || message.content;
        entity.isContentInBlob = !!blobUrl;
        entity.attachmentUrls = message.attachmentUrls;

        await tableClient.updateEntity({ partitionKey: chatId, rowKey: messageId, ...entity }, "Merge");
        console.log("message updated");
        const updatedEntity = await tableClient.getEntity(chatId, message.messageId);
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

        // Retrieve the message entity
        const entity = await tableClient.getEntity(chatId, messageId);
    
        if (entity.isContentInBlob) {
            console.log("blob in blob");
            // Assume that we have stored the blob URL in the entity.content and the container name is 'messagecontents'
            // We need to extract the blob name from the URL
            const blobUrl = new URL(entity.content);
            const blobName = blobUrl.pathname.substring(blobUrl.pathname.lastIndexOf("/") + 1);
            await deleteBlob("messagecontents", blobName);
            console.log("blob deleted");
        }

        // 删除附件
        if (entity.attachmentUrls) {
            const attachments = entity.attachmentUrls.split(";");
            for (const url of attachments) {
                const blobName = url.split("/").pop(); // 假设URL格式允许这样简单地提取
                await deleteBlob("messageattachments", blobName);
            }
        }

        await tableClient.updateEntity({
            partitionKey: entity.partitionKey,
            rowKey: entity.rowKey,
            isDeleted: true
        });
        console.log("message deleted");
        const deletedEntity = await tableClient.getEntity(chatId, messageId);
        res.status(204).json({ data: deletedEntity });
    } catch (error) {
        console.error(`Failed to delete message: ${error.message}`);
        res.status(500).send(error.message);
    }
};