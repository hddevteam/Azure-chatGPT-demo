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
 * @param {string} options.reasoningEffort - Reasoning effort level (low, medium, high) for reasoning models
 * @param {string} options.reasoningSummary - Reasoning summary mode (auto, concise, detailed) for supported models
 * @returns {Promise<Object>} API response
 */
const makeRequest = async ({ 
    apiKey, 
    apiUrl, 
    model, 
    prompt, 
    params, 
    includeFunctionCalls = false,
    reasoningEffort,
    reasoningSummary
}) => {
    console.log("Making API request to:", apiUrl, "with model:", model);
    
    try {
        // Get adapter for the model
        const adapter = AdapterFactory.getAdapter(model, config);
        
        // Process messages for model compatibility (system vs developer messages)
        const processedPrompt = processMessagesForModel(prompt, model);
        
        // Add reasoning parameters to params before adapter processing
        if (reasoningEffort && config.supportsFeature(model, "supportsReasoningEffort")) {
            params.reasoning_effort = reasoningEffort;
            console.log(`Adding reasoning effort to params: ${reasoningEffort}`);
        }

        // Add reasoning summary parameter for reasoning models
        if (reasoningSummary && config.supportsFeature(model, "supportsReasoningSummary")) {
            params.reasoning = {
                summary: reasoningSummary
            };
            console.log(`Adding reasoning summary to params: ${reasoningSummary}`);
        }

        // Use adapter to process request data (including reasoning parameters)
        const requestData = adapter.processRequestBody(processedPrompt, params);

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

        // Process reasoning summary if present
        const processedResponse = processReasoningSummary(response);

        return processedResponse;
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
 * Process parameters for specific model requirements
 * Updated to use new config.getModelParameters function for reasoning models
 * 
 * @param {string} model - Model identifier
 * @param {Object} params - User provided parameters
 * @returns {Object} Processed parameters for the specific model
 */
const processModelParameters = (model, params) => {
    // Use the new getModelParameters function from config
    return config.getModelParameters(model, params);
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

/**
 * Process messages for model compatibility
 * Convert system messages to developer messages for reasoning models
 * 
 * @param {Array} messages - Array of message objects
 * @param {string} model - Model identifier
 * @returns {Array} Processed messages appropriate for the model
 */
const processMessagesForModel = (messages, model) => {
    // For models that support developer messages, convert system messages
    if (config.supportsFeature(model, "supportsDeveloperMessages")) {
        return messages.map(msg => {
            if (msg.role === "system") {
                // Convert system message to developer message
                let content = msg.content;
                
                // Add formatting re-enablement for o3-mini and o1 models for better markdown output
                if ((model === "o3-mini" || model === "o1") && typeof content === "string") {
                    content = "Formatting re-enabled - please enclose code blocks with appropriate markdown tags. " + content;
                }
                
                return {
                    ...msg,
                    role: "developer",
                    content: content
                };
            }
            return msg;
        });
    }
    
    // For models that don't support system messages but also don't support developer messages,
    // use the existing filtering logic
    return filterMessagesByModel(messages, model);
};

/**
 * Process reasoning summary and convert to think block format
 * @param {Object} response - API response object
 * @returns {Object} Processed response with think blocks
 */
const processReasoningSummary = (response) => {
    try {
        // Check if response has reasoning summary data
        if (!response.data || !response.data.output) {
            return response;
        }

        let reasoningSummaryContent = null;
        let mainContent = null;

        // Handle different response formats
        if (Array.isArray(response.data.output)) {
            // Find reasoning and message components
            const reasoningOutput = response.data.output.find(item => item.type === "reasoning");
            const messageOutput = response.data.output.find(item => item.type === "message");

            if (reasoningOutput && reasoningOutput.summary) {
                // Extract reasoning summary text
                const summaryTexts = reasoningOutput.summary
                    .filter(item => item.type === "summary_text")
                    .map(item => item.text);
                
                if (summaryTexts.length > 0) {
                    reasoningSummaryContent = summaryTexts.join("\n\n");
                }
            }

            if (messageOutput && messageOutput.content) {
                // Extract main message content
                const textContent = messageOutput.content
                    .filter(item => item.type === "output_text")
                    .map(item => item.text);
                
                if (textContent.length > 0) {
                    mainContent = textContent.join("\n\n");
                }
            }
        } else if (response.data.choices && response.data.choices[0]) {
            // Standard chat completion format
            mainContent = response.data.choices[0].message?.content;
        }

        // If we have reasoning summary, convert it to think block format
        if (reasoningSummaryContent && mainContent) {
            const thinkBlock = `<think>\n${reasoningSummaryContent}\n</think>\n\n`;
            
            // Create new response with think block prepended
            const processedResponse = JSON.parse(JSON.stringify(response));
            
            // Convert reasoning response to standard chat completion format
            processedResponse.data.choices = [{
                message: {
                    content: thinkBlock + mainContent,
                    role: "assistant"
                },
                finish_reason: "stop",
                index: 0
            }];
            
            // Preserve usage information
            if (response.data.usage) {
                processedResponse.data.usage = response.data.usage;
            }

            console.log("Reasoning summary converted to think block format");
            return processedResponse;
        }

        return response;
    } catch (error) {
        console.error("Error processing reasoning summary:", error);
        return response; // Return original response if processing fails
    }
};

module.exports = {
    makeRequest,
    handleRequestError,
    processModelParameters,
    filterMessagesByModel,
    processMessagesForModel,  // Export the new function
    processReasoningSummary
};