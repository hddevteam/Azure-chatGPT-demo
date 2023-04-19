class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.buffer = [];
        this.audioDataLength = 0;
        this.isRecording = false;

        this.port.onmessage = (event) => {
            if (event.data === "start") {
                this.buffer = [];
                this.isRecording = true;
            } else if (event.data === "stop") {
                this.isRecording = false;
                this.port.postMessage({ audioData: this.buffer, audioDataLength: this.audioDataLength });
            }
        };
    }

    process(inputs, outputs) {
        if (this.isRecording) {
            const input = inputs[0];

            // Downsample the audio data to 16,000 Hz
            const downsampledAudioData = this.downsample(input[0], 44100, 16000);
            this.buffer.push(...downsampledAudioData);
            this.audioDataLength += downsampledAudioData.length;
        }
        return true;
    }

    downsample(buffer, inputSampleRate, outputSampleRate) {
        if (inputSampleRate === outputSampleRate) {
            return buffer;
        }

        const sampleRateRatio = inputSampleRate / outputSampleRate;
        const newLength = Math.round(buffer.length / sampleRateRatio);
        const result = new Float32Array(newLength);

        for (let i = 0; i < newLength; i++) {
            const index = i * sampleRateRatio;
            const indexFloor = Math.floor(index);
            const indexCeil = Math.ceil(index);
            const weight = index - indexFloor;
            result[i] = buffer[indexFloor] * (1 - weight) + buffer[indexCeil] * weight;
        }

        return result;
    }
}

registerProcessor("audio-processor", AudioProcessor);