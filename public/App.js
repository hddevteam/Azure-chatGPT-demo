// Purpose: Contains the App class which is used to store the current state of the application.
import Prompts from "./Prompts.js";

class App {
    constructor() {
        this.prompts = new Prompts();
        this.ttsPracticeMode = false;
        this.audio = new Audio();
        this.currentPlayingSpeaker = null; // Add this variable to keep track of the current playing speaker
    }

    setCurrentPlayingSpeaker(speaker) {
        this.currentPlayingSpeaker = speaker;
    }

    setTtsPracticeMode(mode) {
        this.ttsPracticeMode = mode;
    }
}

export default App;