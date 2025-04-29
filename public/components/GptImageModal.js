// public/components/GptImageModal.js
export default class GptImageModal {
    constructor() {
        this.modalId = "gpt-image-modal";
        this.modal = null;
        this.activeTab = "generate";
        this.init();
    }

    init() {
        this.createModal();
        this.bindEvents();
    }

    createModal() {
        const existingModal = document.getElementById(this.modalId);
        if (existingModal) {
            existingModal.remove();
        }

        const modalHTML = `
            <div id="${this.modalId}" class="modal" role="dialog" aria-labelledby="gptImageModalTitle" aria-modal="true">
                <div class="gpt-image-modal__content">
                    <div class="gpt-image-modal__header">
                        <h2 id="gptImageModalTitle" class="gpt-image-modal__title">Generate Image with GPT-Image-1</h2>
                        <button id="close-gpt-image-btn" class="gpt-image-modal__close" aria-label="Close dialog">&times;</button>
                    </div>
                    
                    <div class="gpt-image-modal__tabs" role="tablist" aria-label="Image operations">
                        <button id="generate-tab-btn" 
                            class="gpt-image-modal__tab gpt-image-modal__tab--active" 
                            role="tab" 
                            aria-selected="true" 
                            aria-controls="generate-tab-content">
                            Generate Image
                        </button>
                        <button id="edit-tab-btn" 
                            class="gpt-image-modal__tab" 
                            role="tab" 
                            aria-selected="false" 
                            aria-controls="edit-tab-content">
                            Edit Image
                        </button>
                    </div>

                    <div id="generate-tab-content" class="gpt-image-modal__tab-content active" role="tabpanel" aria-labelledby="generate-tab-btn">
                        <div class="gpt-image-modal__form-group">
                            <label class="gpt-image-modal__label" for="gptImagePrompt">Prompt Description</label>
                            <textarea id="gptImagePrompt" class="gpt-image-modal__textarea" 
                                    placeholder="Enter a detailed English description of the image you want to generate..." 
                                    rows="3"
                                    aria-describedby="promptHelpText"></textarea>
                            <div id="promptHelpText" class="gpt-image-modal__help-text">Be specific and detailed in your description for better results.</div>
                        </div>

                        <div class="gpt-image-modal__form-group">
                            <label class="gpt-image-modal__label" for="gptImageSize">Image Size</label>
                            <select id="gptImageSize" class="gpt-image-modal__select">
                                <option value="1024x1024">1024x1024 (Square)</option>
                                <option value="1024x1792">1024x1792 (Portrait)</option>
                                <option value="1792x1024">1792x1024 (Landscape)</option>
                            </select>
                        </div>

                        <div class="gpt-image-modal__form-group">
                            <label class="gpt-image-modal__label" for="gptImageQuality">Image Quality</label>
                            <select id="gptImageQuality" class="gpt-image-modal__select" aria-describedby="qualityHelpText">
                                <option value="medium">Standard</option>
                                <option value="hd">HD</option>
                            </select>
                            <div id="qualityHelpText" class="gpt-image-modal__help-text">HD quality may take longer to generate but produces better results.</div>
                        </div>

                        <div class="gpt-image-modal__form-group">
                            <label class="gpt-image-modal__label" for="gptImageCount">Number of Images</label>
                            <select id="gptImageCount" class="gpt-image-modal__select">
                                <option value="1">1 Image</option>
                                <option value="2">2 Images</option>
                                <option value="3">3 Images</option>
                                <option value="4">4 Images</option>
                            </select>
                        </div>
                    </div>

                    <div id="edit-tab-content" class="gpt-image-modal__tab-content" role="tabpanel" aria-labelledby="edit-tab-btn" style="display: none;">
                        <div class="gpt-image-modal__form-group">
                            <label class="gpt-image-modal__label" for="gptImageEditPrompt">Edit Description</label>
                            <textarea id="gptImageEditPrompt" class="gpt-image-modal__textarea" 
                                    placeholder="Describe how you want to modify the image..." 
                                    rows="3"
                                    aria-describedby="editHelpText"></textarea>
                            <div id="editHelpText" class="gpt-image-modal__help-text">Clearly describe the changes you want to make to the image.</div>
                        </div>

                        <div class="gpt-image-modal__form-group">
                            <label class="gpt-image-modal__label" for="gptImageFile">Upload Image</label>
                            <div class="gpt-image-modal__upload-area">
                                <input type="file" id="gptImageFile" accept="image/png,image/jpeg" style="display: none;" aria-describedby="fileHelpText">
                                <button id="gptImageFileBtn" class="gpt-image-modal__upload-button">Select Image File</button>
                                <div id="fileHelpText" class="gpt-image-modal__help-text">Supported formats: PNG, JPEG</div>
                                <div id="imagePreview" class="gpt-image-modal__preview" role="img" aria-label="Image preview"></div>
                            </div>
                        </div>

                        <div class="gpt-image-modal__form-group">
                            <label class="gpt-image-modal__label" for="gptImageMask">Upload Mask (Optional)</label>
                            <div class="gpt-image-modal__upload-area">
                                <input type="file" id="gptImageMask" accept="image/png" style="display: none;" aria-describedby="maskHelpText">
                                <button id="gptImageMaskBtn" class="gpt-image-modal__upload-button">Select Mask File</button>
                                <div id="maskHelpText" class="gpt-image-modal__help-text">PNG file with transparency to specify edit areas</div>
                                <div id="maskPreview" class="gpt-image-modal__preview" role="img" aria-label="Mask preview"></div>
                            </div>
                        </div>
                    </div>

                    <div class="gpt-image-modal__footer">
                        <div id="gptImageError" class="gpt-image-modal__error" style="display: none;"></div>
                        <button id="gptImageCancelBtn" class="gpt-image-modal__button gpt-image-modal__button--secondary">Cancel</button>
                        <button id="gptImageGenerateBtn" class="gpt-image-modal__button gpt-image-modal__button--primary">Generate</button>
                    </div>
                </div>
            </div>`;

        document.body.insertAdjacentHTML("beforeend", modalHTML);
        this.modal = document.getElementById(this.modalId);
    }

    bindEvents() {
        if (!this.modal) return;

        // Close buttons
        const closeBtn = this.modal.querySelector("#close-gpt-image-btn");
        const cancelBtn = this.modal.querySelector("#gptImageCancelBtn");
        
        if (closeBtn) closeBtn.addEventListener("click", () => this.hide());
        if (cancelBtn) cancelBtn.addEventListener("click", () => this.hide());

        // Click outside to close
        this.modal.addEventListener("click", (event) => {
            if (event.target === this.modal) this.hide();
        });

        // Tab switching
        const generateTabBtn = this.modal.querySelector("#generate-tab-btn");
        const editTabBtn = this.modal.querySelector("#edit-tab-btn");
        const generateContent = this.modal.querySelector("#generate-tab-content");
        const editContent = this.modal.querySelector("#edit-tab-content");
        const generateBtn = this.modal.querySelector("#gptImageGenerateBtn");

        if (generateTabBtn && editTabBtn && generateBtn) {
            generateTabBtn.addEventListener("click", () => {
                this.switchTab("generate");
                generateBtn.textContent = "Generate";
            });

            editTabBtn.addEventListener("click", () => {
                this.switchTab("edit");
                generateBtn.textContent = "Apply Edit";
            });
        }

        // File upload handling
        this.setupFileUpload("gptImageFile", "imagePreview");
        this.setupFileUpload("gptImageMask", "maskPreview");

        // Generate/Edit button
        if (generateBtn) {
            generateBtn.addEventListener("click", () => {
                this.clearError();
                if (this.activeTab === "generate") {
                    this.handleGenerate();
                } else {
                    this.handleEdit();
                }
            });
        }
    }

    switchTab(tabName) {
        const tabs = this.modal.querySelectorAll(".gpt-image-modal__tab");
        const contents = this.modal.querySelectorAll(".gpt-image-modal__tab-content");

        this.activeTab = tabName;

        // 移除所有标签的活动状态
        tabs.forEach(tab => {
            tab.classList.remove("gpt-image-modal__tab--active");
            tab.setAttribute("aria-selected", "false");
        });

        // 隐藏所有内容
        contents.forEach(content => {
            content.classList.remove("active");
            content.style.display = "none";
        });

        // 激活当前标签和内容
        const activeTab = this.modal.querySelector(`#${tabName}-tab-btn`);
        const activeContent = this.modal.querySelector(`#${tabName}-tab-content`);

        if (activeTab && activeContent) {
            activeTab.classList.add("gpt-image-modal__tab--active");
            activeTab.setAttribute("aria-selected", "true");
            activeContent.classList.add("active");
            activeContent.style.display = "block";
        }
    }

    setupFileUpload(inputId, previewId) {
        const fileBtn = this.modal.querySelector(`#${inputId.replace("File", "FileBtn")}`);
        const fileInput = this.modal.querySelector(`#${inputId}`);
        
        if (fileBtn && fileInput) {
            fileBtn.addEventListener("click", () => fileInput.click());
            fileInput.addEventListener("change", (event) => {
                this.handleImagePreview(event.target.files[0], previewId);
            });
        }
    }

    handleImagePreview(file, previewId) {
        if (!file) return;

        const preview = this.modal.querySelector(`#${previewId}`);
        if (!preview) return;

        // Validate file type
        if (!file.type.match("image.*")) {
            this.showError("Please select a valid image file.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(file);
    }

    async handleGenerate() {
        const promptInput = this.modal.querySelector("#gptImagePrompt");
        const prompt = promptInput.value.trim();

        if (!prompt) {
            this.showError("Please enter a prompt description.");
            return;
        }

        try {
            // 构建命令字符串
            const messageInput = document.getElementById("message-input");
            if (messageInput) {
                messageInput.value = `/gpt-image-1 ${prompt}`;
                
                // 触发输入框的resize事件以调整高度
                const resizeEvent = new Event("input", { bubbles: true });
                messageInput.dispatchEvent(resizeEvent);
                
                // 获取发送按钮并模拟点击
                const sendButton = document.querySelector("#submitButton");
                if (sendButton) {
                    this.hide();
                    setTimeout(() => sendButton.click(), 10);
                } else {
                    throw new Error("Send button not found");
                }
            } else {
                throw new Error("Message input not found");
            }
        } catch (error) {
            console.error("Image generation error:", error);
            this.showError(error.message || "Failed to generate image");
        }
    }

    async handleEdit() {
        const promptInput = this.modal.querySelector("#gptImageEditPrompt");
        const imageInput = this.modal.querySelector("#gptImageFile");
        const maskInput = this.modal.querySelector("#gptImageMask");
        const prompt = promptInput.value.trim();
        
        if (!prompt) {
            this.showError("Please enter an edit description.");
            return;
        }

        if (!imageInput.files || !imageInput.files[0]) {
            this.showError("Please select an image to edit.");
            return;
        }

        try {
            const messageInput = document.getElementById("message-input");
            const previewContainer = document.getElementById("attachment-preview-list");
            const attachmentContainer = document.getElementById("attachment-preview-container");
            
            if (!messageInput || !previewContainer || !attachmentContainer) {
                throw new Error("Required elements not found");
            }

            // 构建命令字符串
            let command = `/gpt-image-1-edit ${prompt}`;
            messageInput.value = command;

            // 准备要上传的文件
            const files = [imageInput.files[0]];
            if (maskInput.files && maskInput.files[0]) {
                files.push(maskInput.files[0]);
            }

            // 构建FormData并保存供后续使用
            const formData = new FormData();
            formData.append("prompt", prompt);
            
            // 确保文件对象有效
            const imageFile = imageInput.files[0];
            if (!imageFile) {
                throw new Error("No image file selected");
            }
            
            console.log("Image file to upload:", {
                name: imageFile.name,
                type: imageFile.type,
                size: imageFile.size
            });
            
            formData.append("image", imageFile, imageFile.name);
            
            if (maskInput.files && maskInput.files[0]) {
                const maskFile = maskInput.files[0];
                console.log("Mask file to upload:", {
                    name: maskFile.name,
                    type: maskFile.type,
                    size: maskFile.size
                });
                formData.append("mask", maskFile, maskFile.name);
            }

            // 存储FormData以供后续使用
            window.currentEditFormData = formData;

            // 将编辑的图片作为消息的附件
            const previewPromises = files.map(file => {
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        resolve({
                            fileName: file.name,
                            content: e.target.result
                        });
                    };
                    reader.readAsDataURL(file);
                });
            });

            const attachments = await Promise.all(previewPromises);
                
            // 触发输入框的resize事件以调整高度
            messageInput.dispatchEvent(new Event("input", { bubbles: true }));
            
            // 隐藏模态框
            this.hide();

            // 添加预览
            for (const attachment of attachments) {
                const previewItem = document.createElement("div");
                previewItem.classList.add("attachment-preview-item");
                previewItem.dataset.fileName = attachment.fileName;
                previewItem.dataset.content = attachment.content;
                
                previewItem.innerHTML = `
                    <div class="attachment-thumbnail" style="background-image: url('${attachment.content}')">
                        <div class="attachment-delete-btn"><i class="fas fa-times"></i></div>
                    </div>
                    <div class="attachment-file-name">${attachment.fileName}</div>`;
                
                const deleteBtn = previewItem.querySelector(".attachment-delete-btn");
                deleteBtn.addEventListener("click", (event) => {
                    event.target.closest(".attachment-preview-item").remove();
                    if (previewContainer.children.length === 0) {
                        attachmentContainer.classList.add("hidden");
                    }
                });
                
                previewContainer.appendChild(previewItem);
            }
            attachmentContainer.classList.remove("hidden");

            // 触发发送
            const sendButton = document.querySelector("#submitButton");
            if (sendButton) {
                setTimeout(() => sendButton.click(), 10);
            } else {
                throw new Error("Send button not found");
            }
        } catch (error) {
            console.error("Image editing error:", error);
            this.showError(error.message || "Failed to edit image");
        }
    }

    show() {
        if (this.modal) {
            this.modal.style.display = "block";
            this.resetForm();
        }
    }

    hide() {
        if (this.modal) {
            this.modal.style.display = "none";
        }
    }

    resetForm() {
        const form = this.modal.querySelector(".gpt-image-modal__content");
        if (form) {
            form.querySelectorAll("textarea, select").forEach(el => {
                el.value = el.tagName === "SELECT" ? el.options[0].value : "";
            });
            form.querySelectorAll("input[type=\"file\"]").forEach(el => {
                el.value = "";
            });
            form.querySelectorAll(".gpt-image-modal__preview").forEach(el => {
                el.innerHTML = "";
            });
        }
        this.switchTab("generate");
        this.clearError();
    }

    showError(message) {
        const errorElement = this.modal.querySelector("#gptImageError");
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = "block";
        }
    }

    clearError() {
        const errorElement = this.modal.querySelector("#gptImageError");
        if (errorElement) {
            errorElement.textContent = "";
            errorElement.style.display = "none";
        }
    }
}
