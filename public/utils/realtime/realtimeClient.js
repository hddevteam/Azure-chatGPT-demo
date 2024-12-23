import { Player } from "./player.js";
import { Recorder } from "./recorder.js";
import { LowLevelRTClient } from "rt-client";

export class RealtimeClient {
    constructor() {
        this.client = null;
        this.audioRecorder = null;
        this.audioPlayer = null;
        this.recordingActive = false;
        this.buffer = new Uint8Array();
    }

    // add audio buffer processing function
    combineArray(newData) {
        const newBuffer = new Uint8Array(this.buffer.length + newData.length);
        newBuffer.set(this.buffer);
        newBuffer.set(newData, this.buffer.length);
        this.buffer = newBuffer;
    }

    async initialize(endpoint, apiKey, deploymentOrModel, isAzure = true) {
        if (isAzure) {
            this.client = new LowLevelRTClient(
                new URL(endpoint), 
                { key: apiKey }, 
                { deployment: deploymentOrModel }
            );
        } else {
            this.client = new LowLevelRTClient(
                { key: apiKey }, 
                { model: deploymentOrModel }
            );
        }

        // 初始化音频
        await this.resetAudio(false);
    }

    async resetAudio(startRecording) {
        this.recordingActive = false;
        if (this.audioRecorder) {
            this.audioRecorder.stop();
        }
        if (this.audioPlayer) {
            this.audioPlayer.clear();
        }
        
        this.audioRecorder = new Recorder(data => this.processAudioBuffer(data));
        this.audioPlayer = new Player();
        await this.audioPlayer.init(24000);
        
        if (startRecording) {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.audioRecorder.start(stream);
            this.recordingActive = true;
        }
    }

    processAudioBuffer(data) {
        const uint8Array = new Uint8Array(data);
        this.combineArray(uint8Array);
        
        // make sure enough audio data accumulated
        if (this.buffer.length >= 4800) {
            const toSend = new Uint8Array(this.buffer.slice(0, 4800));
            this.buffer = new Uint8Array(this.buffer.slice(4800));
            const regularArray = String.fromCharCode(...toSend);
            const base64 = btoa(regularArray);
            
            if (this.recordingActive && this.client) {
                this.client.send({
                    type: "input_audio_buffer.append",
                    audio: base64,
                });
            }
        }
    }

    async start(config) {
        try {
            await this.client.send({
                type: "session.update",
                session: {
                    ...config,
                    turn_detection: {
                        type: "server_vad",
                    },
                    input_audio_transcription: {
                        model: "whisper-1"
                    }
                }
            });
            await this.resetAudio(true);
            return true;
        } catch (error) {
            console.error("Start error:", error);
            return false;
        }
    }

    stop() {
        this.recordingActive = false;
        if (this.audioRecorder) {
            this.audioRecorder.stop();
        }
        if (this.audioPlayer) {
            this.audioPlayer.clear();
        }
        if (this.client) {
            this.client.close();
        }
    }

    async *getMessages() {
        if (this.client) {
            for await (const message of this.client.messages()) {
                if (message.type === "audio") {
                    this.audioPlayer.play(message.audio.buffer);
                }
                yield message;
            }
        }
    }

    // add audio playback function
    handleAudioPlayback(audioData) {
        if (!this.audioPlayer) return;
        
        const binary = atob(audioData);
        const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
        const pcmData = new Int16Array(bytes.buffer);
        this.audioPlayer.play(pcmData);
    }
}