// ImageMessageProcessor.js - 处理图片生成消息
import MessageProcessor from "./MessageProcessor.js";
import { textToImage } from "../../utils/apiClient.js";

class ImageMessageProcessor extends MessageProcessor {
    constructor(messageManager) {
        super(messageManager);
    }

    async process(message, attachments = []) {
        const timestamp = new Date().toISOString();
        
        try {
            // 验证消息并显示到界面
            const validationResult = await this.validateInput(message, attachments);
            if (!validationResult) {
                return null;
            }
            
            // 处理图片生成
            const response = await this.generateImage(message);
            
            // 处理响应并显示
            return await this.handleAIResponse(response, timestamp);
        } catch (error) {
            console.error("Error in ImageMessageProcessor:", error);
            throw error;
        }
    }

    async generateImage(message) {
        this.uiManager.showToast("AI is generating image...");
        
        const imageCaption = message.replace("/image", "").trim();
        const data = await textToImage(imageCaption);
        
        return {
            message: data.revised_prompt || imageCaption,
            attachmentUrls: data.url
        };
    }
    
    // 检查消息是否是图片生成请求
    static isImageRequest(message) {
        return message.startsWith("/image");
    }
}

export default ImageMessageProcessor;