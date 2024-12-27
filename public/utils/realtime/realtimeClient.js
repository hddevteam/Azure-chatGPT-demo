import { Player } from "./player.js";
import { Recorder } from "./recorder.js";
import { LowLevelRTClient } from "rt-client";
import { generateRealtimeSummary, searchBing } from "../api.js";

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
        this.currentSummary = null; // Only save the current summary, replacing the previous summarizedMessages array
        this.lastSummaryTime = null; // Last summary time
        this.lastSummaryTokens = 0; // Number of tokens in the last summary
        this.originalInstructions = null; // Save initial instructions
        this.lastSummaryIndex = 0; // Record the position of the last summary
        this.summaryRatio = 0.8; // Ratio to trigger summary (80%)
        this.initialContext = null; // Add initial context storage
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

        // Initialize audio
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
            // Create base configuration
            const baseConfig = {
                modalities: ["text", "audio"],
                input_audio_format: "pcm16",
                output_audio_format: "pcm16",
                input_audio_transcription: {
                    model: "whisper-1"
                },
                tool_choice: "auto",
                tools: [{
                    type: "function",
                    name: "get_current_time",
                    description: "Get the current time in the specified timezone, if no timezone specified, use browser's timezone",
                    parameters: {
                        type: "object",
                        properties: {
                            timezone: {
                                type: "string",
                                description: "The timezone to get the time in (e.g. 'Asia/Shanghai', 'America/New_York'). Optional - will use browser timezone if not specified."
                            }
                        },
                        required: []
                    }
                },
                {
                    type: "function",
                    name: "search_bing",
                    description: "Search the internet using Bing Search API",
                    parameters: {
                        type: "object",
                        properties: {
                            query: {
                                type: "string",
                                description: "The search query to send to Bing"
                            }
                        },
                        required: ["query"]
                    }
                }]
            };

            const sessionConfig = {
                ...baseConfig,
                ...config,
                // Use user's turn_detection config if provided
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
            this.initialContext = config.instructions; // Save initial context
            
            // Create initial summary
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

            // Add function call response handling
            this.functionHandlers = {
                get_current_time: this.handleGetCurrentTime.bind(this),
                search_bing: this.handleBingSearch.bind(this)
            };

            await this.resetAudio(true);
            return true;
        } catch (error) {
            console.error("Start error:", error);
            return false;
        }
    }

    // Handle get current time function call
    async handleGetCurrentTime(args) {
        try {
            const { timezone } = args;
            const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            console.log("Getting time for timezone:", timezone || browserTimezone);
            
            const options = {
                hour12: false,
                year: "numeric",
                month: "2-digit",
                day: "2-digit", 
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                timeZone: timezone || browserTimezone // 如果没有指定时区，使用浏览器时区
            };

            const time = new Date().toLocaleString(navigator.language, options);
            return JSON.stringify({ 
                time,
                timezone: options.timeZone,
                isDefaultTimezone: !timezone
            });
        } catch (error) {
            console.error("Error getting time:", error);
            return JSON.stringify({ 
                error: "Failed to get time",
                browserTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            });
        }
    }

    // Add Bing search handling function
    async handleBingSearch(args) {
        try {
            const { query } = args;
            const searchResults = await searchBing(query);
            console.log("Bing search results:", searchResults);
            // Format the results as a string，移除 URL
            const formattedResults = searchResults
                .slice(0, 5) 
                .map((result, index) => {
                    return `${index + 1}. ${result.title}\n   ${result.snippet}`;
                })
                .join("\n\n");
            
            return JSON.stringify({
                query: query,
                results: formattedResults
            });
        } catch (error) {
            console.error("Bing search error:", error);
            return JSON.stringify({ 
                error: "Failed to perform search",
                details: error.message 
            });
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
                // Handle function call
                if (message.type === "response.function_call_arguments.done") {
                    const handler = this.functionHandlers[message.name];
                    if (handler) {
                        try {
                            const args = JSON.parse(message.arguments);
                            const result = await handler(args);
                            // Send function call result
                            await this.client.send({
                                type: "conversation.item.create",
                                item: {
                                    type: "function_call_output",
                                    call_id: message.call_id,
                                    output: result
                                }
                            });
                            
                            // Send response.create event to get AI's response
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

        // 1. Add previous summary section
        const previousSummary = messages.find(msg => msg.role === "Previous Summary");
        if (previousSummary) {
            sections.push(`## Previous Summary\n\n${previousSummary.content}\n`);
        }

        // 2. Add current conversation section
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
        
        // 1. Check if excess messages need to be deleted
        const excessMessages = this.messageHistory.length - this.messageLimit;
        if (excessMessages > 0) {
            // Get messages that have been summarized
            // Note: Since deleting messages affects indices, we need to record the relative position of messages
            const summarizedMessageIds = this.messageHistory
                .slice(0, this.lastSummaryIndex)
                .map(msg => msg.id)
                .filter(Boolean);

            console.log(`Messages already summarized: ${summarizedMessageIds.length}`);
            
            // Only delete messages that have been summarized, and delete up to excessMessages
            const messagesToDelete = this.messageHistory
                .filter(msg => summarizedMessageIds.includes(msg.id))
                .slice(0, excessMessages);

            if (messagesToDelete.length > 0) {
                console.log(`Deleting ${messagesToDelete.length} summarized messages...`);
                
                // Record the state before deletion
                const deletedIndices = messagesToDelete.map(msg => 
                    this.messageHistory.findIndex(m => m.id === msg.id)
                ).sort((a, b) => a - b);
                
                // Batch delete messages
                for (const msg of messagesToDelete) {
                    try {
                        await this.client.send({
                            type: "conversation.item.delete",
                            item_id: msg.id
                        });
                        
                        // Remove from local history
                        const index = this.messageHistory.findIndex(m => m.id === msg.id);
                        if (index !== -1) {
                            this.messageHistory.splice(index, 1);
                        }
                    } catch (error) {
                        console.error(`Failed to delete message ${msg.id}:`, error);
                    }
                }

                // Recalculate lastSummaryIndex
                // Calculate how many deleted messages were before lastSummaryIndex
                const deletedBeforeSummary = deletedIndices.filter(index => index < this.lastSummaryIndex).length;
                this.lastSummaryIndex = Math.max(0, this.lastSummaryIndex - deletedBeforeSummary);
                
                console.log(`Updated lastSummaryIndex to: ${this.lastSummaryIndex}`);
            } else {
                console.log("No summarized messages available for deletion");
            }
        }

        // 2. Check if a new summary needs to be generated
        if (this.shouldGenerateSummary()) {
            // Prepare summary content
            const allContentToSummarize = [];
            
            // Add previous summary content
            if (this.currentSummary) {
                allContentToSummarize.push({
                    role: "Previous Summary",
                    content: `${this.currentSummary.content.summary}\nKey Points: ${this.currentSummary.content.keyPoints.join(", ")}`
                });
            }
            
            // Add new message content
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
                    // Update current summary, retaining initial context
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

                    // Update summary-related state
                    this.lastSummaryIndex = this.messageHistory.length;
                    this.lastSummaryTime = Date.now();
                    this.lastSummaryTokens = summaryResult.tokens;

                    // Update system instructions
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
        
        // Calculate the number of new messages since the last summary
        const newMessagesCount = this.messageHistory.length - this.lastSummaryIndex;
        
        // Calculate dynamic threshold (80% of messageLimit)
        const dynamicThreshold = Math.floor(this.messageLimit * this.summaryRatio);
        
        // If the number of new messages reaches the threshold or the total number of messages exceeds the limit, a summary needs to be generated
        return newMessagesCount >= dynamicThreshold || 
               this.messageHistory.length > this.messageLimit;
    }

    extractMessageContent(message) {
        if (!message) return null;

        // Handle different types of message content
        if (message.rawContent) {
            return message.rawContent.map(content => {
                if (content.type === "text") return content.text;
                if (content.type === "input_audio" && content.transcript) return content.transcript;
                if (content.type === "audio" && content.transcript) return content.transcript;
                return "";
            }).filter(Boolean).join(" ");
        }

        // If it is direct text content
        if (typeof message.content === "string") {
            return message.content;
        }

        return "";
    }

    addMessageToHistory(messageData) {
        // Only add valid server-side messages to history
        if (!messageData.id || messageData.status === "in_progress") {
            console.log("[Message Skipped] Invalid message:", messageData);
            return;
        }

        // Check if the message already exists
        const existingMessageIndex = this.messageHistory.findIndex(msg => msg.id === messageData.id);
        if (existingMessageIndex !== -1) {
            const existingMessage = this.messageHistory[existingMessageIndex];
            const existingText = existingMessage.text || "";
            const newText = messageData.text || "";
            
            // If the new message content is different from the existing message
            if (existingText !== newText) {
                console.log(`[Message Updated] ID: ${messageData.id}`);
                console.log("- Old text:", existingText);
                console.log("- New text:", newText);
                
                // Update the content of the existing message
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

        // Check the validity of the message content
        if (!this.validateMessageContent(messageData)) {
            console.log("[Message Invalid] Missing required content:", messageData);
            return;
        }

        // Add message to history
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
        // Validate message content
        if (!messageData.type || !messageData.content) {
            return false;
        }

        // Ensure text content exists
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

    // Update usage statistics
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

    // Update rate limit information
    updateRateLimits(rateLimits) {
        if (rateLimits) {
            console.log("Rate limits status:", rateLimits.map(limit => 
                `${limit.name}: ${limit.remaining}/${limit.limit} (resets in ${limit.reset_seconds}s)`
            ).join(", "));
        }
    }

    // Handle message deletion confirmation
    handleMessageDeleted(itemId) {
        const index = this.messageHistory.findIndex(msg => msg.id === itemId);
        if (index !== -1) {
            console.log(`Server confirmed message deletion: ${itemId}`);
            // Remove from local history
            this.messageHistory.splice(index, 1);
            console.log(`Message removed from local history. Remaining messages: ${this.messageHistory.length}`);
        }
    }

    // Get current session statistics
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
        // Always start with the original instructions to maintain initial context
        const instructions = [];
        
        // 1. Add original instructions
        if (this.originalInstructions) {
            instructions.push(this.originalInstructions);
        }
        
        // 2. Add current summary
        instructions.push(`
Current Conversation Summary:
${summaryResult.summary}

Key Discussion Points:
${summaryResult.keyPoints.map(point => `• ${point}`).join("\n")}

Current Context:
${summaryResult.context}

Please continue the conversation while maintaining consistency with the above context and key points.`);

        // Return the combined instructions
        return instructions.join("\n\n").trim();
    }
}