const fileUploader = {
    attachmentPreviewContainer: document.getElementById("attachment-preview-container"),
    attachmentPreviewList: document.getElementById("attachment-preview-list"),

    async handleFileUpload(files) {
        this.clearPreview();

        Array.from(files).forEach(file => {
            if (file.type.startsWith("image/")) {
                // 如果是图片，则读取图片生成缩略图
                const reader = new FileReader();
                reader.onload = (e) => this.addImagePreview(e.target.result, file.name);
                reader.readAsDataURL(file);
            } else {
                // 如果是其他类型文件，则直接显示文件名
                this.addFilePreview(file.name);
            }
        });

        this.attachmentPreviewContainer.classList.remove("hidden");
    },

    addImagePreview(imageSrc, fileName) {
        const previewItem = document.createElement("div");
        previewItem.classList.add("attachment-preview-item");
        previewItem.innerHTML = `
            <div class="attachment-thumbnail" style="background-image: url('${imageSrc}')">
                <div class="attachment-delete-btn" onclick="fileUploader.removePreviewItem(event)"><i class="fas fa-times"></i></div>
            </div>
            <div class="attachment-file-name">${fileName}</div>
        `;
        this.attachmentPreviewList.appendChild(previewItem);
    },

    addFilePreview(fileName) {
        const previewItem = document.createElement("div");
        previewItem.classList.add("attachment-preview-item");
        previewItem.innerHTML = `
            <div class="attachment-thumbnail">
            <div class="attachment-delete-btn" onclick="fileUploader.removePreviewItem(event)"><i class="fas fa-times"></i></div>
                <span>${fileName}</span>
            </div>
        `;
        this.attachmentPreviewList.appendChild(previewItem);
    },

    clearPreview() {
        this.attachmentPreviewList.innerHTML = "";
    },

    removePreviewItem(event) {
        event.target.closest("div").remove();
    }
};

export default fileUploader;