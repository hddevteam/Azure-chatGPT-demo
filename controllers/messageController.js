// controllers/messageController.js
const { getTableClient } = require("../services/azureTableStorage");
const { uploadTextToBlob, getTextFromBlob, deleteBlob } = require("../services/azureBlobStorage");
exports.getCloudMessages = async (req, res) => {
    const chatId = req.params.chatId;
    const messages = [];
    try {
        const tableClient = getTableClient("Messages");
        const iterator = tableClient.listEntities({
            queryOptions: { filter: `PartitionKey eq '${chatId}'` }
        });

        for await (const entity of iterator) {
            messages.push(entity);
        }
      
        // Fetch content from Blob Storage if necessary
        for (const message of messages) {
            if (message.isContentInBlob) {
                message.content = await getTextFromBlob(message.content);
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
            const blobUrl = await uploadTextToBlob("messagecontents", chatId, message.content);
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
        res.status(201).json({ data: entity });
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

        // Check if large content needs to be moved to Blob Storage
        let blobUrl;
        if (Buffer.byteLength(message.content, "utf16le") > 32 * 1024) {
            // Update Blob Storage with new content
            blobUrl = await uploadTextToBlob("messagecontents", chatId, message.content);
        }

        // Retrieve the current entity from the table
        const entity = await tableClient.getEntity(chatId, messageId);

        // Update with new Blob URL or the actual text content
        entity.content = blobUrl || message.content;
        entity.isContentInBlob = !!blobUrl;

        await tableClient.updateEntity({ partitionKey: chatId, rowKey: messageId, ...entity }, "Replace");
        res.status(200).json({ data: entity });
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

        await tableClient.updateEntity({
            partitionKey: entity.partitionKey,
            rowKey: entity.rowKey,
            isDeleted: true
        });
        console.log("message deleted");
        res.status(204).send();
    } catch (error) {
        console.error(`Failed to delete message: ${error.message}`);
        res.status(500).send(error.message);
    }
};