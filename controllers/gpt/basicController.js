// controllers/gpt/basicController.js
/**
 * Basic conversation controller - handles basic text generation requests
 * Split into smaller functions to enhance maintainability
 */

const gptService = require("../../services/gptService");

/**
 * Return default GPT request parameters
 */
exports.getDefaultParams = (req, res) => {
    res.json(gptService.defaultParams);
};

/**
 * Extract parameters from request
 * @param {Object} req - Request object
 * @returns {Object} Extracted parameters
 */
const extractParameters = (req) => {
    // Get model parameters from top level
    const model = req.body.model || "gpt-4o";
    
    // Get other parameters from params object
    const {
        temperature = gptService.defaultParams.temperature,
        top_p = gptService.defaultParams.top_p,
        frequency_penalty = gptService.defaultParams.frequency_penalty,
        presence_penalty = gptService.defaultParams.presence_penalty,
        max_tokens = gptService.defaultParams.max_tokens,
        webSearchEnabled = false
    } = req.body.params || {};
    
    return {
        model,
        temperature,
        top_p,
        frequency_penalty,
        presence_penalty,
        max_tokens,
        webSearchEnabled
    };
};

/**
 * Parse and validate prompt content
 * @param {string} promptString - JSON formatted prompt string
 * @returns {Array} Parsed prompt array
 */
const parseAndValidatePrompt = (promptString) => {
    try {
        const prompt = JSON.parse(promptString);
        if (!prompt || !Array.isArray(prompt) || !prompt.length) {
            throw new Error("Invalid prompt format");
        }
        return prompt;
    } catch (error) {
        console.error("Failed to parse prompt:", error);
        throw new Error(`Invalid prompt: ${error.message}`);
    }
};

/**
 * Process search results
 * @param {Array} prompt - Prompt array
 * @param {Array} searchResults - Search results
 * @param {Object} options - Search options
 * @returns {Object} Updated prompt
 */
const processSearchResults = (prompt, searchResults, { language }) => {
    if (!searchResults) return prompt;
    
    // Format search results
    const formattedResults = gptService.formatSearchResults(searchResults);
    
    // Get current date
    const curDate = new Date().toLocaleDateString(
        language === "zh" ? "zh-CN" : "en-US",
        { year: "numeric", month: "long", day: "numeric" }
    );
    
    // Select template based on language
    const template = language === "zh" 
        ? gptService.searchAnswerZhTemplate 
        : gptService.searchAnswerEnTemplate;
    
    // Format final prompt
    const searchPrompt = template
        .replace("{search_results}", formattedResults)
        .replace("{cur_date}", curDate)
        .replace("{question}", prompt[prompt.length - 1].content);
    
    // Return updated prompt
    return [...prompt, {
        role: "system",
        content: searchPrompt
    }];
};

/**
 * Generate response from GPT API
 */
exports.generateResponse = async (req, res) => {
    console.log("generateResponse - Request body:", req.body);
    
    try {
        // Extract parameters
        const {
            model,
            temperature,
            top_p,
            frequency_penalty, 
            presence_penalty,
            max_tokens,
            webSearchEnabled
        } = extractParameters(req);
        
        console.log(`Using model: ${model} with params:`, {
            temperature, top_p, frequency_penalty, presence_penalty, max_tokens, webSearchEnabled
        });
        
        // Process user parameters
        const params = gptService.processModelParameters(model, {
            temperature,
            top_p,
            frequency_penalty,
            presence_penalty,
            max_tokens
        });
        
        console.log("Processed parameters:", params);
        
        // Parse and validate prompt
        let prompt;
        try {
            prompt = parseAndValidatePrompt(req.body.prompt);
        } catch (error) {
            return res.status(400).send(error.message);
        }

        // Filter messages by model
        prompt = gptService.filterMessagesByModel(prompt, model);

        // Get API configuration for the requested model
        const { apiKey, apiUrl } = gptService.getApiConfig(model);

        console.log("API config:", { apiKey, apiUrl });

        // Initial request data
        let requestData = {
            apiKey,
            apiUrl,
            model,  // Ensure model parameter is passed
            prompt,
            params,
            includeFunctionCalls: webSearchEnabled
        };

        // Initial API request
        let response = await gptService.makeRequest(requestData);
        console.log("Initial API response received");

        // If function calling is enabled, process function calls
        let needsFurtherProcessing = webSearchEnabled;
        let maxIterations = 5;
        let currentIteration = 0;
        let searchResults = null;

        while (needsFurtherProcessing && currentIteration < maxIterations) {
            currentIteration++;
            console.log(`Processing iteration ${currentIteration}`);

            const choices = response.data.choices || [];
            const responseMessage = choices[0]?.message;
            
            // Check if there are tool calls to process
            if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
                // Process all tool calls
                const toolCallResults = await gptService.processToolCalls(responseMessage.tool_calls);
                
                // If this is a search, store results for template use
                const searchToolCall = responseMessage.tool_calls.find(
                    call => call.function.name === "search_bing"
                );
                if (searchToolCall) {
                    const searchResult = toolCallResults.find(r => r.toolCallId === searchToolCall.id);
                    searchResults = searchResult?.result?.results || null;
                }

                // Add function calls and results to conversation
                for (const { toolCallId, result } of toolCallResults) {
                    // Find the tool call that produced this result
                    const toolCall = responseMessage.tool_calls.find(tc => tc.id === toolCallId);
                    if (toolCall) {
                        // Add assistant's tool call
                        prompt.push({
                            role: "assistant",
                            content: null,
                            tool_calls: [toolCall]
                        });
                        
                        // Add tool response
                        prompt.push({
                            role: "tool",
                            tool_call_id: toolCallId,
                            content: JSON.stringify(result)
                        });
                    }
                }

                // Update request data and call API again
                requestData.prompt = prompt;
                console.log(`Making follow-up request (iteration ${currentIteration})`);
                response = await gptService.makeRequest(requestData);
                
                // Check if further processing is needed
                const newChoices = response.data.choices || [];
                const newResponseMessage = newChoices[0]?.message;
                needsFurtherProcessing = newResponseMessage?.tool_calls?.length > 0;
            } else {
                // No tool calls, end processing
                needsFurtherProcessing = false;
            }
        }

        if (currentIteration >= maxIterations) {
            console.warn("Reached maximum number of tool call iterations");
        }

        // Check if search template should be used to format response
        const hasSearchContent = prompt.some(msg => {
            const content = msg.content;
            return typeof content === "string" && content.toLowerCase().includes("search");
        });

        if (hasSearchContent && searchResults) {
            // Process search results and update prompt
            prompt = processSearchResults(prompt, searchResults, { language: req.body.language });
            
            // Request again with search results
            requestData.prompt = prompt;
            response = await gptService.makeRequest(requestData);
        }

        // Return final response
        const finalMessage = response.data.choices[0].message.content;
        const totalTokens = response.data.usage?.total_tokens || 0;
        
        console.log("Final response message:", finalMessage);
        console.log("Token usage:", totalTokens);
        
        const responseData = { 
            message: finalMessage, 
            totalTokens,
            searchResults: searchResults || [] 
        };
        
        console.log("Data returned to frontend:", JSON.stringify(responseData, null, 2));
        
        res.json(responseData);
    } catch (error) {
        gptService.handleRequestError(error, res);
    }
};