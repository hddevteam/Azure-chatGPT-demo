// public/components/GptImageModal.js
/**
 * GPT-Image-1模态框组件
 * 用于处理GPT-Image-1的图像生成和编辑功能
 */
export default class GptImageModal {
    constructor() {
        this.modalId = "gpt-image-modal";
        this.modal = null;
        this.activeTab = "generate"; // 默认活动选项卡
        this.init();
    }

    /**
     * 初始化模态框
     */
    init() {
        this.createModal();
        this.bindEvents();
    }

    /**
     * 创建模态框DOM结构
     */
    createModal() {
        // 检查模态框是否已存在，如果存在则移除
        const existingModal = document.getElementById(this.modalId);
        if (existingModal) {
            existingModal.remove();
        }

        // 创建模态框HTML
        const modalHTML = `
            <div id="${this.modalId}" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>GPT-Image-1 图像生成</h2>
                        <button id="close-gpt-image-btn" class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="tab-header">
                            <button id="generate-tab-btn" class="tab-btn active">生成图像</button>
                            <button id="edit-tab-btn" class="tab-btn">编辑图像</button>
                        </div>
                        
                        <div id="generate-tab-content" class="tab-content active">
                            <div class="setting-item">
                                <label for="gptImagePrompt">提示词描述</label>
                                <textarea id="gptImagePrompt" placeholder="输入英文描述您想要生成的图像..." rows="3"></textarea>
                            </div>
                            
                            <div class="setting-item">
                                <label for="gptImageSize">图像尺寸</label>
                                <select id="gptImageSize">
                                    <option value="1024x1024">1024x1024 (正方形)</option>
                                    <option value="1024x1792">1024x1792 (竖向)</option>
                                    <option value="1792x1024">1792x1024 (横向)</option>
                                </select>
                            </div>
                            
                            <div class="setting-item">
                                <label for="gptImageQuality">图像质量</label>
                                <select id="gptImageQuality">
                                    <option value="medium">标准</option>
                                    <option value="hd">高清</option>
                                </select>
                            </div>
                            
                            <div class="setting-item">
                                <label for="gptImageCount">生成数量</label>
                                <select id="gptImageCount">
                                    <option value="1">1张</option>
                                    <option value="2">2张</option>
                                    <option value="3">3张</option>
                                    <option value="4">4张</option>
                                </select>
                            </div>
                        </div>
                        
                        <div id="edit-tab-content" class="tab-content">
                            <div class="setting-item">
                                <label for="gptImageEditPrompt">编辑提示词</label>
                                <textarea id="gptImageEditPrompt" placeholder="输入英文描述您想要对图像的编辑..." rows="3"></textarea>
                            </div>
                            
                            <div class="setting-item">
                                <label for="gptImageFile">上传图像</label>
                                <div class="upload-area">
                                    <input type="file" id="gptImageFile" accept="image/*" style="display: none;">
                                    <button id="gptImageFileBtn" class="upload-btn">选择图像文件</button>
                                    <div id="imagePreview" class="image-preview"></div>
                                </div>
                            </div>
                            
                            <div class="setting-item">
                                <label for="gptImageMask">上传遮罩（可选）</label>
                                <div class="upload-area">
                                    <input type="file" id="gptImageMask" accept="image/*" style="display: none;">
                                    <button id="gptImageMaskBtn" class="upload-btn">选择遮罩文件</button>
                                    <div id="maskPreview" class="image-preview"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <div id="gptImageError" class="error-message" style="display: none;"></div>
                        <button id="gptImageGenerateBtn" class="btn primary-btn">生成</button>
                        <button id="gptImageCancelBtn" class="btn">取消</button>
                    </div>
                </div>
            </div>`;

        // 将模态框添加到文档中
        document.body.insertAdjacentHTML("beforeend", modalHTML);
        
        // 保存模态框引用
        this.modal = document.getElementById(this.modalId);
    }

    /**
     * 绑定事件处理
     */
    bindEvents() {
        if (!this.modal) return;

        // 关闭按钮
        const closeBtn = document.getElementById("close-gpt-image-btn");
        const cancelBtn = document.getElementById("gptImageCancelBtn");
        
        if (closeBtn) {
            closeBtn.addEventListener("click", () => this.hide());
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener("click", () => this.hide());
        }
        
        // 点击外部关闭
        this.modal.addEventListener("click", (event) => {
            if (event.target === this.modal) {
                this.hide();
            }
        });
        
        // 标签切换
        const generateTabBtn = document.getElementById("generate-tab-btn");
        const editTabBtn = document.getElementById("edit-tab-btn");
        const generateContent = document.getElementById("generate-tab-content");
        const editContent = document.getElementById("edit-tab-content");
        
        if (generateTabBtn && editTabBtn) {
            generateTabBtn.addEventListener("click", () => {
                generateTabBtn.classList.add("active");
                editTabBtn.classList.remove("active");
                generateContent.classList.add("active");
                editContent.classList.remove("active");
                this.activeTab = "generate";
            });
            
            editTabBtn.addEventListener("click", () => {
                editTabBtn.classList.add("active");
                generateTabBtn.classList.remove("active");
                editContent.classList.add("active");
                generateContent.classList.remove("active");
                this.activeTab = "edit";
            });
        }
        
        // 文件上传按钮
        const imageFileBtn = document.getElementById("gptImageFileBtn");
        const imageFileInput = document.getElementById("gptImageFile");
        const maskFileBtn = document.getElementById("gptImageMaskBtn");
        const maskFileInput = document.getElementById("gptImageMask");
        
        if (imageFileBtn && imageFileInput) {
            imageFileBtn.addEventListener("click", () => {
                imageFileInput.click();
            });
            
            imageFileInput.addEventListener("change", (event) => {
                this.handleImagePreview(event.target.files[0], "imagePreview");
            });
        }
        
        if (maskFileBtn && maskFileInput) {
            maskFileBtn.addEventListener("click", () => {
                maskFileInput.click();
            });
            
            maskFileInput.addEventListener("change", (event) => {
                this.handleImagePreview(event.target.files[0], "maskPreview");
            });
        }
        
        // 生成按钮
        const generateBtn = document.getElementById("gptImageGenerateBtn");
        if (generateBtn) {
            generateBtn.addEventListener("click", () => {
                if (this.activeTab === "generate") {
                    this.handleGenerate();
                } else {
                    this.handleEdit();
                }
            });
        }
    }

    /**
     * 处理图像预览
     */
    handleImagePreview(file, previewId) {
        if (!file) return;
        
        const preview = document.getElementById(previewId);
        if (!preview) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            preview.innerHTML = `<img src="${reader.result}" alt="预览图">`;
        };
        reader.readAsDataURL(file);
    }

    /**
     * 处理图像生成
     * 直接设置命令到消息输入框并模拟发送，不再试图直接访问messageManager
     */
    async handleGenerate() {
        const prompt = document.getElementById("gptImagePrompt").value.trim();
        const errorElement = document.getElementById("gptImageError");
        
        if (!prompt) {
            errorElement.textContent = "请输入提示词描述";
            errorElement.style.display = "block";
            return;
        }
        
        try {
            // 构建命令字符串
            let command = `/gpt-image-1 ${prompt}`;
            
            // 获取消息输入框
            const messageInput = document.getElementById("message-input");
            if (messageInput) {
                // 设置命令到输入框
                messageInput.value = command;
                
                // 触发输入框的resize事件以调整高度
                const resizeEvent = new Event("input", { bubbles: true });
                messageInput.dispatchEvent(resizeEvent);
                
                // 获取发送按钮并模拟点击
                const sendButton = document.querySelector("#submitButton") || document.querySelector("#submit-button") || document.getElementById("submitButton");
                if (sendButton) {
                    // 关闭模态框
                    this.hide();
                    // 稍微延迟点击，确保模态框已关闭
                    setTimeout(() => {
                        sendButton.click();
                    }, 10);
                } else {
                    console.error("发送按钮不存在，尝试直接提交表单");
                    // 尝试获取并提交表单
                    const messageForm = document.querySelector("#message-form");
                    if (messageForm) {
                        // 关闭模态框
                        this.hide();
                        setTimeout(() => {
                            messageForm.dispatchEvent(new Event("submit"));
                        }, 10);
                    } else {
                        throw new Error("未找到发送按钮或消息表单");
                    }
                }
            } else {
                throw new Error("消息输入框未找到");
            }
        } catch (error) {
            console.error("图像生成错误:", error);
            errorElement.textContent = error.message || "图像生成失败";
            errorElement.style.display = "block";
        }
    }

    /**
     * 处理图像编辑
     */
    async handleEdit() {
        const prompt = document.getElementById("gptImageEditPrompt").value.trim();
        const imageFile = document.getElementById("gptImageFile").files[0];
        const errorElement = document.getElementById("gptImageError");
        
        if (!prompt) {
            errorElement.textContent = "请输入编辑提示词";
            errorElement.style.display = "block";
            return;
        }
        
        if (!imageFile) {
            errorElement.textContent = "请选择要编辑的图像文件";
            errorElement.style.display = "block";
            return;
        }
        
        try {
            // 获取消息输入框
            const messageInput = document.getElementById("message-input");
            if (!messageInput) {
                throw new Error("消息输入框未找到");
            }
            
            // 设置提示词到输入框
            messageInput.value = `/gpt-image-1-edit ${prompt}`;
            
            // 触发输入框的resize事件以调整高度
            const resizeEvent = new Event("input", { bubbles: true });
            messageInput.dispatchEvent(resizeEvent);
            
            // 尝试上传附件
            // 图像编辑功能暂不支持直接通过命令完成，
            // 未来可以单独为编辑功能开发后端API并集成到消息处理流程中
            errorElement.textContent = "图像编辑功能暂不支持，请使用图像生成功能";
            errorElement.style.display = "block";
            
        } catch (error) {
            console.error("图像编辑错误:", error);
            errorElement.textContent = error.message || "图像编辑失败";
            errorElement.style.display = "block";
        }
    }

    /**
     * 显示模态框
     */
    show() {
        if (this.modal) {
            this.modal.style.display = "block";
            // 重置状态
            document.getElementById("gptImageError").style.display = "none";
            
            // 重置表单
            document.getElementById("gptImagePrompt").value = "";
            document.getElementById("gptImageEditPrompt").value = "";
            document.getElementById("imagePreview").innerHTML = "";
            document.getElementById("maskPreview").innerHTML = "";
            document.getElementById("gptImageFile").value = "";
            document.getElementById("gptImageMask").value = "";
            
            // 重置选项
            document.getElementById("gptImageSize").value = "1024x1024";
            document.getElementById("gptImageQuality").value = "medium";
            document.getElementById("gptImageCount").value = "1";
        }
    }

    /**
     * 隐藏模态框
     */
    hide() {
        if (this.modal) {
            this.modal.style.display = "none";
        }
    }
}
