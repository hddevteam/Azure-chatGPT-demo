// ImageEditMessageProcessor.js - 处理图片编辑相关的消息
import MessageProcessor from "./MessageProcessor.js";
import * as apiClient from "../../utils/apiClient.js";

class ImageEditMessageProcessor extends MessageProcessor {
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
            
            // 发送编辑请求
            const response = await this.editImage(message);
            
            // 处理响应并显示
            return await this.handleAIResponse(response, timestamp);
        } catch (error) {
            console.error("Error in ImageEditMessageProcessor:", error);
            throw error;
        }
    }

    async editImage(message) {
        this.uiManager.showToast("AI is editing image...");
        
        const prompt = message.replace("/gpt-image-1-edit", "").trim();
        
        // 获取当前存储的FormData
        const formData = window.currentEditFormData;
        if (!formData) {
            throw new Error("No image data available for editing");
        }

        // 这里不需要重新添加prompt，因为formData已经包含了prompt和文件

        const data = await apiClient.gptImage1Edit(formData);
        console.log("GPT-Image-1 Edit API response:", data);

        // 如果服务器已经处理并上传了图像
        if (data && data.success) {
            // 使用服务器返回的附件URL和修正后的提示词
            return {
                message: data.data.revised_prompt || prompt,
                attachmentUrls: data.data.url
            };
        } else {
            throw new Error("Failed to edit image");
        }
    }
    
    static isImageEditRequest(message) {
        return message.startsWith("/gpt-image-1-edit");
    }
}

export default ImageEditMessageProcessor;
