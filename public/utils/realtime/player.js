export class Player {
    constructor() {
        this.playbackNode = null;
    }

    async init(sampleRate) {
        const audioContext = new AudioContext({ sampleRate });
        await audioContext.audioWorklet.addModule("/utils/realtime/playback-worklet.js");

        this.playbackNode = new AudioWorkletNode(audioContext, "playback-worklet");
        this.playbackNode.connect(audioContext.destination);
    }

    play(buffer) {
        if (this.playbackNode) {
            this.playbackNode.port.postMessage(buffer);
        }
    }

    clear() {
        if (this.playbackNode) {
            this.playbackNode.port.postMessage(null);
        }
    }
}