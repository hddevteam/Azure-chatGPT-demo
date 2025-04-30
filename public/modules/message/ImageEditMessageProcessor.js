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

        // Show preview container
        const previewContainer = document.getElementById("attachment-preview-container");
        const previewList = document.getElementById("attachment-preview-list");
        if (!previewContainer || !previewList) {
            throw new Error("Preview container not found");
        }

        // Clear existing previews
        previewList.innerHTML = "";

        // Check if there is already an image in the preview area (added by the edit button)
        const existingPreviewItems = document.querySelectorAll(".attachment-preview-item[data-is-existing='true']");
        let hasExistingPreview = false;
        let existingImageUrl = null;
        let existingFileName = null;
        let existingFileType = null;
        
        if (existingPreviewItems.length > 0) {
            hasExistingPreview = true;
            const previewItem = existingPreviewItems[0];
            existingImageUrl = previewItem.dataset.url;
            existingFileName = previewItem.dataset.fileName || existingImageUrl.split("/").pop() || "image.jpg";
            existingFileType = previewItem.dataset.fileType || "image/jpeg";
            
            console.log("Using existing preview image:", {
                url: existingImageUrl,
                fileName: existingFileName,
                fileType: existingFileType
            });
        }

        // Check if there's a FormData from the modal
        const formData = window.currentEditFormData;
        
        if (formData) {
            // Use files from the modal's FormData
            const oldImage = formData.get("image");
            if (oldImage) {
                // Ensure original filename and MIME type are preserved
                const originalName = oldImage.name || "image.jpg";
                
                // Determine extension based on file type
                let fileExt = ".jpg";
                if (oldImage.type) {
                    const mimeToExt = {
                        "image/jpeg": ".jpg",
                        "image/jpg": ".jpg",
                        "image/png": ".png",
                        "image/webp": ".webp",
                        "image/gif": ".gif"
                    };
                    fileExt = mimeToExt[oldImage.type] || ".jpg";
                }
                
                // Correct the filename if it doesn't have the right extension
                let correctFileName = originalName;
                if (!correctFileName.toLowerCase().endsWith(fileExt)) {
                    // Remove any existing extension
                    correctFileName = correctFileName.replace(/\.[^/.]+$/, "");
                    // Add the correct extension
                    correctFileName += fileExt;
                }
                
                console.log(`Using original image: ${correctFileName} with MIME type: ${oldImage.type}`);
                newFormData.append("image", oldImage, correctFileName);
                
                // If there is no existing preview, add a preview
                if (!hasExistingPreview) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        this._addPreviewItem(e.target.result, correctFileName);
                    };
                    reader.readAsDataURL(oldImage);
                }
            }
            
            const oldMask = formData.get("mask");
            if (oldMask) {
                // Ensure original filename and MIME type are preserved
                const originalMaskName = oldMask.name || "mask.png";
                
                // Determine extension based on file type
                let maskExt = ".png";
                if (oldMask.type) {
                    const mimeToExt = {
                        "image/jpeg": ".jpg",
                        "image/jpg": ".jpg",
                        "image/png": ".png",
                        "image/webp": ".webp",
                        "image/gif": ".gif"
                    };
                    maskExt = mimeToExt[oldMask.type] || ".png";
                }
                
                // Correct the filename if it doesn't have the right extension
                let correctMaskName = originalMaskName;
                if (!correctMaskName.toLowerCase().endsWith(maskExt)) {
                    // Remove any existing extension
                    correctMaskName = correctMaskName.replace(/\.[^/.]+$/, "");
                    // Add the correct extension
                    correctMaskName += maskExt;
                }
                
                console.log(`Using mask image: ${correctMaskName} with MIME type: ${oldMask.type}`);
                newFormData.append("mask", oldMask, correctMaskName);
                
                // Add mask preview
                const reader = new FileReader();
                reader.onload = (e) => {
                    this._addPreviewItem(e.target.result, correctMaskName);
                };
                reader.readAsDataURL(oldMask);
            }
        } else if (hasExistingPreview && existingImageUrl) {
            // Use the image already displayed in the preview area
            try {
                const response = await fetch(existingImageUrl);
                const blob = await response.blob();
                
                // Get the base filename from the URL
                const urlParts = existingImageUrl.split("/");
                let baseName = urlParts[urlParts.length - 1] || "image";
                
                // Remove existing extension to prepare for replacement
                baseName = baseName.replace(/\.[^/.]+$/, "");
                
                // Determine the correct file extension based on the blob type
                let fileExtension = ".jpg"; // default extension
                if (blob.type) {
                    const mimeToExt = {
                        "image/jpeg": ".jpg",
                        "image/jpg": ".jpg",
                        "image/png": ".png",
                        "image/webp": ".webp",
                        "image/gif": ".gif"
                    };
                    fileExtension = mimeToExt[blob.type] || ".jpg";
                }
                
                // Combine filename with the correct MIME type and extension
                const fileName = baseName + fileExtension;
                console.log(`Using image: ${fileName} with type: ${blob.type}`);
                newFormData.append("image", blob, fileName);
                // No need to add preview as it already exists
            } catch (error) {
                console.error("Failed to fetch existing preview image:", error);
                throw new Error("Failed to fetch existing image for editing");
            }
        } else {
            // Try to get the image from message history
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
                
                // get the base name from the URL
                const urlParts = currentMessage.attachmentUrls.split("/");
                let baseName = urlParts[urlParts.length - 1] || "image";
                
                // remove any existing extension
                baseName = baseName.replace(/\.[^/.]+$/, "");
                
                // determine the correct file extension based on the blob type
                let fileExtension = ".jpg"; // default extension
                if (blob.type) {
                    const mimeToExt = {
                        "image/jpeg": ".jpg",
                        "image/jpg": ".jpg",
                        "image/png": ".png",
                        "image/webp": ".webp",
                        "image/gif": ".gif"
                    };
                    fileExtension = mimeToExt[blob.type] || ".jpg";
                }
                
                // Combine filename with the correct MIME type and extension
                const fileName = baseName + fileExtension;
                console.log(`Using history image: ${fileName} with type: ${blob.type}`);
                newFormData.append("image", blob, fileName);
                
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
