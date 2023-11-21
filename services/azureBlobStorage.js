// services/azureBlobStorage.js
require("dotenv").config();
const { BlobServiceClient } = require("@azure/storage-blob");

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;

const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);

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
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.delete();
}

module.exports = { uploadTextToBlob, getTextFromBlob, deleteBlob };
