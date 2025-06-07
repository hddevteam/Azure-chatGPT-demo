// public/components/GptImageManager.js

import GptImageModal from "./GptImageModal.js";

/**
 * GPT-Image-1 management class
 * Used to initialize and manage GPT-Image-1 related functions
 */
export default class GptImageManager {
    constructor() {
        this.modal = null;
        this.init();
    }

    /**
     * Initialize
     */
    init() {
        this.initModal();
        this.bindEvents();
    }

    /**
     * Initialize modal
     */
    initModal() {
        this.modal = new GptImageModal();
    }

    /**
     * Bind events
     */
    bindEvents() {
        const gptImageBtn = document.getElementById("gpt-image-btn");
        if (gptImageBtn) {
            gptImageBtn.addEventListener("click", () => this.showModal());
        }
    }

    /**
     * Show modal
     */
    showModal() {
        if (this.modal) {
            this.modal.show();
        }
    }
}
