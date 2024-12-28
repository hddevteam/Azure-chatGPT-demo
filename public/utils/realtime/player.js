export class Player {
    constructor() {
        this.playbackNode = null;
        this.isPlaying = false; // Add playback status flag
    }

    async init(sampleRate) {
        const audioContext = new AudioContext({ sampleRate });
        await audioContext.audioWorklet.addModule("/utils/realtime/playback-worklet.js");

        this.playbackNode = new AudioWorkletNode(audioContext, "playback-worklet");
        this.playbackNode.connect(audioContext.destination);
    }

    play(buffer) {
        if (this.playbackNode) {
            this.isPlaying = true;
            this.playbackNode.port.postMessage(buffer);
        }
    }

    stop() {
        if (this.playbackNode) {
            this.isPlaying = false;
            this.playbackNode.port.postMessage("stop");
        }
    }

    clear() {
        if (this.playbackNode) {
            this.isPlaying = false;
            this.playbackNode.port.postMessage(null);
        }
    }

    // Add playback state check method
    getPlaybackState() {
        return this.isPlaying;
    }
}