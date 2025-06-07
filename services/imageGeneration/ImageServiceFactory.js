// services/imageGeneration/ImageServiceFactory.js
const DalleImageService = require("./DalleImageService");
const GptImageService = require("./GptImageService");

/**
 * Image generation service factory class
 * Responsible for creating and managing different image generation service instances
 */
class ImageServiceFactory {
    /**
     * Get image generation service instance
     * @param {string} type - Service type ("dalle" or "gpt-image")
     * @returns {ImageGenerationInterface} Image generation service instance
     */
    static getService(type) {
        switch (type.toLowerCase()) {
        case "dalle":
            return new DalleImageService();
        case "gpt-image":
            return new GptImageService();
        default:
            throw new Error(`Unsupported image service type: ${type}`);
        }
    }
}

module.exports = ImageServiceFactory;
