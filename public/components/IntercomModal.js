import { RealtimeClient } from "../utils/realtime/realtimeClient.js";
import { fetchRealtimeConfig } from "../utils/api.js";


export default class IntercomModal {
    constructor() {
        this.modal = null;
        this.wakeLock = null;
        this.noSleep = null; 
        this.messageLimit = 10;  // limit message history
        this.init();
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
              <div class="welcome-message">
                <div class="welcome-icon">👋</div>
                <h3>Hello there!</h3>
                <p>Tap the microphone button below to start our conversation! 🎙️✨</p>
              </div>
            </div>
            <div class="im-controls">
              <div class="im-button-group">
                <button id="clear-all" class="im-button im-button-warning" type="button">
                  <i class="fas fa-trash"></i>
                </button>
                <button id="record-button" class="im-record-button" type="button">
                  <i class="fas fa-microphone"></i>
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
                <textarea id="session-instructions" 
                  class="im-textarea" 
                  placeholder="Optional conversation instruction, e.g.: 'Talk like a pirate'" 
                  rows="4"></textarea>
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
                <label for="voice" class="im-label">Voice</label>
                <select id="voice" class="im-select">
                  <option value="">Default</option>
                  <option value="alloy">Alloy</option>
                  <option value="echo">Echo</option>
                  <option value="shimmer">Shimmer</option>
                </select>
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
            
            // 生成新的随机目标位置
            tgX = Math.random() * viewportWidth;
            tgY = Math.random() * viewportHeight;
            
            // 3-7秒后再次移动到新位置
            setTimeout(moveToRandomPosition, 3000 + Math.random() * 4000);
        };

        const animate = () => {
            // 平滑过渡到目标位置
            curX += (tgX - curX) / 20;
            curY += (tgY - curY) / 20;
            
            if (interBubble) {
                interBubble.style.transform = `translate(${Math.round(curX)}px, ${Math.round(curY)}px)`;
            }
            
            requestAnimationFrame(animate);
        };

        // 开始动画
        moveToRandomPosition();
        animate();
    }

    async bindEvents() {
        const closeBtn = document.getElementById("close-intercom");
        const recordBtn = document.getElementById("record-button");
        const clearBtn = document.getElementById("clear-all");

        // get realtime config
        this.config = await fetchRealtimeConfig();
        
        closeBtn.addEventListener("click", () => this.hideModal());
        
        // 新的录音按钮事件处理
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
            container.innerHTML = `
              <div class="welcome-message">
                <div class="welcome-icon">👋</div>
                <h3>Hello there!</h3>
                <p>Tap the microphone button below to start our conversation! 🎙️✨</p>
              </div>`;
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
    }

    showModal() {
        this.modal.style.display = "block";
    }

    hideModal() {
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
            // 添加录音状态类到根元素
            this.modal.classList.add("recording-active");
            document.querySelector(".im-text-container").classList.add("recording-active");
            
            // 添加初始化提示消息
            this.makeNewTextBlock("Initializing AI connection. Please wait...", "assistant");
            
            await this.acquireWakeLock();
            this.realtimeClient = new RealtimeClient();
            await this.realtimeClient.initialize(
                config.endpoint,
                config.apiKey, 
                config.deployment
            );

            // update chat title to model name
            document.getElementById("chat-title").textContent = this.realtimeClient.getModelName();

            const sessionConfig = {
                instructions: document.getElementById("session-instructions").value,
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

            // set message history limit
            this.realtimeClient.setMessageLimit(this.messageLimit);

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
        
        // 清理可能存在的语音指示器
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

    handleRealtimeMessage(message) {
        // console.log("Received message:", message);
        
        switch (message.type) {
        case "session.created":
            this.makeNewTextBlock("Session created. You can start speaking now!", "assistant");
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
            if (this.latestInputSpeechBlock && message.transcript && message.item_id) {
                const content = this.latestInputSpeechBlock.querySelector(".im-message-content");
                const transcriptText = message.transcript;
                content.textContent = transcriptText;
                    
                // 存储转录后的文本
                if (this.realtimeClient) {
                    this.realtimeClient.addMessageToHistory({
                        id: message.item_id,
                        type: "user",
                        timestamp: new Date(),
                        text: transcriptText,
                        content: [{
                            type: "input_audio",
                            transcript: transcriptText
                        }],
                        status: "completed"
                    });
                }
                    
                this.latestInputSpeechBlock = null;
            }
            this.makeNewTextBlock("", "assistant"); // create a new block for assistant response
            break;

        case "response.output_item.done":
            // 删除对消息处理的部分，因为这不是最终状态
            break;

        case "response.done":
            if (this.realtimeClient && message.response?.output) {
                // 只处理完成状态的消息
                const completedMessages = message.response.output.filter(
                    item => item.type === "message" && 
                        item.status === "completed" &&
                        item.id
                );

                for (const item of completedMessages) {
                    const textContent = this.extractTextContent(item);
                    if (textContent) {
                        this.realtimeClient.addMessageToHistory({
                            id: item.id,
                            type: item.role,
                            timestamp: new Date(),
                            text: textContent,
                            content: item.content,
                            status: item.status
                        });
                    }
                }

                // 显示当前会话统计
                const stats = this.realtimeClient.getSessionStats();
                console.log("Response completed. Session stats:", {
                    messages: `${stats.messageCount}/${stats.messageLimit || "∞"}`,
                    tokens: {
                        total: stats.totalTokens,
                        input: stats.inputTokens,
                        output: stats.outputTokens
                    }
                });

                // 获取并显示最新的摘要
                if (this.realtimeClient.currentSummary) {
                    this.displaySummary(this.realtimeClient.currentSummary);
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
            // 可以在这里验证配置是否正确应用
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
        
        return item.content
            .filter(c => c.type === "audio" && c.transcript)
            .map(c => c.transcript)
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
        // 不要检查 text.trim()，让空文本也能创建消息块
        contentDiv.innerHTML = text;
        
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

    displaySummary(summary) {
        const summaryContainer = document.getElementById("summary-container");
        const settingsSection = document.querySelector(".im-settings-section");
        
        // 清空之前的摘要
        summaryContainer.innerHTML = '';
        
        // 创建新的摘要元素
        const summaryElement = document.createElement("div");
        summaryElement.className = "im-summary-item";
        
        // 构建摘要内容
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

        // 确保新的摘要内容可见
        settingsSection.scrollTo({
            top: summaryContainer.offsetTop,
            behavior: 'smooth'
        });
    }
}