// 使用ES6+特性进行代码改进
class FileUploader {
    constructor() {
        this.attachmentPreviewContainer = document.getElementById("attachment-preview-container");
        this.attachmentPreviewList = document.getElementById("attachment-preview-list");
        
        // 在构造函数中绑定this，确保方法在回调中使用正确的this
        this.removePreviewItem = this.removePreviewItem.bind(this);
    }

    async handleFileUpload(files) {

        Array.from(files).forEach(file => {
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
