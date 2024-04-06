// tests/message.test.js
const {
    getCloudMessages,
    createCloudMessage,
    updateCloudMessage,
    deleteCloudMessage,
    uploadAttachment,
    uploadAttachmentAndUpdateMessage,
    deleteAttachment
} = require("../controllers/messageController");

const { getTextFromBlob } = require("../services/azureBlobStorage");
  
const { getTableClient } = require("../services/azureTableStorage");
  
const { v4: uuidv4 } = require("uuid");
  
const tableClient = getTableClient("Messages");
  
const chatHistoryId = `testChat_${uuidv4()}`;
const messageId = Math.random().toString(36).slice(2, 10);
const longMessageId = Math.random().toString(36).slice(2, 10);
const pastMessageId = Math.random().toString(36).slice(2, 10);
const futureMessageId = Math.random().toString(36).slice(2, 10);

const timeout = 30000;
  
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

    beforeAll(async () => {

        // Create an older message in the table
        await tableClient.createEntity({
            partitionKey: chatHistoryId,
            rowKey: pastMessageId,
            content: "Past Message",
            isActive: true,
        });

    });
  
    afterAll(async () => {
        await clearTableEntity(chatHistoryId, messageId);
        await clearTableEntity(chatHistoryId, longMessageId);
        
        await clearTableEntity(chatHistoryId, pastMessageId);
        await clearTableEntity(chatHistoryId, futureMessageId);
        
    });
  
    test("Create a new Message in Azure Table Storage", async () => {
        const req = setupMockRequest({
            messageId: messageId,
            role: "user",
            content: "Hello, Azure!",
            isActive: true
        },{},{
            chatId: chatHistoryId,
        }
        );
  
        const res = setupMockResponse();
  
        await createCloudMessage(req, res);
  
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalled();
  
        const result = await tableClient.getEntity(chatHistoryId, messageId);
        expect(result.rowKey).toEqual(messageId);
    }, timeout);
  
    test("Retrieve Messages from Azure Table Storage", async () => {
        const req = setupMockRequest({}, {}, { chatId: chatHistoryId });
        const res = setupMockResponse();
  
        await getCloudMessages(req, res);
  
        expect(res.json).toHaveBeenCalled();
        const result = res.json.mock.calls[0][0];
        expect(result.data).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    partitionKey: chatHistoryId,
                    rowKey: messageId
                })
            ])
        );
    }, timeout);

    let uploadedAttachmentUrl = "";

    test("Upload a new Attachment to Blob", async () => {
        const req = setupMockRequest({}, {}, {});
        // 向req对象直接添加file属性
        req.file = {
            buffer: Buffer.from("This is a test attachment content"),
            originalname: "testAttachment.txt"
        };
    
        const res = setupMockResponse();
    
        await uploadAttachment(req, res);
    
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalled();
    }, timeout);
    
    test("Upload a new Attachment to Blob and Update the Message", async () => {
        const req = setupMockRequest({
            fileContent: Buffer.from("This is a test attachment content").toString("base64"),
            originalFileName: "testAttachment.txt"
        }, {}, {
            chatId: chatHistoryId,
            messageId: messageId
        });
    
        const res = setupMockResponse();
    
        await uploadAttachmentAndUpdateMessage(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalled();
    
        const updatedEntity = await tableClient.getEntity(chatHistoryId, messageId);
        expect(updatedEntity.attachmentUrls).toContain("testAttachment.txt");
        // Save the URL from the uploaded attachment
        uploadedAttachmentUrl = updatedEntity.attachmentUrls.split(";").find(url => url.includes("testAttachment.txt"));

    }, timeout);
    

    // 测试用例中假设已经有 uploadedAttachmentUrl 包含正确的附件URL
    test("Delete an Attachment from Blob and Update the Message", async () => {
        expect(uploadedAttachmentUrl).not.toBe("");

        // 将attachmentUrl作为请求体传递
        const req = setupMockRequest({
            attachmentUrl: uploadedAttachmentUrl
        }, {}, {
            chatId: chatHistoryId,
            messageId: messageId
        });

        const res = setupMockResponse();

        await deleteAttachment(req, res);

        expect(res.status).toHaveBeenCalledWith(204);

        const updatedEntity = await tableClient.getEntity(chatHistoryId, messageId);
        // 使用更精确的断言来确认attachmentUrl不再出现在attachmentUrls字段中
        expect(updatedEntity.attachmentUrls).not.toContain(uploadedAttachmentUrl);
    }, timeout);


    test("should only return messages with timestamp after the provided lastTimestamp", async () => {
        const req = setupMockRequest({}, { lastTimestamp: new Date().toISOString() }, { chatId: chatHistoryId });

        // Create a future message in the table        
        await tableClient.createEntity({
            partitionKey: chatHistoryId,
            rowKey: futureMessageId,
            content: "Future Message",
            isActive: true,
        });
        
        const res = setupMockResponse();

        await getCloudMessages(req, res);

        expect(res.json).toHaveBeenCalled();
        const result = res.json.mock.calls[0][0];

        // Should only include the future message that is newer than now
        expect(result.data).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    partitionKey: chatHistoryId,
                    rowKey: futureMessageId
                })
            ])
        );

        // Should not include the past message that is older than now
        expect(result.data).not.toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    rowKey: pastMessageId
                })
            ])
        );
    }, timeout);
  
    test("Update a Message in Azure Table Storage", async () => {
        const newContent = "Goodbye, Azure!";
        const req = setupMockRequest({
            messageId: messageId,
            content: newContent,
        },{},{
            chatId: chatHistoryId,
        });
        const res = setupMockResponse();
  
        await updateCloudMessage(req, res);
  
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalled();
  
        const updatedEntity = await tableClient.getEntity(chatHistoryId, messageId);
        expect(updatedEntity.content).toEqual(newContent);
    }, timeout);
  
    test("Delete a Message from Azure Table Storage", async () => {
        const req = setupMockRequest({}, {}, {
            chatId: chatHistoryId,
            messageId: messageId
        });
        const res = setupMockResponse();
  
        await deleteCloudMessage(req, res);
  
        expect(res.status).toHaveBeenCalledWith(204);
  
        const deletedEntity = await tableClient.getEntity(chatHistoryId, messageId);
        expect(deletedEntity.isDeleted).toBeTruthy();
    }, timeout);

    test("Create and Delete a Message with Blob from Azure Table Storage", async () => {
        // Create a message with large content using the 'createCloudMessage' method
        const largeContent = "a".repeat(32 * 1024 + 1);
        const reqCreate = setupMockRequest({
            messageId: longMessageId,
            role: "user",
            content: largeContent,
            isActive: true,
        }, {}, { chatId: chatHistoryId });
    
        const resCreate = setupMockResponse();
    
        // Create the message
        await createCloudMessage(reqCreate, resCreate);

        expect(resCreate.status).toHaveBeenCalledWith(201);

        // Save the URL from the large message's content, it should be the URL pointing to the Blob
        const blobUrl = resCreate.json.mock.calls[0][0].data.content;
        console.log("blobUrl", blobUrl);
        // Delete the message using the 'deleteCloudMessage' method
        const reqDelete = setupMockRequest({}, {}, {
            chatId: chatHistoryId,
            messageId: longMessageId,
        });
        const resDelete = setupMockResponse();
    
        // Delete the message
        await deleteCloudMessage(reqDelete, resDelete);
        expect(resDelete.status).toHaveBeenCalledWith(204);
    
        // Now check if the Blob has been deleted using 'getTextFromBlob' and expecting it to fail
        await expect(getTextFromBlob(blobUrl)).rejects.toThrow("BlobNotFound");
    }, timeout);

}, timeout);