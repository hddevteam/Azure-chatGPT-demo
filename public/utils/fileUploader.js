import swal from "sweetalert";
class FileUploader {
    constructor() {
        this.attachmentPreviewContainer = document.getElementById("attachment-preview-container");
        this.attachmentPreviewList = document.getElementById("attachment-preview-list");
        
        this.allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];
        this.maxSize = 20 * 1024 * 1024; // 20MB
        
        // 在构造函数中绑定this，确保方法在回调中使用正确的this
        this.removePreviewItem = this.removePreviewItem.bind(this);
    }

    async handleFileUpload(files) {
        Array.from(files).forEach(file => {
            if (!this.allowedTypes.includes(file.type)) {
                swal("We only support PNG, JPEG, WEBP, and non-animated GIF formats for image uploads.", "error");
                return;
            }
            if (file.size > this.maxSize) {
                swal("File size must not exceed 20MB.", "error");
                return;
            }

            if (file.type.startsWith("image/")) {
                const reader = new FileReader();
                reader.onload = e => this.addImagePreview(e.target.result, file.name);
                reader.readAsDataURL(file);
            } else {
                this.addFilePreview(file.name);
            }
        });

        this.attachmentPreviewContainer.classList.remove("hidden");
    }

    addImagePreview(imageSrc, fileName) {
        const previewItem = document.createElement("div");
        previewItem.classList.add("attachment-preview-item");
        previewItem.innerHTML = `
            <div class="attachment-thumbnail" style="background-image: url('${imageSrc}')">
                <div class="attachment-delete-btn"><i class="fas fa-times"></i></div>
            </div>
            <div class="attachment-file-name">${fileName}</div>`;
        
        const deleteBtn = previewItem.querySelector(".attachment-delete-btn");
        deleteBtn.addEventListener("click", (event) => this.removePreviewItem(event));

        this.attachmentPreviewList.appendChild(previewItem);
    }

    addFilePreview(fileName) {
        const previewItem = document.createElement("div");
        previewItem.classList.add("attachment-preview-item");
        previewItem.innerHTML = `
            <div class="attachment-thumbnail">
                <div class="attachment-delete-btn"><i class="fas fa-times"></i></div>
                <span>${fileName}</span>
            </div>`;

        const deleteBtn = previewItem.querySelector(".attachment-delete-btn");
        deleteBtn.addEventListener("click", (event) => this.removePreviewItem(event));

        this.attachmentPreviewList.appendChild(previewItem);
    }

    clearPreview() {
        this.attachmentPreviewList.innerHTML = "";
    }

    removePreviewItem(event) {
        event.target.closest(".attachment-preview-item").remove();
    }
}

const fileUploader = new FileUploader();
export default fileUploader;
