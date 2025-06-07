// services/gptService/apiService.js
/**
 * API Service for making requests to LLM providers
 * Handles formatting requests, processing responses, and error handling
 */

const axios = require("axios");
const { toolDefinitions } = require("./tools");
const config = require("./config");
const AdapterFactory = require("./modelAdapters/AdapterFactory");

/**
 * Make a request to an LLM API endpoint
 * 
 * @param {Object} options - Request options
 * @param {string} options.apiKey - API key for authentication
 * @param {string} options.apiUrl - API endpoint URL
 * @param {string} options.model - Model name, used to determine model features
 * @param {Array} options.prompt - Array of message objects
 * @param {Object} options.params - Additional parameters like temperature
 * @param {boolean} options.includeFunctionCalls - Whether to include function calling capabilities
 * @returns {Promise<Object>} API response
 */
const makeRequest = async ({ apiKey, apiUrl, model, prompt, params, includeFunctionCalls = false }) => {
    console.log("Making API request to:", apiUrl, "with model:", model);
    
    try {
        // Get adapter for the model
        const adapter = AdapterFactory.getAdapter(model, config);
        
        // Use adapter to process request data
        const requestData = adapter.processRequestBody(prompt, params);

        // Only add tools when model supports function calling and function calling is enabled
        if (includeFunctionCalls && config.supportsFeature(model, "supportsFunctionCalls")) {
            requestData.tools = toolDefinitions;
        }

        console.log("Request data:", JSON.stringify(requestData, null, 2));

        const options = {
            method: "POST",
            headers: adapter.getHeaders(apiKey),
            data: requestData,
        };

        const response = await axios(apiUrl, options);
        
        console.log("API response status:", response.status);
        console.log("API response data:", JSON.stringify(response.data, null, 2));
        
        if (response.status === 404) {
            throw new Error(`API endpoint not found: ${apiUrl}`);
        }

        return response;
    } catch (error) {
        console.error("API request failed:", error.message);
        if (error.response) {
            console.error("Response data:", error.response.data);
            console.error("Response status:", error.response.status);
        }
        throw error;
    }
};

/**
 * Handle errors from API requests
 * 
 * @param {Error} error - Error object
 * @param {Object} res - Express response object
 * @returns {Object} Express response with error information
 */
const handleRequestError = (error, res) => {
    console.error("API Error:", error.message);
    console.error("Stack trace:", error.stack);

    if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);
        return res.status(error.response.status).send(error.response.data);
    } else if (error.request) {
        console.error("Request error:", error.request);
        return res.status(500).send("Request was made but no response was received");
    } else {
        return res.status(500).send(`Error: ${error.message}`);
    }
};

/**
 * Process model parameters based on model type
 * 
 * @param {string} model - Model identifier
 * @param {Object} params - User provided parameters
 * @returns {Object} Processed parameters for the specific model
 */
const processModelParameters = (model, params) => {
    // models with different parameter requirements for o1, o1-mini, o3, o3-mini, o4-mini... o series model
    if (model === "o1" || model === "o1-mini" || model === "o3" || model === "o3-mini" || model === "o4-mini") {
        return {
            max_completion_tokens: parseInt(params.max_tokens)
        };
    } 
    // DeepSeek-R1 model parameter processing
    else if (model === "deepseek-r1") {
        return {
            temperature: parseFloat(params.temperature),
            top_p: parseFloat(params.top_p),
            max_tokens: parseInt(params.max_tokens)
        };
    }
    else {
        // Standard parameters for OpenAI-compatible models
        return {
            temperature: parseFloat(params.temperature),
            top_p: parseFloat(params.top_p),
            frequency_penalty: parseFloat(params.frequency_penalty),
            presence_penalty: parseFloat(params.presence_penalty),
            max_tokens: parseInt(params.max_tokens)
        };
    }
};

/**
 * Filter messages based on model requirements
 * 
 * @param {Array} messages - Array of message objects
 * @param {string} model - Model identifier
 * @returns {Array} Filtered messages appropriate for the model
 */
const filterMessagesByModel = (messages, model) => {
    // Use supportsFeature to check if model supports system messages
    if (!config.supportsFeature(model, "supportsSystemMessages")) {
        // For models that don't support system messages, merge system prompt into first user message
        const systemMessages = messages.filter(msg => msg.role === "system");
        const nonSystemMessages = messages.filter(msg => msg.role !== "system");
        
        if (systemMessages.length > 0 && nonSystemMessages.length > 0) {
            // Find the first user message
            const firstUserIndex = nonSystemMessages.findIndex(msg => msg.role === "user");
            
            if (firstUserIndex !== -1) {
                // Merge all system messages content
                const systemContent = systemMessages.map(msg => msg.content).join("\n\n");
                
                // Add system content to the beginning of first user message
                const firstUserMessage = nonSystemMessages[firstUserIndex];
                nonSystemMessages[firstUserIndex] = {
                    ...firstUserMessage,
                    content: `${systemContent}\n\n${firstUserMessage.content}`
                };
            }
        }
        
        return nonSystemMessages;
    }
    return messages;
};

module.exports = {
    makeRequest,
    handleRequestError,
    processModelParameters,
    filterMessagesByModel
};