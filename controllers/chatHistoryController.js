// controllers/chatHistoryController.js
const { getTableClient } = require("../services/azureTableStorage");

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
        // Assuming that the id is in the form of 'username_profileName_uuid'
        let [username, profileName, uuid] = chatHistory.id.split("_");
        // if !uuid, uuid = 0
        if (!uuid) {
            uuid = "0";
        }
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
        const username = req.params.username; // 或者通过其他方式获取用户名，如认证信息等
        const chatId = req.params.chatId;
        const uuid = chatId.split("_")[2]||"0";
        const chatHistoryData = req.body;
        console.log(username, chatId, uuid, chatHistoryData);
        const tableClient = getTableClient("ChatHistories");
        await tableClient.updateEntity({
            partitionKey: username,
            rowKey: uuid,
            ...chatHistoryData
        });
        console.log("chat history updated");
        const updateEntity = await tableClient.getEntity(username, uuid);
        res.status(200).json({ data: updateEntity });
    } catch (error) {
        console.error(`Failed to update chat history: ${error.message}`);
        res.status(500).send(error.message);
    }
};


exports.deleteCloudChatHistory = async (req, res) => {
    console.log("deleteCloudChatHistory");
    try {
        const username = req.params.username;
        const chatId = req.params.chatId;
        const uuid = chatId.split("_")[2]||"0";
        console.log(username, chatId, uuid);

        const tableClient = getTableClient("ChatHistories");
        // Soft delete the chat history by setting 'isDeleted' to true
        let chatHistoryData = await tableClient.getEntity(username, uuid);
        console.log(chatHistoryData);
        chatHistoryData.isDeleted = true;
        await tableClient.updateEntity({
            partitionKey: username,
            rowKey: uuid,
            ...chatHistoryData
        });
        console.log("chat history deleted");
        const deleteEntity = await tableClient.getEntity(username, uuid);
        res.status(204).end( deleteEntity );
    } catch (error) {
        console.error(`Failed to delete chat history: ${error.message}`);
        res.status(500).send(error.message);
    }
};

