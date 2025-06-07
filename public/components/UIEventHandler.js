// UIEventHandler.js - Handle all UI-related events
class UIEventHandler {
    constructor(uiManager) {
        this.uiManager = uiManager;
        // Bind event handler functions to instance, so they can be used as callbacks
        this.boundHideAIActorOnOutsideClick = this.hideAIActorOnOutsideClick.bind(this);
        this.handleClickOutsideCreateAIActorModal = this.clickOutsideCreateAIActorModal.bind(this);
        this.handleResize = this.handleResize.bind(this);
    }

    setupEventListeners() {
        this.setupChatHistoryListClickHandler();
        this.setupIntercomHandler();
        this.setupWebSearchToggle();
        this.setupUploadFunctionality();
        this.setupNewAIActorButton();
        this.setupModalCloseHandlers();
        this.setupResizeHandler();
    }

    // Set window resize event handler
    setupResizeHandler() {
        let resizeTimeout;
        window.addEventListener("resize", () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(this.handleResize, 250);
        });
    }

    // Handle window resize event
    handleResize() {
        // Check if modal is visible, if not visible, do nothing
        const aiActorSettingsModal = document.getElementById("ai-actor-settings-wrapper");
        if (!aiActorSettingsModal) return;
        
        // Add mobile device adaptation class
        if (window.innerWidth <= 768) {
            aiActorSettingsModal.classList.add("mobile-view");
        } else {
            aiActorSettingsModal.classList.remove("mobile-view");
        }
    }

    // Set modal close handler
    setupModalCloseHandlers() {
        // Add click outside to close functionality to modal
        const modalOverlay = document.querySelector(".modal-overlay");
        if (modalOverlay) {
            modalOverlay.addEventListener("click", (event) => {
                if (event.target === modalOverlay) {
                    const aiActorWrapper = document.getElementById("ai-actor-wrapper");
                    const aiActorSettingsWrapper = document.getElementById("ai-actor-settings-wrapper");
                    
                    // Check if AI Actor list is visible
                    if (aiActorWrapper && aiActorWrapper.classList.contains("visible")) {
                        this.uiManager.hideAIActorList();
                    }
                    
                    // Check if settings panel is in modal mode
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

    // Set up click event handler for "Create AI Actor" button
    setupNewAIActorButton() {
        const newAIActorButton = document.getElementById("new-ai-actor");
        if (newAIActorButton) {
            newAIActorButton.addEventListener("click", (event) => {
                event.stopPropagation();
                // Close AI Actor list
                this.uiManager.hideAIActorList();
                // Show create AI Actor form
                this.uiManager.showNewAIActorModal();
            });
        }
    }

    // Handle clicks outside AI Actor list area
    hideAIActorOnOutsideClick(event) {
        const aiActorWrapper = document.getElementById("ai-actor-wrapper");
        if (aiActorWrapper && aiActorWrapper.classList.contains("visible")) {
            const isClickInside = aiActorWrapper.contains(event.target);
            if (!isClickInside) {
                this.uiManager.hideAIActorList();
            }
        }
    }

    // Handle clicks outside "Create AI Actor" modal area
    clickOutsideCreateAIActorModal(event) {
        const modalWrapper = document.getElementById("ai-actor-settings-wrapper");
        if (modalWrapper && modalWrapper.classList.contains("modal-mode")) {
            // Check if click is inside modal
            const isClickInside = modalWrapper.contains(event.target);
            if (!isClickInside) {
                this.uiManager.hideNewAIActorModal();
            }
        }
    }

    // Helper function for handling click outside modal events
    handleClickOutsideCreateAIActorModal(event) {
        const chatSettingsSidebar = document.getElementById("ai-actor-settings-wrapper");
        if (chatSettingsSidebar && !chatSettingsSidebar.contains(event.target)) {
            this.uiManager.hideNewAIActorModal();
            document.removeEventListener("click", this.handleClickOutsideCreateAIActorModal);
            event.stopPropagation();
        }
    }

    // Handle profile list menu click events
    handleProfileListMenuClick(event) {
        if (event.target.tagName.toLowerCase() === "li") {
            const selectedName = event.target.textContent;
            this.uiManager.messageManager.addProfileToMessageInput(selectedName);
            this.uiManager.clearProfileListMenu();
        }
    }
}

export default UIEventHandler;