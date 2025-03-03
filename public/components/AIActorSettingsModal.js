// AIActorSettingsModal.js
import swal from "sweetalert";

export default class AIActorSettingsModal {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.modal = null;
        this.editMode = false;
        this.currentProfileData = null;
        this.init();
    }

    init() {
        this.createModal();
        this.bindEvents();
    }

    createModal() {
        const modalTemplate = `
            <div id="ai-actor-settings-wrapper" class="modal-wrapper">
                <div id="ai-actor-settings-inner-form-wrapper" class="modal-inner">
                    <div class="modal-header">
                        <div class="modal-title-container">
                            <span id="modal-title">AI Actor Settings</span>
                            <button type="button" id="close-settings" title="Close">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="modal-header-buttons">
                            <button type="button" id="new-ai-actor-btn" title="Create New AI Actor">New</button>
                            <button type="button" id="export-profile" title="Export AI profile">Export</button>
                            <button type="button" id="import-profile" title="Import AI profile">Import</button>
                            <button type="button" id="delete-profile" class="danger" title="Delete Profile">Delete</button>
                            <button type="button" id="save-profile">Save</button>
                        </div>
                    </div>
                    <div class="setting-item">
                        <label for="prompt">Prompt</label>
                        <div class="textarea-container">
                            <textarea id="prompt" rows="12" required></textarea>
                            <div id="profile-buttons">
                                <button id="generate-prompt" title="Automatically generate prompt based on your content">
                                    <i class="fas fa-magic"></i>
                                    <span>Generate Prompt</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="setting-item">
                        <label for="temperature">Temperature</label>
                        <input type="number" id="temperature" min="0" max="1" step="0.1" placeholder="0.8 (default)">
                    </div>
                    <div class="setting-item">
                        <label for="top_p">Top P</label>
                        <input type="number" id="top_p" min="0" max="1" step="0.05" placeholder="0.95 (default)">
                    </div>
                    <div class="setting-item">
                        <label for="frequency_penalty">Frequency Penalty</label>
                        <input type="number" id="frequency_penalty" min="0" max="1" step="0.1" placeholder="0 (default)">
                    </div>
                    <div class="setting-item">
                        <label for="presence_penalty">Presence Penalty</label>
                        <input type="number" id="presence_penalty" min="0" max="1" step="0.1" placeholder="0 (default)">
                    </div>
                    <div class="setting-item">
                        <label for="max_tokens">Max Tokens</label>
                        <input type="number" id="max_tokens" min="1" step="1" placeholder="2000 (default)">
                    </div>
                    <h5>Profile Settings</h5>
                    <div class="setting-item">
                        <label for="name">Name</label>
                        <input type="text" id="name" required>
                    </div>
                    <div class="setting-item">
                        <label for="icon">Icon<i id="icon-preview"></i></label>
                        <input type="text" id="icon" required>
                    </div>
                    <div class="setting-item">
                        <label for="displayName">Display Name</label>
                        <input type="text" id="displayName">
                    </div>
                    <div class="setting-item">
                        <label for="tts">Text to Speech</label>
                        <select id="tts">
                            <option value="disabled">Disabled</option>
                            <option value="enabled">Enabled</option>
                        </select>
                    </div>
                    <div class="setting-item">
                        <label for="sortedIndex">Sorted Index</label>
                        <input type="number" id="sortedIndex" min="0" required>
                    </div>
                </div>
            </div>`;

        // 将模态框添加到文档中
        document.body.insertAdjacentHTML("beforeend", modalTemplate);
        this.modal = document.getElementById("ai-actor-settings-wrapper");
    }

    bindEvents() {
        // 点击外部区域关闭
        this.modal.addEventListener("click", (event) => {
            if (event.target === this.modal) {
                this.hide();
            }
        });

        // ESC键关闭
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && this.isVisible()) {
                this.hide();
            }
        });

        // "New" button - create a new AI Actor
        const newButton = this.modal.querySelector("#new-ai-actor-btn");
        if (newButton) {
            newButton.addEventListener("click", () => {
                // Reset the form and switch to new actor mode
                this.uiManager.profileFormManager.resetForm();
                this.uiManager.profileFormManager.oldName = "";
                this.show(null); // Show modal in create mode
            });
        }

        // 保存按钮
        const saveButton = this.modal.querySelector("#save-profile");
        if (saveButton) {
            saveButton.addEventListener("click", () => {
                // 触发保存逻辑后关闭模态框
                this.hide();
            });
        }

        // 关闭按钮
        const closeButton = this.modal.querySelector("#close-settings");
        if (closeButton) {
            closeButton.addEventListener("click", () => {
                this.hide();
            });
        }

        // Delete button - add an extra check to prevent errors in create mode
        const deleteButton = this.modal.querySelector("#delete-profile");
        if (deleteButton) {
            deleteButton.addEventListener("click", (event) => {
                // If in create mode, show warning and prevent default action
                if (!this.editMode) {
                    event.preventDefault();
                    event.stopPropagation();
                    this.showWarningMessage("Cannot delete a profile that hasn't been created yet.");
                    return false;
                }
                // Otherwise let the ProfileFormManager handle it
            });
        }

        // 监听 Display Name 变化，实时更新标题
        const displayNameInput = this.modal.querySelector("#displayName");
        if (displayNameInput) {
            displayNameInput.addEventListener("input", (e) => {
                const modalTitle = this.modal.querySelector("#modal-title");
                if (modalTitle && e.target.value) {
                    modalTitle.textContent = e.target.value;
                } else {
                    modalTitle.textContent = "New AI Actor";
                }
            });
        }
    }

    // Add a helper method to show warning messages
    showWarningMessage(message) {
        // Use sweetalert if available, otherwise use native alert
        if (typeof swal === "function") {
            swal({
                title: "Warning",
                text: message,
                icon: "warning",
                button: "OK",
            });
        } else {
            alert(message);
        }
    }
    
    // Update UI based on edit mode
    updateUIForEditMode() {
        const deleteButton = this.modal.querySelector("#delete-profile");
        if (deleteButton) {
            if (this.editMode) {
                // In edit mode, show delete button normally
                deleteButton.style.display = "inline-block";
                deleteButton.disabled = false;
            } else {
                // In create mode, disable delete button
                deleteButton.style.display = "none";
            }
        }
    }

    show(profileData = null) {
        this.editMode = !!profileData;
        this.currentProfileData = profileData;

        // When we switch to create mode from edit mode, ensure form is properly reset
        if (!this.editMode && this.modal.classList.contains("visible")) {
            // Clear all form fields to prepare for a new AI Actor
            const formElements = this.modal.querySelectorAll("input, textarea, select");
            formElements.forEach(element => {
                if (element.type === "checkbox" || element.type === "radio") {
                    element.checked = false;
                } else {
                    element.value = "";
                }
            });
            
            // Set default values for certain fields
            const sortedIndexField = this.modal.querySelector("#sortedIndex");
            if (sortedIndexField) {
                sortedIndexField.value = "0";
            }
        }

        // 更新标题
        const modalTitle = this.modal.querySelector("#modal-title");
        const nameField = this.modal.querySelector("#name");

        if (this.editMode && profileData) {
            // 编辑模式：设置标题为 Display Name 并禁用 Name 字段
            modalTitle.textContent = profileData.displayName || profileData.name;
            if (nameField) {
                nameField.disabled = true;
                nameField.classList.add("disabled");
            }
        } else {
            // 新建模式：重置标题并启用 Name 字段
            modalTitle.textContent = "New AI Actor";
            if (nameField) {
                nameField.disabled = false;
                nameField.classList.remove("disabled");
            }
        }

        // Update UI elements based on edit mode
        this.updateUIForEditMode();

        this.modal.classList.add("visible");
        // 添加一个短暂延迟以确保过渡动画正确触发
        requestAnimationFrame(() => {
            this.modal.style.opacity = "1";
        });
    }

    hide() {
        this.modal.style.opacity = "0";
        // 等待过渡动画完成后再隐藏元素
        setTimeout(() => {
            this.modal.classList.remove("visible");
        }, 300); // 与 CSS 过渡时间相匹配
    }

    isVisible() {
        return this.modal.classList.contains("visible");
    }
}