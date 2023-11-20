// tests/azureBlobStorage.test.js
const { uploadTextToBlob, getTextFromBlob } = require("../services/azureBlobStorage");

describe("Azure Blob Storage service", () => {
    const containerName = "test-container";
    const blobName = "test-blob";
    const testContent = "Hello, world!";

    test("uploadTextToBlob should upload text and return a blob URL", async () => {
        const url = await uploadTextToBlob(containerName, blobName, testContent);
        expect(url).toMatch(/http[s]?:\/\/.+/);  // 确定返回的是一个URL
    });

    test("getTextFromBlob should retrieve the text content from the blob URL", async () => {
        const url = await uploadTextToBlob(containerName, blobName, testContent); // 首先上传以便测试
        const content = await getTextFromBlob(url);
        expect(content).toBe(testContent);
    });

    // 更多测试可以添加在这里，比如错误处理，权限问题等。
});
