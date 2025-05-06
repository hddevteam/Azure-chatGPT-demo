// ImageEditMessageProcessor.js - Process Image Edit Messages
import MessageProcessor from "./MessageProcessor.js";
import * as apiClient from "../../utils/apiClient.js";
import { ensureCorrectFileExtension } from "../../utils/fileUtils.js";

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

        // Try to get preview item with data-is-existing first (for Edit this image functionality)
        let previewItem = document.querySelector(".attachment-preview-item[data-is-existing='true']");
        
        // If not found, try to get any preview item (for new uploads from modal)
        if (!previewItem) {
            previewItem = document.querySelector(".attachment-preview-item");
        }
        
        if (!previewItem) {
            throw new Error("No image available in preview");
        }

        // Get image information from preview item
        const imageUrl = previewItem.dataset.url || previewItem.dataset.content; // support both url and content
        const fileName = previewItem.dataset.fileName || imageUrl.split("/").pop() || "image.png";
        const mimeType = previewItem.dataset.fileType || this._getMimeTypeFromFileName(fileName);

        try {
            console.log("Processing image from preview:", {
                url: imageUrl,
                fileName: fileName,
                mimeType: mimeType
            });

            // Fetch and process the image
            const response = await fetch(imageUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            const blob = new Blob([arrayBuffer], { type: mimeType });
            
            // Add image to FormData
            newFormData.append("image", blob, fileName);

            // Add mask if available (from modal)
            if (window.currentEditFormData) {
                const maskFile = window.currentEditFormData.get("mask");
                if (maskFile) {
                    const maskFileName = maskFile.name || "mask.png";
                    const maskMimeType = maskFile.type || "image/png";
                    console.log("Adding mask:", { fileName: maskFileName, type: maskMimeType });
                    newFormData.append("mask", maskFile, maskFileName);
                }
            }

            console.log("Sending edit request with:", {
                prompt,
                hasImage: !!newFormData.get("image"),
                hasMask: !!newFormData.get("mask")
            });
            
            try {
                const data = await apiClient.gptImage1Edit(newFormData);
                console.log("GPT-Image-1 Edit API response:", data);
                
                // Clear the attachment preview area
                this._clearAttachmentPreview();
                
                // If the server has processed and uploaded the image
                if (data && data.success) {
                    // Use the attachment URL and revised prompt returned by the server
                    return {
                        message: data.data.revised_prompt || prompt,
                        attachmentUrls: data.data.url
                    };
                } else {
                    throw new Error("Failed to edit image: API returned unsuccessful response");
                }
            } catch (error) {
                // Clear the attachment preview area (even if an error occurs)
                this._clearAttachmentPreview();
                
                console.error("Image edit API error:", error);
                if (error.response) {
                    console.error("API error details:", {
                        status: error.response.status,
                        data: error.response.data
                    });
                    throw new Error(`Failed to edit image: API error ${error.response.status}`);
                }
                throw error;
            }
        } catch (error) {
            this._clearAttachmentPreview();
            console.error("Image edit error:", error);
            if (error.response) {
                console.error("API error details:", {
                    status: error.response.status,
                    data: error.response.data
                });
                throw new Error(`Failed to edit image: API error ${error.response.status}`);
            }
            throw error;
        }
    }
    
    // Helper method to get MIME type from file name
    _getMimeTypeFromFileName(fileName) {
        const ext = fileName.toLowerCase().split(".").pop();
        const mimeTypes = {
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "png": "image/png",
            "webp": "image/webp",
            "gif": "image/gif"
        };
        return mimeTypes[ext] || "image/png";
    }

    // Clear the attachment preview area
    _clearAttachmentPreview() {
        const previewContainer = document.getElementById("attachment-preview-container");
        const previewList = document.getElementById("attachment-preview-list");
        
        if (previewContainer && previewList) {
            previewList.innerHTML = "";
            previewContainer.classList.add("hidden");
        }
    }
    
    // Add preview item to preview list
    _addPreviewItem(imageUrl, fileName) {
        const previewList = document.getElementById("attachment-preview-list");
        const previewContainer = document.getElementById("attachment-preview-container");
        
        if (!previewList || !previewContainer) {
            console.error("Preview container not found");
            return;
        }
        
        const previewItem = document.createElement("div");
        previewItem.classList.add("attachment-preview-item");
        previewItem.dataset.url = imageUrl;
        // Add a flag to indicate this is an existing image and does not need uploading
        previewItem.dataset.isExisting = "true";
        
        previewItem.innerHTML = `
            <div class="attachment-thumbnail" style="background-image: url('${imageUrl}')">
                <div class="attachment-delete-btn"><i class="fas fa-times"></i></div>
            </div>
            <div class="attachment-file-name">${fileName}</div>`;
        
        const deleteBtn = previewItem.querySelector(".attachment-delete-btn");
        deleteBtn.addEventListener("click", (event) => {
            event.target.closest(".attachment-preview-item").remove();
            if (previewList.children.length === 0) {
                previewContainer.classList.add("hidden");
            }
        });
        
        previewList.appendChild(previewItem);
        previewContainer.classList.remove("hidden");
    }
    
    static isImageEditRequest(message) {
        return message.startsWith("/gpt-image-1-edit");
    }
}

export default ImageEditMessageProcessor;
