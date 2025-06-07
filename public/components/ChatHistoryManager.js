//components/ChatHistoryManager.js
import { generateTitle } from "../utils/apiClient.js";
import { generateExcerpt } from "../utils/textUtils.js";
import { v4 as uuidv4 } from "uuid";

class ChatHistoryManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.chatHistoryKeyPrefix = "chatHistory_";
        this.subscribers = [];
    }

    subscribe(callback) {
        this.subscribers.push(callback);
    }

    notifySubscribers(action, chatHistoryItem) {
        this.subscribers.forEach(callback => callback(action, chatHistoryItem));
    }

    // Generate unique chat ID
    generateChatId(username, profileName) {
        return `${username}_${profileName}_${uuidv4()}`;
    }

    // Use these functions like this
    getChatHistory() {
        const username = this.uiManager.storageManager.getCurrentUsername();
        const chatHistory = this.uiManager.storageManager.getChatHistory(username);
        
        return chatHistory.sort((a, b) => {
            return new Date(b.updatedAt) - new Date(a.updatedAt);
        });
    }

    async generateChatHistory() {
        const username = this.uiManager.storageManager.getCurrentUsername();

        // Get all localStorage keys
        const keys = Object.keys(localStorage);

        // Filter out current user's chat history keys
        const chatKeys = keys.filter(key => key.startsWith(username + "_"));

        // For each chat record, generate a chat history record
        for (let key of chatKeys) {
            await this.createChatHistory(key);
        }
    }

    // Create new chat history record
    async createChatHistory(data) {
        // Handle when data is passed as an object directly
        if (typeof data === "object") {
            const chatHistoryItem = {
                ...data,
                createdAt: data.createdAt || new Date().toISOString(),
                updatedAt: data.updatedAt || new Date().toISOString()
            };
            this.uiManager.storageManager.createChatHistory(chatHistoryItem);
            this.notifySubscribers("create", chatHistoryItem);
            return;
        }

        // Handle when data is a chatId string
        const chatId = data;
        const profileName = chatId.split("_")[1];
        const messages = this.uiManager.storageManager.getMessages(chatId);
        let title = "untitled";
        if (messages.length) {
            // Use first message to generate title
            title = await this.generateChatTitle(messages[0].content);
        }
        const newChatHistory = {
            id: chatId,
            title: title,
            profileName: profileName,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.uiManager.storageManager.createChatHistory(newChatHistory);
        this.notifySubscribers("create", newChatHistory);
    }

    // Update chat history record
    async updateChatHistory(chatId, forceGenerateTitle = false, title = "") {
        const chatHistory = this.getChatHistory();
        // Handle the case where chatId is an object (backward compatibility)
        const id = typeof chatId === "object" ? chatId.id : chatId;
        const chatHistoryToUpdate = chatHistory.find(history => history.id === id);
        
        if (!chatHistoryToUpdate) {
            console.error("Chat history not found:", id);
            return;
        }

        // Get messages to generate title
        const messages = this.uiManager.storageManager.getMessages(id);
        
        // If messages exist
        if (messages && messages.length > 0) {
            // If title is provided, use it directly
            if (title) {
                chatHistoryToUpdate.title = title;
            } 
            // Otherwise, generate title in the following situations:
            // 1. Force title generation
            // 2. Current title is default value and message count is sufficient
            else if (forceGenerateTitle || 
                    (chatHistoryToUpdate.title === "untitled" && messages.length >= 2)) {
                try {
                    // Generate conversation context
                    const context = this.generateConversationContext(messages);
                    
                    // Use generated context to get title
                    const generatedTitle = await this.generateChatTitle(context);
                    if (this.isValidTitle(generatedTitle)) {
                        chatHistoryToUpdate.title = generatedTitle.trim();
                    }
                } catch (error) {
                    console.error("Error generating title:", error);
                }
            }
        }

        // Update timestamp
        chatHistoryToUpdate.updatedAt = new Date().toISOString();
        
        // Save update
        this.uiManager.storageManager.updateChatHistory(chatHistoryToUpdate);
        
        // Notify subscribers
        this.notifySubscribers("update", chatHistoryToUpdate);
    }

    // Delete chat history record
    deleteChatHistory(chatId) {
        const chatHistoryToDelete = this.uiManager.storageManager.readChatHistory(chatId);
        this.uiManager.storageManager.deleteChatHistory(chatId);
        this.notifySubscribers("delete", chatHistoryToDelete);
    }

    // Helper method: Generate conversation context to optimize title generation
    generateConversationContext(messages) {
        // Get key conversation content
        const keyMessages = this.selectKeyMessages(messages);
        
        // Combine messages into context
        return keyMessages
            .map(msg => msg.content)
            .join("\n")
            .slice(0, 2000); // Limit length to improve response speed
    }

    // Helper method: Select key messages for title generation
    selectKeyMessages(messages) {
        if (!messages || messages.length === 0) return [];

        // If message count is 3 or less, use all messages
        if (messages.length <= 3) return messages;

        // Otherwise, select first user message and first assistant reply, plus last meaningful message
        const firstUserMsg = messages.find(m => m.role === "user");
        const firstAssistantMsg = messages.find(m => m.role === "assistant");
        const lastMeaningfulMsg = [...messages]
            .reverse()
            .find(m => m.content && m.content.trim().length > 30);

        return [firstUserMsg, firstAssistantMsg, lastMeaningfulMsg]
            .filter(Boolean) // Remove undefined
            .filter((msg, index, self) => 
                // Remove duplicates
                index === self.findIndex(m => m.messageId === msg.messageId)
            );
    }

    // Helper method: Generate chat title
    async generateChatTitle(content) {
        try {
            const title = await generateTitle(content);
            return this.isValidTitle(title) ? title : "untitled";
        } catch (error) {
            console.error("Error in generateChatTitle:", error);
            return "untitled";
        }
    }

    // Helper method: Validate if title is valid
    isValidTitle(title) {
        return title && 
               title !== "undefined" && 
               title !== "null" &&
               title.trim() !== "" &&
               title !== "untitled";
    }
}

export default ChatHistoryManager;
