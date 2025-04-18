import { Player } from "./player.js";
import { Recorder } from "./recorder.js";
import { LowLevelRTClient } from "rt-client";
import { searchBing, getUrlSummary } from "../apiClient.js";
import { ConversationSummaryHelper } from "../ConversationSummaryHelper.js";

export class RealtimeClient {
    constructor() {
        this.client = null;
        this.audioRecorder = null;
        this.audioPlayer = null;
        this.recordingActive = false;
        this.buffer = new Uint8Array();
        this.messageLimit = 10; // Default message history limit
        this.messageHistory = []; // Message history array
        this.totalTokens = 0; // Total token count
        this.inputTokens = 0; // Input token count
        this.outputTokens = 0; // Output token count
        this.currentSummary = null; // Current conversation summary
        this.lastSummaryTime = null; // Timestamp of last summary
        this.lastSummaryTokens = 0; // Token count of last summary
        this.originalInstructions = null; // Initial instruction set
        this.lastSummaryIndex = 0; // Index of last summary in history
        this.summaryRatio = 0.8; // Summary trigger ratio (80%)
        this.initialContext = null; // Initial context storage
        this.pttMode = false; // Push-to-talk mode flag
        this.aiSpeaking = false; // AI speaking status flag
        this.audioBufferQueue = []; // Audio buffer queue
        this.originalPrompt = null; // Original prompt storage
        this.tools = [
            {
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
                description: `Search the internet using Bing Search API with advanced options.
        
Examples:
1. Basic search: {"query": "latest AI news"}
2. With market: {"query": "local restaurants", "mkt": "zh-CN"}
3. With filters: {"query": "OpenAI", "responseFilter": ['WebPages','News','Entities']}
4. With time range: {"query": "AI news", "freshness": "Week"}

Note: The search will automatically include the current time context for more relevant results.`,
                parameters: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "The search query to send to Bing"
                        },
                        mkt: {
                            type: "string",
                            description: "Optional. The market where the results come from (e.g., 'en-US', 'zh-CN', 'ja-JP')"
                        },
                        responseFilter: {
                            type: "array",
                            description: "Optional. Additional content types to include in results. Default: ['WebPages','News','Entities']",
                            items: {
                                type: "string",
                                enum: ["Computation", "Entities", "Images", "News", "Places", "RelatedSearches", "SpellSuggestions", "TimeZone", "Translations", "Videos", "Webpages"]
                            }
                        },
                        freshness: {
                            type: "string",
                            description: "Optional. Filter results by age. Default: 'Day'",
                            enum: ["Day", "Week", "Month"]
                        }
                    },
                    required: ["query"]
                }
            },
            {
                type: "function",
                name: "analyze_webpage",
                description: `Analyze and summarize webpage content with advanced options.

Examples:
1. Basic summary: {"url": "https://example.com/article"}
2. With specific question: {"url": "https://example.com/tech", "question": "What are the key technical features mentioned?"}
3. With language preference: {"url": "https://example.com/news", "language": "zh-CN"}
4. Complex analysis: {"url": "https://example.com/research", "question": "What are the main findings and methodology?", "language": "en"}

The function will:
1. Extract main content from the webpage
2. Remove ads and irrelevant elements
3. Generate comprehensive or focused analysis based on input
4. Support multilingual output
5. Handle different types of content (articles, news, research, etc.)

Note: Use specific questions to get more focused analysis of the webpage content.`,
                parameters: {
                    type: "object",
                    properties: {
                        url: {
                            type: "string",
                            description: "The URL of the webpage to analyze"
                        },
                        question: {
                            type: "string",
                            description: "Optional. Specific question or analysis focus (e.g., 'What are the main arguments?', 'Summarize the methodology')"
                        },
                        language: {
                            type: "string",
                            description: "Optional. The language for the analysis response (e.g., 'en', 'zh-CN', 'ja'). Default is 'en'"
                        }
                    },
                    required: ["url"]
                }
            }
        ];
    }

    // add audio buffer processing function
    combineArray(newData) {
        const newBuffer = new Uint8Array(this.buffer.length + newData.length);
        newBuffer.set(this.buffer);
        newBuffer.set(newData, this.buffer.length);
        this.buffer = newBuffer;
    }

    async initialize(endpoint, apiKey, deploymentOrModel, isAzure = true, initialSummary = null, originalPrompt = null) {
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
        this.currentSummary = initialSummary;
        this.originalPrompt = originalPrompt;
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
        
        if (this.buffer.length >= 4800) {
            const toSend = new Uint8Array(this.buffer.slice(0, 4800));
            this.buffer = new Uint8Array(this.buffer.slice(4800));
            const regularArray = String.fromCharCode(...toSend);
            const base64 = btoa(regularArray);
            
            // Optimize audio sending logic in PTT mode
            if (this.recordingActive && this.client) {
                if (!this.pttMode || !this.aiSpeaking || !this.audioPlayer.getPlaybackState()) {
                    this.client.send({
                        type: "input_audio_buffer.append",
                        audio: base64,
                    });
                } else {
                    // Drop audio input while AI is speaking in PTT mode
                    // console.log("Dropping audio input while AI is speaking (PTT mode)");
                }
            }
        }
    }

    async start(config) {
        try {
            // Use the originalPrompt passed in instead of config instructions
            const prompt = this.originalPrompt || config.instructions;
            
            // Create base configuration
            const baseConfig = {
                modalities: ["text", "audio"],
                input_audio_format: "pcm16",
                output_audio_format: "pcm16",
                input_audio_transcription: {
                    model: "whisper-1"
                },
                tool_choice: "auto",
                tools: this.tools // Use instance tools configuration
            };
            console.log("Base config:", baseConfig);
            console.log("config:", config);
                
            // Create session config by merging base config with passed config
            const sessionConfig = {
                ...baseConfig,
                ...config,
                instructions: ConversationSummaryHelper.buildSessionInstructions(
                    prompt,
                    this.currentSummary
                )
            };
            console.log("Session config:", sessionConfig);

            await this.client.send({
                type: "session.update",
                session: sessionConfig
            });

            // No longer using config.instructions
            this.initialContext = prompt;

            // Add function call response handling
            this.functionHandlers = {
                get_current_time: this.handleGetCurrentTime.bind(this),
                search_bing: this.handleBingSearch.bind(this),
                analyze_webpage: this.handleWebpageAnalysis.bind(this)
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
                timeZone: timezone || browserTimezone // Use browser timezone if none specified
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
            const { query, mkt, responseFilter, freshness } = args;
            const searchResults = await searchBing(query, { mkt, responseFilter, freshness });
            console.log("Bing search results:", searchResults);
            
            return JSON.stringify({
                query: searchResults.query,
                market: searchResults.market,
                filters: searchResults.filters,
                freshness: searchResults.freshness,
                results: searchResults.results
            });
        } catch (error) {
            console.error("Bing search error:", error);
            return JSON.stringify({ 
                error: "Failed to perform search",
                details: error.message 
            });
        }
    }

    // Web page analysis function 
    async handleWebpageAnalysis(args) {
        console.log("Analyzing webpage with args:", args);
        const { url, question, language = this.clientLanguage || "en" } = args;
        try {
            const response = await getUrlSummary(url, language, question);
            return response.summary; // Return summary content from API
        } catch (error) {
            console.error("Error in handleWebpageAnalysis:", error);
            return `Error analyzing webpage: ${error.message}`;
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
            let toolCallsInProgress = [];
            let maxConsecutiveToolCalls = 5;
            let currentToolCallCount = 0;

            for await (const message of this.client.messages()) {
                // Update AI speaking status
                if (message.type === "response.audio.delta") {
                    this.aiSpeaking = true;
                } else if (message.type === "response.audio.done") {
                    console.log("Response audio generation completed");
                }

                // Handle function call with iteration limit
                if (message.type === "response.function_call_arguments.done") {
                    currentToolCallCount++;
                    
                    // Check for maximum consecutive tool calls
                    if (currentToolCallCount > maxConsecutiveToolCalls) {
                        console.warn(`Exceeded maximum tool calls (${maxConsecutiveToolCalls}), stopping tool call chain`);
                        yield {
                            type: "text",
                            content: "Sorry, tool call limit exceeded. Please rephrase your question."
                        };
                        break;
                    }

                    const handler = this.functionHandlers[message.name];
                    if (handler) {
                        try {
                            const args = JSON.parse(message.arguments);
                            console.log(`Executing tool call ${currentToolCallCount}:`, message.name, args);
                            
                            const result = await handler(args);
                            // Add to tool calls in progress
                            toolCallsInProgress.push({
                                call_id: message.call_id,
                                result: result
                            });

                            // Send all accumulated tool call results
                            for (const toolCall of toolCallsInProgress) {
                                await this.client.send({
                                    type: "conversation.item.create",
                                    item: {
                                        type: "function_call_output",
                                        call_id: toolCall.call_id,
                                        output: toolCall.result
                                    }
                                });
                            }
                            
                            // Clear processed tool calls
                            toolCallsInProgress = [];
                            
                            // Request next response
                            await this.client.send({
                                type: "response.create"
                            });
                        } catch (error) {
                            console.error(`Tool call ${currentToolCallCount} failed:`, error);
                            yield {
                                type: "error",
                                content: `Tool ${message.name} execution failed: ${error.message}`
                            };
                        }
                    }
                } else if (message.type === "response.message.start") {
                    // Reset tool call counter when new message starts
                    currentToolCallCount = 0;
                    toolCallsInProgress = [];
                }

                // Handle audio message
                if (message.type === "audio") {
                    this.audioPlayer.play(message.audio.buffer);
                }

                // Yield the message for external processing
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
        
        // Add listener to track playback status
        this.audioPlayer.playbackNode.port.onmessage = (event) => {
            if (event.data.type === "playback_ended") {
                console.log("Audio playback completed");
                this.aiSpeaking = false;
            }
        };
        
        this.audioPlayer.play(pcmData);
    }

    setMessageLimit(limit) {
        this.messageLimit = limit;
        console.log(`Message history limit set to: ${limit} (0 means unlimited)`);
        this.pruneMessageHistory();
    }

    async updateSummary() {
        if (!ConversationSummaryHelper.shouldGenerateNewSummary(
            this.currentSummary,
            this.messageHistory,
            this.summaryRatio,
            this.messageLimit
        )) {
            return;
        }

        const newSummary = await ConversationSummaryHelper.generateSummary(
            this.messageHistory,
            this.currentSummary
        );

        if (newSummary) {
            this.currentSummary = newSummary;
            
            if (!this.isGeneratingResponse) {
                await this.client.send({
                    type: "session.update",
                    session: {
                        instructions: ConversationSummaryHelper.buildSessionInstructions(
                            this.originalPrompt,
                            this.currentSummary
                        )
                    }
                });
            }
        }
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

        // 2. Check and generate new summary if needed
        if (this.shouldGenerateSummary()) {
            // Use Helper to generate new summary
            const newSummary = await ConversationSummaryHelper.generateSummary(
                this.messageHistory,
                this.currentSummary
            );

            if (newSummary) {
                this.currentSummary = newSummary;
                this.lastSummaryIndex = this.messageHistory.length;
                this.lastSummaryTime = Date.now();
                this.lastSummaryTokens = newSummary.tokens;

                // Update session instructions if not currently generating response
                if (!this.isGeneratingResponse) {
                    await this.client.send({
                        type: "session.update",
                        session: {
                            instructions: ConversationSummaryHelper.buildSessionInstructions(
                                this.originalPrompt,
                                this.currentSummary
                            )
                        }
                    });
                }
            }
        }
    }

    shouldGenerateSummary() {
        // Use Helper's method instead
        return ConversationSummaryHelper.shouldGenerateNewSummary(
            this.currentSummary,
            this.messageHistory,
            this.summaryRatio,
            this.messageLimit
        );
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
        console.log("addMessageToHistory Message data:", messageData);

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
            role: messageData.role,
            messageCount: `${this.messageHistory.length}/${this.messageLimit || "∞"}`,
            text: messageData.text?.substring(0, 50) + (messageData.text?.length > 50 ? "..." : "")
        });

        // console.log("Current message history:", this.messageHistory);
        
        this.pruneMessageHistory();
    }

    validateMessageContent(messageData) {
        // Validate message content
        if (!messageData.role || !messageData.content) {
            console.log("Message missing type or content:", messageData);
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
        } else {
            console.log("Invalid message content format:", messageData);
        }

        return false;
    }

    // Update usage statistics
    updateUsageStats(usage) {
        if (!usage) return;
        
        // Update cumulative token usage
        this.totalTokens += usage.total_tokens || 0;
        this.inputTokens += usage.input_tokens || 0;
        this.outputTokens += usage.output_tokens || 0;

        // Log detailed token information if available
        if (usage.input_token_details) {
            console.log("Input token details:", {
                cached: usage.input_token_details.cached_tokens,
                text: usage.input_token_details.text_tokens,
                audio: usage.input_token_details.audio_tokens
            });
        }

        if (usage.output_token_details) {
            console.log("Output token details:", {
                text: usage.output_token_details.text_tokens,
                audio: usage.output_token_details.audio_tokens
            });
        }

        console.log("Updated token usage:", {
            total: this.totalTokens,
            input: this.inputTokens,
            output: this.outputTokens
        });
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
}