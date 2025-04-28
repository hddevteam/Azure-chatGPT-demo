// public/components/GptImageManager.js

import GptImageModal from "./GptImageModal.js";

/**
 * GPT-Image-1管理类
 * 用于初始化和管理GPT-Image-1相关功能
 */
export default class GptImageManager {
    constructor() {
        this.modal = null;
        this.init();
    }

    /**
     * 初始化
     */
    init() {
        this.initModal();
        this.bindEvents();
    }

    /**
     * 初始化模态框
     */
    initModal() {
        this.modal = new GptImageModal();
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        const gptImageBtn = document.getElementById("gpt-image-btn");
        if (gptImageBtn) {
            gptImageBtn.addEventListener("click", () => this.showModal());
        }
    }

    /**
     * 显示模态框
     */
    showModal() {
        if (this.modal) {
            this.modal.show();
        }
    }
}
