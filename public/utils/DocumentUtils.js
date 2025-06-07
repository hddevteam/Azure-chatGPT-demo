// DocumentUtils.js
class DocumentUtils {
    static getFileExtension(fileName) {
        return fileName.slice((fileName.lastIndexOf(".") - 1 >>> 0) + 2).toLowerCase();
    }

    static getFileType(fileName) {
        const extension = this.getFileExtension(fileName);
        const mimeTypes = {
            "txt": "text/plain",
            "md": "text/markdown",
            "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "pdf": "application/pdf",
            "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "xls": "application/vnd.ms-excel",
            "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "ppt": "application/vnd.ms-powerpoint"
        };
        return mimeTypes[extension] || "application/octet-stream";
    }

    static formatFileSize(bytes) {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    }

    static truncateFileName(fileName, maxLength = 20) {
        if (fileName.length <= maxLength) return fileName;
        const extension = this.getFileExtension(fileName);
        const nameWithoutExt = fileName.slice(0, fileName.lastIndexOf("."));
        const truncatedName = nameWithoutExt.slice(0, maxLength - extension.length - 3) + "...";
        return `${truncatedName}.${extension}`;
    }

    static isDocumentFile(fileName) {
        // Treat all files as documents
        return true;
    }
}

export default DocumentUtils;