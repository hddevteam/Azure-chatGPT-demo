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
            // Validate message and display to interface
            const validationResult = await this.validateInput(message, attachments);
            if (!validationResult) {
                return null;
            }
            
            // Process image generation
            const response = await this.generateImage(message);
            
            // Process response and display
            return await this.handleAIResponse(response, timestamp);
        } catch (error) {
            console.error("Error in ImageMessageProcessor:", error);
            throw error;
        }
    }

    async generateImage(message) {
        this.uiManager.showToast("AI is generating image...");
        
        // Determine which image generation service to use
        if (message.startsWith("/gpt-image-1")) {
            // Use GPT-Image-1
            const prompt = message.replace("/gpt-image-1", "").trim();
            const data = await apiClient.gptImage1Generate(prompt);
            console.log("GPT-Image-1 API returned data:", data);
            
            // If server has already processed and uploaded the image
            if (data && data.success) {
                // Prefer attachment URL returned by server
                if (data.attachmentUrl) {
                    console.log("Using server-generated attachment URL:", data.attachmentUrl);
                    return {
                        message: data.revisedPrompt || prompt,
                        attachmentUrls: data.attachmentUrl
                    };
                }
                
                // If server returned image data but no attachment URL
                if (data.data && data.data.length > 0) {
                    const imageData = data.data[0];
                    // Prefer URL, otherwise try base64
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
            
            console.error("GPT-Image-1 API returned invalid data:", data);
            return {
                message: `${prompt}\n(Image generation failed or cannot be displayed)`,
                attachmentUrls: ""
            };
        } else {
            // Default to using DALL-E
            const imageCaption = message.replace("/dalle", "").trim();
            const data = await apiClient.textToImage(imageCaption);            console.log("DALL-E API returned data:", data);

            // Directly use URL returned by DALL-E
            return {
                message: data.revised_prompt || imageCaption,
                attachmentUrls: data.url || ""
            };
        }
    }
    
    // Check if the message is an image generation request
    static isImageRequest(message) {
        return message.startsWith("/dalle") || message.startsWith("/gpt-image-1");
    }
}

export default ImageMessageProcessor;