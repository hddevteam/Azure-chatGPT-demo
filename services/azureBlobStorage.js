// services/azureBlobStorage.js
require("dotenv").config();
const { BlobServiceClient } = require("@azure/storage-blob");

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;

const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);

async function uploadTextToBlob(containerName, blobName, text) {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    await containerClient.createIfNotExists({ access: "blob" });

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const uploadBlobResponse = await blockBlobClient.upload(text, Buffer.byteLength(text));
    return blockBlobClient.url;
}

async function getTextFromBlob(url) {
    const response = await fetch(url);
    return await response.text();
}


async function deleteBlob(containerName, blobName) {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.delete();
}

module.exports = { uploadTextToBlob, getTextFromBlob, deleteBlob };
