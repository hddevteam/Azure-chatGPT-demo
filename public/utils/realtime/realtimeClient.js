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
        this.messageLimit = 10; // default message history limit
        this.messageHistory = []; // message history
        this.totalTokens = 0; // total token number
        this.inputTokens = 0; // input token number
        this.outputTokens = 0; // output token number
    }

    // add audio buffer processing function
    combineArray(newData) {
        const newBuffer = new Uint8Array(this.buffer.length + newData.length);
        newBuffer.set(this.buffer);
        newBuffer.set(newData, this.buffer.length);
        this.buffer = newBuffer;
    }

    async initialize(endpoint, apiKey, deploymentOrModel, isAzure = true) {
        this.modelName = deploymentOrModel.toUpperCase();
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

    getModelName() {
        return this.modelName || "UNKNOWN MODEL";
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
            // 创建基础配置
            const baseConfig = {
                modalities: ["text", "audio"],
                input_audio_format: "pcm16",
                output_audio_format: "pcm16",
                input_audio_transcription: {
                    model: "whisper-1"
                },
                tool_choice: "auto"
            };

            // 合并配置，确保用户配置优先级更高
            const sessionConfig = {
                ...baseConfig,
                ...config,
                // 如果用户提供了 turn_detection，使用用户的配置
                turn_detection: config.turn_detection || {
                    type: "server_vad",
                    threshold: 0.5,
                    prefix_padding_ms: 300,
                    silence_duration_ms: 1000
                }
            };

            await this.client.send({
                type: "session.update",
                session: sessionConfig
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

    setMessageLimit(limit) {
        this.messageLimit = limit;
        console.log(`Message history limit set to: ${limit} (0 means unlimited)`);
        this.pruneMessageHistory();
    }

    async pruneMessageHistory() {
        if (this.messageLimit === 0) return;

        while (this.messageHistory.length > this.messageLimit) {
            const oldestMessage = this.messageHistory.shift();
            if (this.client && oldestMessage.id) {
                try {
                    await this.client.send({
                        type: "conversation.item.delete",
                        item_id: oldestMessage.id
                    });
                    console.log(`Removed old message: ${oldestMessage.id.substring(0, 8)}... (${this.messageHistory.length}/${this.messageLimit})`);
                } catch (error) {
                    console.error("Failed to delete message:", error);
                }
            }
        }
    }

    addMessageToHistory(message, type) {
        const messageData = {
            id: message.id,
            type,
            timestamp: new Date(),
            content: message.content
        };
        
        this.messageHistory.push(messageData);
        console.log(`Message added: ${messageData.id} (${this.messageHistory.length}/${this.messageLimit || "∞"})`);
        
        this.pruneMessageHistory();
    }

    // 更新使用情况统计
    updateUsageStats(usage) {
        if (usage) {
            const prevTotal = this.totalTokens;
            this.totalTokens = usage.total_tokens || this.totalTokens;
            this.inputTokens = usage.input_tokens || this.inputTokens;
            this.outputTokens = usage.output_tokens || this.outputTokens;
            
            if (this.totalTokens !== prevTotal) {
                console.log(`Token usage updated - Total: ${this.totalTokens}, Input: ${this.inputTokens}, Output: ${this.outputTokens}`);
            }
        }
    }

    // 更新速率限制信息
    updateRateLimits(rateLimits) {
        if (rateLimits) {
            console.log("Rate limits status:", rateLimits.map(limit => 
                `${limit.name}: ${limit.remaining}/${limit.limit} (resets in ${limit.reset_seconds}s)`
            ).join(", "));
        }
    }

    // 处理消息删除确认
    handleMessageDeleted(itemId) {
        const index = this.messageHistory.findIndex(msg => msg.id === itemId);
        if (index !== -1) {
            // const message = this.messageHistory[index];
            console.log(`Server confirmed message deletion: ${itemId.substring(0, 8)}...`);
            // 可选：从历史记录中移除
            // this.messageHistory.splice(index, 1);
        }
    }

    // 获取当前会话统计信息
    getSessionStats() {
        return {
            messageCount: this.messageHistory.length,
            messageLimit: this.messageLimit,
            totalTokens: this.totalTokens,
            inputTokens: this.inputTokens,
            outputTokens: this.outputTokens
        };
    }
}