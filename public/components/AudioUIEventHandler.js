// AudioUIEventHandler.js
import { deleteAudioFile, fetchUploadedAudioFiles } from "../utils/apiClient.js";
import swal from "sweetalert";

export default class AudioUIEventHandler {
    constructor(view, uploadHandler, transcriptionHandler) {
        this.view = view;
        this.uploadHandler = uploadHandler;
        this.transcriptionHandler = transcriptionHandler;
    }

    init() {
        this.bindCloseModalEvent();
        this.bindFileListEvents();
        this.uploadHandler.setupDragAndDrop();
        this.bindAudioUploadedEvent();
    }

    bindCloseModalEvent() {
        // Bind close button event
        this.view.closeModalBtn.addEventListener("click", () => {
            this.transcriptionHandler.stopAllPollingTasks();
            this.view.hideModal();
        });

        // Click outside the modal to close it
        this.view.modal.addEventListener("click", (event) => {
            if (event.target === this.view.modal) {
                this.transcriptionHandler.stopAllPollingTasks();
                this.view.hideModal();
            }
        });
    }

    bindFileListEvents() {
        document.getElementById("uploaded-audio-files-list").addEventListener("click", async (event) => {
            const target = this.findAncestor(event.target, ["recognize-btn", "view-result-btn", "delete-audio-btn"]);
            if (!target) return;

            if (target.classList.contains("recognize-btn")) {
                const audioUrl = target.getAttribute("data-audio-url");
                await this.transcriptionHandler.recognizeAudioFile(audioUrl, target);
            } 
            else if (target.classList.contains("view-result-btn")) {
                const transcriptionUrl = target.getAttribute("data-transcription-url");
                await this.transcriptionHandler.viewTranscriptionResult(transcriptionUrl);
            } 
            else if (target.classList.contains("delete-audio-btn")) {
                await this.handleDeleteAudioFile(target);
            }
        });
    }

    bindAudioUploadedEvent() {
        window.addEventListener("audioFileUploaded", () => {
            this.refreshFilesList();
        });
    }

    // Helper function: find ancestor with specified classes
    findAncestor(el, classes) {
        while (el && !classes.some(cls => el.classList.contains(cls))) {
            el = el.parentElement;
        }
        return el;
    }

    async handleDeleteAudioFile(deleteBtn) {
        const blobName = deleteBtn.getAttribute("data-blob-name");
        const fileItem = this.findAncestor(deleteBtn, ["uploaded-file-item"]);

        const willDelete = await swal({
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
        });

        if (willDelete) {
            try {
                if (fileItem) {
                    fileItem.classList.add("removing");
                }
                
                await deleteAudioFile(blobName);
                
                setTimeout(() => {
                    this.refreshFilesList();
                    swal("Deleted!", "The audio file has been deleted.", "success", { 
                        buttons: false, 
                        timer: 1500 
                    });
                }, 300);
            } catch (error) {
                console.error("Failed to delete audio file:", error);
                if (fileItem) {
                    fileItem.classList.remove("removing");
                }
                swal("Error", "Failed to delete the audio file.", "error");
            }
        }
    }

    async refreshFilesList() {
        try {
            this.view.showLoadingFiles();
            const result = await fetchUploadedAudioFiles();
            if (result.success && result.data) {
                const sortedFiles = result.data.sort((a, b) => 
                    new Date(b.lastModified) - new Date(a.lastModified)
                );
                this.view.renderAudioFiles(sortedFiles);
            } else {
                throw new Error("Failed to fetch audio files");
            }
        } catch (error) {
            console.error("Error fetching audio files:", error);
            this.view.showErrorState(() => this.refreshFilesList());
        }
    }
}