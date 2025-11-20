export class Player {
    constructor() {
        this.playbackNode = null;
        this.gainNode = null;
        this.audioContext = null;
        this.isPlaying = false; // Add playback status flag
        this.isMuted = false; // Add mute state flag
    }

    async init(sampleRate) {
        this.audioContext = new AudioContext({ sampleRate });
        await this.audioContext.audioWorklet.addModule("/utils/realtime/playback-worklet.js");

        this.playbackNode = new AudioWorkletNode(this.audioContext, "playback-worklet");
        
        // Create gain node for volume control
        this.gainNode = this.audioContext.createGain();
        this.gainNode.gain.value = 1.0; // Default volume
        
        // Connect: playbackNode -> gainNode -> destination
        this.playbackNode.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);
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

    // Mute/unmute audio output
    setMuted(muted) {
        if (this.gainNode) {
            this.isMuted = muted;
            // Set gain to 0 when muted, 1.0 when unmuted
            this.gainNode.gain.value = muted ? 0 : 1.0;
            console.log(`Audio ${muted ? "muted" : "unmuted"} via gain control`);
        }
    }

    // Get mute state
    isMutedState() {
        return this.isMuted;
    }
}