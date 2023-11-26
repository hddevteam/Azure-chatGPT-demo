// tests/chatHistory.test.js
const {
    getCloudChatHistories,
    createCloudChatHistory,
    updateCloudChatHistory,
    deleteCloudChatHistory,
    createOrUpdateCloudChatHistory
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
const messagesTableClient = getTableClient("Messages");
const messageId = Math.random().toString(36).slice(2, 10);
  
// This function is used to clear the table after each test
async function clearTableEntity(partitionKey, rowKey) {
    try {
        await tableClient.deleteEntity(partitionKey, rowKey);
    } catch (error) {
        // Ignore if already deleted or non-existent
    }
}
  
describe("ChatHistory Controller", () => {

    beforeAll(async () => {
        // Create a new message in the table
        const message = {
            partitionKey: chatId,
            rowKey: messageId,
            messageId: messageId,
            role: "user",
            content: "Hello, Azure!",
            isActive: true
        };
        await messagesTableClient.createEntity(message);
    });
  
    afterAll(async () => {
        await clearTableEntity(username, testUUID);
        await clearTableEntity(chatId, messageId);
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

    test("Upsert ChatHistory in Azure Table Storage", async () => {
        const req = setupMockRequest({
            id: chatId,
            title: "ChatHistory",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        const res = setupMockResponse();
    
        await createOrUpdateCloudChatHistory(req, res);
    
        const expectedStatusCode = 200;
        expect(res.status).toHaveBeenCalledWith(expectedStatusCode);
        expect(res.json).toHaveBeenCalled();

        const reqUpdate = setupMockRequest({
            id: chatId,
            title: "Updated ChatHistory",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        const resUpdate = setupMockResponse();
        await createOrUpdateCloudChatHistory(reqUpdate, resUpdate);
        expect(resUpdate.status).toHaveBeenCalledWith(expectedStatusCode);
        expect(resUpdate.json).toHaveBeenCalled();
    
        const result = await tableClient.getEntity(username, testUUID);
        console.log(result);
        expect(result.rowKey).toEqual(testUUID);
        expect(result.title).toEqual("Updated ChatHistory");
    }, timeout);
    

  
    test("Delete a ChatHistory and associated Messages from Azure Table Storage", async () => {
        

        const req = setupMockRequest({}, {}, { chatId: chatId });
        const res = setupMockResponse();
    
        const messagesTableClient = getTableClient("Messages");  // Mocked in test setup
        const chatHistoriesTableClient = getTableClient("ChatHistories");  // Mocked in test setup
    
        await deleteCloudChatHistory(req, res);
    
        expect(res.status).toHaveBeenCalledWith(204);
        
        // verify that messages are deleted
        const messagesIterator = messagesTableClient.listEntities({
            queryOptions: { filter: `PartitionKey eq '${chatId}'` }
        });
    
        let messageExists = false;
        
        for await (const message of messagesIterator) {
            console.log(message);
            messageExists = true;
            break;
        }
        
        expect(messageExists).toBeFalsy();
    
        // Verify that the ChatHistory is marked as isDeleted
        
        const deletedEntity = await chatHistoriesTableClient.getEntity(username, testUUID);
        expect(deletedEntity.isDeleted).toBeTruthy();
        
    }, timeout); 
    
}, timeout);
  