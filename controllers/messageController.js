// controllers/messageController.js
const { getTableClient } = require("../services/azureTableStorage");

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

        res.json({ data: messages });
    } catch (error) {
        console.error(`Failed to get messages: ${error.message}`);
        res.status(500).send(error.message);
    }
};

exports.createCloudMessage = async (req, res) => {
    try {
        const chatId = req.params.chatId; // Chat ID from the URL
        const message = req.body; // The message data from the request body
        
        // Assumes getTableClient has been implemented to handle & return the table client
        const tableClient = getTableClient("Messages");
        
        let maxSequenceNumber = 0;
        const iterator = tableClient.listEntities({
            queryOptions: { filter: `PartitionKey eq '${chatId}'` }
        });
        // 使用 for-await-of 迭代器遍历所有消息，查找最大的 SequenceNumber
        for await (const msg of iterator) {
            if (msg.SequenceNumber > maxSequenceNumber) {
                maxSequenceNumber = msg.SequenceNumber;
            }
        }
        
        const sequenceNumber = maxSequenceNumber + 1; // Increment the max sequenceNumber by 1
        
        const newMessageEntity = {
            PartitionKey: chatId, 
            RowKey: message.messageId, // Use messageId as the RowKey
            SequenceNumber: sequenceNumber, // Set sequenceNumber to the message entity
            ...message // Spread the rest of the message fields
        };
        
        await tableClient.createEntity(newMessageEntity);
        res.status(201).json({ data: newMessageEntity });
    } catch (error) {
        console.error(`Failed to create message: ${error.message}`);
        res.status(500).send(error.message);
    }
};


exports.updateCloudMessage = async (req, res) => {
    try {
        const messageId = req.params.messageId;
        const messageData = req.body;
        const tableClient = getTableClient("Messages");
        const updateEntityResponse = await tableClient.updateEntity({...messageData, PartitionKey: req.params.chatId, RowKey: messageId }, { etag: "*" });
        res.status(200).json({ data: updateEntityResponse });
    } catch (error) {
        console.error(`Failed to update message: ${error.message}`);
        res.status(500).send(error.message);
    }
};

exports.deleteCloudMessage = async (req, res) => {
    try {
        const messageId = req.params.messageId;
        const chatId = req.params.chatId;
        const tableClient = getTableClient("Messages");

        // You need to get the existing entity to retrieve the etag for deletion
        const message = await tableClient.getEntity(chatId, messageId);
        await tableClient.deleteEntity(chatId, messageId, { etag: message.etag });
        res.status(204).end();
    } catch (error) {
        console.error(`Failed to delete message: ${error.message}`);
        res.status(500).send(error.message);
    }
};
