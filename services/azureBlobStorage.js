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
  
async function uploadFileToBlob(containerName, blobName, fileContent, username) { 
    try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        await containerClient.createIfNotExists({ access: "blob" });

        // 不再添加时间戳，直接使用传入的 blobName
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        const contentType = getContentTypeByFileName(blobName);
        
        // 准备上传选项
        const options = {
            blobHTTPHeaders: { blobContentType: contentType }
        };
        
        // 只有当username存在时才添加metadata
        if (username) {
            options.metadata = { username };
        }
        
        // 处理不同类型的fileContent
        const contentLength = Buffer.isBuffer(fileContent) ? fileContent.length : Buffer.byteLength(fileContent);
        
        await blockBlobClient.upload(fileContent, contentLength, options);

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
        const decodedBlobName = decodeURIComponent(blobName);
        console.log("decodedBlobName", decodedBlobName);
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blobClient = containerClient.getBlobClient(decodedBlobName);
        const downloadBlockBlobResponse = await blobClient.download(0);
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

async function updateBlobMetadata(containerName, blobName, metadataUpdates) {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(blobName);

    try {
        // 在设置之前对元数据的值进行URL编码
        const encodedMetadataUpdates = {};
        for (const key in metadataUpdates) {
            const value = metadataUpdates[key];
            encodedMetadataUpdates[key] = encodeURIComponent(value);
        }

        // 获取现有的元数据
        const existingMetadata = (await blobClient.getProperties()).metadata;

        // 合并现有的元数据与更新内容
        const updatedMetadata = { ...existingMetadata, ...encodedMetadataUpdates };

        // 更新 Blob 元数据
        await blobClient.setMetadata(updatedMetadata);

        console.log("元数据更新成功");
    } catch (error) {
        console.error("更新元数据时发生错误：", error);
        throw error;
    }
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
            const blobUrl = `${containerUrl}/${blob.name}`; 
            blobs.push({ 
                name: blob.name, 
                contentLength: blob.properties.contentLength,
                url: blobUrl,
                transcriptionStatus: blob.metadata.transcriptionStatus, // 转录状态
                transcriptionUrl: blob.metadata.transcriptionUrl, // 转录结果URL
                transcriptionId: blob.metadata.transcriptionId, // 转录ID
                lastModified: blob.properties.lastModified
            });
        }
    }
    return blobs;
}

async function checkBlobExists(containerName, blobName) {
    try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blobClient = containerClient.getBlobClient(blobName);

        const exists = await blobClient.exists();
        return exists;
    } catch (error) {
        console.error(`检查Blob存在时发生错误: ${error}`);
        throw error;
    }
}

async function getTextFromBlob(blobPath) {
    try {
        console.log(`Getting text from blob: ${blobPath}`);
        const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
        
        // 正确解析容器名和 blob 名称
        let [containerName, ...blobNameParts] = blobPath.split('/');
        const blobName = decodeURIComponent(blobNameParts.join('/')); // 确保 URL 编码的文件名被正确解码
        
        console.log(`Container: ${containerName}, Blob: ${blobName}`);
        
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blobClient = containerClient.getBlobClient(blobName);
        
        // 检查 blob 是否存在
        const exists = await blobClient.exists();
        if (!exists) {
            throw new Error(`Blob not found: ${blobName}`);
        }
        
        // 下载 blob 内容
        const downloadResponse = await blobClient.download();
        const content = await streamToBuffer(downloadResponse.readableStreamBody);
        
        return content.toString('utf-8');
    } catch (error) {
        console.error(`Error getting text from blob: ${error.message}`);
        throw error;
    }
}

// 辅助函数：将流转换为buffer
async function streamToBuffer(readableStream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        readableStream.on("data", (data) => {
            chunks.push(data instanceof Buffer ? data : Buffer.from(data));
        });
        readableStream.on("end", () => {
            resolve(Buffer.concat(chunks));
        });
        readableStream.on("error", reject);
    });
}

module.exports = { uploadTextToBlob, getTextFromBlob, deleteBlob, uploadFileToBlob, listBlobsByUser, updateBlobMetadata, getTextContentFromBlob, checkBlobExists };
