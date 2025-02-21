// controllers/messageController.js
const { getTableClient } = require("../services/azureTableStorage");
const { uploadTextToBlob, getTextFromBlob, deleteBlob } = require("../services/azureBlobStorage");

const { uploadFileToBlob } = require("../services/azureBlobStorage");

exports.uploadAttachment = async (req, res) => {
    const fileContent = req.file.buffer; // 文件的二进制内容
    // 尝试从req.body中获取客户端提供的文件名，如果不存在，则使用原始文件名
    const originalFileName = req.body.originalFileName || req.file.originalname;
    const username = req.body.username; // 从请求中获取username
    const containerName = "messageattachments"; // 附件存储在这个容器中

    try {
        const attachment = await uploadFileToBlob(containerName, originalFileName, fileContent, username);
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
            // 处理从Blob存储中获取内容
            if (entity.isContentInBlob) {
                try {
                    entity.content = await getTextFromBlob(entity.content);
                } catch (blobError) {
                    console.warn(`Blob for message ${entity.rowKey} not found:`, blobError);
                    entity.content = null;
                }
            }

            // 反序列化JSON数据
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

        // 预处理消息数据，确保所有字段都是Azure Table Storage支持的类型
        const processedMessage = {
            ...message,
            // 确保searchResults被序列化为字符串
            searchResults: message.searchResults ? JSON.stringify(message.searchResults) : null,
            // 确保其他可能的对象类型也被序列化
            metadata: message.metadata ? JSON.stringify(message.metadata) : null
        };

        // 检查消息内容大小并处理blob存储
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

        // 获取创建的实体并在返回之前处理数据
        const createdEntity = await tableClient.getEntity(chatId, message.messageId);
        
        // 反序列化存储的JSON数据
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
        // 获取当前实体
        const entity = await tableClient.getEntity(chatId, messageId);

        // 如果消息内容在Blob中且有新内容，则删除旧的Blob
        if (message.content && entity.isContentInBlob) {
            const blobUrl = new URL(entity.content);
            const blobName = blobUrl.pathname.substring(blobUrl.pathname.lastIndexOf("/") + 1);
            await deleteBlob("messagecontents", blobName);
        }

        // 处理新的消息数据
        const processedMessage = {
            ...message,
            // 序列化复杂数据类型
            searchResults: message.searchResults ? JSON.stringify(message.searchResults) : entity.searchResults,
            metadata: message.metadata ? JSON.stringify(message.metadata) : entity.metadata
        };

        // 检查新内容是否需要存储到Blob
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

        // 更新实体
        await tableClient.updateEntity({
            partitionKey: chatId,
            rowKey: messageId,
            ...processedMessage
        }, "Merge");

        // 获取更新后的实体并处理返回数据
        const updatedEntity = await tableClient.getEntity(chatId, messageId);
        
        // 反序列化数据以返回
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

        // 如果内容在Blob中，获取实际内容
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

        // 检索消息实体
        const entity = await tableClient.getEntity(chatId, messageId);
    
        // 1. 如果消息内容在Blob中，删除Blob
        if (entity.isContentInBlob) {
            console.log("删除Blob存储的消息内容");
            const blobName = entity.content.substring(entity.content.lastIndexOf("/") + 1);
            try {
                await deleteBlob("messagecontents", blobName);
                console.log("blob deleted");
            } catch (error) {
                console.warn(`Failed to delete blob ('messagecontents', ${blobName}): ${error.message}`);
            }
        }

        // 2. 删除相关的附件
        if (entity.attachmentUrls) {
            console.log("删除消息相关的附件");
            const attachments = entity.attachmentUrls.split(";");
            for (const url of attachments) {
                if (!url) continue; // 跳过空URL
                const blobName = url.split("/").pop();
                try {
                    await deleteBlob("messageattachments", blobName);
                    console.log(`Attachment ${blobName} deleted`);
                } catch (error) {
                    console.warn(`Failed to delete attachment (${blobName}): ${error.message}`);
                }
            }
        }

        // 3. 从Table Storage中删除消息实体
        await tableClient.deleteEntity(chatId, messageId);
        console.log("Message entity deleted");
        
        res.status(204).send();
    } catch (error) {
        console.error(`Failed to delete message: ${error.message}`);
        res.status(500).send(error.message);
    }
};