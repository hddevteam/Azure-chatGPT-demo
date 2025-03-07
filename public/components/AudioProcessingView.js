// AudioProcessingView.js
export default class AudioProcessingView {
    constructor() {
        this.modal = null;
        this.closeModalBtn = null;
    }

    createModal() {
        if (!document.getElementById("audio-processing-modal")) {
            const modalHTML = `
                <div id="audio-processing-modal" class="modal">
                    <div class="modal-content">
                        <h2>Audio Processing</h2>
                        <button id="close-audio-modal-btn">&times;</button>
                        
                        <div class="modal-content-container">
                            <div class="upload-section">
                                <div class="drop-zone">
                                    <div class="drop-text">
                                        <i class="fas fa-cloud-upload-alt" style="font-size: 2rem; margin-bottom: 10px;"></i>
                                        <p>Drag & drop audio files here or</p>
                                    </div>
                                    <input type="file" id="audio-upload-input" accept="audio/*" style="display: none;">
                                    <button id="upload-audio-btn">
                                        <i class="fas fa-file-audio"></i> Select File
                                    </button>
                                </div>
                            </div>
                            
                            <div class="options-section">
                                <div class="language-select">
                                    <label for="language-options">Select Language(s)</label>
                                    <select id="language-options" multiple>
                                        <option value="zh-cn" selected>中文（简体）</option>
                                        <option value="zh-tw">中文（台湾）</option>
                                        <option value="zh-hk">中文（香港）</option>
                                        <option value="en-us">English(US)</option>
                                        <option value="ja-jp">日本語</option>
                                        <option value="ko-kr">한국어</option>
                                    </select>
                                </div>
                                <div class="speaker-identification">
                                    <label for="max-speakers">Max Speakers</label>
                                    <input type="number" id="max-speakers" min="1" max="10" value="1">
                                </div>
                            </div>
                            
                            <div class="files-list">
                                <h3>Uploaded Files</h3>
                                <ul id="uploaded-audio-files-list"></ul>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML("beforeend", modalHTML);
        }
        
        this.modal = document.getElementById("audio-processing-modal");
        this.closeModalBtn = document.getElementById("close-audio-modal-btn");
    }

    showModal() {
        this.modal.classList.add("visible");
    }

    hideModal() {
        this.modal.classList.add("fade-out");
        setTimeout(() => {
            this.modal.classList.remove("visible");
            this.modal.classList.remove("fade-out");
        }, 300);
    }

    showLoadingFiles() {
        const uploadedFilesList = document.getElementById("uploaded-audio-files-list");
        uploadedFilesList.innerHTML = `
            <div class="audio-loader">
                <div class="spinner-container">
                    <div class="spinner"></div>
                </div>
                <div class="loading-message">Loading audio files...</div>
            </div>
        `;
    }

    showErrorState(onRetry) {
        const uploadedFilesList = document.getElementById("uploaded-audio-files-list");
        uploadedFilesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load audio files.</p>
                <button class="retry-btn" id="retry-load-files">Retry</button>
            </div>
        `;

        const retryBtn = document.getElementById("retry-load-files");
        if (retryBtn && onRetry) {
            retryBtn.addEventListener("click", onRetry);
        }
    }

    renderAudioFiles(audioFiles) {
        const uploadedFilesList = document.getElementById("uploaded-audio-files-list");
        uploadedFilesList.innerHTML = "";

        if (audioFiles.length === 0) {
            return;
        }

        audioFiles.forEach(file => {
            const fileItem = this.createFileListItem(file);
            uploadedFilesList.appendChild(fileItem);
        });
    }

    createFileListItem(file) {
        const fileItem = document.createElement("li");
        fileItem.classList.add("uploaded-file-item");

        const fileInfo = this.createFileInfo(file);
        const buttonContainer = this.createButtonContainer(file);

        fileItem.appendChild(fileInfo);
        fileItem.appendChild(buttonContainer);
        return fileItem;
    }

    createFileInfo(file) {
        const fileInfo = document.createElement("div");
        fileInfo.classList.add("file-info");

        const fileIcon = document.createElement("div");
        fileIcon.classList.add("file-icon");
        fileIcon.innerHTML = "<i class=\"fas fa-file-audio\"></i>";

        const fileDetails = document.createElement("div");
        fileDetails.classList.add("file-details");

        const fileName = document.createElement("div");
        fileName.classList.add("file-name");
        fileName.textContent = file.name;

        const fileSize = document.createElement("div");
        fileSize.classList.add("file-meta");
        fileSize.textContent = `${(file.size / 1024).toFixed(0)}KB · ${new Date(file.lastModified).toLocaleString()}`;

        fileDetails.appendChild(fileName);
        fileDetails.appendChild(fileSize);
        fileInfo.appendChild(fileIcon);
        fileInfo.appendChild(fileDetails);

        return fileInfo;
    }

    createButtonContainer(file) {
        const buttonContainer = document.createElement("div");
        buttonContainer.classList.add("button-container");

        switch(file.transcriptionStatus) {
        case "Succeeded":
            const viewBtn = document.createElement("button");
            viewBtn.classList.add("view-result-btn");
            viewBtn.setAttribute("data-transcription-url", file.transcriptionUrl);
            viewBtn.innerHTML = "<i class=\"fas fa-eye\"></i> View Transcript";
            buttonContainer.appendChild(viewBtn);
            break;

        case "Running":
            const processingBtn = document.createElement("button");
            processingBtn.classList.add("recognize-btn");
            processingBtn.setAttribute("data-audio-url", file.url);
            processingBtn.disabled = true;
            processingBtn.innerHTML = "<i class=\"fas fa-spinner fa-spin\"></i> Processing...";
            buttonContainer.appendChild(processingBtn);
            break;

        case "Failed":
            const retryBtn = document.createElement("button");
            retryBtn.classList.add("recognize-btn");
            retryBtn.setAttribute("data-audio-url", file.url);
            retryBtn.innerHTML = "<i class=\"fas fa-redo\"></i> Retry";
            buttonContainer.appendChild(retryBtn);
            break;

        default:
            const recognizeBtn = document.createElement("button");
            recognizeBtn.classList.add("recognize-btn");
            recognizeBtn.setAttribute("data-audio-url", file.url);
            recognizeBtn.innerHTML = "<i class=\"fas fa-magic\"></i> Recognize";
            buttonContainer.appendChild(recognizeBtn);
        }

        const deleteBtn = document.createElement("button");
        deleteBtn.classList.add("delete-audio-btn");
        deleteBtn.setAttribute("data-audio-url", file.url);
        deleteBtn.setAttribute("data-blob-name", file.name);
        deleteBtn.innerHTML = "<i class=\"fas fa-trash\"></i>";
        deleteBtn.title = "Delete audio file";
        buttonContainer.appendChild(deleteBtn);

        return buttonContainer;
    }

    updateButtonState(buttonElement, state, text) {
        buttonElement.innerHTML = text;
        buttonElement.disabled = state === "disabled";
    }

    showTranscriptionResult(transcriptText) {
        return swal({
            title: "Transcription Result",
            content: {
                element: "div",
                attributes: {
                    className: "transcript-result",
                    innerHTML: `
                        <textarea id="transcription-result-text" readonly>${transcriptText}</textarea>
                    `
                },
            },
            buttons: {
                copy: {
                    text: "Copy to Clipboard",
                    value: "copy",
                    className: "copy-button",
                },
                insert: {
                    text: "Insert to Message",
                    value: "insert",
                    className: "swal-button--insert",
                },
                close: "Close",
            },
            className: "transcript-modal"
        });
    }
}