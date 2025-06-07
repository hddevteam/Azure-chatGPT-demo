require("dotenv").config();
const { BlobServiceClient } = require("@azure/storage-blob");

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;

const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);

function getContentTypeByFileName(fileName) {
    const extension = fileName.split(".").pop().toLowerCase();
    const mimeTypes = {
        "png": "image/png",
        "jpeg": "image/jpeg",
        "jpg": "image/jpeg",
        "webp": "image/webp",
        "gif": "image/gif"
    };
    return mimeTypes[extension] || "application/octet-stream";
}
  
async function uploadFileToBlob(containerName, blobName, fileContent, username, additionalMetadata = null) { 
    try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        await containerClient.createIfNotExists({ access: "blob" });

        // No longer add timestamp, directly use the passed blobName
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        const contentType = getContentTypeByFileName(blobName);
        
        // Prepare upload options
        const options = {
            blobHTTPHeaders: { blobContentType: contentType }
        };
        
        // Build metadata object
        const metadata = {};
        
        // Add username
        if (username) {
            metadata.username = encodeURIComponent(username);
        }
        
        // Add additional metadata, URL encode all values
        if (additionalMetadata && typeof additionalMetadata === "object") {
            for (const [key, value] of Object.entries(additionalMetadata)) {
                if (value !== null && value !== undefined) {
                    // URL encode metadata values to ensure they can be passed as HTTP headers
                    metadata[key] = encodeURIComponent(String(value));
                }
            }
        }
        
        // If there's metadata, add it to options
        if (Object.keys(metadata).length > 0) {
            options.metadata = metadata;
        }
        
        console.log(`📋 Uploading blob ${blobName} with encoded metadata:`, metadata);
        
        // Handle different types of fileContent
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
        console.error("Error occurred while getting content from Blob:", error.toString());
        throw new Error("FailedToGetTextFromBlob");
    }
}


// Helper function to convert read stream to string
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
        // URL encode metadata values before setting them
        const encodedMetadataUpdates = {};
        for (const key in metadataUpdates) {
            const value = metadataUpdates[key];
            encodedMetadataUpdates[key] = encodeURIComponent(value);
        }

        // Get existing metadata
        const existingMetadata = (await blobClient.getProperties()).metadata;

        // Merge existing metadata with updated content
        const updatedMetadata = { ...existingMetadata, ...encodedMetadataUpdates };

        // Update Blob metadata
        await blobClient.setMetadata(updatedMetadata);

        console.log("Metadata updated successfully");
    } catch (error) {
        console.error("Error occurred while updating metadata:", error);
        throw error;
    }
}


async function deleteBlob(containerName, blobName) {
    try {
        if (!blobName) {
            throw new Error("Blob name is required and cannot be undefined or empty");
        }
        
        console.log(`Deleting blob: ${blobName} from container: ${containerName}`);
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        await blockBlobClient.delete();
        console.log(`Successfully deleted blob: ${blobName}`);
    } catch (error) {
        console.error(`Failed to delete blob: ${blobName}`, error);
        throw error;
    }
}

async function listBlobsByUser(username, containerName = "audiofiles") {
    try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        
        // Create container if it doesn't exist
        await containerClient.createIfNotExists({ access: "blob" });
        
        let blobs = [];
        const containerUrl = containerClient.url; 

        for await (const blob of containerClient.listBlobsFlat({ includeMetadata: true })) {
            if (blob.metadata && blob.metadata.username) {
                // Decode username for comparison
                const decodedUsername = decodeURIComponent(blob.metadata.username);
                if (decodedUsername === username) {
                    const blobUrl = `${containerUrl}/${blob.name}`; 
                    
                    // Decode all metadata values
                    const decodedMetadata = {};
                    if (blob.metadata) {
                        for (const [key, value] of Object.entries(blob.metadata)) {
                            if (value) {
                                decodedMetadata[key] = decodeURIComponent(value);
                            }
                        }
                    }
                    
                    blobs.push({ 
                        name: blob.name, 
                        contentLength: blob.properties.contentLength,
                        url: blobUrl,
                        metadata: decodedMetadata,
                        transcriptionStatus: decodedMetadata.transcriptionStatus, // Transcription status
                        transcriptionUrl: decodedMetadata.transcriptionUrl, // Transcription result URL
                        transcriptionId: decodedMetadata.transcriptionId, // Transcription ID
                        lastModified: blob.properties.lastModified
                    });
                }
            }
        }
        return blobs;
    } catch (error) {
        console.error("Error listing blobs by user:", error);
        throw error;
    }
}

async function checkBlobExists(containerName, blobName) {
    try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blobClient = containerClient.getBlobClient(blobName);

        const exists = await blobClient.exists();
        return exists;
    } catch (error) {
        console.error(`Error occurred while checking Blob existence: ${error}`);
        throw error;
    }
}

async function getTextFromBlobByPath(blobPath) {
    try {
        console.log(`Getting text from blob: ${blobPath}`);
        const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
        
        // Correctly parse container name and blob name
        let [containerName, ...blobNameParts] = blobPath.split('/');
        const blobName = decodeURIComponent(blobNameParts.join('/')); // Ensure URL-encoded filename is properly decoded
        
        console.log(`Container: ${containerName}, Blob: ${blobName}`);
        
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blobClient = containerClient.getBlobClient(blobName);
        
        // Check if blob exists
        const exists = await blobClient.exists();
        if (!exists) {
            throw new Error(`Blob not found: ${blobName}`);
        }
        
        // Download blob content
        const downloadResponse = await blobClient.download();
        const content = await streamToBuffer(downloadResponse.readableStreamBody);
        
        return content.toString('utf-8');
    } catch (error) {
        console.error(`Error getting text from blob: ${error.message}`);
        throw error;
    }
}

// Helper function: convert stream to buffer
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
