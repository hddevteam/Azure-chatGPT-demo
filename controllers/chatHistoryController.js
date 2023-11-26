// controllers/chatHistoryController.js
const { getTableClient } = require("../services/azureTableStorage");

const parseChatId = (chatId) => {
    const parts = chatId.split("_");
    if (parts.length !== 3) {
        throw new Error("Invalid chatId format. Expected format: username_profileName_uuid, but got: " + chatId);
    }
    const [username, profileName, uuid] = parts;
    if(!username.trim() || !profileName.trim() || !uuid.trim()) {
        throw new Error("Invalid chatId format. All components must be non-empty.");
    }
    return { username, profileName, uuid };
};


exports.getCloudChatHistories = async (req, res) => {
    const username = req.params.username;
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

exports.createCloudChatHistory = async (req, res) => {
    try {
        let chatHistory = req.body;
        console.log(chatHistory);
        let parsed;
        try {
            parsed = parseChatId(chatHistory.id);
        } catch (error) {
            console.error(error.message);
            return res.status(400).json({ message: error.message });
        }
        const { username, profileName, uuid } = parsed;
        console.log(username, profileName, uuid);

        // Update chatHistory to include PartitionKey and RowKey, 
        // and removing id as it is not required in Azure Table Storage format
        chatHistory = {
            ...chatHistory,
            partitionKey: username,
            rowKey: uuid,
            // Ensure all the other required properties are included
        };

        // Create the chat history entity in the table
        const tableClient = getTableClient("ChatHistories");
        await tableClient.createEntity(chatHistory);
        console.log("chat history created");
        const createdEntity = await tableClient.getEntity(username, uuid);
        res.status(201).json({ data: createdEntity });
    } catch (error) {
        console.error(`Failed to create chat history: ${error.message}`);
        res.status(500).send(error.message);
    }
};



exports.updateCloudChatHistory = async (req, res) => {
    console.log("updateCloudChatHistory");
    try {
        let chatHistory = req.body;
        let parsed;
        try {
            parsed = parseChatId(chatHistory.id);
        } catch (error) {
            console.error(error.message);
            return res.status(400).json({ message: error.message });
        }
        const { username, profileName, uuid } = parsed;
        console.log(username, profileName, uuid);
        const tableClient = getTableClient("ChatHistories");
        await tableClient.updateEntity({
            partitionKey: username,
            rowKey: uuid,
            ...chatHistory
        });
        console.log("chat history updated");
        const updateEntity = await tableClient.getEntity(username, uuid);
        res.status(200).json({ data: updateEntity });
    } catch (error) {
        console.error(`Failed to update chat history: ${error.message}`);
        res.status(500).send(error.message);
    }
};

exports.createOrUpdateCloudChatHistory = async (req, res) => {
    try {
        let chatHistory = req.body;
        console.log(chatHistory);
        let parsed;
        try {
            parsed = parseChatId(chatHistory.id);
        } catch (error) {
            console.error(error.message);
            return res.status(400).json({ message: error.message });
        }

        const { username, profileName, uuid } = parsed; // I assume profileName is not required for the operation itself
        console.log(username, profileName, uuid);

        chatHistory = {
            ...chatHistory,
            partitionKey: username,
            rowKey: uuid,
        };

        const tableClient = getTableClient("ChatHistories");
        await tableClient.upsertEntity(chatHistory);

        console.log(`chat history upserted: ${uuid}`);
        const upsertedEntity = await tableClient.getEntity(username, uuid);
        res.status(200).json({ data: upsertedEntity });
    } catch (error) {
        console.error(`Failed to upsert chat history: ${error.message}`);
        res.status(500).send(error.message);
    }
};



exports.deleteCloudChatHistory = async (req, res) => {
    console.log("deleteCloudChatHistory");
    try {
        const chatId = req.params.chatId;
        let parsed;
        try {
            parsed = parseChatId(chatId);
        } catch (error) {
            console.error(error.message);
            return res.status(400).json({ message: error.message });
        }
        const { username, profileName, uuid } = parsed;
        console.log(username, profileName, uuid);

        // Get the Messages table client
        const messagesTableClient = getTableClient("Messages");
        // Query all messages for this chatId
        const messagesIterator = messagesTableClient.listEntities({
            queryOptions: { filter: `PartitionKey eq '${chatId}'` }
        });
        
        for await (const message of messagesIterator) {
            // Delete the message entity
            await messagesTableClient.deleteEntity(message.partitionKey, message.rowKey);
        }

        // Continue deleting the ChatHistory
        const tableClient = getTableClient("ChatHistories");
        let chatHistoryData = await tableClient.getEntity(username, uuid);
        console.log(chatHistoryData);

        // Assuming that there might be cases where the data may not exist and we don't want to throw an error
        if (chatHistoryData) {
            chatHistoryData.isDeleted = true;
            await tableClient.updateEntity({
                partitionKey: username,
                rowKey: uuid,
                ...chatHistoryData
            });
        }
        console.log("chat history marked as deleted");

        res.status(204).end();
    } catch (error) {
        console.error(`Failed to delete chat history: ${error.message}`);
        res.status(500).send(error.message);
    }
}; 
