export class Recorder {
    constructor(onDataAvailable) {
        this.onDataAvailable = onDataAvailable;
        this.audioContext = null;
        this.mediaStream = null;
        this.mediaStreamSource = null;
        this.workletNode = null;
    }

    async start(stream) {
        try {
            this.audioContext = new AudioContext({ sampleRate: 24000 });
            await this.audioContext.audioWorklet.addModule(
                "/utils/realtime/audio-worklet-processor.js"
            );
            this.mediaStream = stream;
            this.mediaStreamSource = this.audioContext.createMediaStreamSource(
                this.mediaStream
            );
            this.workletNode = new AudioWorkletNode(
                this.audioContext,
                "audio-worklet-processor"
            );
            this.workletNode.port.onmessage = (event) => {
                this.onDataAvailable(event.data.buffer);
            };
            this.mediaStreamSource.connect(this.workletNode);
            this.workletNode.connect(this.audioContext.destination);
        } catch (error) {
            this.stop();
        }
    }

    stop() {
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach((track) => track.stop());
        }
        if (this.audioContext) {
            this.audioContext.close();
        }
    }
}