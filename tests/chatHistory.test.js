// tests/chatHistory.test.js
const {
    getCloudChatHistories,
    createCloudChatHistory,
    updateCloudChatHistory,
    deleteCloudChatHistory
} = require("../controllers/chatHistoryController");
  
const { getTableClient } = require("../services/azureTableStorage");
  
const { v4: uuidv4 } = require("uuid");
const timeout = 30000;
  
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
  
// Ensure unique ID for each test
const testUUID = uuidv4();
const username = "testUser";
const profileName = "testProfile";
const chatId = `${username}_${profileName}_${testUUID}`;
const tableClient = getTableClient("ChatHistories");
  
// This function is used to clear the table after each test
async function clearTableEntity(partitionKey, rowKey) {
    try {
        await tableClient.deleteEntity(partitionKey, rowKey);
    } catch (error) {
        // Ignore if already deleted or non-existent
    }
}
  
describe("ChatHistory Controller", () => {
  
    afterAll(async () => {
        await clearTableEntity(username, testUUID);
    });
  
    test("Create a new ChatHistory in Azure Table Storage", async () => {
        const req = setupMockRequest({
            id: chatId,
            title: "New ChatHistory",
            profileName: profileName,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
  
        const res = setupMockResponse();
  
        await createCloudChatHistory(req, res);
  
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalled();
      
        // Check if the entity was actually created in Azure
        const result = await tableClient.getEntity(username, testUUID);
        console.log(result);
        expect(result.rowKey).toEqual(testUUID);
    }, timeout);
  
    test("Retrieve ChatHistories from Azure Table Storage", async () => {
        const req = setupMockRequest({}, {}, {username: username});
        const res = setupMockResponse();
  
        await getCloudChatHistories(req, res);
  
        expect(res.json).toHaveBeenCalled();
        const result = res.json.mock.calls[0][0];
        expect(result.data).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    partitionKey: username,
                    rowKey: testUUID
                })
            ])
        );
    }, timeout);
  
    test("Update a ChatHistory in Azure Table Storage", async () => {
        const newTitle = "Updated ChatHistory";
        const req = setupMockRequest({
            id: chatId,
            title: newTitle,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },{
        },{});
        const res = setupMockResponse();
  
        await updateCloudChatHistory(req, res);
  
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalled();
      
        const updatedEntity = await tableClient.getEntity(username, testUUID);
        expect(updatedEntity.title).toEqual(newTitle);
    }, timeout);
  
    test("Delete a ChatHistory from Azure Table Storage", async () => {
        const req = setupMockRequest({}, {}, { chatId: chatId });
        const res = setupMockResponse();
  
        await deleteCloudChatHistory(req, res);

        expect(res.status).toHaveBeenCalledWith(204);

        // 检索实体以确认isDeleted字段已设置为true
        const deletedEntity = await tableClient.getEntity(username, testUUID);
        expect(deletedEntity.isDeleted).toBeTruthy();
    }, timeout);
}, timeout);
  