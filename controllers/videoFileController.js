//controller/videoFileController.js
const { uploadFileToBlob, listBlobsByUser, deleteBlob } = require("../services/azureBlobStorage");
require("dotenv").config();

const containerName = "videofiles"; // Video files are stored in this container

/**
 * Upload video file to Azure Blob Storage
 */
exports.uploadVideofile = async (req, res) => {
    const fileContent = req.file.buffer; // Binary content of the file
    const originalFileName = req.body.originalFileName || req.file.originalname;
    const username = req.body.username; // Get username from request
    const jobId = req.body.jobId; // Sora job ID for reference
    const prompt = req.body.prompt; // Video generation prompt

    try {
        // Create unique filename with timestamp to avoid conflicts
        const timestamp = Date.now();
        const extension = originalFileName.split(".").pop();
        const uniqueFileName = `sora_${jobId}_${timestamp}.${extension}`;
        
        // Pass username, jobId, prompt as metadata to uploadFileToBlob
        const videoFile = await uploadFileToBlob(containerName, uniqueFileName, fileContent, username, {
            jobId: jobId,
            prompt: prompt,
            originalFileName: originalFileName,
            generatedAt: new Date().toISOString()
        });
        
        console.log("Video file uploaded:", videoFile);
        res.status(201).json({
            url: videoFile.url,
            fileName: uniqueFileName,
            originalFileName: originalFileName,
            jobId: jobId
        });
    } catch (error) {
        console.error(`Failed to upload video file: ${error.message}`);
        res.status(500).send(error.message);
    }
};

/**
 * List video files for a specific user
 */
exports.listVideoFiles = async (req, res) => {
    console.log("listVideoFiles");
    try {
        const username = req.query.username;
        console.log("username", username);
        const blobs = await listBlobsByUser(username, containerName);
        console.log("video blobs", blobs);
        
        const filesList = blobs.map(blob => ({
            name: blob.name,
            size: blob.contentLength,
            url: blob.url,
            jobId: blob.metadata?.jobId,
            prompt: blob.metadata?.prompt,
            originalFileName: blob.metadata?.originalFileName,
            generatedAt: blob.metadata?.generatedAt,
            generationId: blob.metadata?.generationId,
            // Video specifications
            width: blob.metadata?.width,
            height: blob.metadata?.height,
            duration: blob.metadata?.duration,
            aspectRatio: blob.metadata?.aspectRatio,
            resolution: blob.metadata?.resolution,
            model: blob.metadata?.model,
            variants: blob.metadata?.variants,
            // Additional metadata
            fileSize: blob.metadata?.fileSize || blob.contentLength,
            videoFormat: blob.metadata?.videoFormat || "mp4",
            quality: blob.metadata?.quality || "high",
            lastModified: blob.lastModified,
            // Frontend display fields
            type: "uploaded",
            id: blob.name,
            title: blob.metadata?.prompt || blob.name,
            uploadDate: blob.lastModified
        }));
        
        console.log("video filesList", filesList);
        res.json(filesList);
    } catch (error) {
        console.error("Error listing video files: ", error);
        res.status(500).send("Unable to list video files.");
    }
};

/**
 * Delete video file from Azure Blob Storage
 */
exports.deleteVideoFile = async (req, res) => {
    const { blobName, fileName } = req.body;
    
    // Support both blobName and fileName parameters
    const targetBlobName = blobName || fileName;
    
    if (!targetBlobName) {
        return res.status(400).send("Error: blobName or fileName is required");
    }
    
    try {
        console.log(`Attempting to delete video file: ${targetBlobName}`);
        // Delete video file
        await deleteBlob(containerName, targetBlobName);
        console.log(`Successfully deleted video file: ${targetBlobName}`);
        res.status(200).send("Video file deleted successfully");
    } catch (error) {
        console.error("Error deleting video file:", error);
        res.status(500).send("Error deleting video file: " + error.message);
    }
};

/**
 * Get video file details
 */
exports.getVideoFileDetails = async (req, res) => {
    const { id } = req.params; // Use id parameter instead of blobName
    const username = req.query.username;
    
    console.log("Getting video file details for:", { id, username });
    
    try {
        const blobs = await listBlobsByUser(username, containerName);
        
        // Try to find the blob by exact name match first
        let videoFile = blobs.find(blob => blob.name === id);
        
        // If not found, try to find by decoded URI component
        if (!videoFile) {
            const decodedId = decodeURIComponent(id);
            videoFile = blobs.find(blob => blob.name === decodedId);
        }
        
        // If still not found, try to find by filename (without path)
        if (!videoFile) {
            const fileName = id.split("/").pop(); // Get filename from path
            videoFile = blobs.find(blob => blob.name.includes(fileName) || blob.name.endsWith(fileName));
        }
        
        console.log("Video file search result:", {
            searchId: id,
            found: !!videoFile,
            fileName: videoFile?.name,
            availableFiles: blobs.map(b => b.name).slice(0, 5) // Show first 5 for debugging
        });
        
        if (!videoFile) {
            return res.status(404).json({ error: "Video file not found" });
        }
        
        res.json({
            name: videoFile.name,
            size: videoFile.contentLength,
            url: videoFile.url,
            jobId: videoFile.metadata?.jobId,
            prompt: videoFile.metadata?.prompt,
            originalFileName: videoFile.metadata?.originalFileName,
            generatedAt: videoFile.metadata?.generatedAt,
            generationId: videoFile.metadata?.generationId,
            // Video specifications
            width: videoFile.metadata?.width,
            height: videoFile.metadata?.height,
            duration: videoFile.metadata?.duration,
            aspectRatio: videoFile.metadata?.aspectRatio,
            resolution: videoFile.metadata?.resolution,
            model: videoFile.metadata?.model,
            variants: videoFile.metadata?.variants,
            lastModified: videoFile.lastModified
        });
    } catch (error) {
        console.error("Error getting video file details:", error);
        res.status(500).send("Error getting video file details: " + error.message);
    }
};
