// AudioProcessingModal.js
import AudioProcessingView from "./AudioProcessingView.js";
import AudioUploadHandler from "./AudioUploadHandler.js";
import AudioTranscriptionHandler from "./AudioTranscriptionHandler.js";
import AudioUIEventHandler from "./AudioUIEventHandler.js";

export default class AudioProcessingModal {
    constructor() {
        this.view = new AudioProcessingView();
        this.transcriptionHandler = new AudioTranscriptionHandler(this.view);
        this.uploadHandler = new AudioUploadHandler(this.view);
        this.uiHandler = new AudioUIEventHandler(this.view, this.uploadHandler, this.transcriptionHandler);
    }

    init() {
        // Create and initialize the modal view
        this.view.createModal();
        
        // Initialize UI event handling
        this.uiHandler.init();
    }

    showModal() {
        this.view.showModal();
        this.uiHandler.refreshFilesList();
    }

    hideModal() {
        this.transcriptionHandler.stopAllPollingTasks();
        this.view.hideModal();
    }
}