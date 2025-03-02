// AIActorSettingsModal.js
export default class AIActorSettingsModal {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.modal = null;
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
                        <span>AI Actor Settings</span>
                        <div class="modal-header-buttons">
                            <button type="button" id="export-profile" title="Export ai profile">Export</button>
                            <button type="button" id="import-profile" title="Import ai profile">Import</button>
                            <button type="button" id="save-profile">Save</button>
                        </div>
                    </div>
                    <div class="setting-item">
                        <label for="prompt">Prompt</label>
                        <div class="textarea-container">
                            <textarea id="prompt" rows="12" required></textarea>
                            <div id="profile-buttons">
                                <button id="generate-prompt" title="Automatic generate prompt based on your content">
                                    <i class="fas fa-magic"></i>
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
                    <div class="bottom-buttons">
                        <button type="button" id="delete-profile" class="danger" title="Delete Profile">
                            <i class="fas fa-trash-alt"></i>
                        </button>
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

        // 保存按钮
        const saveButton = this.modal.querySelector("#save-profile");
        if (saveButton) {
            saveButton.addEventListener("click", () => {
                // 触发保存逻辑后关闭模态框
                this.hide();
            });
        }
    }

    show() {
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