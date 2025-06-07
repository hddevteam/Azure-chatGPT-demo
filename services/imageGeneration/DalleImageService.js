// services/imageGeneration/DalleImageService.js
const axios = require("axios");
const ImageGenerationInterface = require("./imageGenerationInterface");

/**
 * DALL-E Service Adapter Class
 * Wraps existing DALL-E service to adapt to unified interface
 */
class DalleImageService extends ImageGenerationInterface {
    constructor() {
        super();
        this.apiUrl = process.env.API_DALLE_URL;
        this.apiKey = process.env.API_DALLE_KEY;
    }

    /**
     * Generate image
     * @param {Object} params
     * @param {string} params.prompt - Image description
     * @param {string} params.size - Image size (e.g., "1024x1024")
     * @param {string} params.quality - Image quality
     * @param {number} params.n - Generation count
     * @returns {Promise<Array>} Generated image data
     */
    async generateImage({ prompt, size = "1024x1024", quality, n = 1 }) {
        try {
            // DALL-E uses style instead of quality
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
     * DALL-E does not support image editing, throwing unimplemented error
     */
    async editImage() {
        throw new Error("DALL-E does not support image editing");
    }
}

module.exports = DalleImageService;
