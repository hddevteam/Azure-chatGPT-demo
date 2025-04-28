// services/imageGeneration/ImageServiceFactory.js
const DalleImageService = require("./DalleImageService");
const GptImageService = require("./GptImageService");

/**
 * 图像生成服务工厂类
 * 负责创建和管理不同的图像生成服务实例
 */
class ImageServiceFactory {
    /**
     * 获取图像生成服务实例
     * @param {string} type - 服务类型 ("dalle" 或 "gpt-image")
     * @returns {ImageGenerationInterface} 图像生成服务实例
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
