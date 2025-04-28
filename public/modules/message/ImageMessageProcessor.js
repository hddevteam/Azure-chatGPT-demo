// public/modules/message/ImageMessageProcessor.js
import MessageProcessor from "./MessageProcessor.js";
import * as apiClient from "../../utils/apiClient.js";

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
        
        // 确定使用哪种图像生成服务
        if (message.startsWith("/gpt-image-1")) {
            // 使用GPT-Image-1
            const prompt = message.replace("/gpt-image-1", "").trim();
            const data = await apiClient.gptImage1Generate(prompt);
            console.log("GPT-Image-1 API 返回数据:", data);
            
            // 如果服务器已经处理并上传了图像
            if (data && data.success) {
                // 首选服务器返回的附件URL
                if (data.attachmentUrl) {
                    console.log("使用服务器生成的附件URL:", data.attachmentUrl);
                    return {
                        message: data.revisedPrompt || prompt,
                        attachmentUrls: data.attachmentUrl
                    };
                }
                
                // 如果服务器返回了图像数据但没有附件URL
                if (data.data && data.data.length > 0) {
                    const imageData = data.data[0];
                    // 优先使用 URL，否则尝试 base64
                    const imageUrl = imageData.url || 
                        (imageData.b64_json ? `data:image/png;base64,${imageData.b64_json}` : null);
                    const revisedPrompt = imageData.revised_prompt || prompt;
                    
                    if (imageUrl) {
                        return {
                            message: revisedPrompt,
                            attachmentUrls: imageUrl
                        };
                    }
                }
            }
            
            console.error("GPT-Image-1 API返回无效数据:", data);
            return {
                message: `${prompt}\n(图像生成失败或无法显示)`,
                attachmentUrls: ""
            };
        } else {
            // 默认使用DALL-E
            const imageCaption = message.replace("/dalle", "").trim();
            const data = await apiClient.textToImage(imageCaption);
            console.log("DALL-E API 返回数据:", data);
            
            // 直接使用DALL-E返回的URL
            return {
                message: data.revised_prompt || imageCaption,
                attachmentUrls: data.url || ""
            };
        }
    }
    
    // 检查消息是否是图片生成请求
    static isImageRequest(message) {
        return message.startsWith("/dalle") || message.startsWith("/gpt-image-1");
    }
}

export default ImageMessageProcessor;