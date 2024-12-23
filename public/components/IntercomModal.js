import { RealtimeClient } from "../utils/realtime/realtimeClient.js";
import { fetchRealtimeConfig } from "../utils/api.js";

export default class IntercomModal {
    constructor() {
        this.modal = null;
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
              <h2>Real-Time Chat</h2>
            </div>
            <div id="received-text-container" class="im-text-container"></div>
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

            <div class="im-controls">
              <div class="im-button-group">
                <button id="start-recording" class="im-button im-button-primary" type="button">
                  <i class="fas fa-microphone"></i>
                  Start Recording
                </button>
                <button id="stop-recording" class="im-button im-button-secondary" type="button" disabled>
                  <i class="fas fa-stop"></i>
                  Stop
                </button>
                <button id="clear-all" class="im-button im-button-warning" type="button">
                  <i class="fas fa-trash"></i>
                  Clear
                </button>
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
    }

    showModal() {
        this.modal.style.display = "block";
    }

    hideModal() {
        this.modal.style.display = "none";
    }

    async startRealtime(config) {
        try {
            this.realtimeClient = new RealtimeClient();
            await this.realtimeClient.initialize(
                config.endpoint,
                config.apiKey, 
                config.deployment
            );

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
            console.error("Realtime chat error:", error);
            this.makeNewTextBlock(`<< Connection error: ${error.message} >>`);
        }
    }

    stopRealtime() {
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
            container.appendChild(document.createElement("hr"));
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
        const p = document.createElement("p");
        p.textContent = text;
        container.appendChild(p);
        return p;
    }

    appendToTextBlock(text) {
        const container = document.getElementById("received-text-container");
        const lastElement = container.lastElementChild;
        if (lastElement) {
            lastElement.textContent += text;
        } else {
            this.makeNewTextBlock(text);
        }
    }
}