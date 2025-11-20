import { RealtimeClient } from "../utils/realtime/realtimeClient.js";
import { fetchRealtimeConfig, generateSystemPrompt } from "../utils/apiClient.js";
import { ConversationSummaryHelper } from "../utils/ConversationSummaryHelper.js";
import MarkdownRenderer from "../utils/MarkdownRenderer.js";
import { REALTIME_VOICES, DEFAULT_VOICE } from "../config/realtimeVoices.js";

const WELCOME_MESSAGE_TEMPLATE = `
    <div class="welcome-message">
        <div class="welcome-icon">👋</div>
        <h3>Let's Start Our Voice Chat!</h3>
        <p>Click the microphone button below to begin our real-time conversation! 🎙️✨</p>
        <div class="welcome-ptt-info">
            <p><strong>Push-To-Talk Mode:</strong></p>
            <p>- ON: AI response cannot be interrupted</p>
            <p>- OFF: You can speak anytime to interrupt AI</p>
        </div>
        <div class="welcome-features">
            <p><strong>💡 Quick Tips:</strong></p>
            <p>- Speak naturally and clearly</p>
            <p>- Feel free to ask anything</p>
            <p>- I'm here to help and chat with you!</p>
        </div>
    </div>
`;

export default class IntercomModal {
    constructor() {
        this.modal = null;
        this.wakeLock = null;
        this.noSleep = null; 
        this.messageLimit = 10;  
        this.pttEnabled = false; // ptt mode disabled by default
        this.audioEnabled = true; // audio output enabled by default
        this.uiManager = null; // Add UIManager reference
        this.init();
    }

    // Add method to set UIManager reference
    setUIManager(uiManager) {
        this.uiManager = uiManager;
    }

    init() {
        this.createModal();
        this.bindEvents();
    }

    createModal() {
        const modalHtml = `
      <div id="intercom-modal" class="im-modal">
        <div class="gradient-bg">
          <svg xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="goo">
                <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
                <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8" result="goo" />
                <feBlend in="SourceGraphic" in2="goo" />
              </filter>
            </defs>
          </svg>
          <div class="gradients-container">
            <div class="gradient-circle g1"></div>
            <div class="gradient-circle g2"></div>
            <div class="gradient-circle g3"></div>
            <div class="gradient-circle g4"></div>
            <div class="gradient-circle g5"></div>
            <div class="gradient-circle interactive"></div>
          </div>
        </div>
        <div class="im-modal-content">
          <div class="im-chat-section">
            <div class="im-header">
              <h2 id="chat-title">Real-Time Chat</h2>
              <div class="im-header-buttons">
                <button class="im-settings-toggle">
                  <i class="fas fa-cog"></i>
                </button>
                <button id="close-intercom" class="im-close-button">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
            <div id="received-text-container" class="im-text-container">
              ${WELCOME_MESSAGE_TEMPLATE}
            </div>
            <div class="im-controls">
              <div class="im-button-group">
                <div class="ptt-toggle">
                    <input type="checkbox" id="ptt-switch" class="checkbox">
                    <div class="knob"></div>
                    <div class="btn-bg"></div>
                </div>
                <button id="record-button" class="im-record-button" type="button">
                    <i class="fas fa-microphone"></i>
                </button>
                <button id="clear-all" class="im-button im-button-warning" type="button">
                    <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          </div>

          <div class="im-settings-section">
            <div class="im-header">
              <h2>Settings</h2>
            </div>
            
            <div class="im-container">
              <div class="im-input-group">
                <label for="session-instructions" class="im-label">System Instructions</label>
                <div class="im-textarea-group">
                  <textarea id="session-instructions" 
                    class="im-textarea" 
                    placeholder="Optional conversation instruction, e.g.: 'Talk like a pirate'" 
                    rows="4"></textarea>
                  <button id="im-generate-prompt" class="im-button im-button-secondary">
                    <i class="fas fa-magic"></i> Optimize Prompt
                  </button>
                </div>
              </div>

              <div class="im-input-group">
                <label for="temperature" class="im-label">Temperature</label>
                <input id="temperature" 
                  class="im-input" 
                  type="number" 
                  min="0.6" 
                  max="1.2" 
                  step="0.05" 
                  placeholder="0.6-1.2 (default 0.8)"/>
              </div>

              <div class="im-input-group">
                <label for="model-select" class="im-label">Model</label>
                <select id="model-select" class="im-select">
                  <option value="">Loading models...</option>
                </select>
              </div>

              <div class="im-input-group">
                <label for="voice" class="im-label">Voice</label>
                <select id="voice" class="im-select">
                  <!-- Will be populated dynamically -->
                </select>
              </div>

              <div class="im-input-group">
                <label class="im-label">Audio Output</label>
                <div class="im-audio-toggle-group">
                  <button id="audio-toggle-btn" class="im-button im-button-secondary" data-enabled="true">
                    <i class="fas fa-volume-up"></i> <span>Audio Enabled</span>
                  </button>
                </div>
              </div>

              <div class="im-input-group">
                <label for="message-limit" class="im-label">Message History Limit</label>
                <input id="message-limit" 
                  class="im-input" 
                  type="number" 
                  min="0" 
                  max="100" 
                  step="1" 
                  placeholder="0-100 (0 means unlimited, default 10)"
                  value="10"/>
              </div>

              <div class="im-input-group">
                <label for="vad-threshold" class="im-label">Voice Detection Sensitivity</label>
                <input id="vad-threshold" 
                  class="im-input" 
                  type="number" 
                  min="0" 
                  max="1" 
                  step="0.1" 
                  placeholder="0.0-1.0 (default 0.6)"
                  value="0.6"/>
                <small class="im-help-text">Higher values make it less likely to detect non-speech sounds as speech.</small>
              </div>

              <div class="im-input-group">
                <label for="prefix-padding" class="im-label">Audio Prefix Padding (ms)</label>
                <input id="prefix-padding" 
                  class="im-input" 
                  type="number" 
                  min="100" 
                  max="1000" 
                  step="100" 
                  placeholder="100-1000 (default 400)"
                  value="400"/>
                <small class="im-help-text">Amount of audio included before speech is detected.</small>
              </div>

              <div class="im-input-group">
                <label for="silence-duration" class="im-label">Silence Duration (ms)</label>
                <input id="silence-duration" 
                  class="im-input" 
                  type="number" 
                  min="500" 
                  max="5000" 
                  step="100" 
                  placeholder="500-5000 (default 2000)"
                  value="2000"/>
                <small class="im-help-text">Duration of silence to detect end of speech.</small>
              </div>
                <div class="im-summary-section">
                    <div class="im-summary-header">
                        <h3>Conversation Summary</h3>
                    </div>
                    <div id="summary-container" class="im-summary-container"></div>
                </div>
            </div>
          </div>
        </div>
      </div>`;

        document.body.insertAdjacentHTML("beforeend", modalHtml);
        this.modal = document.getElementById("intercom-modal");
        this.initGradientAnimation();
    }

    initGradientAnimation() {
        const interBubble = document.querySelector(".interactive");
        let curX = 0;
        let curY = 0;
        let tgX = 0;
        let tgY = 0;

        const moveToRandomPosition = () => {
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            // Generate new random target position
            tgX = Math.random() * viewportWidth;
            tgY = Math.random() * viewportHeight;
            
            // Move to a new position after 3-7 seconds
            setTimeout(moveToRandomPosition, 3000 + Math.random() * 4000);
        };

        const animate = () => {
            // Smooth transition to target position
            curX += (tgX - curX) / 20;
            curY += (tgY - curY) / 20;
            
            if (interBubble) {
                interBubble.style.transform = `translate(${Math.round(curX)}px, ${Math.round(curY)}px)`;
            }
            
            requestAnimationFrame(animate);
        };

        // Start animation
        moveToRandomPosition();
        animate();
    }

    async bindEvents() {
        const closeBtn = document.getElementById("close-intercom");
        const recordBtn = document.getElementById("record-button");
        const clearBtn = document.getElementById("clear-all");

        // get realtime config
        this.config = await fetchRealtimeConfig();
        
        // Initialize model selector
        this.initModelSelector();
        
        // Initialize voice selector
        this.initVoiceSelector();
        
        closeBtn.addEventListener("click", () => this.hideModal());
        
        // New record button event handler
        recordBtn.addEventListener("click", async () => {
            if (!this.recordingActive) {
                recordBtn.classList.add("recording");
                this.recordingActive = true;
                await this.startRealtime(this.config);
            } else {
                recordBtn.classList.remove("recording");
                this.recordingActive = false;
                this.stopRealtime();
            }
        });

        clearBtn.addEventListener("click", () => {
            const container = document.getElementById("received-text-container");
            container.innerHTML = WELCOME_MESSAGE_TEMPLATE;
        });

        // settings section toggle
        const settingsToggle = document.querySelector(".im-settings-toggle");
        const settingsSection = document.querySelector(".im-settings-section");
        
        settingsToggle.addEventListener("click", () => {
            settingsSection.classList.toggle("show");
        });

        // hide settings section when clicking outside
        this.modal.addEventListener("click", (e) => {
            if (settingsSection.classList.contains("show") &&
                !settingsSection.contains(e.target) &&
                !settingsToggle.contains(e.target)) {
                settingsSection.classList.remove("show");
            }
        });

        // add event listener for message history limit input
        const messageLimitInput = document.getElementById("message-limit");
        messageLimitInput.addEventListener("change", (e) => {
            const value = parseInt(e.target.value);
            if (value >= 0 && value <= 100) {
                this.messageLimit = value;
                if (this.realtimeClient) {
                    this.realtimeClient.setMessageLimit(value);
                }
            } else {
                e.target.value = this.messageLimit;
            }
        });

        // Add event listener for generate prompt button
        const generatePromptBtn = document.getElementById("im-generate-prompt");
        const instructionsTextarea = document.getElementById("session-instructions");

        generatePromptBtn.addEventListener("click", async () => {
            const context = instructionsTextarea.value.trim();
            if (!context) {
                swal("Input Required", "Please describe the conversation style or scenario in the input box.", "warning");
                return;
            }

            try {
                generatePromptBtn.disabled = true;
                generatePromptBtn.innerHTML = "<i class=\"fas fa-spinner fa-spin\"></i> Generating...";
            
                const { prompt } = await generateSystemPrompt(context);
                instructionsTextarea.value = prompt;

            } catch (error) {
                console.error("Failed to generate prompt:", error);
                swal("Generation Failed", error.message || "Error occurred while generating system prompt", "error");
            } finally {
                generatePromptBtn.disabled = false;
                generatePromptBtn.innerHTML = "<i class=\"fas fa-magic\"></i> Generate Prompt";
            }
        });

        // PTT switch event
        const pttSwitch = document.getElementById("ptt-switch");
        
        // Sync initial state
        pttSwitch.checked = this.pttEnabled;
        
        pttSwitch.addEventListener("change", (e) => {
            this.pttEnabled = e.target.checked;
            if (this.realtimeClient) {
                this.realtimeClient.pttMode = this.pttEnabled;
            }
        });

        // Audio toggle button event
        const audioToggleBtn = document.getElementById("audio-toggle-btn");
        
        // Sync initial state
        audioToggleBtn.dataset.enabled = this.audioEnabled;
        audioToggleBtn.innerHTML = this.audioEnabled 
            ? "<i class=\"fas fa-volume-up\"></i> <span>Speaker On</span>"
            : "<i class=\"fas fa-volume-mute\"></i> <span>Speaker Off</span>";
        audioToggleBtn.classList.toggle("muted", !this.audioEnabled);
        
        audioToggleBtn.addEventListener("click", () => {
            const isEnabled = audioToggleBtn.dataset.enabled === "true";
            const newState = !isEnabled;
            
            // Update local state immediately
            this.audioEnabled = newState;
            audioToggleBtn.dataset.enabled = newState;
            audioToggleBtn.innerHTML = newState 
                ? "<i class=\"fas fa-volume-up\"></i> <span>Speaker On</span>"
                : "<i class=\"fas fa-volume-mute\"></i> <span>Speaker Off</span>";
            audioToggleBtn.classList.toggle("muted", !newState);
            
            // If realtime is already running, update mute state
            if (this.realtimeClient) {
                this.realtimeClient.toggleAudioOutput(newState);
            }
        });
    }

    async showModal() {
        this.modal.style.display = "block";
        console.log("Showing Intercom modal");
        
        if (this.uiManager) {
            const currentProfile = this.uiManager.storageManager.getCurrentProfile();
            const instructionsTextarea = document.getElementById("session-instructions");
            const summaryContainer = document.getElementById("summary-container");
            
            // Set current profile's prompt as system instructions
            instructionsTextarea.value = currentProfile.prompt;
            
            const messages = this.uiManager.storageManager.getMessages(this.uiManager.currentChatId);
            // console.log("Current chat messages:", messages);
            
            if (messages.length > 0) {
                try {
                    // Generate initial summary
                    const initialSummary = await ConversationSummaryHelper.generateSummary(messages);
                    
                    if (initialSummary) {
                        // Display summary in UI
                        this.displaySummary(initialSummary);
                        this.currentSummary = initialSummary; // Store for later use
                    }
                } catch (error) {
                    console.error("Failed to process summary:", error);
                    summaryContainer.innerHTML = `<div class="error">Failed to generate conversation summary: ${error.message}</div>`;
                }
            } else {
                summaryContainer.innerHTML = "";
            }
        }
    }

    hideModal() {
        // Stop realtime chat if it's active
        if (this.recordingActive) {
            const recordBtn = document.getElementById("record-button");
            recordBtn.classList.remove("recording");
            this.stopRealtime();
        }
        
        this.releaseWakeLock();
        this.modal.style.display = "none";
    }

    async acquireWakeLock() {
        try {
            // initialize NoSleep
            if (!this.noSleep) {
                this.noSleep = new NoSleep();
                // enable NoSleep
                await this.noSleep.enable();
                console.log("NoSleep initialized and enabled");
            }

            if ("wakeLock" in navigator) {
                this.wakeLock = await navigator.wakeLock.request("screen");
                console.log("Wake Lock is active");
            }

            // add visibility change event listener
            document.addEventListener("visibilitychange", this.handleVisibilityChange.bind(this));
            
        } catch (err) {
            console.error(`Failed to keep screen awake: ${err.message}`);
        }
    }

    // handle visibility change event
    async handleVisibilityChange() {
        if (document.visibilityState === "visible" && this.recordingActive) {
            // if the page is visible and recording is active, re-acquire wake lock
            await this.acquireWakeLock();
        }
    }

    releaseWakeLock() {
        if (this.wakeLock) {
            this.wakeLock.release()
                .then(() => {
                    this.wakeLock = null;
                    console.log("Wake Lock released");
                });
        }
        if (this.noSleep) {
            this.noSleep.disable();
            console.log("NoSleep disabled");
        }
        // remove visibility change event listener
        document.removeEventListener("visibilitychange", this.handleVisibilityChange.bind(this));
    }

    async startRealtime(config) {
        try {
            this.recordingActive = true;
            this.modal.classList.add("recording-active");
            document.querySelector(".im-text-container").classList.add("recording-active");
            
            // Add initialization prompt message
            this.makeNewTextBlock("Initializing AI connection. Please wait...", "assistant");
            
            await this.acquireWakeLock();

            // Get current prompt from textarea
            const currentPrompt = document.getElementById("session-instructions").value;

            // Get selected model configuration
            const selectedModel = this.currentModel || config.defaultModel;
            const modelConfig = config.models[selectedModel];
            
            if (!modelConfig) {
                throw new Error(`Model configuration not found for: ${selectedModel}`);
            }

            // Initialize RealtimeClient with selected model
            this.realtimeClient = new RealtimeClient();
            await this.realtimeClient.initialize(
                modelConfig.endpoint,
                modelConfig.apiKey, 
                selectedModel,  // Use model key as deployment name
                true,
                this.currentSummary,  // Pass in previously saved summary
                currentPrompt        // Pass in current prompt
            );
            
            // Set additional configs
            this.realtimeClient.pttMode = this.pttEnabled;
            this.realtimeClient.setMessageLimit(this.messageLimit);
            
            // Set initial audio mute state before starting
            this.realtimeClient.audioMuted = !this.audioEnabled;
            this.realtimeClient.audioEnabled = this.audioEnabled;
            
            // Update chat title
            document.getElementById("chat-title").textContent = this.realtimeClient.getModelName();

            // Prepare session config (only additional settings)
            const sessionConfig = {
                temperature: parseFloat(document.getElementById("temperature").value) || 0.8,
                voice: document.getElementById("voice").value || "alloy",
                turn_detection: {
                    type: "server_vad",
                    threshold: parseFloat(document.getElementById("vad-threshold").value) || 0.6,
                    prefix_padding_ms: parseInt(document.getElementById("prefix-padding").value) || 400,
                    silence_duration_ms: parseInt(document.getElementById("silence-duration").value) || 2000
                }
            };

            console.log("Starting Realtime chat with config:", sessionConfig);
            console.log("Initial audio mute state:", !this.audioEnabled);

            await this.realtimeClient.start(sessionConfig);

            for await (const message of this.realtimeClient.getMessages()) {
                this.handleRealtimeMessage(message);
            }
        } catch (error) {
            this.recordingActive = false;
            this.modal.classList.remove("recording-active");
            document.querySelector(".im-text-container").classList.remove("recording-active");
            this.releaseWakeLock();
            console.error("Realtime chat error:", error);
            this.makeNewTextBlock(`<< Connection error: ${error.message} >>`);
        }
    }

    stopRealtime() {
        this.recordingActive = false;
        this.modal.classList.remove("recording-active");
        document.querySelector(".im-text-container").classList.remove("recording-active");
        
        // Clear any existing speech indicators
        if (this.latestInputSpeechBlock) {
            const content = this.latestInputSpeechBlock.querySelector(".im-message-content");
            if (content && content.querySelector(".speech-indicator")) {
                this.latestInputSpeechBlock.remove();
            }
            this.latestInputSpeechBlock = null;
        }
        
        this.releaseWakeLock();
        if (this.realtimeClient) {
            this.realtimeClient.stop();
        }
    }

    createSpeechIndicator() {
        return `<span class="speech-indicator">
            <span class="speech-dot"></span>
            <span class="speech-dot"></span>
            <span class="speech-dot"></span>
        </span>`;
    }

    // Add helper method for message synchronization with UI Manager
    syncMessageToUIManager(messageData) {
        if (!this.uiManager) return;

        const newMessage = {
            role: messageData.type || messageData.role,
            content: messageData.text || messageData.content,
            messageId: messageData.id,
            isActive: true,
            timestamp: new Date().toISOString()
        };

        // Add message to UI
        this.uiManager.messageManager.addMessage(
            newMessage.role,
            newMessage.content,
            newMessage.messageId,
            newMessage.isActive
        );

        // Save to storage
        this.uiManager.storageManager.saveMessage(
            this.uiManager.currentChatId,
            newMessage
        );

        // Sync to server
        this.uiManager.syncManager.syncMessageCreate(
            this.uiManager.currentChatId,
            newMessage
        );

        // Update chat history
        this.uiManager.chatHistoryManager.updateChatHistory(
            this.uiManager.currentChatId
        );
    }

    handleRealtimeMessage(message) {
        
        switch (message.type) {
        case "session.created":
            this.makeNewTextBlock("Session created. You can start speaking now!", "assistant");
            console.log("Session created with config:", message.session);
            break;

        case "conversation.item.created":
            if (this.realtimeClient) {
                this.realtimeClient.addMessageToHistory(message.item, message.item.role);

                // display current session stats
                const stats = this.realtimeClient.getSessionStats();
                console.log("Current session stats:", {
                    messages: `${stats.messageCount}/${stats.messageLimit || "∞"}`,
                    tokens: {
                        total: stats.totalTokens,
                        input: stats.inputTokens,
                        output: stats.outputTokens
                    }
                });
            }
            break;

        case "response.audio_transcript.delta":
            this.appendToTextBlock(message.delta);
            break;

        case "response.audio.delta":
            if (this.realtimeClient) {
                this.realtimeClient.handleAudioPlayback(message.delta);
            }
            break;

        case "input_audio_buffer.speech_started": {
            // stop any existing audio playback
            if (this.realtimeClient && this.realtimeClient.audioPlayer) {
                this.realtimeClient.audioPlayer.stop();
            }
                    
            const messageDiv = this.makeNewTextBlock(this.createSpeechIndicator(), "user");
            this.latestInputSpeechBlock = messageDiv;
            break;
        }

        case "conversation.item.input_audio_transcription.completed":
            console.log("handleRealtimeMessage input_audio_transcription.completed:", message);
            if (this.latestInputSpeechBlock && message.transcript && message.item_id) {
                const content = this.latestInputSpeechBlock.querySelector(".im-message-content");
                const transcriptText = message.transcript;
                content.textContent = transcriptText;
                    
                // Store transcribed text and sync with UI Manager
                if (this.realtimeClient) {
                    const messageData = {
                        id: message.item_id,
                        role: "user",
                        timestamp: new Date(),
                        text: transcriptText,
                        content: [{
                            type: "input_audio",
                            transcript: transcriptText
                        }],
                        status: "completed"
                    };

                    // Add to realtime history
                    this.realtimeClient.addMessageToHistory(messageData);
                    
                    // Sync to UI Manager
                    this.syncMessageToUIManager(messageData);
                }
                this.latestInputSpeechBlock = null;
            }
            this.makeNewTextBlock("", "assistant"); // Create new block for assistant response
            break;

        case "response.output_item.done":
            // Remove message handling part as this is not the final state
            break;

        case "response.done":
            console.log("handleRealtimeMessage response.done:", message);
            if (this.realtimeClient && message.response) {
                // Handle usage statistics
                if (message.response.usage) {
                    this.realtimeClient.updateUsageStats(message.response.usage);
                }

                // Handle output messages
                if (message.response.output) {
                    // Only handle completed state messages
                    const completedMessages = message.response.output.filter(
                        item => item.type === "message" && 
                            item.status === "completed" &&
                            item.id
                    );

                    for (const item of completedMessages) {
                        const textContent = this.extractTextContent(item);
                        if (textContent) {
                            const messageData = {
                                id: item.id,
                                role: item.role,
                                timestamp: new Date(),
                                text: textContent,
                                content: item.content,
                                status: item.status
                            };

                            // Add to realtime history
                            this.realtimeClient.addMessageToHistory(messageData);

                            // Sync to UI Manager
                            this.syncMessageToUIManager(messageData);
                        }
                    }

                    // Display current session stats
                    const stats = this.realtimeClient.getSessionStats();
                    console.log("Response completed. Session stats:", {
                        messages: `${stats.messageCount}/${stats.messageLimit || "∞"}`,
                        tokens: {
                            total: stats.totalTokens,
                            input: stats.inputTokens,
                            output: stats.outputTokens
                        }
                    });

                    // Get and display the latest summary
                    if (this.realtimeClient.currentSummary) {
                        this.displaySummary(this.realtimeClient.currentSummary);
                    }
                }
            }
            break;

        case "rate_limits.updated":
            if (this.realtimeClient) {
                this.realtimeClient.updateRateLimits(message.rate_limits);
                console.log("Rate limits updated:", message.rate_limits);
            }
            break;

        case "conversation.item.deleted":
            if (this.realtimeClient) {
                this.realtimeClient.handleMessageDeleted(message.item_id);
            }
            break;

        case "session.updated":
            console.log("Session updated with config:", message.session);
            if (message.session.turn_detection) {
                console.log("Turn detection settings:", message.session.turn_detection);
            }
            break;

        case "error":
            console.error("Realtime error:", message.error);
            this.makeNewTextBlock(`<< Error: ${message.error.message} >>`);
            break;
            
        default:
            console.log("Unhandled message:", JSON.stringify(message, null, 2));
        }
    }

    extractTextContent(item) {
        if (!item.content) return null;
        
        // Extract text from both audio (with transcript) and text content types
        return item.content
            .filter(c => {
                // Support audio with transcript OR text content
                return (c.type === "audio" && c.transcript) || (c.type === "text" && c.text);
            })
            .map(c => {
                // Get transcript from audio or text from text content
                return c.transcript || c.text || "";
            })
            .join(" ")
            .trim();
    }

    makeNewTextBlock(text = "", type = "assistant") {
        const container = document.getElementById("received-text-container");
        // Clear welcome message if it exists
        const welcomeMessage = container.querySelector(".welcome-message");
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        const messageDiv = document.createElement("div");
        messageDiv.className = `im-message im-message-${type}`;
        
        const contentDiv = document.createElement("div");
        contentDiv.className = "im-message-content";
        
        // Use MarkdownRenderer for assistant messages, plain text for user messages
        if (type === "assistant" && text) {
            try {
                contentDiv.innerHTML = MarkdownRenderer.render(text);
            } catch (error) {
                console.error("Error rendering markdown in IntercomModal:", error);
                contentDiv.innerHTML = text;
            }
        } else {
            contentDiv.innerHTML = text;
        }
        
        const metaDiv = document.createElement("div");
        metaDiv.className = "im-message-meta";
        metaDiv.textContent = new Date().toLocaleTimeString();
        
        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(metaDiv);
        container.appendChild(messageDiv);
        
        container.scrollTop = container.scrollHeight;
        return messageDiv;
    }

    appendToTextBlock(text) {
        const container = document.getElementById("received-text-container");
        const lastMessage = container.lastElementChild;
        if (lastMessage && lastMessage.classList.contains("im-message-assistant")) {
            const contentDiv = lastMessage.querySelector(".im-message-content");
            if (contentDiv) {
                contentDiv.textContent += text;
                container.scrollTop = container.scrollHeight;
            }
        } else {
            this.makeNewTextBlock(text, "assistant");
        }
    }

    initModelSelector() {
        const modelSelect = document.getElementById("model-select");
        
        if (!this.config || !this.config.models) {
            modelSelect.innerHTML = "<option value=\"\">No models available</option>";
            return;
        }

        // Populate model options
        modelSelect.innerHTML = "";
        Object.keys(this.config.models).forEach(modelKey => {
            const model = this.config.models[modelKey];
            const option = document.createElement("option");
            option.value = modelKey;
            option.textContent = `${model.name} - ${model.description}`;
            if (modelKey === this.config.defaultModel) {
                option.selected = true;
            }
            modelSelect.appendChild(option);
        });

        // Store current model
        this.currentModel = this.config.defaultModel;

        // Handle model change
        modelSelect.addEventListener("change", async (e) => {
            const newModel = e.target.value;
            if (newModel === this.currentModel) return;

            // If recording is active, need to restart connection
            if (this.recordingActive) {
                const result = await swal({
                    title: "Switch Model",
                    text: "Switching models requires restarting the conversation. Continue?",
                    icon: "warning",
                    buttons: ["Cancel", "Continue"],
                    dangerMode: true,
                });

                if (!result) {
                    modelSelect.value = this.currentModel;
                    return;
                }

                // Stop current connection
                this.stopRealtime();
                const recordBtn = document.getElementById("record-button");
                recordBtn.classList.remove("recording");
                this.recordingActive = false;

                // Update current model
                this.currentModel = newModel;

                // Restart connection with new model
                await this.startRealtime(this.config);
                recordBtn.classList.add("recording");
                this.recordingActive = true;
            } else {
                this.currentModel = newModel;
            }
        });
    }

    initVoiceSelector() {
        const voiceSelect = document.getElementById("voice");
        
        // Populate voice options
        voiceSelect.innerHTML = "";
        REALTIME_VOICES.forEach(voice => {
            const option = document.createElement("option");
            option.value = voice.value;
            option.textContent = voice.label;
            if (voice.isNew) {
                option.textContent += " 🆕";
            }
            if (voice.value === DEFAULT_VOICE) {
                option.selected = true;
            }
            voiceSelect.appendChild(option);
        });

        // Handle voice change
        voiceSelect.addEventListener("change", async (e) => {
            const newVoice = e.target.value;
            
            if (this.realtimeClient) {
                try {
                    await this.realtimeClient.updateVoice(newVoice);
                    console.log(`Voice updated to: ${newVoice}`);
                } catch (error) {
                    console.error("Failed to update voice:", error);
                    swal("Error", "Failed to update voice. Please try again.", "error");
                }
            }
        });
    }

    displaySummary(summary) {
        const summaryContainer = document.getElementById("summary-container");
        const settingsSection = document.querySelector(".im-settings-section");
        
        // Clear previous summary
        summaryContainer.innerHTML = "";
        
        // Create new summary element
        const summaryElement = document.createElement("div");
        summaryElement.className = "im-summary-item";
        
        // Build summary content
        const content = `
            <div class="im-summary-content">
                <h4>Current Summary:</h4>
                <p>${summary.content.summary}</p>
                
                <h4>Key Points:</h4>
                <ul>
                    ${summary.content.keyPoints.map(point => `<li>${point}</li>`).join("")}
                </ul>
                
                <h4>Context:</h4>
                <p>${summary.content.context}</p>
            </div>
            <div class="im-summary-timestamp">Last updated: ${new Date(summary.timestamp).toLocaleTimeString()}</div>
        `;
        
        summaryElement.innerHTML = content;
        summaryContainer.appendChild(summaryElement);

        // Ensure new summary content is visible
        settingsSection.scrollTo({
            top: summaryContainer.offsetTop,
            behavior: "smooth"
        });
    }
}