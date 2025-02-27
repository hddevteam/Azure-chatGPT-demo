// ProfileMessageProcessor.js - 处理用户配置文件相关的消息
import MessageProcessor from "./MessageProcessor.js";
import { getGpt } from "../../utils/apiClient.js";

class ProfileMessageProcessor extends MessageProcessor {
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
            
            // 处理配置文件消息
            const response = await this.sendProfileMessage(message);
            
            // 处理响应并显示
            return await this.handleAIResponse(response, timestamp);
        } catch (error) {
            console.error("Error in ProfileMessageProcessor:", error);
            throw error;
        }
    }

    async sendProfileMessage(message) {
        this.uiManager.showToast("AI is thinking...");
        
        const parts = message.split(":");
        if (parts.length >= 2) {
            const profileDisplayName = parts[0].substring(1).trim(); // Remove '@'
            const messageContent = parts.slice(1).join(":").trim();
            let externalSystemPrompt;
            const profile = this.uiManager.profiles.find(p => p.displayName === profileDisplayName);
    
            if (profile) {
                externalSystemPrompt = profile.prompt;
            } else {
                externalSystemPrompt = `You are an experienced ${profileDisplayName}.`;
            }
    
            const promptText = this.uiManager.app.prompts.getPromptTextWithReplacement(
                externalSystemPrompt, 
                messageContent
            );
    
            return await getGpt(promptText, this.uiManager.app.model);
        }
        
        throw new Error("Invalid profile message format");
    }
    
    // 检查消息是否是配置文件请求
    static isProfileRequest(message) {
        return message.startsWith("@") && message.includes(":");
    }
}

export default ProfileMessageProcessor;