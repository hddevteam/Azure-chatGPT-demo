// DocumentPreview.js
import swal from "sweetalert";
import { getDocumentContent } from "../utils/apiClient.js";

class DocumentPreview {
    constructor() {
        this.overlay = null;
        this.createPreviewElements();
        this.maxPreviewSize = 1024 * 1024; // 1MB limit for preview
    }

    createPreviewElements() {
        // Create DOM elements for preview window
        this.overlay = document.createElement("div");
        this.overlay.className = "document-preview-overlay";
        this.overlay.innerHTML = `
            <div class="document-preview-content">
                <div class="document-preview-header">
                    <h3>Document Preview</h3>
                    <button class="close-preview">&times;</button>
                </div>
                <div class="document-preview-body">
                    <div class="document-info"></div>
                    <div class="loading-indicator" style="display: none;">
                        <i class="fas fa-spinner fa-spin"></i> Loading preview...
                    </div>
                    <pre class="document-text"></pre>
                </div>
            </div>`;

        // Add to document
        document.body.appendChild(this.overlay);

        // Add close button event
        const closeButton = this.overlay.querySelector(".close-preview");
        closeButton.addEventListener("click", () => this.hidePreview());

        // Click mask layer to close preview
        this.overlay.addEventListener("click", (e) => {
            if (e.target === this.overlay) {
                this.hidePreview();
            }
        });

        // Close on escape key
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && this.overlay.style.display === "flex") {
                this.hidePreview();
            }
        });
    }

    showLoading() {
        this.overlay.querySelector(".loading-indicator").style.display = "block";
        this.overlay.querySelector(".document-text").style.display = "none";
    }

    hideLoading() {
        this.overlay.querySelector(".loading-indicator").style.display = "none";
        this.overlay.querySelector(".document-text").style.display = "block";
    }

    async showPreview(fileName, originalFileName) {
        if (!fileName) {
            swal("Error", "Invalid preview parameters", "error");
            return;
        }

        try {
            this.overlay.style.display = "flex";
            this.showLoading();

            const content = await getDocumentContent(fileName);
            
            if (!content) {
                throw new Error("No content received from server");
            }

            // Use original filename when displaying file name, if available
            this.overlay.querySelector(".document-info").textContent = 
                originalFileName || fileName.replace(/^\d+-/, "").replace("_processed.md", "");
            
            const previewElem = this.overlay.querySelector(".document-text");
            previewElem.textContent = content;

            // If it's a processed markdown file, add code content class
            if (fileName.endsWith("_processed.md")) {
                previewElem.classList.add("code-content");
            }

        } catch (error) {
            console.error("Error showing preview:", error);
            swal("Preview Error", "Failed to load document preview: " + error.message, "error");
            this.hidePreview();
        } finally {
            this.hideLoading();
        }
    }

    hidePreview() {
        if (this.overlay) {
            this.overlay.style.display = "none";
        }
        // Clear content when hiding
        this.overlay.querySelector(".document-text").textContent = "";
        this.overlay.querySelector(".document-info").textContent = "";
    }
}

export default DocumentPreview;