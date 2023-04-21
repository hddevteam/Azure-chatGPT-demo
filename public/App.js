// App.js
import Prompts from "./Prompts.js";

class App {
    constructor() {
        this.prompts = new Prompts();
        this.currentProfile = null;
        this.ttsPracticeMode = false;
        this.audio = new Audio();
        this.currentPlayingSpeaker = null; // Add this variable to keep track of the current playing speaker
    }

    // Add methods to interact with variables
    setCurrentProfile(profile) {
        this.currentProfile = profile;
    }

    setCurrentPlayingSpeaker(speaker) {
        this.currentPlayingSpeaker = speaker;
    }

    setTtsPracticeMode(mode) {
        this.ttsPracticeMode = mode;
    }
}

export default App;