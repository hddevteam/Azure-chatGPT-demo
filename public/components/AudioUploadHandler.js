// AudioUploadHandler.js
import { uploadAudiofile } from "../utils/apiClient.js";
import swal from "sweetalert";

export default class AudioUploadHandler {
    constructor(view) {
        this.view = view;
    }

    setupDragAndDrop() {
        const dropZone = document.querySelector(".drop-zone");
        const fileInput = document.getElementById("audio-upload-input");
        const uploadBtn = document.getElementById("upload-audio-btn");

        ["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
            dropZone.addEventListener(eventName, this.preventDefaults, false);
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });

        ["dragenter", "dragover"].forEach(eventName => {
            dropZone.addEventListener(eventName, () => this.highlight(dropZone), false);
        });

        ["dragleave", "drop"].forEach(eventName => {
            dropZone.addEventListener(eventName, () => this.unhighlight(dropZone), false);
        });

        dropZone.addEventListener("drop", (e) => this.handleDrop(e, dropZone), false);
        uploadBtn.addEventListener("click", () => fileInput.click());
        fileInput.addEventListener("change", () => {
            const file = fileInput.files[0];
            if (file) {
                this.uploadFile(file, dropZone);
            }
        });
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    highlight(dropZone) {
        dropZone.classList.add("drop-zone-active");
    }

    unhighlight(dropZone) {
        dropZone.classList.remove("drop-zone-active");
    }

    handleDrop(e, dropZone) {
        const dt = e.dataTransfer;
        const file = dt.files[0];

        if (file && file.type.startsWith("audio/")) {
            this.uploadFile(file, dropZone);
        } else {
            swal("Invalid File", "Please upload an audio file.", "error");
        }
    }

    async uploadFile(file, dropZone) {
        const uploadBtn = document.getElementById("upload-audio-btn");
        
        // Show uploading state
        dropZone.classList.add("uploading");
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = "<i class=\"fas fa-spinner fa-spin\"></i> Uploading...";

        // Create progress bar
        const progressContainer = document.createElement("div");
        progressContainer.className = "progress-container";
        const progressBar = document.createElement("div");
        progressBar.className = "progress-bar";
        progressContainer.appendChild(progressBar);
        dropZone.appendChild(progressContainer);

        // Simulate progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += 5;
            if (progress >= 90) {
                clearInterval(interval);
            }
            progressBar.style.width = `${progress}%`;
        }, 200);

        try {
            await uploadAudiofile(file, file.name);
            
            // Complete progress animation
            clearInterval(interval);
            progressBar.style.width = "100%";

            // Show success message
            setTimeout(() => {
                this.onUploadSuccess();
                dropZone.classList.remove("uploading");
                uploadBtn.disabled = false;
                uploadBtn.innerHTML = "<i class=\"fas fa-file-audio\"></i> Select File";
                dropZone.removeChild(progressContainer);
            }, 500);
        } catch (error) {
            this.handleUploadError(error, interval, dropZone, uploadBtn, progressContainer);
        }

        // Reset file input
        document.getElementById("audio-upload-input").value = "";
    }

    onUploadSuccess() {
        swal("Success!", "Audio file uploaded successfully.", "success", { buttons: false, timer: 1500 });
        // Trigger refresh of file list through event
        window.dispatchEvent(new CustomEvent("audioFileUploaded"));
    }

    handleUploadError(error, interval, dropZone, uploadBtn, progressContainer) {
        clearInterval(interval);
        console.error("Failed to upload audio file:", error);
        swal("Upload Failed", "Failed to upload audio file.", "error");
        
        dropZone.classList.remove("uploading");
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = "<i class=\"fas fa-file-audio\"></i> Select File";
        if (progressContainer.parentNode === dropZone) {
            dropZone.removeChild(progressContainer);
        }
    }
}