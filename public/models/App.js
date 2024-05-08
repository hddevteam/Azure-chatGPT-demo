//public/models/App.js
import Prompts from "./Prompts.js";

class App {
    constructor() {
        this.prompts = new Prompts();
        this.ttsPracticeMode = false;
        this.audio = new Audio();
        this.currentPlayingSpeaker = null; // Add this variable to keep track of the current playing speaker
        this.model = "gpt-3.5-turbo";
    }

    setCurrentPlayingSpeaker(speaker) {
        this.currentPlayingSpeaker = speaker;
    }

    setTtsPracticeMode(mode) {
        this.ttsPracticeMode = mode;
    }
}

export default App;