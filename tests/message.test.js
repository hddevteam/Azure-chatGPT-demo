// tests/message.test.js
const {
    getCloudMessages,
    createCloudMessage,
    updateCloudMessage,
    deleteCloudMessage
} = require("../controllers/messageController");
  
const { getTableClient } = require("../services/azureTableStorage");
  
const { v4: uuidv4 } = require("uuid");
  
const tableClient = getTableClient("Messages");
  
const chatHistoryId = `testChat_${uuidv4()}`;
const messageId = uuidv4();
  
async function clearTableEntity(partitionKey, rowKey) {
    try {
        await tableClient.deleteEntity(partitionKey, rowKey);
    } catch (error) {
        // Ignore if already deleted or non-existent
    }
}
// Setup request and response mock objects for Express controllers
function setupMockRequest(bodyParams = {}, queryParams = {}, pathParams = {}) {
    return {
        body: bodyParams,
        query: queryParams,
        params: pathParams
    };
}
  
function setupMockResponse() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.end = jest.fn().mockReturnValue(res);
    return res;
}
  
describe("Message Controller", () => {
  
    afterAll(async () => {
        await clearTableEntity(chatHistoryId, messageId);
    });
  
    test("Create a new Message in Azure Table Storage", async () => {
        const req = setupMockRequest({
            chatId: chatHistoryId,
            messageId: messageId,
            role: "user",
            content: "Hello, Azure!"
        });
  
        const res = setupMockResponse();
  
        await createCloudMessage(req, res);
  
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalled();
  
        const result = await tableClient.getEntity(chatHistoryId, messageId);
        expect(result.RowKey).toEqual(messageId);
    });
  
    test("Retrieve Messages from Azure Table Storage", async () => {
        const req = setupMockRequest({}, {}, { chatId: chatHistoryId });
        const res = setupMockResponse();
  
        await getCloudMessages(req, res);
  
        expect(res.json).toHaveBeenCalled();
        const result = res.json.mock.calls[0][0];
        expect(result.data).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    PartitionKey: chatHistoryId,
                    RowKey: messageId
                })
            ])
        );
    });
  
    test("Update a Message in Azure Table Storage", async () => {
        const newContent = "Goodbye, Azure!";
        const req = setupMockRequest({
            content: newContent
        },{
            chatId: chatHistoryId,
            messageId: messageId
        });
        const res = setupMockResponse();
  
        await updateCloudMessage(req, res);
  
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalled();
  
        const updatedEntity = await tableClient.getEntity(chatHistoryId, messageId);
        expect(updatedEntity.content).toEqual(newContent);
    });
  
    test("Delete a Message from Azure Table Storage", async () => {
        const req = setupMockRequest({}, {}, {
            chatId: chatHistoryId,
            messageId: messageId
        });
        const res = setupMockResponse();
  
        await deleteCloudMessage(req, res);
  
        expect(res.status).toHaveBeenCalledWith(204);
  
        await expect(tableClient.getEntity(chatHistoryId, messageId)).rejects.toThrow();
    });
});
  