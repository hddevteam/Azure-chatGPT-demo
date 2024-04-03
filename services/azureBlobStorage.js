// services/azureBlobStorage.js
require("dotenv").config();
const { BlobServiceClient } = require("@azure/storage-blob");

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;

const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);

// 在services/azureBlobStorage.js中更新uploadFileToBlob函数

async function uploadFileToBlob(containerName, originalFileName, fileContent) {
    try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        await containerClient.createIfNotExists({ access: "blob" });

        const blobName = `${Date.now()}-${originalFileName}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        await blockBlobClient.upload(fileContent, Buffer.byteLength(fileContent));
        await blockBlobClient.setMetadata({ originalFileName });

        return {
            filename: blobName,
            originalFileName: originalFileName,
            url: blockBlobClient.url,
        };
    } catch (error) {
        console.error("Failed to upload file to blob", error);
        throw error;
    }
}



async function uploadTextToBlob(containerName, blobName, text) {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    await containerClient.createIfNotExists({ access: "blob" });

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.upload(text, Buffer.byteLength(text));
    return blockBlobClient.url;
}

async function getTextFromBlob(url) {
    const response = await fetch(url);
    if (response.status === 404) { // Check for a 404 Not Found status
        throw new Error("BlobNotFound");
    }
    if (!response.ok) {
        // Throw an error for other types of HTTP errors
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.text();
}


async function deleteBlob(containerName, blobName) {
    try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        await blockBlobClient.delete();
    } catch (error) {
        console.error(`Failed to delete blob: ${blobName}`, error);
        throw error;
    }
}


module.exports = { uploadTextToBlob, getTextFromBlob, deleteBlob, uploadFileToBlob };
