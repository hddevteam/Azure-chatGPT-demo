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

    async initialize(endpoint, apiKey, deploymentOrModel, isAzure = true) {
        // 初始化客户端
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
        if (this.recordingActive && this.client) {
            // 将 buffer 数据转换为 base64 字符串
            const uint8Array = new Uint8Array(data);
            const regularArray = String.fromCharCode(...uint8Array);
            const base64 = btoa(regularArray);
            
            // 发送正确格式的音频数据
            this.client.send({
                type: "input_audio_buffer.append",
                audio: base64  // 直接发送 base64 字符串，而不是包装在对象中
            });

            // 发送 commit 消息
            this.client.send({
                type: "input_audio_buffer.commit"
            });
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

    handleAudioPlayback(audioData) {
        if (this.audioPlayer) {
            const binary = atob(audioData);
            const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
            const pcmData = new Int16Array(bytes.buffer);
            this.audioPlayer.play(pcmData);
        }
    }
}