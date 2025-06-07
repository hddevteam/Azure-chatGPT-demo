// tests/azureBlobStorage.test.js
const { uploadTextToBlob, getTextFromBlob, uploadFileToBlob } = require("../services/azureBlobStorage");

describe("Azure Blob Storage service", () => {
    const containerName = "test-container";
    const blobName = "test-blob";
    const testContent = "Hello, world!";

    test("uploadTextToBlob should upload text and return a blob URL", async () => {
        const url = await uploadTextToBlob(containerName, blobName, testContent);
        expect(url).toMatch(/http[s]?:\/\/.+/);  // Ensure the returned value is a URL
    });

    test("getTextFromBlob should retrieve the text content from the blob URL", async () => {
        const url = await uploadTextToBlob(containerName, blobName, testContent); // First upload for testing
        const content = await getTextFromBlob(url);
        expect(content).toBe(testContent);
    });

    describe("Azure Blob Storage service for file content upload", () => {
        const containerName = "test-container";
        const originalFileName = "testFile.txt";
        const fileContent = "This is a test file content"; // Use string to simulate file content

        test("uploadFileToBlob should upload file content and return metadata", async () => {
            const { filename, originalFileName: returnedFileName, url } = await uploadFileToBlob(containerName, originalFileName, fileContent);

            expect(filename).toBeDefined(); // Ensure blob name is generated
            expect(returnedFileName).toBe(originalFileName); // Ensure original file name is returned
            expect(url).toMatch(/^http[s]?:\/\//); // Ensure URL format is correct
        });

    // Add more test scenarios as needed.
    });


    // Additional tests can be added here, such as error handling, permission issues, etc.
});
