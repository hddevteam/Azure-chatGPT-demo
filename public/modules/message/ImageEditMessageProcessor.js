// ImageEditMessageProcessor.js - Process Image Edit Messages
import MessageProcessor from "./MessageProcessor.js";
import * as apiClient from "../../utils/apiClient.js";

class ImageEditMessageProcessor extends MessageProcessor {
    constructor(messageManager) {
        super(messageManager);
    }

    async process(message, attachments = []) {
        const timestamp = new Date().toISOString();
        
        try {
            // validate input message and display
            const validationResult = await this.validateInput(message, attachments);
            if (!validationResult) {
                return null;
            }
            
            // send edit request
            const response = await this.editImage(message);
            
            // process response
            return await this.handleAIResponse(response, timestamp);
        } catch (error) {
            console.error("Error in ImageEditMessageProcessor:", error);
            throw error;
        }
    }

    async editImage(message) {
        this.uiManager.showToast("AI is editing image...");
        
        const prompt = message.replace("/gpt-image-1-edit", "").trim();
        const newFormData = new FormData();
        newFormData.append("prompt", prompt);

        // Show preview container
        const previewContainer = document.getElementById("attachment-preview-container");
        const previewList = document.getElementById("attachment-preview-list");
        if (!previewContainer || !previewList) {
            throw new Error("Preview container not found");
        }

        // Clear existing previews
        previewList.innerHTML = "";

        // Check if there's a FormData from the modal
        const formData = window.currentEditFormData;
        
        if (formData) {
            // Use files from the modal's FormData
            const oldImage = formData.get("image");
            if (oldImage) {
                newFormData.append("image", oldImage, oldImage.name || "image.png");
                
                // Add preview for the image
                const reader = new FileReader();
                reader.onload = (e) => {
                    this._addPreviewItem(e.target.result, oldImage.name || "image.png");
                };
                reader.readAsDataURL(oldImage);
            }
            
            const oldMask = formData.get("mask");
            if (oldMask) {
                newFormData.append("mask", oldMask, oldMask.name || "mask.png");
                
                // Add preview for the mask
                const reader = new FileReader();
                reader.onload = (e) => {
                    this._addPreviewItem(e.target.result, oldMask.name || "mask.png");
                };
                reader.readAsDataURL(oldMask);
            }
        } else {
            // Check if we're editing an existing image message
            const currentMessage = this.messageManager.uiManager.storageManager.getMessage(
                this.messageManager.uiManager.currentChatId,
                this.messageManager.uiManager.selectedMessageId
            );

            if (!currentMessage || !currentMessage.attachmentUrls) {
                throw new Error("No image available for editing");
            }

            // Download the image from the attachment URL
            try {
                const response = await fetch(currentMessage.attachmentUrls);
                const blob = await response.blob();
                newFormData.append("image", blob, "image.png");
                
                // Add preview for the existing image
                this._addPreviewItem(currentMessage.attachmentUrls, "Referenced Image");
            } catch (error) {
                console.error("Failed to fetch image from attachment:", error);
                throw new Error("Failed to fetch image for editing");
            }
        }

        console.log("Sending edit request with:", {
            prompt,
            hasImage: !!newFormData.get("image"),
            hasMask: !!newFormData.get("mask")
        });
        
        const data = await apiClient.gptImage1Edit(newFormData);
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
