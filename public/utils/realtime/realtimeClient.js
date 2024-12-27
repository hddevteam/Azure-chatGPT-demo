import { Player } from "./player.js";
import { Recorder } from "./recorder.js";
import { LowLevelRTClient } from "rt-client";
import { generateRealtimeSummary } from "../api.js";

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
        this.currentSummary = null; // 只保存当前摘要，替换之前的 summarizedMessages 数组
        this.lastSummaryTime = null; // 上次摘要时间
        this.lastSummaryTokens = 0; // 上次摘要的token数
        this.originalInstructions = null; // 保存初始instructions
        this.lastSummaryIndex = 0; // 记录上次摘要的位置
        this.summaryRatio = 0.8; // 触发摘要的比例(80%)
        this.initialContext = null; // 添加初始上下文存储
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
                tool_choice: "auto",
                // 添加时间获取工具
                tools: [{
                    type: "function",
                    name: "get_current_time",
                    description: "Get the current time in the specified timezone",
                    parameters: {
                        type: "object",
                        properties: {
                            timezone: {
                                type: "string",
                                description: "The timezone to get the time in (e.g. 'Asia/Shanghai', 'America/New_York')"
                            }
                        },
                        required: ["timezone"]
                    }
                }]
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
            
            this.originalInstructions = config.instructions;
            this.initialContext = config.instructions; // 保存初始上下文
            
            // 创建初始摘要
            if (config.instructions) {
                const initialSummary = {
                    id: `summary-init-${Date.now()}`,
                    type: "initial",
                    content: {
                        summary: "",
                        keyPoints: [],
                        context: config.instructions
                    },
                    timestamp: new Date(),
                    originalMessages: []
                };
                this.currentSummary = initialSummary;
            }

            // 添加函数调用响应处理
            this.functionHandlers = {
                get_current_time: this.handleGetCurrentTime.bind(this)
            };

            await this.resetAudio(true);
            return true;
        } catch (error) {
            console.error("Start error:", error);
            return false;
        }
    }

    // 处理获取时间的函数调用
    async handleGetCurrentTime(args) {
        try {
            const { timezone } = args;
            const options = {
                hour12: false,
                year: "numeric",
                month: "2-digit",
                day: "2-digit", 
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            };

            // 如果提供了时区就使用指定时区,否则使用本地时区
            if (timezone) {
                options.timeZone = timezone;
            }

            const time = new Date().toLocaleString("zh-CN", options);
            return JSON.stringify({ 
                time,
                timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone // 返回使用的时区信息
            });
        } catch (error) {
            console.error("Error getting time:", error);
            return JSON.stringify({ error: "Failed to get time" });
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
                // 处理函数调用
                if (message.type === "response.function_call_arguments.done") {
                    const handler = this.functionHandlers[message.name];
                    if (handler) {
                        try {
                            const args = JSON.parse(message.arguments);
                            const result = await handler(args);
                            // 发送函数调用结果
                            await this.client.send({
                                type: "conversation.item.create",
                                item: {
                                    type: "function_call_output",
                                    call_id: message.call_id,
                                    output: result
                                }
                            });
                            
                            // 发送 response.create 事件以获取 AI 的响应
                            await this.client.send({
                                type: "response.create"
                            });
                        } catch (error) {
                            console.error("Function call error:", error);
                        }
                    }
                }
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

    async generateSummary(messages) {
        try {
            // 将消息转换为 Markdown 格式
            const markdownContent = this.convertToMarkdown(messages);
            console.log("Markdown formatted content:", markdownContent);

            const messageContent = [{
                role: "user",
                content: markdownContent
            }];

            const summaryData = await generateRealtimeSummary(messageContent);
            return {
                summary: summaryData.summary,
                keyPoints: summaryData.key_points,
                context: summaryData.context,
                tokens: summaryData.tokens
            };
        } catch (error) {
            console.error("Failed to generate summary:", error);
            return null;
        }
    }

    convertToMarkdown(messages) {
        const sections = [];

        // 1. 添加之前的摘要部分
        const previousSummary = messages.find(msg => msg.role === "Previous Summary");
        if (previousSummary) {
            sections.push(`## Previous Summary\n\n${previousSummary.content}\n`);
        }

        // 2. 添加当前对话部分
        const currentMessages = messages.filter(msg => msg.role !== "Previous Summary");
        if (currentMessages.length > 0) {
            sections.push("## Current Conversation\n");
            currentMessages.forEach(msg => {
                const role = msg.role === "assistant" ? "Assistant" : "User";
                sections.push(`### ${role}\n${msg.content}\n`);
            });
        }

        return sections.join("\n");
    }

    async pruneMessageHistory() {
        if (this.messageLimit === 0) return;
        
        // 1. 检查是否需要删除多余的消息
        const excessMessages = this.messageHistory.length - this.messageLimit;
        if (excessMessages > 0) {
            // 获取已被总结过的消息
            // 注意：由于删除消息会影响索引，我们需要记录消息的相对位置
            const summarizedMessageIds = this.messageHistory
                .slice(0, this.lastSummaryIndex)
                .map(msg => msg.id)
                .filter(Boolean);

            console.log(`Messages already summarized: ${summarizedMessageIds.length}`);
            
            // 只删除已被总结过的消息，且最多删除 excessMessages 条
            const messagesToDelete = this.messageHistory
                .filter(msg => summarizedMessageIds.includes(msg.id))
                .slice(0, excessMessages);

            if (messagesToDelete.length > 0) {
                console.log(`Deleting ${messagesToDelete.length} summarized messages...`);
                
                // 记录删除前的状态
                const deletedIndices = messagesToDelete.map(msg => 
                    this.messageHistory.findIndex(m => m.id === msg.id)
                ).sort((a, b) => a - b);
                
                // 批量删除消息
                for (const msg of messagesToDelete) {
                    try {
                        await this.client.send({
                            type: "conversation.item.delete",
                            item_id: msg.id
                        });
                        
                        // 从本地历史记录中移除
                        const index = this.messageHistory.findIndex(m => m.id === msg.id);
                        if (index !== -1) {
                            this.messageHistory.splice(index, 1);
                        }
                    } catch (error) {
                        console.error(`Failed to delete message ${msg.id}:`, error);
                    }
                }

                // 重新计算 lastSummaryIndex
                // 计算有多少个被删除的消息位于 lastSummaryIndex 之前
                const deletedBeforeSummary = deletedIndices.filter(index => index < this.lastSummaryIndex).length;
                this.lastSummaryIndex = Math.max(0, this.lastSummaryIndex - deletedBeforeSummary);
                
                console.log(`Updated lastSummaryIndex to: ${this.lastSummaryIndex}`);
            } else {
                console.log("No summarized messages available for deletion");
            }
        }

        // 2. 检查是否需要生成新的摘要
        if (this.shouldGenerateSummary()) {
            // 准备摘要内容
            const allContentToSummarize = [];
            
            // 添加之前的摘要内容
            if (this.currentSummary) {
                allContentToSummarize.push({
                    role: "Previous Summary",
                    content: `${this.currentSummary.content.summary}\nKey Points: ${this.currentSummary.content.keyPoints.join(", ")}`
                });
            }
            
            // 添加新消息内容
            const newMessages = this.messageHistory.slice(this.lastSummaryIndex);
            const processedNewMessages = newMessages
                .filter(msg => msg.text && msg.text.trim() !== "")
                .map(msg => ({
                    role: msg.type,
                    content: msg.text
                }));
                
            allContentToSummarize.push(...processedNewMessages);

            if (allContentToSummarize.length > 0) {
                const summaryResult = await this.generateSummary(allContentToSummarize);
                
                if (summaryResult) {
                    // 更新当前摘要，保留初始上下文
                    this.currentSummary = {
                        id: `summary-${Date.now()}`,
                        type: "summary",
                        content: {
                            summary: summaryResult.summary,
                            keyPoints: summaryResult.keyPoints,
                            context: `${this.initialContext}\n\nCurrent Context: ${summaryResult.context}`
                        },
                        tokens: summaryResult.tokens,
                        timestamp: new Date()
                    };
                    console.log("Summary updated:", this.currentSummary);

                    // 更新摘要相关状态
                    this.lastSummaryIndex = this.messageHistory.length;
                    this.lastSummaryTime = Date.now();
                    this.lastSummaryTokens = summaryResult.tokens;

                    // 更新系统指令
                    const updatedInstructions = this.buildUpdatedInstructions(summaryResult);
                    if (!this.isGeneratingResponse) {
                        await this.client.send({
                            type: "session.update",
                            session: {
                                instructions: updatedInstructions
                            }
                        });
                    }
                }
            }
        }
    }

    shouldGenerateSummary() {
        if (this.messageLimit === 0) return false;
        
        // 计算自上次摘要后的新消息数量
        const newMessagesCount = this.messageHistory.length - this.lastSummaryIndex;
        
        // 计算动态阈值 (messageLimit的80%)
        const dynamicThreshold = Math.floor(this.messageLimit * this.summaryRatio);
        
        // 如果新消息数量达到阈值或者总消息数量超过限制，就需要生成摘要
        return newMessagesCount >= dynamicThreshold || 
               this.messageHistory.length > this.messageLimit;
    }

    extractMessageContent(message) {
        if (!message) return null;

        // 处理不同类型的消息内容
        if (message.rawContent) {
            return message.rawContent.map(content => {
                if (content.type === "text") return content.text;
                if (content.type === "input_audio" && content.transcript) return content.transcript;
                if (content.type === "audio" && content.transcript) return content.transcript;
                return "";
            }).filter(Boolean).join(" ");
        }

        // 如果是直接的文本内容
        if (typeof message.content === "string") {
            return message.content;
        }

        return "";
    }

    addMessageToHistory(messageData) {
        // 只有有效的服务器端消息才添加到历史记录
        if (!messageData.id || messageData.status === "in_progress") {
            console.log("[Message Skipped] Invalid message:", messageData);
            return;
        }

        // 检查消息是否已存在
        const existingMessageIndex = this.messageHistory.findIndex(msg => msg.id === messageData.id);
        if (existingMessageIndex !== -1) {
            const existingMessage = this.messageHistory[existingMessageIndex];
            const existingText = existingMessage.text || "";
            const newText = messageData.text || "";
            
            // 如果新消息内容不同于现有消息
            if (existingText !== newText) {
                console.log(`[Message Updated] ID: ${messageData.id}`);
                console.log("- Old text:", existingText);
                console.log("- New text:", newText);
                
                // 更新现有消息的内容
                this.messageHistory[existingMessageIndex] = {
                    ...existingMessage,
                    text: newText,
                    content: messageData.content,
                    lastUpdated: new Date()
                };
            } else {
                console.log(`[Message Unchanged] ID: ${messageData.id}`);
            }
            return;
        }

        // 检查消息内容的有效性
        if (!this.validateMessageContent(messageData)) {
            console.log("[Message Invalid] Missing required content:", messageData);
            return;
        }

        // 添加消息到历史记录
        this.messageHistory.push({
            ...messageData,
            createdAt: new Date(),
            lastUpdated: new Date()
        });
        
        console.log("[Message Added]", {
            id: messageData.id,
            type: messageData.type,
            messageCount: `${this.messageHistory.length}/${this.messageLimit || "∞"}`,
            text: messageData.text?.substring(0, 50) + (messageData.text?.length > 50 ? "..." : "")
        });

        // console.log("Current message history:", this.messageHistory);
        
        this.pruneMessageHistory();
    }

    validateMessageContent(messageData) {
        // 验证消息内容
        if (!messageData.type || !messageData.content) {
            return false;
        }

        // 确保文本内容存在
        if (Array.isArray(messageData.content)) {
            const hasValidContent = messageData.content.some(item => {
                return (item.type === "text" && item.text) || 
                       (item.type === "audio" && item.transcript) ||
                       (item.type === "input_audio" && item.transcript);
            });
            return hasValidContent;
        }

        return false;
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
            console.log(`Server confirmed message deletion: ${itemId}`);
            // Remove from local history
            this.messageHistory.splice(index, 1);
            console.log(`Message removed from local history. Remaining messages: ${this.messageHistory.length}`);
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

    buildUpdatedInstructions(summaryResult) {
        // 始终以原始指令开头，保持初始上下文
        const instructions = [];
        
        // 1. 添加原始指令
        if (this.originalInstructions) {
            instructions.push(this.originalInstructions);
        }
        
        // 2. 添加当前总结
        instructions.push(`
Current Conversation Summary:
${summaryResult.summary}

Key Discussion Points:
${summaryResult.keyPoints.map(point => `• ${point}`).join("\n")}

Current Context:
${summaryResult.context}

Please continue the conversation while maintaining consistency with the above context and key points.`);

        // 返回组合后的指令
        return instructions.join("\n\n").trim();
    }
}