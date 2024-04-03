// tests/azureBlobStorage.test.js
const { uploadTextToBlob, getTextFromBlob, uploadFileToBlob } = require("../services/azureBlobStorage");

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

    describe("Azure Blob Storage service for file content upload", () => {
        const containerName = "test-container";
        const originalFileName = "testFile.txt";
        const fileContent = "This is a test file content"; // 用字符串模拟文件内容

        test("uploadFileToBlob should upload file content and return metadata", async () => {
            const { filename, originalFileName: returnedFileName, url } = await uploadFileToBlob(containerName, originalFileName, fileContent);

            expect(filename).toBeDefined(); // 确保生成了blob名称
            expect(returnedFileName).toBe(originalFileName); // 确保原始文件名回传
            expect(url).toMatch(/^http[s]?:\/\//); // 确保URL格式正确
        });

    // 根据需要添加更多测试场景。
    });


    // 更多测试可以添加在这里，比如错误处理，权限问题等。
});
