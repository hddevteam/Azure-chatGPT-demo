// TextMessageProcessor.js - Handles regular text messages
import MessageProcessor from "./MessageProcessor.js";
import { getGpt } from "../../utils/apiClient.js";

class TextMessageProcessor extends MessageProcessor {
    constructor(messageManager) {
        super(messageManager);
    }

    async process(message, attachments = []) {
        const timestamp = new Date().toISOString();
        
        try {
            // Validate message and display to interface
            const validationResult = await this.validateInput(message, attachments);
            if (!validationResult) {
                return null;
            }
            
            // Send request to server
            const response = await this.sendTextMessage();
            
            // Update search results status
            if (response && response.searchResults) {
                this.messageManager.searchResults = this.processSearchResults(response.searchResults);
            } else {
                this.messageManager.searchResults = null;
            }
            
            // Process response and display
            return await this.handleAIResponse(response, timestamp);
        } catch (error) {
            console.error("Error in TextMessageProcessor:", error);
            throw error;
        }
    }

    async sendTextMessage() {
        this.uiManager.showToast("AI is thinking...");
        const promptText = this.uiManager.app.prompts.getPromptText();
        console.log("Prompt text:", promptText);
        const currentProfile = this.uiManager.storageManager.getCurrentProfile();
        
        // Extract configuration parameters and ensure correct types
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