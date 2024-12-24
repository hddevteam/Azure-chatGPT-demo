import { RealtimeClient } from "../utils/realtime/realtimeClient.js";
import { fetchRealtimeConfig } from "../utils/api.js";


export default class IntercomModal {
    constructor() {
        this.modal = null;
        this.wakeLock = null;
        this.noSleep = null; 
        this.init();
    }

    init() {
        this.createModal();
        this.bindEvents();
    }

    createModal() {
        const modalHtml = `
      <div id="intercom-modal" class="im-modal">
        <div class="im-modal-content">
          <div class="im-chat-section">
            <div class="im-header">
              <h2 id="chat-title">Real-Time Chat</h2>
              <button class="im-settings-toggle">
                <i class="fas fa-cog"></i>
              </button>
            </div>
            <div id="received-text-container" class="im-text-container"></div>
            <div class="im-controls">
              <div class="im-button-group">
                <button id="start-recording" class="im-button im-button-primary" type="button">
                  <i class="fas fa-microphone"></i>
                  Start
                </button>
                <button id="stop-recording" class="im-button im-button-secondary" type="button" disabled>
                  <i class="fas fa-stop"></i>
                  Stop
                </button>
                <button id="clear-all" class="im-button im-button-warning" type="button">
                  <i class="fas fa-trash"></i>
                  Clear All
                </button>
              </div>
            </div>
          </div>

          <div class="im-settings-section">
            <div class="im-header">
              <h2>Settings</h2>
              <button id="close-intercom" class="im-close-button">
                <i class="fas fa-times"></i>
              </button>
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
            </div>
          </div>
        </div>
      </div>`;

        document.body.insertAdjacentHTML("beforeend", modalHtml);
        this.modal = document.getElementById("intercom-modal");
    }

    async bindEvents() {
        const closeBtn = document.getElementById("close-intercom");
        const startBtn = document.getElementById("start-recording");
        const stopBtn = document.getElementById("stop-recording");
        const clearBtn = document.getElementById("clear-all");

        // 从后端获取API配置
        this.config = await fetchRealtimeConfig();
        
        closeBtn.addEventListener("click", () => this.hideModal());
        startBtn.addEventListener("click", async () => {
            startBtn.disabled = true;
            stopBtn.disabled = false;
            await this.startRealtime(this.config);
        });
        stopBtn.addEventListener("click", () => {
            startBtn.disabled = false; 
            stopBtn.disabled = true;
            this.stopRealtime();
        });
        clearBtn.addEventListener("click", () => {
            document.getElementById("received-text-container").innerHTML = "";
        });

        // 添加设置切换按钮事件
        const settingsToggle = document.querySelector(".im-settings-toggle");
        const settingsSection = document.querySelector(".im-settings-section");
        
        settingsToggle.addEventListener("click", () => {
            settingsSection.classList.toggle("show");
        });

        // 点击设置面板外部时关闭设置
        this.modal.addEventListener("click", (e) => {
            if (settingsSection.classList.contains("show") &&
                !settingsSection.contains(e.target) &&
                !settingsToggle.contains(e.target)) {
                settingsSection.classList.remove("show");
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
            // 确保 NoSleep 实例只创建一次
            if (!this.noSleep) {
                this.noSleep = new NoSleep();
                // 用户交互时启用 NoSleep
                await this.noSleep.enable();
                console.log("NoSleep initialized and enabled");
            }

            if ("wakeLock" in navigator) {
                this.wakeLock = await navigator.wakeLock.request("screen");
                console.log("Wake Lock is active");
            }

            // 添加可见性变化监听
            document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
            
        } catch (err) {
            console.error(`Failed to keep screen awake: ${err.message}`);
        }
    }

    // 添加页面可见性变化处理
    async handleVisibilityChange() {
        if (document.visibilityState === 'visible' && this.recordingActive) {
            // 如果页面重新变为可见且正在录音，重新获取 wake lock
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
        // 移除可见性变化监听
        document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }

    async startRealtime(config) {
        try {
            this.recordingActive = true; // 添加录音状态标记
            await this.acquireWakeLock();
            this.realtimeClient = new RealtimeClient();
            await this.realtimeClient.initialize(
                config.endpoint,
                config.apiKey, 
                config.deployment
            );

            // 更新标题显示当前模型名称
            document.getElementById("chat-title").textContent = this.realtimeClient.getModelName();

            const sessionConfig = {
                instructions: document.getElementById("session-instructions").value,
                temperature: parseFloat(document.getElementById("temperature").value) || 0.8,
                voice: document.getElementById("voice").value || "alloy"
            };

            await this.realtimeClient.start(sessionConfig);

            for await (const message of this.realtimeClient.getMessages()) {
                this.handleRealtimeMessage(message);
            }
        } catch (error) {
            this.recordingActive = false; // 发生错误时更新状态
            this.releaseWakeLock();
            console.error("Realtime chat error:", error);
            this.makeNewTextBlock(`<< Connection error: ${error.message} >>`);
        }
    }

    stopRealtime() {
        this.recordingActive = false; // 停止时更新状态
        this.releaseWakeLock();
        if (this.realtimeClient) {
            this.realtimeClient.stop();
        }
    }

    handleRealtimeMessage(message) {
        console.log("Received message:", message.type);
        const container = document.getElementById("received-text-container");

        switch (message.type) {
        case "session.created":
            this.makeNewTextBlock("<< Session Started >>");
            this.makeNewTextBlock("Session initialized successfully");
            break;

        case "session.updated":
            console.log("Session configuration updated:", message.session);
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
            // 停止当前正在播放的音频
            if (this.realtimeClient && this.realtimeClient.audioPlayer) {
                this.realtimeClient.audioPlayer.stop();
            }
            
            this.makeNewTextBlock("<< Speech Started >>");
            const textElements = container.children;
            this.latestInputSpeechBlock = textElements[textElements.length - 1];
            this.makeNewTextBlock();
            break;
        }

        case "conversation.item.input_audio_transcription.completed":
            if (this.latestInputSpeechBlock) {
                this.latestInputSpeechBlock.textContent += " User: " + message.transcript;
            }
            break;

        case "response.done":
            break;

        case "error":
            console.error("Realtime error:", message.error);
            this.makeNewTextBlock(`<< Error: ${message.error.message} >>`);
            break;

        default:
            console.log("Unhandled message:", JSON.stringify(message, null, 2));
        }
    }

    makeNewTextBlock(text = "") {
        const container = document.getElementById("received-text-container");
        const messageDiv = document.createElement("div");
        messageDiv.className = `im-message ${text.includes("User:") ? "im-message-user" : "im-message-assistant"}`;
        
        const contentDiv = document.createElement("div");
        contentDiv.className = "im-message-content";
        contentDiv.textContent = text.replace("User: ", "");
        
        const metaDiv = document.createElement("div");
        metaDiv.className = "im-message-meta";
        metaDiv.textContent = new Date().toLocaleTimeString();
        
        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(metaDiv);
        container.appendChild(messageDiv);
        
        // 自动滚动到底部
        container.scrollTop = container.scrollHeight;
        return contentDiv;
    }

    appendToTextBlock(text) {
        const container = document.getElementById("received-text-container");
        const lastElement = container.lastElementChild;
        if (lastElement) {
            const contentDiv = lastElement.querySelector(".im-message-content");
            if (contentDiv) {
                contentDiv.textContent += text;
                container.scrollTop = container.scrollHeight;
            } else {
                this.makeNewTextBlock(text);
            }
        } else {
            this.makeNewTextBlock(text);
        }
    }
}