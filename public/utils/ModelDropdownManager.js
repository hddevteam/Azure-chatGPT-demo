// /utils/ModelDropdownManager.js

/**
 * 管理模型选择模态对话框的类
 */
export default class ModelDropdownManager {
    /**
     * @param {Object} app - 应用实例
     * @param {string} switchElementId - 模型切换按钮的选择器
     */
    constructor(app, switchElementId) {
        this.app = app;
        this.switchElement = document.querySelector(switchElementId);
        
        // 支持的模型列表和它们的显示名称
        this.supportedModels = {
            "gpt-4o": "GPT-4O",
            "gpt-4o-mini": "GPT-4O-MINI",
            "o1": "O1",
            "o1-mini": "O1-MINI",
            "o3-mini": "O3-MINI",
            "deepseek-r1": "DEEPSEEK-R1"
        };
        
        // 默认模型
        this.model = "gpt-4o";
        
        this.createModal();
        this.initFromStorage();
        this.setupEventListeners();
    }

    createModal() {
        // 如果已存在则移除
        const existingModal = document.getElementById("model-select-modal");
        if (existingModal) {
            existingModal.remove();
        }

        const modalHtml = `
            <div id="model-select-modal" class="modal-wrapper">
                <div class="modal-inner">
                    <div class="modal-header">
                        <div class="modal-title-container">
                            <span class="modal-title">Select Model</span>
                            <button type="button" class="modal-close" title="Close">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <div class="modal-content">
                        <div class="model-options">
                            ${Object.entries(this.supportedModels).map(([id, name]) => `
                                <div class="model-option" data-model="${id}">
                                    ${name}
                                </div>
                            `).join("")}
                        </div>
                    </div>
                </div>
            </div>`;

        document.body.insertAdjacentHTML("beforeend", modalHtml);
        this.modal = document.getElementById("model-select-modal");
    }

    setupEventListeners() {
        // 点击切换按钮显示模态框
        this.switchElement.addEventListener("click", () => {
            this.showModal();
        });

        // 关闭按钮和点击外部关闭
        this.modal.addEventListener("click", (event) => {
            if (event.target === this.modal || event.target.closest(".modal-close")) {
                this.hideModal();
            }
        });

        // ESC键关闭
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && this.isVisible()) {
                this.hideModal();
            }
        });

        // 选择模型
        const modelOptions = this.modal.querySelectorAll(".model-option");
        modelOptions.forEach(option => {
            option.addEventListener("click", () => {
                const selectedModel = option.dataset.model;
                this.setModel(selectedModel);
                this.hideModal();
            });
        });
    }

    showModal() {
        this.updateSelectedModelUI();
        this.modal.classList.add("visible");
    }

    hideModal() {
        this.modal.classList.remove("visible");
    }

    isVisible() {
        return this.modal.classList.contains("visible");
    }

    updateSelectedModelUI() {
        const options = this.modal.querySelectorAll(".model-option");
        options.forEach(option => {
            if (option.dataset.model === this.model) {
                option.classList.add("selected");
            } else {
                option.classList.remove("selected");
            }
        });
    }

    initFromStorage() {
        try {
            const savedModel = localStorage.getItem("selectedModel");
            if (savedModel && this.supportedModels[savedModel]) {
                this.setModel(savedModel);
            }
        } catch (e) {
            console.error("Error loading model from storage:", e);
        }
    }

    setModel(model) {
        if (!this.supportedModels[model]) {
            console.warn(`Model ${model} not supported, using default`);
            model = "gpt-4o";
        }
        
        this.model = model;
        
        // 更新切换按钮文本和样式
        this.switchElement.textContent = this.supportedModels[model];
        
        // 更新切换按钮的类名
        Object.keys(this.supportedModels).forEach(modelKey => {
            this.switchElement.classList.remove(modelKey);
        });
        this.switchElement.classList.add(model);
        
        // 更新应用实例的模型
        this.app.model = model;
        
        // 保存到本地存储
        try {
            localStorage.setItem("selectedModel", model);
        } catch (e) {
            console.warn("Unable to save model selection to storage:", e);
        }
    }

    getSelectedModel() {
        return this.model;
    }
}
