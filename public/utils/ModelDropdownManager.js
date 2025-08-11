// /utils/ModelDropdownManager.js

/**
 * Class for managing model selection modal dialog
 */
export default class ModelDropdownManager {
    /**
     * @param {Object} app - Application instance
     * @param {string} switchElementId - Selector for model switch button
     */
    constructor(app, switchElementId) {
        this.app = app;
        this.switchElement = document.querySelector(switchElementId);
        
        // Supported model list and their display names
        this.supportedModels = {
            "gpt-4o": "GPT-4O",
            "gpt-4o-mini": "GPT-4O-MINI",
            "o1": "O1",
            "o1-mini": "O1-MINI",
            "o3": "O3", 
            "o3-mini": "O3-MINI",
            "deepseek-r1": "DEEPSEEK-R1",
            "o4-mini": "O4-MINI",
            "gpt-4.5-preview": "GPT-4.5 PREVIEW",
            "gpt-4.1": "GPT-4.1",
            "gpt-4.1-nano": "GPT-4.1 NANO",
            "gpt-4.1-mini": "GPT-4.1 MINI",
            "gpt-5": "GPT-5",
            "gpt-5-mini": "GPT-5 MINI",
            "gpt-5-nano": "GPT-5 NANO",
            "gpt-5-chat": "GPT-5 CHAT"
        };
        
        // Default model
        this.model = "gpt-4o";
        
        this.createModal();
        this.initFromStorage();
        this.setupEventListeners();
    }

    createModal() {
        // Remove if already exists
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
        // Click switch button to show modal
        this.switchElement.addEventListener("click", () => {
            this.showModal();
        });

        // Close button and click outside to close
        this.modal.addEventListener("click", (event) => {
            if (event.target === this.modal || event.target.closest(".modal-close")) {
                this.hideModal();
            }
        });

        // ESC key to close
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && this.isVisible()) {
                this.hideModal();
            }
        });

        // Select model
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
        
        // Update switch button text and style
        this.switchElement.textContent = this.supportedModels[model];
        
        // Update switch button class name
        Object.keys(this.supportedModels).forEach(modelKey => {
            this.switchElement.classList.remove(modelKey);
        });
        this.switchElement.classList.add(model);
        
        // Update application instance model
        this.app.model = model;
        
        // Save to local storage
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
