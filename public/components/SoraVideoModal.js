/**
 * SoraVideoModal Component
 * Handles the Sora video generation modal interface
 */
class SoraVideoModal {
    constructor() {
        this.modal = null;
        this.isOpen = false;
        this.soraVideoGenerator = null;
        this.init();
    }

    init() {
        this.createModal();
        this.attachEventListeners();
        this.loadSoraModule();
    }

    createModal() {
        // Create modal overlay
        const modalOverlay = document.createElement("div");
        modalOverlay.className = "modal-overlay modal-overlay--sora hidden";
        modalOverlay.id = "sora-modal-overlay";

        // Create modal container
        const modal = document.createElement("div");
        modal.className = "modal modal--sora";
        modal.id = "sora-video-modal";

        // Create modal content
        modal.innerHTML = `
            <div class="modal__header">
                <h2 class="modal__title">
                    <i class="fas fa-video"></i>
                    Sora Video Generator
                </h2>
                <button class="modal__close" id="sora-modal-close" title="Close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal__body">
                <div class="sora-studio" id="sora-studio">
                    <!-- Content will be loaded by SoraVideoGenerator -->
                    <div class="sora-studio__loading">
                        <i class="fas fa-spinner fa-spin"></i>
                        <span>Loading Sora Video Generator...</span>
                    </div>
                </div>
            </div>
        `;

        modalOverlay.appendChild(modal);
        document.body.appendChild(modalOverlay);

        this.modal = modalOverlay;
    }

    attachEventListeners() {
        // Close modal when clicking overlay
        this.modal.addEventListener("click", (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        // Close modal when clicking close button
        const closeButton = this.modal.querySelector("#sora-modal-close");
        closeButton.addEventListener("click", () => {
            this.close();
        });

        // Close modal on ESC key
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && this.isOpen) {
                this.close();
            }
        });
    }

    async loadSoraModule() {
        try {
            // Dynamic import of the SoraVideoGenerator module
            const module = await import("../modules/soraVideoGenerator.js");
            const SoraVideoGenerator = module.default || module.SoraVideoGenerator;
            
            this.soraVideoGenerator = new SoraVideoGenerator();
            
            // Initialize the generator and render it in the modal
            const studioContainer = this.modal.querySelector("#sora-studio");
            await this.soraVideoGenerator.init(studioContainer);
            
            console.log("Sora Video Generator loaded successfully");
        } catch (error) {
            console.error("Failed to load Sora Video Generator:", error);
            this.showError("Failed to load video generator module");
        }
    }

    showError(message) {
        const studioContainer = this.modal.querySelector("#sora-studio");
        studioContainer.innerHTML = `
            <div class="sora-studio__error">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error</h3>
                <p>${message}</p>
                <button class="btn btn--secondary" onclick="location.reload()">
                    <i class="fas fa-refresh"></i>
                    Reload Page
                </button>
            </div>
        `;
    }

    open() {
        if (this.isOpen) return;

        this.modal.classList.remove("hidden");
        document.body.style.overflow = "hidden";
        this.isOpen = true;

        // Focus the modal for accessibility
        this.modal.setAttribute("tabindex", "-1");
        this.modal.focus();

        // Trigger any necessary initialization in the SoraVideoGenerator
        if (this.soraVideoGenerator && typeof this.soraVideoGenerator.onModalOpen === "function") {
            this.soraVideoGenerator.onModalOpen();
        }
    }

    close() {
        if (!this.isOpen) return;

        this.modal.classList.add("hidden");
        document.body.style.overflow = "";
        this.isOpen = false;

        // Trigger any necessary cleanup in the SoraVideoGenerator
        if (this.soraVideoGenerator && typeof this.soraVideoGenerator.onModalClose === "function") {
            this.soraVideoGenerator.onModalClose();
        }
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    isModalOpen() {
        return this.isOpen;
    }
}

export default SoraVideoModal;
