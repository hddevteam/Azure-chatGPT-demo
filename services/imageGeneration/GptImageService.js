// services/imageGeneration/GptImageService.js
const axios = require("axios");
const FormData = require("form-data");
const ImageGenerationInterface = require("./imageGenerationInterface");

/**
 * GPT-Image-1 service implementation
 */
class GptImageService extends ImageGenerationInterface {
    constructor() {
        super();
        // Use correct environment variable name
        this.baseUrl = process.env.GPT_IMAGE_1_API_URL.split("/images/generations")[0];
        this.apiKey = process.env.GPT_IMAGE_1_API_KEY;
        this.apiVersion = "2025-04-01-preview";
    }

    /**
     * Generate image
     * @param {Object} params
     * @param {string} params.prompt - Image description
     * @param {string} params.size - Image size (e.g., "1024x1024")
     * @param {string} params.quality - Image quality ("medium"/"hd")
     * @param {number} params.n - Generation count
     * @returns {Promise<Array>} Generated image data
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
     * Edit image
     * @param {Object} params
     * @param {Buffer|string} params.image - Original image data
     * @param {Buffer|string} params.mask - Mask image data (optional)
     * @param {string} params.prompt - Edit description
     * @returns {Promise<Array>} Edited image data
     */
    async editImage({ image, mask, prompt }) {
        try {
            const formData = new FormData();
            
            // Process image data
            if (typeof image === "string") {
                // If it's a Base64 string, convert to Buffer
                const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
                const imageBuffer = Buffer.from(base64Data, "base64");
                formData.append("image", imageBuffer, { filename: "image.png" });
            } else {
                // If it's already a Buffer
                formData.append("image", image, { filename: "image.png" });
            }

            // Process mask data (if any)
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
