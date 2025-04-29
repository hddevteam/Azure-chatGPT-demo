// controllers/gptImageController.js
const axios = require("axios");
const FormData = require("form-data");
const { uploadFileToBlob } = require("../services/azureBlobStorage");
const { Buffer } = require("buffer");

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
     * 处理图像生成请求
     */
    async generateImage(req, res) {
        try {
            const { prompt, size, quality, n } = req.body;
            
            if (!prompt) {
                return res.status(400).json({ success: false, error: "Prompt is required" });
            }
            
            // 验证API配置
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

            // 调用GPT-Image-1 API生成图像
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

            // 处理图像上传到附件
            try {
                // 获取第一个生成的图像数据
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
                console.error("上传图像失败:", uploadError);
                // 即使上传失败，仍然返回API的原始响应
                return res.json({
                    success: true,
                    data: apiResponse.data.data,
                    error: "上传图像失败，但API调用成功"
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
     * 处理图像编辑请求
     */
    async editImage(req, res) {
        try {
            const { prompt } = req.body;
            if (!prompt) {
                return res.status(400).json({ success: false, error: "Prompt is required" });
            }

            // 验证API配置
            if (!this.apiUrl || !this.apiKey) {
                return res.status(500).json({ 
                    success: false, 
                    error: "GPT-Image-1 service is not properly configured" 
                });
            }

            // 检查是否有图片文件
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

            // 确保图片数据存在且是有效的
            if (!imageFile.buffer) {
                throw new Error("Image data is missing");
            }

            // 处理主图片 - 使用原始的 buffer
            const imageBuffer = imageFile.buffer;
            
            console.log("Using buffer:", {
                bufferLength: imageBuffer.length,
                isBuffer: Buffer.isBuffer(imageBuffer)
            });

            formData.append("image", imageBuffer, {
                filename: imageFile.originalname || "image.png",
                contentType: imageFile.mimetype || "image/png",
                knownLength: imageBuffer.length
            });

            // 如果有mask文件，添加到formData
            if (req.files.mask) {
                const maskBuffer = Buffer.from(req.files.mask.data);
                formData.append("mask", maskBuffer, {
                    filename: req.files.mask.name || "mask.png",
                    contentType: req.files.mask.mimetype || "image/png",
                    knownLength: maskBuffer.length
                });
            }

            // 调用GPT-Image-1 API编辑图像
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

            // 处理编辑后的图像
            const imageData = apiResponse.data.data[0];
            let attachmentUrl = null;

            // 处理base64图像数据
            if (imageData.b64_json) {
                console.log("Processing image data after edit...");
                const imageBuffer = Buffer.from(imageData.b64_json, "base64");
                const timestamp = Date.now();
                const fileName = `gpt-image-1-edit-${timestamp}.png`;
                
                // 上传到Blob存储
                const containerName = "messageattachments";
                const username = req.body?.username || req.query?.username || null;
                const uploadResult = await uploadFileToBlob(containerName, fileName, imageBuffer, username);
                console.log("Upload successful:", uploadResult);
                attachmentUrl = uploadResult.url;
            }

            // 返回编辑后的图像URL
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

// 创建控制器实例并导出
const gptImageController = new GptImageController();
module.exports = gptImageController;
