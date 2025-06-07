// ProfileMessageProcessor.js - Handles user profile-related messages
import MessageProcessor from "./MessageProcessor.js";
import { getGpt } from "../../utils/apiClient.js";

class ProfileMessageProcessor extends MessageProcessor {
    constructor(messageManager) {
        super(messageManager);
    }

    async process(message, attachments = []) {
        const timestamp = new Date().toISOString();
        
        try {
            // Validate message and display in UI
            const validationResult = await this.validateInput(message, attachments);
            if (!validationResult) {
                return null;
            }
            
            // Process profile message
            const response = await this.sendProfileMessage(message);
            
            // Process response and display
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
    
    // Check if message is a profile request
    static isProfileRequest(message) {
        return message.startsWith("@") && message.includes(":");
    }
}

export default ProfileMessageProcessor;