// AudioManager.js
import { getTts } from "../utils/apiClient.js";

class AudioManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.audio = new Audio();
        this.currentPlayingSpeaker = null;
    }

    turnOnPracticeMode() {
        const practiceMode = document.querySelector("#practice-mode");
        const practiceModeIcon = document.querySelector("#practice-mode-icon");
        practiceMode.innerText = "Auto";
        practiceModeIcon.classList.remove("fa-volume-off");
        practiceModeIcon.classList.add("fa-volume-up");
        this.uiManager.app.setTtsPracticeMode(true);
    }

    turnOffPracticeMode() {
        const practiceMode = document.querySelector("#practice-mode");
        const practiceModeIcon = document.querySelector("#practice-mode-icon");
        practiceMode.innerText = "Man.";
        practiceModeIcon.classList.remove("fa-volume-up");
        practiceModeIcon.classList.add("fa-volume-off");
        this.uiManager.app.setTtsPracticeMode(false);
    }

    setupPracticeMode() {
        const ttsContainer = document.querySelector("#tts-container");
        if (this.uiManager.storageManager.getCurrentProfile() && 
            this.uiManager.storageManager.getCurrentProfile().tts === "enabled") {
            ttsContainer.style.display = "inline-block";
        } else {
            ttsContainer.style.display = "none";
        }
    }

    async playMessage(speaker) {
        if (speaker.classList.contains("fa-volume-up")) {
            this.audio.pause();
            this.uiManager.domManager.toggleSpeakerIcon(speaker);
            this.currentPlayingSpeaker = null;
            return;
        }

        if (this.currentPlayingSpeaker && this.currentPlayingSpeaker !== speaker) {
            this.audio.pause();
            this.uiManager.domManager.toggleSpeakerIcon(this.currentPlayingSpeaker);
        }

        this.currentPlayingSpeaker = speaker;
        const message = speaker.parentElement.parentElement.dataset.message;

        try {
            this.uiManager.domManager.toggleSpeakerIcon(speaker);
            const blob = await getTts(message);
            console.log("ready to play...");
            this.audio.src = URL.createObjectURL(blob);
            await this.playAudio(speaker);
        } catch (error) {
            this.uiManager.domManager.toggleSpeakerIcon(speaker);
            console.error(error);
        }
    }

    async playAudio(speaker) {
        return new Promise((resolve, reject) => {
            this.audio.onerror = () => {
                this.uiManager.domManager.toggleSpeakerIcon(speaker);
                this.currentPlayingSpeaker = null;
                console.error("Error playing audio.");
                reject(new Error("Error playing audio."));
            };
            this.audio.onended = () => {
                this.uiManager.domManager.toggleSpeakerIcon(speaker);
                this.currentPlayingSpeaker = null;
                resolve();
            };
            this.audio.onabort = () => {
                console.error("Audio play aborted.");
                resolve();
            };
            this.audio.play();
        });
    }
}

export default AudioManager;