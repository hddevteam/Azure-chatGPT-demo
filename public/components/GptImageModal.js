// public/components/GptImageModal.js
/**
 * GPT-Image-1模态框组件
 * 用于处理GPT-Image-1的图像生成和编辑功能
 */
// 导入专用API客户端函数
import { gptImage1Generate, gptImage1Edit, uploadAttachment } from "../utils/apiClient.js";

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
                        
                        <div id="results-container" class="results-container">
                            <!-- 结果将在这里显示 -->
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
        const reader = new FileReader();
        
        reader.onloadend = () => {
            preview.innerHTML = `<img src="${reader.result}" alt="预览图">`;
        };
        
        reader.readAsDataURL(file);
    }

    /**
     * 处理图像生成
     */
    async handleGenerate() {
        const prompt = document.getElementById("gptImagePrompt").value.trim();
        const size = document.getElementById("gptImageSize").value;
        const quality = document.getElementById("gptImageQuality").value;
        const n = parseInt(document.getElementById("gptImageCount").value);
        const errorElement = document.getElementById("gptImageError");
        const resultsContainer = document.getElementById("results-container");
        
        if (!prompt) {
            errorElement.textContent = "请输入提示词描述";
            errorElement.style.display = "block";
            return;
        }
        
        try {
            // 显示加载状态
            resultsContainer.innerHTML = `
                <div class="loading-container">
                    <div class="spinner-border"></div>
                    <p>生成中，请稍候...</p>
                </div>`;
            
            // 使用专用的GPT-Image-1函数生成图像
            const response = await gptImage1Generate(prompt, size, quality, n);
            
            // 处理响应
            if (response && response.success) {
                // 显示结果
                this.displayResults(response.data);
            } else {
                throw new Error(response?.error || "图像生成失败");
            }
            
        } catch (error) {
            console.error("图像生成错误:", error);
            errorElement.textContent = error.message || "图像生成失败";
            errorElement.style.display = "block";
            resultsContainer.innerHTML = "";
        }
    }
    
    /**
     * 处理图像编辑
     */
    async handleEdit() {
        const prompt = document.getElementById("gptImageEditPrompt").value.trim();
        const imageFile = document.getElementById("gptImageFile").files[0];
        const maskFile = document.getElementById("gptImageMask").files[0];
        const errorElement = document.getElementById("gptImageError");
        const resultsContainer = document.getElementById("results-container");
        
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
            // 显示加载状态
            resultsContainer.innerHTML = `
                <div class="loading-container">
                    <div class="spinner-border"></div>
                    <p>编辑中，请稍候...</p>
                </div>`;
            
            // 创建表单数据
            const formData = new FormData();
            formData.append("prompt", prompt);
            formData.append("image", imageFile);
            if (maskFile) {
                formData.append("mask", maskFile);
            }
            
            // 使用专用的GPT-Image-1函数编辑图像
            const response = await gptImage1Edit(formData);
            
            // 处理响应
            if (response && response.success) {
                // 显示结果
                this.displayResults(response.data);
            } else {
                throw new Error(response?.error || "图像编辑失败");
            }
            
        } catch (error) {
            console.error("图像编辑错误:", error);
            errorElement.textContent = error.message || "图像编辑失败";
            errorElement.style.display = "block";
            resultsContainer.innerHTML = "";
        }
    }
    
    /**
     * 显示结果
     */
    async displayResults(images) {
        const resultsContainer = document.getElementById("results-container");
        
        if (!images || images.length === 0) {
            resultsContainer.innerHTML = "<p class=\"no-results\">未生成任何图像</p>";
            return;
        }
        
        console.log("处理图像结果:", images);
        
        // 自动处理第一张图像并发送到聊天
        try {
            const firstImage = images[0];
            const imageUrl = firstImage.url || firstImage.b64_json ? `data:image/png;base64,${firstImage.b64_json}` : null;
            
            if (imageUrl) {
                // 获取图片并转换为blob
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                
                // 生成文件名
                const fileName = `gpt-image-${Date.now()}-0.png`;
                
                // 上传图片作为附件
                const uploadResponse = await uploadAttachment(blob, fileName);
                console.log("图像上传成功:", uploadResponse);

                // 自动发送到聊天
                this.sendToChat(imageUrl, firstImage.revised_prompt, uploadResponse.url);
                
                // 关闭模态框
                this.hide();
                
                // 直接返回，不再显示结果网格
                return;
            }
        } catch (error) {
            console.error("自动发送图像失败，继续显示结果网格:", error);
        }
        
        // 如果自动发送失败，显示结果网格作为备选
        let html = "<div class=\"results-grid\">";
        
        // 对每个图像，先上传到服务器以保存为附件
        const processedImages = await Promise.all(images.map(async (image, index) => {
            try {
                // 检查图像数据结构
                const imageUrl = image.url || image.b64_json ? `data:image/png;base64,${image.b64_json}` : null;
                
                if (!imageUrl) {
                    console.error("无效的图像数据结构:", image);
                    return {
                        ...image,
                        url: null,
                        attachmentUrl: null
                    };
                }
                
                // 获取图片并转换为blob
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                
                // 生成文件名
                const fileName = `gpt-image-${Date.now()}-${index}.png`;
                
                // 上传图片作为附件
                const uploadResponse = await uploadAttachment(blob, fileName);
                console.log("图像上传成功:", uploadResponse);
                
                return {
                    ...image,
                    url: imageUrl, // 确保有可用的URL
                    attachmentUrl: uploadResponse.url,
                    fileName: fileName
                };
            } catch (error) {
                console.error("处理图像失败:", error);
                return image; // 如果上传失败，返回原始图像
            }
        }));
        
        // 渲染结果
        processedImages.forEach((image, index) => {
            const displayUrl = image.attachmentUrl || image.url;
            
            html += `
                <div class="result-card">
                    <img src="${displayUrl}" alt="生成的图像 ${index + 1}">
                    <div class="result-actions">
                        <button class="btn-sm use-in-chat" data-url="${displayUrl}" data-revised="${image.revised_prompt || ""}" data-attachment-url="${image.attachmentUrl || ""}">
                            发送到聊天
                        </button>
                        <a href="${displayUrl}" class="btn-sm download" download="${image.fileName || `gpt-image-${Date.now()}-${index}.png`}">
                            下载
                        </a>
                    </div>
                    ${image.revised_prompt ? `<div class="revised-prompt">修改后的提示词: ${image.revised_prompt}</div>` : ""}
                </div>`;
        });
        
        html += "</div>";
        resultsContainer.innerHTML = html;
        
        // 添加"发送到聊天"按钮的事件监听
        const useInChatBtns = resultsContainer.querySelectorAll(".use-in-chat");
        useInChatBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                const url = btn.dataset.url;
                const revised = btn.dataset.revised;
                const attachmentUrl = btn.dataset.attachmentUrl;
                this.sendToChat(url, revised, attachmentUrl);
                this.hide();
            });
        });
    }
    
    /**
     * 发送图像到聊天
     */
    sendToChat(imageUrl, revisedPrompt, attachmentUrl) {
        // 获取当前消息输入框
        const messageInput = document.getElementById("message-input");
        if (!messageInput) return;
        
        // 添加图像链接到消息
        let message = messageInput.value.trim();
        if (message) {
            message += "\n\n";
        }
        
        // 添加GPT-Image-1生成的图像标记和链接
        message += `[GPT-Image-1生成的图像](${imageUrl})`;
        
        if (revisedPrompt) {
            message += `\n修改后的提示词: ${revisedPrompt}`;
        }
        
        // 设置消息文本
        messageInput.value = message;
        
        // 如果有attachmentUrl，将其添加到消息附件中
        if (attachmentUrl) {
            // 查找附件预览列表
            const attachmentPreviewList = document.getElementById("attachment-preview-list");
            if (attachmentPreviewList) {
                // 创建附件预览项
                const previewItem = document.createElement("div");
                previewItem.className = "attachment-preview-item";
                previewItem.dataset.fileName = `gpt-image-${Date.now()}.png`;
                previewItem.dataset.content = attachmentUrl;
                previewItem.innerHTML = `
                    <img src="${imageUrl}" alt="GPT-Image-1 生成的图像">
                    <button class="remove-attachment"><i class="fas fa-times"></i></button>
                `;
                
                // 添加到预览列表
                attachmentPreviewList.appendChild(previewItem);
                
                // 绑定移除按钮事件
                const removeBtn = previewItem.querySelector(".remove-attachment");
                if (removeBtn) {
                    removeBtn.addEventListener("click", () => {
                        previewItem.remove();
                    });
                }
            }
        }
        
        // 触发输入框的resize事件以调整高度
        const event = new Event("input", { bubbles: true });
        messageInput.dispatchEvent(event);
    }

    /**
     * 显示模态框
     */
    show() {
        if (this.modal) {
            this.modal.style.display = "block";
            // 重置状态
            document.getElementById("gptImageError").style.display = "none";
            document.getElementById("results-container").innerHTML = "";
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
