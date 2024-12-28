class PlaybackWorklet extends AudioWorkletProcessor {
    constructor() {
        super();
        this.buffer = [];
        this.port.onmessage = this.handleMessage.bind(this);
    }

    handleMessage(event) {
        if (event.data === "stop") {
            this.buffer = [];
            this.port.postMessage({ type: "playback_ended" });
            return;
        }
        if (event.data === null) {
            this.buffer = [];
            this.port.postMessage({ type: "playback_ended" });
            return;
        }
        this.buffer.push(...event.data);
    }

    process(inputs, outputs, parameters) {
        const output = outputs[0];
        const channel = output[0];

        if (this.buffer.length > channel.length) {
            const toProcess = this.buffer.splice(0, channel.length);
            channel.set(toProcess.map((v) => v / 32768));
        } else if (this.buffer.length > 0) {
            channel.set(this.buffer.map((v) => v / 32768));
            this.buffer = [];
            // Send notification when buffer playback is complete
            this.port.postMessage({ type: "playback_ended" });
        }

        return true;
    }
}

registerProcessor("playback-worklet", PlaybackWorklet);
