// AudioProcessingModal.js
import { uploadAudiofile, fetchUploadedAudioFiles, fetchTranscriptionStatus, submitTranscriptionJob, fetchTranscriptText, deleteAudioFile } from "../utils/apiClient.js";
import swal from "sweetalert";
import ClipboardJS from "clipboard";

export default class AudioProcessingModal {
    constructor() {
        this.modal = null;
        this.closeModalBtn = null;
        this.pollingTasks = {};
    }

    /**
     * Creates and injects the audio processing modal HTML into the DOM
     */
    createModal() {
        // Create the modal element if it doesn't exist
        if (!document.getElementById("audio-processing-modal")) {
            const modalHTML = `
                <div id="audio-processing-modal" class="modal">
                    <div class="modal-content">
                        <h2>Audio Processing</h2>
                        <button id="close-audio-modal-btn">&times;</button>
                        
                        <!-- Add: modal-content-container to wrap all content areas -->
                        <div class="modal-content-container">
                            <div class="upload-section">
                                <input type="file" id="audio-upload-input" accept="audio/*" style="display: none;">
                                <button id="upload-audio-btn">
                                    <i class="fas fa-cloud-upload-alt"></i> Upload Audio
                                </button>
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
                                <ul id="uploaded-audio-files-list">
                                    <!-- Files will be dynamically inserted here -->
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Append modal HTML to body
            document.body.insertAdjacentHTML("beforeend", modalHTML);
        }
        
        // Cache DOM elements
        this.modal = document.getElementById("audio-processing-modal");
        this.closeModalBtn = document.getElementById("close-audio-modal-btn");
    }

    /**
     * Shows the transcription result in a modal dialog
     */
    async showTranscriptionResult(transcriptText) {
        swal({
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
        }).then(
            (value) => {
                if (value === "copy") {
                    const clipboard = new ClipboardJS(".copy-button", {
                        text: function () {
                            return transcriptText;
                        },
                    });
                    clipboard.on("success", function () {
                        swal("Copied!", "The transcript has been copied to the clipboard.", "success", { buttons: false, timer: 1000 });
                        clipboard.destroy();
                    });
                    clipboard.on("error", function () {
                        swal("Error!", "Failed to copy the transcript to the clipboard.", "error");
                        clipboard.destroy();
                    });
                } else if (value === "insert") {
                    // Insert text into the message input
                    const messageInput = document.getElementById("message-input");
                    if (messageInput) {
                        // If there's already text, add a line break
                        if (messageInput.value.trim() !== "") {
                            messageInput.value += "\n\n";
                        }
                        messageInput.value += transcriptText;
                        messageInput.focus();
                        
                        // Show success message
                        swal("Inserted!", "The transcript has been inserted into your message.", "success", { buttons: false, timer: 1000 });
                    }
                }
            }
        );
    }

    /**
     * Shows the modal with animation and proper CSS class
     */
    showModal() {
        // Modify: Add visible class to apply flex layout
        this.modal.classList.add("visible");
        this.fetchAndDisplayUploadedAudioFiles();
    }

    /**
     * Hides the modal with animation
     */
    hideModal() {
        // Add fade-out animation
        this.modal.classList.add("fade-out");
        
        // Wait for the animation to complete before hiding
        setTimeout(() => {
            this.modal.classList.remove("visible");
            this.modal.classList.remove("fade-out");
            
            // Stop and clean up all polling tasks
            this.stopAllPollingTasks();
        }, 300);
    }
    
    /**
     * Fetches and displays the uploaded audio files
     */
    async fetchAndDisplayUploadedAudioFiles() {
        console.log("Fetching uploaded audio files");
        try {
            // Show loading indicator
            const uploadedFilesList = document.getElementById("uploaded-audio-files-list");
            uploadedFilesList.innerHTML = `
                <div class="audio-loader">
                    <div class="spinner-container">
                        <div class="spinner"></div>
                    </div>
                    <div class="loading-message">Loading audio files...</div>
                </div>
            `;
            
            // Call API to get the list of uploaded audio files
            const result = await fetchUploadedAudioFiles();
            if (result.success && result.data) {
                let audioFiles = result.data;
                audioFiles = audioFiles.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
                
                // Clear loading indicator
                uploadedFilesList.innerHTML = "";
                
                if (audioFiles.length === 0) {
                    // If there are no files, the CSS :empty selector will handle the message
                } else {
                    audioFiles.forEach(file => {
                        const fileItem = document.createElement("li");
                        fileItem.classList.add("uploaded-file-item");
                        
                        // Create file info section
                        const fileInfo = document.createElement("div");
                        fileInfo.classList.add("file-info");
                        
                        // Create icon
                        const fileIcon = document.createElement("div");
                        fileIcon.classList.add("file-icon");
                        fileIcon.innerHTML = "<i class=\"fas fa-file-audio\"></i>";
                        
                        // Create text content
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
                        
                        // Assemble file info
                        fileInfo.appendChild(fileIcon);
                        fileInfo.appendChild(fileDetails);
                        
                        // Create button container
                        const buttonContainer = document.createElement("div");
                        buttonContainer.classList.add("button-container");
                        
                        // Create appropriate buttons based on file status
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
                        
                        // Add delete button
                        const deleteBtn = document.createElement("button");
                        deleteBtn.classList.add("delete-audio-btn");
                        deleteBtn.setAttribute("data-audio-url", file.url);
                        deleteBtn.setAttribute("data-blob-name", file.name);
                        deleteBtn.innerHTML = "<i class=\"fas fa-trash\"></i>";
                        deleteBtn.title = "Delete audio file";
                        buttonContainer.appendChild(deleteBtn);
                        
                        // Assemble file item
                        fileItem.appendChild(fileInfo);
                        fileItem.appendChild(buttonContainer);
                        uploadedFilesList.appendChild(fileItem);
                    });
                    
                    // Start polling for any files that are in "Running" status
                    audioFiles.forEach(file => {
                        if (file.transcriptionStatus === "Running" && !this.pollingTasks[file.name]) {
                            const buttonElement = document.querySelector(`button[data-audio-url='${file.url}']`);
                            if(buttonElement) {
                                this.pollForTranscriptResults(file.transcriptionId, file.name, buttonElement);
                            }
                        }
                    });
                    
                }
            } else {
                // If API call fails, display an error message
                uploadedFilesList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Failed to load audio files. Please try again.</p>
                        <button class="retry-btn" id="retry-load-files">Retry</button>
                    </div>
                `;
                
                // Add retry button event listener
                const retryBtn = document.getElementById("retry-load-files");
                if (retryBtn) {
                    retryBtn.addEventListener("click", () => this.fetchAndDisplayUploadedAudioFiles());
                }
            }
        } catch (error) {
            console.error("Failed to get list of uploaded audio files:", error);
            const uploadedFilesList = document.getElementById("uploaded-audio-files-list");
            uploadedFilesList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>An error occurred while fetching audio files.</p>
                    <button class="retry-btn" id="retry-load-files">Retry</button>
                </div>
            `;
            
            // Add retry button event listener
            const retryBtn = document.getElementById("retry-load-files");
            if (retryBtn) {
                retryBtn.addEventListener("click", () => this.fetchAndDisplayUploadedAudioFiles());
            }
        }
    }

    /**
     * Binds event handlers to modal elements
     */
    bindEvents() {
        document.getElementById("uploaded-audio-files-list").addEventListener("click", async (event) => {
            let target = event.target;
    
            // Helper function: find ancestor with specified class name (including self)
            function findAncestor(el, cls) {
                while (el && !el.classList.contains(cls)) {
                    el = el.parentElement;
                }
                return el;
            }
    
            const recognizeBtn = findAncestor(target, "recognize-btn");
            const viewResultBtn = findAncestor(target, "view-result-btn");
            const deleteAudioBtn = findAncestor(target, "delete-audio-btn");
    
            if (recognizeBtn) {
                const audioUrl = recognizeBtn.getAttribute("data-audio-url");
                await this.recognizeAudioFile(audioUrl, recognizeBtn);
            } else if (viewResultBtn) {
                const transcriptionUrl = viewResultBtn.getAttribute("data-transcription-url");
                swal({
                    title: "Loading...",
                    text: "Fetching transcription result...",
                    icon: "info",
                    buttons: false,
                    closeOnClickOutside: false,
                    closeOnEsc: false,
                });
                try {
                    const transcriptText = await fetchTranscriptText(transcriptionUrl);
                    swal.close();
                    await this.showTranscriptionResult(transcriptText);
                } catch (error) {
                    console.error("Failed to view recognition result: ", error);
                    swal.close();
                    swal("Error", "Failed to view recognition result.", "error");
                }
            } else if (deleteAudioBtn) {
                const blobName = deleteAudioBtn.getAttribute("data-blob-name");
                const fileItem = findAncestor(deleteAudioBtn, "uploaded-file-item");
                swal({
                    title: "Delete Audio File",
                    text: "Deleted audio files cannot be recovered. Are you sure you want to delete this file?",
                    icon: "warning",
                    buttons: {
                        cancel: "Cancel",
                        confirm: {
                            text: "Delete",
                            value: true,
                            className: "swal-button--danger"
                        }
                    },
                    dangerMode: true,
                }).then(async (willDelete) => {
                    if (willDelete) {
                        try {
                            // Add removing animation to the file item
                            if (fileItem) {
                                fileItem.classList.add("removing");
                            }
                            
                            // Delete the file
                            await deleteAudioFile(blobName); 
                            
                            // Wait for animation to complete before refreshing the list
                            setTimeout(() => {
                                this.fetchAndDisplayUploadedAudioFiles(); 
                                swal("Deleted!", "The audio file has been deleted.", "success", { buttons: false, timer: 1500 });
                            }, 300);
                        } catch (error) {
                            console.error("Failed to delete audio file:", error);
                            if (fileItem) {
                                fileItem.classList.remove("removing");
                            }
                            swal("Error", "Failed to delete the audio file.", "error");
                        }
                    }
                });
            }
        });
    }
    
    /**
     * Recognizes an audio file
     */
    async recognizeAudioFile(audioUrl, buttonElement) {
        try {
            // Change button state to "submitting"
            buttonElement.innerHTML = "<i class=\"fas fa-spinner fa-spin\"></i> Submitting...";
            buttonElement.disabled = true;
    
            const languages = Array.from(document.getElementById("language-options").selectedOptions).map(option => option.value);
            const maxSpeakers = document.getElementById("max-speakers").value;
            const identifySpeakers = maxSpeakers > 1;
    
            const { transcriptionId, audioName } = await submitTranscriptionJob(audioUrl, { languages, identifySpeakers, maxSpeakers });
    
            // Start polling for recognition results
            await this.pollForTranscriptResults(transcriptionId, audioName, buttonElement);
        } catch (error) {
            console.error("Failed to recognize audio file: ", error);
            swal("Recognition Failed", "Please try again.", "error");
            // Restore button state to allow the user to retry
            buttonElement.innerHTML = "<i class=\"fas fa-magic\"></i> Recognize";
            buttonElement.disabled = false;
        }
    }
    
    /**
     * Polls for transcription results
     */
    async pollForTranscriptResults(transcriptionId, audioName, buttonElement) {
        if (this.pollingTasks[audioName] && this.pollingTasks[audioName].active) {
            console.log(`Polling task ${audioName} is already running`);
            return;
        }
    
        let attempts = 20;
        let pollInterval = 5000;
    
        const poll = async () => {
            if (attempts-- === 0 || !this.pollingTasks[audioName].active) {
                swal("Recognition Failed", "Timeout getting transcription result. Please try again later.", "error");
                buttonElement.innerHTML = "<i class=\"fas fa-magic\"></i> Recognize";
                buttonElement.disabled = false;
                delete this.pollingTasks[audioName]; // Clean up polling task
                return;
            }
            try {
                const result = await fetchTranscriptionStatus(transcriptionId, audioName);
                
                if (result.status === "Succeeded") {
                    const audioUrl = buttonElement.getAttribute("data-audio-url");
                    const existingButton = document.querySelector(`button.recognize-btn[data-audio-url='${audioUrl}']`);
                    
                    if (existingButton) {
                        // Create new view result button
                        const newButton = document.createElement("button");
                        newButton.className = "view-result-btn";
                        newButton.setAttribute("data-transcription-url", result.transcriptionUrl);
                        newButton.innerHTML = "<i class=\"fas fa-eye\"></i> View Transcript";
                        
                        // Replace the recognize button with the view result button
                        existingButton.parentNode.replaceChild(newButton, existingButton);
                        
                        // Show success notification
                        swal("Success!", "The transcription is ready.", "success", { buttons: false, timer: 1500 });
                        
                        // Clean up polling task
                        delete this.pollingTasks[audioName];
                    }
                } else if (result.status === "Running" || result.status === "NotStarted") {
                    // If the task is still in progress, continue polling
                    const processingText = result.status === "NotStarted" ? "Queued..." : "Processing...";
                    buttonElement.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${processingText}`;
                    setTimeout(() => poll(), pollInterval);
                    
                    // Gradually increase polling interval, but not more than 30 seconds
                    pollInterval = Math.min(pollInterval * 1.5, 30000);
                } else {
                    // Transcription failed or encountered unexpected status
                    swal("Recognition Failed", "Please try again.", "error");
                    buttonElement.innerHTML = "<i class=\"fas fa-redo\"></i> Retry";
                    buttonElement.disabled = false;
                    delete this.pollingTasks[audioName]; // Clean up polling task
                }
            } catch (error) {
                console.error("Error polling recognition status:", error);
                swal("Recognition Failed", "Error during polling. Please try again later.", "error");
                buttonElement.innerHTML = "<i class=\"fas fa-redo\"></i> Retry";
                buttonElement.disabled = false;
                delete this.pollingTasks[audioName]; // Clean up polling task
            }
        };
        
        this.pollingTasks[audioName] = { active: true };
        poll(); // Start polling
    }
    
    /**
     * Initializes the modal and its event listeners
     */
    init() {
        // Create the modal (if it doesn't exist)
        this.createModal();
        
        // Bind close button event
        this.closeModalBtn.addEventListener("click", () => this.hideModal());
        
        const uploadBtn = document.getElementById("upload-audio-btn");
        const fileInput = document.getElementById("audio-upload-input");
        
        // Set upload button click event to trigger file input click event
        uploadBtn.addEventListener("click", () => {
            fileInput.click(); // Trigger file input click event
        });
        
        fileInput.addEventListener("change", () => {
            const file = fileInput.files[0];
            if(file) {
                // Change button text and disable it
                uploadBtn.innerHTML = "<i class=\"fas fa-spinner fa-spin\"></i> Uploading...";
                uploadBtn.disabled = true;
                
                // Upload the file
                uploadAudiofile(file, file.name)
                    .then(() => {
                        this.fetchAndDisplayUploadedAudioFiles(); // Refresh the uploaded audio files list
                        swal("Success!", "Audio file uploaded successfully.", "success", { buttons: false, timer: 1500 });
                    })
                    .catch(error => {
                        console.error("Failed to upload audio file:", error);
                        swal("Upload Failed", "Failed to upload audio file.", "error");
                    })
                    .finally(() => {
                        uploadBtn.innerHTML = "<i class=\"fas fa-cloud-upload-alt\"></i> Upload Audio";
                        uploadBtn.disabled = false; 
                        fileInput.value = ""; 
                    });
            }
        });
        
        // Click outside the modal to close it (only for modal background)
        this.modal.addEventListener("click", (event) => {
            if (event.target === this.modal) {
                this.hideModal();
            }
        });
        
        // Set event listeners
        this.bindEvents();
        
        // Add drag and drop functionality
        this.setupDragAndDrop();
    }
    
    /**
     * Sets up drag and drop for file uploads
     */
    setupDragAndDrop() {
        const uploadSection = document.querySelector(".upload-section");
        const fileInput = document.getElementById("audio-upload-input");
        const uploadBtn = document.getElementById("upload-audio-btn");
        
        // Convert upload section to a drop zone
        uploadSection.innerHTML = `
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
        `;
        
        // Re-bind elements
        const dropZone = document.querySelector(".drop-zone");
        const newFileInput = document.getElementById("audio-upload-input");
        const newUploadBtn = document.getElementById("upload-audio-btn");
        
        // Prevent defaults for drag events
        ["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });
        
        // Highlight drop zone when dragging over
        ["dragenter", "dragover"].forEach(eventName => {
            dropZone.addEventListener(eventName, highlight, false);
        });
        
        // Remove highlight when drag leaves
        ["dragleave", "drop"].forEach(eventName => {
            dropZone.addEventListener(eventName, unhighlight, false);
        });
        
        // Handle file drop
        dropZone.addEventListener("drop", handleDrop, false);
        
        // Button click to select file
        newUploadBtn.addEventListener("click", () => {
            newFileInput.click();
        });
        
        // Handle file selection
        newFileInput.addEventListener("change", () => {
            const file = newFileInput.files[0];
            if (file) {
                uploadFile(file);
            }
        });
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        function highlight() {
            dropZone.classList.add("drop-zone-active");
        }
        
        function unhighlight() {
            dropZone.classList.remove("drop-zone-active");
        }
        
        const uploadFile = (file) => {
            // Show uploading state
            dropZone.classList.add("uploading");
            newUploadBtn.disabled = true;
            newUploadBtn.innerHTML = "<i class=\"fas fa-spinner fa-spin\"></i> Uploading...";
            
            // Create and show progress bar
            const progressContainer = document.createElement("div");
            progressContainer.className = "progress-container";
            const progressBar = document.createElement("div");
            progressBar.className = "progress-bar";
            progressContainer.appendChild(progressBar);
            dropZone.appendChild(progressContainer);
            
            // Simulate progress (since actual progress isn't available from API)
            let progress = 0;
            const interval = setInterval(() => {
                progress += 5;
                if (progress >= 90) {
                    clearInterval(interval);
                }
                progressBar.style.width = `${progress}%`;
            }, 200);
            
            // Upload the file
            uploadAudiofile(file, file.name)
                .then(() => {
                    // Complete progress
                    clearInterval(interval);
                    progressBar.style.width = "100%";
                    
                    // Show success message after a moment
                    setTimeout(() => {
                        this.fetchAndDisplayUploadedAudioFiles();
                        swal("Success!", "Audio file uploaded successfully.", "success", { buttons: false, timer: 1500 });
                        
                        // Reset drop zone
                        dropZone.classList.remove("uploading");
                        newUploadBtn.disabled = false;
                        newUploadBtn.innerHTML = "<i class=\"fas fa-file-audio\"></i> Select File";
                        dropZone.removeChild(progressContainer);
                    }, 500);
                })
                .catch(error => {
                    // Clear progress indication
                    clearInterval(interval);
                    
                    // Show error
                    console.error("Failed to upload audio file:", error);
                    swal("Upload Failed", "Failed to upload audio file.", "error");
                    
                    // Reset drop zone
                    dropZone.classList.remove("uploading");
                    newUploadBtn.disabled = false;
                    newUploadBtn.innerHTML = "<i class=\"fas fa-file-audio\"></i> Select File";
                    dropZone.removeChild(progressContainer);
                });
            
            // Clear file input
            newFileInput.value = "";
        };
        
        function handleDrop(e) {
            const dt = e.dataTransfer;
            const file = dt.files[0];
            
            if (file && file.type.startsWith("audio/")) {
                uploadFile(file);
            } else {
                swal("Invalid File", "Please upload an audio file.", "error");
            }
        }
    }
    
    /**
     * Stops all polling tasks
     */
    stopAllPollingTasks() {
        Object.keys(this.pollingTasks).forEach(audioName => {
            if (this.pollingTasks[audioName].active) {
                this.pollingTasks[audioName].active = false;
                delete this.pollingTasks[audioName];
            }
        });
    }
}