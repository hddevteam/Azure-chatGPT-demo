// TextMessageProcessor.js - 处理普通文本消息
import MessageProcessor from "./MessageProcessor.js";
import { getGpt } from "../../utils/apiClient.js";

class TextMessageProcessor extends MessageProcessor {
    constructor(messageManager) {
        super(messageManager);
    }

    async process(message, attachments = []) {
        const timestamp = new Date().toISOString();
        
        try {
            // 验证消息并显示到界面
            const validationResult = await this.validateInput(message, attachments);
            if (!validationResult) {
                return null;
            }
            
            // 发送请求到服务器
            const response = await this.sendTextMessage();
            
            // 更新搜索结果状态
            if (response && response.searchResults) {
                this.messageManager.searchResults = this.processSearchResults(response.searchResults);
            } else {
                this.messageManager.searchResults = null;
            }
            
            // 处理响应并显示
            return await this.handleAIResponse(response, timestamp);
        } catch (error) {
            console.error("Error in TextMessageProcessor:", error);
            throw error;
        }
    }

    async sendTextMessage() {
        this.uiManager.showToast("AI is thinking...");
        const promptText = this.uiManager.app.prompts.getPromptText();
        const currentProfile = this.uiManager.storageManager.getCurrentProfile();
        
        // 提取配置参数并确保正确类型
        const params = {
            temperature: parseFloat(currentProfile.temperature) || 0.8,
            top_p: parseFloat(currentProfile.top_p) || 0.95,
            frequency_penalty: parseFloat(currentProfile.frequency_penalty) || 0,
            presence_penalty: parseFloat(currentProfile.presence_penalty) || 0,
            max_tokens: parseInt(currentProfile.max_tokens) || 2000,
            webSearchEnabled: this.messageManager.webSearchEnabled
        };
        
        console.log("Sending request with params:", params);
        return await getGpt(promptText, this.uiManager.app.model, params);
    }
}

export default TextMessageProcessor;