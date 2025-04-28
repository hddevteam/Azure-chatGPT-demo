// controllers/gptImageController.js
const axios = require("axios");
const FormData = require("form-data");

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

            // 使用完整的URL，确保与curl命令一致
            const response = await axios.post(
                this.apiUrl,
                {
                    prompt,
                    size: size || "1024x1024",
                    quality: quality || "medium",
                    n: parseInt(n) || 1
                    // 不再添加style参数，与curl命令保持一致
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        "api-key": this.apiKey
                    }
                }
            );
            
            console.log("GPT-Image-1 API response status:", response.status);
            if (!response.data || !response.data.data) {
                console.error("Unexpected API response format:", response.data);
                return res.status(500).json({
                    success: false,
                    error: "Invalid response from GPT-Image-1 API"
                });
            }

            res.json({ success: true, data: response.data.data });
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

            const response = await axios.post(
                editUrl,
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                        "api-key": this.apiKey
                    }
                }
            );
            
            res.json({ success: true, data: response.data.data });
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
