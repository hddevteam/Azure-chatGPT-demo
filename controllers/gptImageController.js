// controllers/gptImageController.js
const axios = require("axios");
const FormData = require("form-data");
const { uploadFileToBlob } = require("../services/azureBlobStorage");
const { Buffer } = require("buffer");

/**
 * GPT-Image-1控制器
 * 处理GPT-Image-1图像生成和编辑请求
 * 直接使用环境变量而不依赖于服务工厂，提高健壮性
 */
class GptImageController {
    constructor() {
        // 直接使用完整的API URL，不再分割
        this.apiUrl = process.env.GPT_IMAGE_1_API_URL;
        this.apiKey = process.env.GPT_IMAGE_1_API_KEY;
        
        // 验证必要的环境变量
        if (!this.apiUrl || !this.apiKey) {
            console.warn("警告: GPT_IMAGE_1 环境变量未正确配置");
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
                
                // 处理base64图像数据
                if (imageData.b64_json) {
                    console.log("处理base64图像数据...");
                    const imageBuffer = Buffer.from(imageData.b64_json, "base64");
                    const timestamp = Date.now();
                    const fileName = `gpt-image-1-${timestamp}.png`;
                    
                    // 上传到Blob存储
                    const containerName = "messageattachments";
                    // 获取用户名，如果有
                    const username = req.body?.username || req.query?.username || null;
                    // 传递可选用户名
                    const uploadResult = await uploadFileToBlob(containerName, fileName, imageBuffer, username);
                    console.log("图像上传成功:", uploadResult);
                    attachmentUrl = uploadResult.url;
                } 
                // 处理图像URL
                else if (imageData.url) {
                    console.log("处理图像URL:", imageData.url);
                    try {
                        // 下载图像
                        const imageResponse = await axios.get(imageData.url, { responseType: "arraybuffer" });
                        const imageBuffer = Buffer.from(imageResponse.data);
                        
                        // 生成唯一文件名并上传
                        const timestamp = Date.now();
                        const fileName = `gpt-image-1-${timestamp}.png`;
                        const containerName = "messageattachments";
                        // 获取用户名，如果有
                        const username = req.body?.username || req.query?.username || null;
                        // 传递可选用户名
                        const uploadResult = await uploadFileToBlob(containerName, fileName, imageBuffer, username);
                        console.log("图像上传成功:", uploadResult);
                        attachmentUrl = uploadResult.url;
                    } catch (downloadError) {
                        console.error("下载图像失败:", downloadError);
                        // 如果下载失败，使用原始URL
                        attachmentUrl = imageData.url;
                    }
                } else {
                    console.error("未找到图像数据:", imageData);
                    return res.json({
                        success: true,
                        data: apiResponse.data.data,
                        error: "API未返回图像数据"
                    });
                }
                
                // 返回成功结果，包含上传后的附件URL
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
            
            if (!req.files || !req.files.image) {
                return res.status(400).json({ success: false, error: "Image is required" });
            }
            
            // 验证API配置
            if (!this.apiUrl || !this.apiKey) {
                return res.status(500).json({ 
                    success: false, 
                    error: "GPT-Image-1 service is not properly configured" 
                });
            }
            
            // 编辑图像使用不同的端点
            const editUrl = this.apiUrl.replace("images/generations", "images/edits");
            
            const formData = new FormData();
            const image = req.files.image[0].buffer;
            const mask = req.files.mask ? req.files.mask[0].buffer : null;
            
            formData.append("image", image, { filename: "image.png" });
            if (mask) {
                formData.append("mask", mask, { filename: "mask.png" });
            }
            formData.append("prompt", prompt);

            // 发送编辑请求
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

            // 处理返回的图像数据并上传
            try {
                if (!apiResponse.data || !apiResponse.data.data || apiResponse.data.data.length === 0) {
                    return res.status(500).json({
                        success: false, 
                        error: "API未返回有效的图像数据" 
                    });
                }
                
                const imageData = apiResponse.data.data[0];
                let attachmentUrl = null;
                let revisedPrompt = imageData.revised_prompt || prompt;
                
                // 处理base64图像数据
                if (imageData.b64_json) {
                    const imageBuffer = Buffer.from(imageData.b64_json, "base64");
                    const timestamp = Date.now();
                    const fileName = `gpt-image-1-edit-${timestamp}.png`;
                    
                    // 上传到Blob存储
                    const containerName = "messageattachments";
                    // 获取用户名，如果有
                    const username = req.body?.username || req.query?.username || null;
                    // 传递可选用户名
                    const uploadResult = await uploadFileToBlob(containerName, fileName, imageBuffer, username);
                    console.log("编辑后图像上传成功:", uploadResult);
                    attachmentUrl = uploadResult.url;
                } 
                // 处理图像URL
                else if (imageData.url) {
                    try {
                        // 下载图像
                        const imageResponse = await axios.get(imageData.url, { responseType: "arraybuffer" });
                        const imageBuffer = Buffer.from(imageResponse.data);
                        
                        // 生成唯一文件名并上传
                        const timestamp = Date.now();
                        const fileName = `gpt-image-1-edit-${timestamp}.png`;
                        const containerName = "messageattachments";
                        // 获取用户名，如果有
                        const username = req.body?.username || req.query?.username || null;
                        // 传递可选用户名
                        const uploadResult = await uploadFileToBlob(containerName, fileName, imageBuffer, username);
                        console.log("编辑后图像上传成功:", uploadResult);
                        attachmentUrl = uploadResult.url;
                    } catch (downloadError) {
                        console.error("下载编辑后图像失败:", downloadError);
                        // 如果下载失败，使用原始URL
                        attachmentUrl = imageData.url;
                    }
                } else {
                    console.error("未找到编辑后图像数据");
                    return res.json({
                        success: true,
                        data: apiResponse.data.data,
                        error: "API未返回编辑后图像数据"
                    });
                }
                
                // 返回成功结果，包含上传后的附件URL
                return res.json({
                    success: true,
                    data: apiResponse.data.data,
                    attachmentUrl: attachmentUrl,
                    revisedPrompt: revisedPrompt
                });
            } catch (uploadError) {
                console.error("上传编辑后图像失败:", uploadError);
                // 即使上传失败，仍然返回API的原始响应
                return res.json({
                    success: true,
                    data: apiResponse.data.data,
                    error: "上传编辑后图像失败，但API调用成功"
                });
            }
        } catch (error) {
            console.error("Error editing image:", error.response?.data || error.message);
            res.status(500).json({ 
                success: false, 
                error: error.response?.data?.error?.message || error.message 
            });
        }
    }
}

// 创建控制器实例并导出
const gptImageController = new GptImageController();
module.exports = gptImageController;
