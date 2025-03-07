// AudioTranscriptionHandler.js
import { submitTranscriptionJob, fetchTranscriptionStatus, fetchTranscriptText } from "../utils/apiClient.js";
import swal from "sweetalert";
import ClipboardJS from "clipboard";

export default class AudioTranscriptionHandler {
    constructor(view) {
        this.view = view;
        this.pollingTasks = {};
    }

    async recognizeAudioFile(audioUrl, buttonElement) {
        try {
            this.view.updateButtonState(buttonElement, "disabled", "<i class=\"fas fa-spinner fa-spin\"></i> Submitting...");

            const languages = Array.from(document.getElementById("language-options").selectedOptions).map(option => option.value);
            const maxSpeakers = document.getElementById("max-speakers").value;
            const identifySpeakers = maxSpeakers > 1;

            const { transcriptionId, audioName } = await submitTranscriptionJob(audioUrl, { 
                languages, 
                identifySpeakers, 
                maxSpeakers 
            });

            await this.pollForTranscriptResults(transcriptionId, audioName, buttonElement);
        } catch (error) {
            console.error("Failed to recognize audio file: ", error);
            swal("Recognition Failed", "Please try again.", "error");
            this.view.updateButtonState(buttonElement, "enabled", "<i class=\"fas fa-magic\"></i> Recognize");
        }
    }

    async pollForTranscriptResults(transcriptionId, audioName, buttonElement) {
        if (this.pollingTasks[audioName]?.active) {
            console.log(`Polling task ${audioName} is already running`);
            return;
        }

        let attempts = 20;
        let pollInterval = 5000;

        const poll = async () => {
            if (attempts-- === 0 || !this.pollingTasks[audioName]?.active) {
                swal("Recognition Failed", "Timeout getting transcription result. Please try again later.", "error");
                this.view.updateButtonState(buttonElement, "enabled", "<i class=\"fas fa-magic\"></i> Recognize");
                delete this.pollingTasks[audioName];
                return;
            }

            try {
                const result = await fetchTranscriptionStatus(transcriptionId, audioName);
                
                switch(result.status) {
                case "Succeeded":
                    await this.handleSuccessfulTranscription(result, buttonElement);
                    delete this.pollingTasks[audioName];
                    break;

                case "Running":
                case "NotStarted":
                    const processingText = result.status === "NotStarted" ? 
                        "<i class=\"fas fa-spinner fa-spin\"></i> Queued..." : 
                        "<i class=\"fas fa-spinner fa-spin\"></i> Processing...";
                    this.view.updateButtonState(buttonElement, "disabled", processingText);
                    setTimeout(() => poll(), pollInterval);
                    pollInterval = Math.min(pollInterval * 1.5, 30000);
                    break;

                default:
                    swal("Recognition Failed", "Please try again.", "error");
                    this.view.updateButtonState(buttonElement, "enabled", "<i class=\"fas fa-redo\"></i> Retry");
                    delete this.pollingTasks[audioName];
                }
            } catch (error) {
                console.error("Error polling recognition status:", error);
                swal("Recognition Failed", "Error during polling. Please try again later.", "error");
                this.view.updateButtonState(buttonElement, "enabled", "<i class=\"fas fa-redo\"></i> Retry");
                delete this.pollingTasks[audioName];
            }
        };
        
        this.pollingTasks[audioName] = { active: true };
        poll();
    }

    async handleSuccessfulTranscription(result, buttonElement) {
        const audioUrl = buttonElement.getAttribute("data-audio-url");
        const existingButton = document.querySelector(`button.recognize-btn[data-audio-url='${audioUrl}']`);
        
        if (existingButton) {
            const newButton = document.createElement("button");
            newButton.className = "view-result-btn";
            newButton.setAttribute("data-transcription-url", result.transcriptionUrl);
            newButton.innerHTML = "<i class=\"fas fa-eye\"></i> View Transcript";
            existingButton.parentNode.replaceChild(newButton, existingButton);
            swal("Success!", "The transcription is ready.", "success", { buttons: false, timer: 1500 });
        }
    }

    async viewTranscriptionResult(transcriptionUrl) {
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
            
            const result = await this.view.showTranscriptionResult(transcriptText);
            await this.handleTranscriptionAction(result, transcriptText);
        } catch (error) {
            console.error("Failed to view recognition result: ", error);
            swal.close();
            swal("Error", "Failed to view recognition result.", "error");
        }
    }

    async handleTranscriptionAction(action, transcriptText) {
        if (action === "copy") {
            const clipboard = new ClipboardJS(".copy-button", {
                text: () => transcriptText
            });
            
            clipboard.on("success", () => {
                swal("Copied!", "The transcript has been copied to the clipboard.", "success", { 
                    buttons: false, 
                    timer: 1000 
                });
                clipboard.destroy();
            });
            
            clipboard.on("error", () => {
                swal("Error!", "Failed to copy the transcript to the clipboard.", "error");
                clipboard.destroy();
            });
        } else if (action === "insert") {
            const messageInput = document.getElementById("message-input");
            if (messageInput) {
                if (messageInput.value.trim() !== "") {
                    messageInput.value += "\n\n";
                }
                messageInput.value += transcriptText;
                messageInput.focus();
                
                swal("Inserted!", "The transcript has been inserted into your message.", "success", { 
                    buttons: false, 
                    timer: 1000 
                });
            }
        }
    }

    stopAllPollingTasks() {
        Object.keys(this.pollingTasks).forEach(audioName => {
            if (this.pollingTasks[audioName].active) {
                this.pollingTasks[audioName].active = false;
                delete this.pollingTasks[audioName];
            }
        });
    }
}