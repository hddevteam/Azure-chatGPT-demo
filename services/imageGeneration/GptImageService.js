// services/imageGeneration/GptImageService.js
const axios = require("axios");
const FormData = require("form-data");
const ImageGenerationInterface = require("./imageGenerationInterface");

/**
 * GPT-Image-1 服务实现
 */
class GptImageService extends ImageGenerationInterface {
    constructor() {
        super();
        // 使用正确的环境变量名称
        this.baseUrl = process.env.GPT_IMAGE_1_API_URL.split("/images/generations")[0];
        this.apiKey = process.env.GPT_IMAGE_1_API_KEY;
        this.apiVersion = "2025-04-01-preview";
    }

    /**
     * 生成图像
     * @param {Object} params
     * @param {string} params.prompt - 图像描述
     * @param {string} params.size - 图像尺寸 (例如: "1024x1024")
     * @param {string} params.quality - 图像质量 ("medium"/"hd")
     * @param {number} params.n - 生成数量
     * @returns {Promise<Array>} 生成的图像数据
     */
    async generateImage({ prompt, size = "1024x1024", quality = "standard", n = 1 }) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/images/generations?api-version=${this.apiVersion}`,
                {
                    prompt,
                    size,
                    quality,
                    n
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
            console.error("GPT-Image generation error:", error.response?.data || error.message);
            throw new Error(error.response?.data?.error?.message || "Failed to generate image with GPT-Image-1");
        }
    }

    /**
     * 编辑图像
     * @param {Object} params
     * @param {Buffer|string} params.image - 原图像数据
     * @param {Buffer|string} params.mask - 遮罩图像数据 (可选)
     * @param {string} params.prompt - 编辑描述
     * @returns {Promise<Array>} 编辑后的图像数据
     */
    async editImage({ image, mask, prompt }) {
        try {
            const formData = new FormData();
            
            // 处理图像数据
            if (typeof image === "string") {
                // 如果是Base64字符串，转换为Buffer
                const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
                const imageBuffer = Buffer.from(base64Data, "base64");
                formData.append("image", imageBuffer, { filename: "image.png" });
            } else {
                // 如果已经是Buffer
                formData.append("image", image, { filename: "image.png" });
            }

            // 处理遮罩数据（如果有）
            if (mask) {
                if (typeof mask === "string") {
                    const maskBase64 = mask.replace(/^data:image\/\w+;base64,/, "");
                    const maskBuffer = Buffer.from(maskBase64, "base64");
                    formData.append("mask", maskBuffer, { filename: "mask.png" });
                } else {
                    formData.append("mask", mask, { filename: "mask.png" });
                }
            }

            formData.append("prompt", prompt);

            const response = await axios.post(
                `${this.baseUrl}/images/edits?api-version=${this.apiVersion}`,
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                        "api-key": this.apiKey
                    }
                }
            );

            return response.data.data;
        } catch (error) {
            console.error("GPT-Image edit error:", error.response?.data || error.message);
            throw new Error(error.response?.data?.error?.message || "Failed to edit image with GPT-Image-1");
        }
    }
}

module.exports = GptImageService;
