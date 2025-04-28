// services/imageGeneration/DalleImageService.js
const axios = require("axios");
const ImageGenerationInterface = require("./imageGenerationInterface");

/**
 * DALL-E服务适配类
 * 包装现有的DALL-E服务以适配统一接口
 */
class DalleImageService extends ImageGenerationInterface {
    constructor() {
        super();
        this.apiUrl = process.env.API_DALLE_URL;
        this.apiKey = process.env.API_DALLE_KEY;
    }

    /**
     * 生成图像
     * @param {Object} params
     * @param {string} params.prompt - 图像描述
     * @param {string} params.size - 图像尺寸 (例如: "1024x1024")
     * @param {string} params.quality - 图像质量
     * @param {number} params.n - 生成数量
     * @returns {Promise<Array>} 生成的图像数据
     */
    async generateImage({ prompt, size = "1024x1024", quality, n = 1 }) {
        try {
            // DALL-E使用style而不是quality
            const style = quality === "hd" ? "vivid" : "natural";
            
            const response = await axios.post(
                this.apiUrl,
                {
                    prompt,
                    n,
                    size,
                    style
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        "api-key": this.apiKey
                    }
                }
            );

            return response.data.data;
        } catch (error) {
            console.error("DALL-E generation error:", error.response?.data || error.message);
            throw new Error(error.response?.data?.error?.message || "Failed to generate image with DALL-E");
        }
    }

    /**
     * DALL-E不支持编辑图像，这里抛出未实现错误
     */
    async editImage() {
        throw new Error("DALL-E does not support image editing");
    }
}

module.exports = DalleImageService;
