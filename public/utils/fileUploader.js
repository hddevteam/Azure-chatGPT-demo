import swal from "sweetalert";
import DocumentPreview from "../components/DocumentPreview.js";

class FileUploader {
    constructor() {
        this.attachmentPreviewContainer = document.getElementById("attachment-preview-container");
        this.attachmentPreviewList = document.getElementById("attachment-preview-list");
        
        this.allowedTypes = [
            "image/png", "image/jpeg", "image/webp", "image/gif",
            "text/plain", "text/markdown",
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        ];
        this.maxSize = 20 * 1024 * 1024; // 20MB
        
        this.removePreviewItem = this.removePreviewItem.bind(this);
        
        this.documentPreview = new DocumentPreview();
        this.addPreviewButtonListeners();
    }

    getFileIcon(fileType) {
        if (fileType.startsWith('image/')) return 'fa-image';
        if (fileType.includes('pdf')) return 'fa-file-pdf';
        if (fileType.includes('word')) return 'fa-file-word';
        if (fileType.includes('sheet')) return 'fa-file-excel';
        if (fileType.includes('presentation')) return 'fa-file-powerpoint';
        if (fileType.includes('text')) return 'fa-file-text';
        return 'fa-file';
    }

    async handleFileUpload(files) {
        for (const file of files) {
            if (!this.allowedTypes.includes(file.type)) {
                swal("Invalid file type", `File type ${file.type} is not supported. Supported types are documents and images.`, "error");
                continue;
            }

            if (file.size > this.maxSize) {
                swal("File too large", "Please upload files smaller than 20MB.", "error");
                continue;
            }

            try {
                const reader = new FileReader();
                if (file.type.startsWith('image/')) {
                    reader.onload = (e) => {
                        const previewItem = document.createElement("div");
                        previewItem.classList.add("attachment-preview-item");
                        previewItem.dataset.fileName = file.name;
                        previewItem.dataset.content = e.target.result;
                        
                        previewItem.innerHTML = `
                            <div class="attachment-thumbnail" style="background-image: url('${e.target.result}')">
                                <div class="attachment-delete-btn"><i class="fas fa-times"></i></div>
                            </div>
                            <div class="attachment-file-name">${file.name}</div>`;
                        
                        const deleteBtn = previewItem.querySelector(".attachment-delete-btn");
                        deleteBtn.addEventListener("click", (event) => this.removePreviewItem(event));
                        
                        this.attachmentPreviewList.appendChild(previewItem);
                    };
                    reader.readAsDataURL(file);
                } else {
                    reader.onload = (e) => {
                        const previewItem = document.createElement("div");
                        previewItem.classList.add("attachment-preview-item");
                        previewItem.dataset.fileName = file.name;
                        previewItem.dataset.content = e.target.result;
                        
                        const icon = this.getFileIcon(file.type);
                        previewItem.innerHTML = `
                            <div class="attachment-thumbnail file-preview">
                                <div class="attachment-delete-btn"><i class="fas fa-times"></i></div>
                                <i class="fas ${icon} fa-2x"></i>
                                <div class="attachment-file-name">${file.name}</div>
                            </div>`;

                        const deleteBtn = previewItem.querySelector(".attachment-delete-btn");
                        deleteBtn.addEventListener("click", (event) => this.removePreviewItem(event));

                        this.attachmentPreviewList.appendChild(previewItem);
                    };
                    reader.readAsDataURL(file);
                }

                if (this.attachmentPreviewContainer.classList.contains("hidden")) {
                    this.attachmentPreviewContainer.classList.remove("hidden");
                }
            } catch (error) {
                console.error('Error processing file:', error);
                swal("Error", "Failed to process file: " + file.name, "error");
            }
        }
    }

    clearPreview() {
        this.attachmentPreviewList.innerHTML = "";
        if (!this.attachmentPreviewContainer.classList.contains("hidden")) {
            this.attachmentPreviewContainer.classList.add("hidden");
        }
    }

    removePreviewItem(event) {
        event.target.closest(".attachment-preview-item").remove();
        // check if there are any remaining items
        if (this.attachmentPreviewList.children.length === 0) {
            this.attachmentPreviewContainer.classList.add("hidden");
        }
    }

    addPreviewButtonListeners() {
        document.addEventListener('click', (e) => {
            const previewButton = e.target.closest('.preview-document-btn');
            if (previewButton) {
                const fileName = previewButton.dataset.processedFileName || previewButton.dataset.fileName;
                const originalFileName = previewButton.dataset.fileName;
                if (fileName) {
                    this.documentPreview.showPreview(fileName, originalFileName);
                }
            }
        });
    }
}

const fileUploader = new FileUploader();
export default fileUploader;
