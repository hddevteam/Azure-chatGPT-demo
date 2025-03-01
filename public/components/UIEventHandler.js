// UIEventHandler.js - 处理所有 UI 相关的事件
class UIEventHandler {
    constructor(uiManager) {
        this.uiManager = uiManager;
        // 绑定事件处理函数到实例，以便可以作为回调函数使用
        this.boundHideAIActorOnOutsideClick = this.hideAIActorOnOutsideClick.bind(this);
        this.handleClickOutsideCreateAIActorModal = this.clickOutsideCreateAIActorModal.bind(this);
    }

    setupEventListeners() {
        this.setupChatHistoryListClickHandler();
        this.setupIntercomHandler();
        this.setupWebSearchToggle();
        this.setupUploadFunctionality();
        this.setupNewAIActorButton();
        this.setupModalCloseHandlers();
    }

    // 设置模态框关闭处理程序
    setupModalCloseHandlers() {
        // 为模态框添加点击外部关闭功能
        const modalOverlay = document.querySelector(".modal-overlay");
        if (modalOverlay) {
            modalOverlay.addEventListener("click", (event) => {
                if (event.target === modalOverlay) {
                    const aiActorWrapper = document.getElementById("ai-actor-wrapper");
                    const aiActorSettingsWrapper = document.getElementById("ai-actor-settings-wrapper");
                    
                    // 检查 AI Actor 列表是否可见
                    if (aiActorWrapper && aiActorWrapper.classList.contains("visible")) {
                        this.uiManager.hideAIActorList();
                    }
                    
                    // 检查设置面板是否处于模态模式
                    if (aiActorSettingsWrapper && aiActorSettingsWrapper.classList.contains("modal-mode")) {
                        this.uiManager.hideNewAIActorModal();
                    }
                }
            });
        }
    }

    setupIntercomHandler() {
        const voiceInputBtn = document.getElementById("voice-input-button");
        voiceInputBtn.addEventListener("click", () => {
            this.uiManager.intercomModal.showModal();
        });
    }

    setupChatHistoryListClickHandler() {
        const chatHistoryListElement = document.querySelector("#chat-history-list");
        chatHistoryListElement.addEventListener("click", this.handleChatHistoryItemClick.bind(this));
    }

    handleChatHistoryItemClick(e) {
        const listItemElement = e.target.closest(".chat-history-item");
        if (listItemElement) {
            this.uiManager.changeChatTopic(listItemElement.dataset.id);
            // Hide the chat history list if it's a mobile device
            if (window.innerWidth <= 768) {
                const chatHistoryContainer = document.getElementById("chat-history-container");
                this.uiManager.hiddenElement(chatHistoryContainer);
            }
        }
    }

    setupWebSearchToggle() {
        const webSearchToggle = document.getElementById("web-search-toggle");
        webSearchToggle.addEventListener("click", () => {
            this.uiManager.messageManager.toggleWebSearch();
        });
    }

    setupUploadFunctionality() {
        const uploadContainer = document.querySelector("#upload-container");
        const fileInput = document.createElement("input");

        fileInput.type = "file";
        fileInput.accept = ".md";
        this.uiManager.hiddenElement(fileInput);

        uploadContainer.addEventListener("click", () => {
            fileInput.value = null;
            fileInput.click();
            console.log("fileInput click event");
        });

        fileInput.addEventListener("change", (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const mdContent = e.target.result;
                    this.uiManager.importChatHistory(mdContent);
                };
                reader.readAsText(file);
            }
        });

        document.body.appendChild(fileInput);
    }

    // 设置"新建 AI Actor"按钮的点击事件处理
    setupNewAIActorButton() {
        const newAIActorButton = document.getElementById("new-ai-actor");
        if (newAIActorButton) {
            newAIActorButton.addEventListener("click", (event) => {
                event.stopPropagation();
                // 关闭 AI Actor 列表
                this.uiManager.hideAIActorList();
                // 显示新建 AI Actor 表单
                this.uiManager.showNewAIActorModal();
            });
        }
    }

    // 处理点击 AI Actor 列表外部区域
    hideAIActorOnOutsideClick(event) {
        const aiActorWrapper = document.getElementById("ai-actor-wrapper");
        if (aiActorWrapper && aiActorWrapper.classList.contains("visible")) {
            const isClickInside = aiActorWrapper.contains(event.target);
            if (!isClickInside) {
                this.uiManager.hideAIActorList();
            }
        }
    }

    // 处理点击"新建 AI Actor"模态框外部区域
    clickOutsideCreateAIActorModal(event) {
        const modalWrapper = document.getElementById("ai-actor-settings-wrapper");
        if (modalWrapper && modalWrapper.classList.contains("modal-mode")) {
            // 检查点击是否在模态框内部
            const isClickInside = modalWrapper.contains(event.target);
            if (!isClickInside) {
                this.uiManager.hideNewAIActorModal();
            }
        }
    }

    // 处理用于处理点击模态框外部事件的辅助函数
    handleClickOutsideCreateAIActorModal(event) {
        const chatSettingsSidebar = document.getElementById("ai-actor-settings-wrapper");
        if (chatSettingsSidebar && !chatSettingsSidebar.contains(event.target)) {
            this.uiManager.hideNewAIActorModal();
            document.removeEventListener("click", this.handleClickOutsideCreateAIActorModal);
            event.stopPropagation();
        }
    }

    // 处理配置文件列表菜单的点击事件
    handleProfileListMenuClick(event) {
        if (event.target.tagName.toLowerCase() === "li") {
            const selectedName = event.target.textContent;
            this.uiManager.messageManager.addProfileToMessageInput(selectedName);
            this.uiManager.clearProfileListMenu();
        }
    }
}

export default UIEventHandler;