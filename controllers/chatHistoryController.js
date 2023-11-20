// controllers/chatHistoryController.js
const { getTableClient } = require("../services/azureTableStorage");

exports.getCloudChatHistories = async (req, res) => {
    const username = req.query.username;
    if (!username) {
        return res.status(400).json({ message: "username parameter required" });
    }

    const chatHistories = [];
    try {
        const tableClient = getTableClient("ChatHistories");
        const iterator = tableClient.listEntities({
            queryOptions: { filter: `PartitionKey eq '${username}'` }
        });

        for await (const entity of iterator) {
            chatHistories.push(entity);
        }

        res.json({ data: chatHistories });
    } catch (error) {
        console.error(`Failed to get chat histories: ${error.message}`);
        res.status(500).send(error.message);
    }
};

// controllers/chatHistoryController.js

exports.createCloudChatHistory = async (req, res) => {
    try {
        let chatHistory = req.body;

        // Assuming that the id is in the form of 'username_profileName_uuid'
        const [username, profileName, uuid] = chatHistory.id.split('_');

        // Update chatHistory to include PartitionKey and RowKey, 
        // and removing id as it is not required in Azure Table Storage format
        chatHistory = {
            ...chatHistory,
            PartitionKey: username,
            RowKey: uuid,
            // Ensure all the other required properties are included
        };

        // Remove 'id' property as it is not used in Azure Table Storage Entity
        delete chatHistory.id;

        // Create the chat history entity in the table
        const tableClient = getTableClient("ChatHistories");
        const createEntityResponse = await tableClient.createEntity(chatHistory);

        res.status(201).json({ data: createEntityResponse });
    } catch (error) {
        console.error(`Failed to create chat history: ${error.message}`);
        res.status(500).send(error.message);
    }
};



exports.updateCloudChatHistory = async (req, res) => {
    try {
        const username = req.params.username; // 或者通过其他方式获取用户名，如认证信息等
        const chatId = req.params.chatId;
        const chatHistoryData = req.body;
        const tableClient = getTableClient("ChatHistories");
        const updateEntityResponse = await tableClient.updateEntity({
            ...chatHistoryData,
            PartitionKey: username,
            RowKey: chatId
        }, { etag: "*" });
        res.status(200).json({ data: updateEntityResponse });
    } catch (error) {
        console.error(`Failed to update chat history: ${error.message}`);
        res.status(500).send(error.message);
    }
};


exports.deleteCloudChatHistory = async (req, res) => {
    try {
        const chatId = req.params.chatId;
        const tableClient = getTableClient("ChatHistories");

        // Get the existing entity so you can update its 'isDeleted' field
        const chatHistoryEntity = await tableClient.getEntity(req.query.username, chatId);

        // Soft delete the chat history by setting 'isDeleted' to true
        chatHistoryEntity.isDeleted = true;
        await tableClient.updateEntity(chatHistoryEntity, { etag: "*" });
        
        res.status(204).end();
    } catch (error) {
        console.error(`Failed to delete chat history: ${error.message}`);
        res.status(500).send(error.message);
    }
};

