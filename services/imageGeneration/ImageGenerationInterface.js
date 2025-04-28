// services/imageGeneration/ImageGenerationInterface.js

/**
 * Interface for image generation services
 */
class ImageGenerationInterface {
    /**
     * Generate an image based on prompt
     * @param {Object} params
     * @param {string} params.prompt - The text description
     * @param {string} params.size - Image size (e.g. "1024x1024")
     * @param {string} params.quality - Image quality
     * @param {number} params.n - Number of images to generate
     * @returns {Promise<Array>} Generated image data
     */
    async generateImage(params) {
        throw new Error("Method not implemented");
    }

    /**
     * Edit an existing image
     * @param {Object} params
     * @param {Buffer|string} params.image - Original image buffer or base64
     * @param {Buffer|string} params.mask - Mask image buffer or base64 (optional)
     * @param {string} params.prompt - Edit instruction
     * @returns {Promise<Array>} Edited image data
     */
    async editImage(params) {
        throw new Error("Method not implemented");
    }
}

module.exports = ImageGenerationInterface;
