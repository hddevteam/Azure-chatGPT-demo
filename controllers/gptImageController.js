// controllers/gptImageController.js
const axios = require("axios");
const FormData = require("form-data");
const { uploadFileToBlob } = require("../services/azureBlobStorage");
const { Buffer } = require("buffer");
const { ensureCorrectFileExtension } = require("../utils/fileUtils");

/**
 * GPT-Image-1 Controller
 * Handles GPT-Image-1 image generation and editing requests
 * Uses environment variables directly without service factory for better robustness
 */
class GptImageController {
    constructor() {
        // Use complete API URL directly, no splitting
        this.apiUrl = process.env.GPT_IMAGE_1_API_URL;
        this.apiKey = process.env.GPT_IMAGE_1_API_KEY;
        
        // Validate required environment variables
        if (!this.apiUrl || !this.apiKey) {
            console.warn("Warning: GPT_IMAGE_1 environment variables are not properly configured");
        }
    }

    /**
     * Handles image generation requests
     */
    async generateImage(req, res) {
        try {
            const { prompt, size, quality, n } = req.body;
            
            if (!prompt) {
                return res.status(400).json({ success: false, error: "Prompt is required" });
            }
            
            // Validate API configuration
            if (!this.apiUrl || !this.apiKey) {
                return res.status(500).json({ 
                    success: false, 
                    error: "GPT-Image-1 service is not properly configured" 
                });
            }
            
            console.log("Generating image with GPT-Image-1:", {
                url: this.apiUrl,
                params: {
                    prompt,
                    size: size || "1024x1024",
                    quality: quality || "medium",
                    n: parseInt(n) || 1
                }
            });

            // Call GPT-Image-1 API to generate image
            const apiResponse = await axios.post(
                this.apiUrl,
                {
                    prompt,
                    size: size || "1024x1024",
                    quality: quality || "medium",
                    n: parseInt(n) || 1
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        "api-key": this.apiKey
                    }
                }
            );
            
            console.log("GPT-Image-1 API response status:", apiResponse.status);
            if (!apiResponse.data || !apiResponse.data.data) {
                console.error("Unexpected API response format:", apiResponse.data);
                return res.status(500).json({
                    success: false,
                    error: "Invalid response from GPT-Image-1 API"
                });
            }

            // Handle image upload to attachment
            try {
                // Get the first generated image data
                const imageData = apiResponse.data.data[0];
                let attachmentUrl = null;
                let revisedPrompt = imageData.revised_prompt || prompt;
                
                // Process base64 image data
                if (imageData.b64_json) {
                    console.log("Processing base64 image data...");
                    const imageBuffer = Buffer.from(imageData.b64_json, "base64");
                    const timestamp = Date.now();
                    const fileName = `gpt-image-1-${timestamp}.png`;
                    
                    // Upload to Blob storage
                    const containerName = "messageattachments";
                    // Get username if available
                    const username = req.body?.username || req.query?.username || null;
                    // Pass optional username
                    const uploadResult = await uploadFileToBlob(containerName, fileName, imageBuffer, username);
                    console.log("Image upload successful:", uploadResult);
                    attachmentUrl = uploadResult.url;
                } 
                // Process image URL
                else if (imageData.url) {
                    console.log("Processing image URL:", imageData.url);
                    try {
                        // Download image
                        const imageResponse = await axios.get(imageData.url, { responseType: "arraybuffer" });
                        const imageBuffer = Buffer.from(imageResponse.data);
                        
                        // Generate unique filename and upload
                        const timestamp = Date.now();
                        const fileName = `gpt-image-1-${timestamp}.png`;
                        const containerName = "messageattachments";
                        // Get username if available
                        const username = req.body?.username || req.query?.username || null;
                        // Pass optional username
                        const uploadResult = await uploadFileToBlob(containerName, fileName, imageBuffer, username);
                        console.log("Image upload successful:", uploadResult);
                        attachmentUrl = uploadResult.url;
                    } catch (downloadError) {
                        console.error("Failed to download image:", downloadError);
                        // If download fails, use original URL
                        attachmentUrl = imageData.url;
                    }
                } else {
                    console.error("No image data found:", imageData);
                    return res.json({
                        success: true,
                        data: apiResponse.data.data,
                        error: "API did not return image data"
                    });
                }
                
                // Return success result with uploaded attachment URL
                return res.json({
                    success: true,
                    data: apiResponse.data.data,
                    attachmentUrl: attachmentUrl,
                    revisedPrompt: revisedPrompt
                });
            } catch (uploadError) {
                console.error("Failed to upload image:", uploadError);
                // Even if the upload fails, return the original API response
                return res.json({
                    success: true,
                    data: apiResponse.data.data,
                    error: "Failed to upload image, but API call was successful"
                });
            }
        } catch (error) {
            console.error("Error generating image:", error.response?.data || error.message);
            res.status(500).json({ 
                success: false, 
                error: error.response?.data?.error || error.message 
            });
        }
    }

    /**
     * Handles image editing requests
     */
    async editImage(req, res) {
        try {
            const { prompt } = req.body;
            if (!prompt) {
                return res.status(400).json({ success: false, error: "Prompt is required" });
            }

            // Validate API configuration
            if (!this.apiUrl || !this.apiKey) {
                return res.status(500).json({ 
                    success: false, 
                    error: "GPT-Image-1 service is not properly configured" 
                });
            }

            // Check if there is an image file
            console.log("Received files:", req.files);
            
            if (!req.files || !req.files.image) {
                return res.status(400).json({ success: false, error: "Image file is required" });
            }

            const imageFile = req.files.image[0]; // multer provides files as arrays
            console.log("Image file data:", {
                name: imageFile.originalname,
                mimetype: imageFile.mimetype,
                size: imageFile.size,
                hasBuffer: !!imageFile.buffer,
                bufferType: typeof imageFile.buffer
            });

            const formData = new FormData();
            formData.append("prompt", prompt);

            // Ensure image data exists and is valid
            if (!imageFile.buffer) {
                throw new Error("Image data is missing");
            }

            // Handle main image - use the original buffer
            const imageBuffer = imageFile.buffer;
            
            console.log("Using buffer:", {
                bufferLength: imageBuffer.length,
                isBuffer: Buffer.isBuffer(imageBuffer),
                mimetype: imageFile.mimetype
            });

            // Use original image format, do not force conversion to PNG
            let processedImageBuffer = imageBuffer;
            
            // Get corrected filename with proper extension based on MIME type
            const fileName = ensureCorrectFileExtension("image", imageFile.mimetype);
            console.log(`Using file name: ${fileName} with MIME type: ${imageFile.mimetype}`);
            
            formData.append("image", processedImageBuffer, {
                filename: fileName,
                contentType: imageFile.mimetype || "image/png",
                knownLength: processedImageBuffer.length
            });

            // If there is a mask file, add it to formData
            if (req.files.mask && req.files.mask[0]) {
                const maskFile = req.files.mask[0];
                const maskBuffer = maskFile.buffer;
                
                console.log("Mask file data:", {
                    name: maskFile.originalname,
                    mimetype: maskFile.mimetype,
                    size: maskFile.size,
                    hasBuffer: !!maskFile.buffer
                });
                
                // Get corrected filename with proper extension based on MIME type
                const maskFileName = ensureCorrectFileExtension("mask", maskFile.mimetype);
                console.log(`Using mask file name: ${maskFileName} with MIME type: ${maskFile.mimetype}`);
                
                formData.append("mask", maskBuffer, {
                    filename: maskFileName,
                    contentType: maskFile.mimetype || "image/png",
                    knownLength: maskBuffer.length
                });
            }

            // Call GPT-Image-1 API to edit the image
            const editUrl = this.apiUrl.replace("/images/generations", "/images/edits");
            const apiResponse = await axios.post(
                editUrl,
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                        "api-key": this.apiKey
                    }
                }
            );

            if (!apiResponse.data || !apiResponse.data.data) {
                console.error("Unexpected API response format:", apiResponse.data);
                return res.status(500).json({
                    success: false,
                    error: "Invalid response from GPT-Image-1 API"
                });
            }

            // Process the edited image
            const imageData = apiResponse.data.data[0];
            let attachmentUrl = null;

            // Process base64 image data
            if (imageData.b64_json) {
                console.log("Processing image data after edit...");
                const imageBuffer = Buffer.from(imageData.b64_json, "base64");
                const timestamp = Date.now();
                const fileName = `gpt-image-1-edit-${timestamp}.png`;
                
                // Upload to Blob storage
                const containerName = "messageattachments";
                const username = req.body?.username || req.query?.username || null;
                const uploadResult = await uploadFileToBlob(containerName, fileName, imageBuffer, username);
                console.log("Upload successful:", uploadResult);
                attachmentUrl = uploadResult.url;
            }

            // Return the URL of the edited image
            return res.json({
                success: true,
                data: {
                    url: attachmentUrl,
                    revised_prompt: imageData.revised_prompt || prompt
                }
            });

        } catch (error) {
            console.error("Image editing error:", error);
            return res.status(500).json({
                success: false,
                error: error.message || "Failed to edit image"
            });
        }
    }
}

// Create a controller instance and export it
const gptImageController = new GptImageController();
module.exports = gptImageController;
