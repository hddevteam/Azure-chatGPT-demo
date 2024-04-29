// services/azureBlobStorage.js
require("dotenv").config();
const { BlobServiceClient } = require("@azure/storage-blob");

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;

const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);

// 该函数用于根据文件扩展名返回对应的内容类型
function getContentTypeByFileName(fileName) {
    const extension = fileName.split(".").pop().toLowerCase();
    const mimeTypes = {
        "png": "image/png",
        "jpeg": "image/jpeg",
        "jpg": "image/jpeg",
        "webp": "image/webp",
        "gif": "image/gif"
    };
    // 默认返回 application/octet-stream 表示“二进制流”类型
    return mimeTypes[extension] || "application/octet-stream";
}
  
async function uploadFileToBlob(containerName, originalFileName, fileContent, username) { 
    try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        await containerClient.createIfNotExists({ access: "blob" });

        const blobName = `${Date.now()}-${originalFileName}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        const contentType = getContentTypeByFileName(originalFileName);

        await blockBlobClient.upload(fileContent, Buffer.byteLength(fileContent), {
            blobHTTPHeaders: { blobContentType: contentType },
            metadata: { username }  // 在这里设置metadata
        });

        return {
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

async function getTextContentFromBlob(containerName, blobName) {
    try {
        // 获取容器客户端
        const containerClient = blobServiceClient.getContainerClient(containerName);
        // 获取Blob客户端
        const blobClient = containerClient.getBlobClient(blobName);
        // 下载Blob内容到Buffer
        const downloadBlockBlobResponse = await blobClient.download(0);
        // 将Buffer转为字符串
        const downloadedContent = await streamToString(downloadBlockBlobResponse.readableStreamBody);
        return downloadedContent;
    } catch (error) {
        console.error("从Blob获取内容时发生错误:", error.toString());
        throw new Error("FailedToGetTextFromBlob");
    }
}

// 辅助函数，将读取流转换为字符串
async function streamToString(readableStream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        readableStream.on("data", (data) => {
            chunks.push(data.toString());
        });
        readableStream.on("end", () => {
            resolve(chunks.join(""));
        });
        readableStream.on("error", reject);
    });
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

async function updateBlobMetadata(containerName, blobName, metadata) {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(blobName);
    const blockBlobClient = blobClient.getBlockBlobClient();
    
    await blockBlobClient.setMetadata(metadata);
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

async function listBlobsByUser(username) {
    const containerClient = blobServiceClient.getContainerClient("audiofiles");
    let blobs = [];
    const containerUrl = containerClient.url; 

    for await (const blob of containerClient.listBlobsFlat({ includeMetadata: true })) {
        if (blob.metadata && blob.metadata.username === username) {
            const blobUrl = `${containerUrl}/${blob.name}`; // 构造blob的完整访问URL
            // 确保这里提取了所有需要的metadata，如 transcriptionStatus, transcriptionUrl, 以及 transcriptionId
            blobs.push({ 
                name: blob.name, 
                contentLength: blob.properties.contentLength,
                url: blobUrl,
                transcriptionStatus: blob.metadata.transcriptionStatus, // 转录状态
                transcriptionUrl: blob.metadata.transcriptionUrl, // 转录结果URL
                transcriptionId: blob.metadata.transcriptionId // 转录ID
            });
        }
    }
    return blobs;
}

module.exports = { uploadTextToBlob, getTextFromBlob, deleteBlob, uploadFileToBlob, listBlobsByUser, updateBlobMetadata, getTextContentFromBlob };
