// services/gptService/config.js
/**
 * Configuration module for GPT Services
 * Contains environment variables, API keys, and default parameters
 */

// Environment configuration
const devMode = process.env.DEV_MODE ? eval(process.env.DEV_MODE) : false;

// API Keys Configuration
const apiKeys = {
    gpt4o: process.env.GPT_4O_API_KEY,
    gpt4oMini: process.env.GPT_4O_MINI_API_KEY,
    o1: process.env.O1_API_KEY,
    o1Mini: process.env.O1_MINI_API_KEY,
    o3: process.env.O3_API_KEY, // API Key for o3 model
    o3Mini: process.env.O3_API_KEY, // API Key for o3-mini model
    deepseek: process.env.DEEPSEEK_API_KEY, // API Key for DeepSeek
    o4Mini: process.env.O4_MINI_API_KEY, // API Key for o4-mini model
    gpt45: process.env.GPT_4_5_API_KEY, // API Key for gpt-4.5-preview model
    gpt41: process.env.GPT_4_1_API_KEY, // API Key for gpt-4.1 model
    gpt41Nano: process.env.GPT_4_1_NANO_API_KEY, // API Key for gpt-4.1-nano model
    gpt41Mini: process.env.GPT_4_1_MINI_API_KEY, // API Key for gpt-4.1-mini model
    gpt5: process.env.GPT_5_API_KEY, // API Key for gpt-5 model
    gpt5Mini: process.env.GPT_5_MINI_API_KEY, // API Key for gpt-5-mini model
    gpt5Nano: process.env.GPT_5_NANO_API_KEY, // API Key for gpt-5-nano model
    gpt5Chat: process.env.GPT_5_CHAT_API_KEY, // API Key for gpt-5-chat model
    gpt52: process.env.AZURE_AI_FOUNDRY_KEY, // API Key for gpt-5.2 model (Azure AI Foundry)
    gpt51: process.env.AZURE_AI_FOUNDRY_KEY, // API Key for gpt-5.1 model (Azure AI Foundry)
    // Default key based on environment
    default: devMode ? process.env.API_KEY_DEV : process.env.GPT_4_1_API_KEY
};

// API URLs Configuration
const apiUrls = {
    gpt4o: process.env.GPT_4O_API_URL,
    gpt4oMini: process.env.GPT_4O_MINI_API_URL,
    o1: process.env.O1_API_URL,
    o1Mini: process.env.O1_MINI_API_URL,
    o3: process.env.O3_API_URL, // URL for o3 model
    o3Mini: process.env.O3_API_URL,
    deepseek: `${process.env.DEEPSEEK_API_URL}/chat/completions`,
    o4Mini: process.env.O4_MINI_API_URL, // URL for o4-mini model
    gpt45: process.env.GPT_4_5_API_URL, // URL for gpt-4.5-preview model
    gpt41: process.env.GPT_4_1_API_URL, // URL for gpt-4.1 model
    gpt41Nano: process.env.GPT_4_1_NANO_API_URL, // URL for gpt-4.1-nano model
    gpt41Mini: process.env.GPT_4_1_MINI_API_URL, // URL for gpt-4.1-mini model
    gpt5: process.env.GPT_5_API_URL, // URL for gpt-5 model
    gpt5Mini: process.env.GPT_5_MINI_API_URL, // URL for gpt-5-mini model
    gpt5Nano: process.env.GPT_5_NANO_API_URL, // URL for gpt-5-nano model
    gpt5Chat: process.env.GPT_5_CHAT_API_URL, // URL for gpt-5-chat model
    gpt52: process.env.AZURE_AI_FOUNDRY_ENDPOINT, // URL for gpt-5.2 model (Azure AI Foundry)
    gpt51: process.env.AZURE_AI_FOUNDRY_ENDPOINT, // URL for gpt-5.1 model (Azure AI Foundry)
    // Default URL based on environment
    default: devMode ? process.env.API_URL_DEV : process.env.GPT_4_1_API_URL
};

// Default parameters for API requests
const defaultParams = {
    temperature: 0.8,
    top_p: 0.95,
    frequency_penalty: 0,
    presence_penalty: 0,
    max_tokens: 128000
};

// Default parameters for reasoning models (GPT-5 series, O-series)
// Based on: https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/reasoning
const reasoningModelParams = {
    max_completion_tokens: 128000,
    reasoning_effort: "medium" // minimal, low, medium, high
};

/**
 * Get model supported features
 * Based on: https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/reasoning
 * @type {Object}
 */
const modelFeatures = {
        'gpt-4o': {
            supportsFunctionCalling: true,
            supportsSystemMessages: true,
            supportsVision: true,
            supportsStructuredOutputs: true,
            supportsParallelFunctionCalling: true,
            maxTokens: 128000,
            outputTokens: 16384
        },
        'gpt-4o-mini': {
            supportsFunctionCalling: true,
            supportsSystemMessages: true,
            supportsVision: true,
            supportsStructuredOutputs: true,
            supportsParallelFunctionCalling: true,
            maxTokens: 128000,
            outputTokens: 16384
        },
        'o1': {
            supportsFunctionCalling: true,
            supportsSystemMessages: true, // ✅ Latest reasoning models support system messages
            supportsVision: true,
            supportsStructuredOutputs: true,
            supportsParallelFunctionCalling: true,
            maxTokens: 200000,
            outputTokens: 100000,
            supportsReasoningEffort: true,
            supportsDeveloperMessages: true
        },
        'o1-mini': {
            supportsFunctionCalling: true,
            supportsSystemMessages: true, // ✅ Latest reasoning models support system messages
            supportsVision: false,
            supportsStructuredOutputs: true,
            supportsParallelFunctionCalling: true,
            maxTokens: 128000,
            outputTokens: 65536,
            supportsReasoningEffort: true, // ✅ Supports low, medium, high (not minimal)
            supportsDeveloperMessages: true
        },
        // ✅ GPT-5 Series - All support reasoning, function calling, and parallel tool calling
        'gpt-5': {
            supportsFunctionCalling: true,
            supportsSystemMessages: true,
            supportsVision: true,
            supportsStructuredOutputs: true,
            supportsParallelFunctionCalling: true,
            maxTokens: 272000,
            outputTokens: 128000,
            supportsReasoningEffort: true,
            supportsReasoningSummary: true,
            supportsVerbosity: true, // ✅ New GPT-5 feature
            supportsPreamble: true, // ✅ New GPT-5 feature
            supportsMinimalReasoningEffort: true, // ✅ GPT-5 supports "minimal"
            supportsCustomToolType: true, // ✅ Raw text outputs
            supportsLarkTool: true, // ✅ Python lark capabilities
            supportsDeveloperMessages: true,
            requiresMaxCompletionTokens: true, // ✅ Must use max_completion_tokens
            unsupportedParams: ['temperature', 'top_p', 'presence_penalty', 'frequency_penalty', 'max_tokens'] // ❌ Not supported
        },
        'gpt-5-mini': {
            supportsFunctionCalling: true,
            supportsSystemMessages: true,
            supportsVision: true,
            supportsStructuredOutputs: true,
            supportsParallelFunctionCalling: true,
            maxTokens: 272000,
            outputTokens: 128000,
            supportsReasoningEffort: true,
            supportsVerbosity: true, // ✅ New GPT-5 feature
            supportsPreamble: true, // ✅ New GPT-5 feature
            supportsMinimalReasoningEffort: true, // ✅ GPT-5 supports "minimal"
            supportsCustomToolType: true, // ✅ Raw text outputs
            supportsLarkTool: true, // ✅ Python lark capabilities
            supportsDeveloperMessages: true,
            requiresMaxCompletionTokens: true, // ✅ Must use max_completion_tokens
            unsupportedParams: ['temperature', 'top_p', 'presence_penalty', 'frequency_penalty', 'max_tokens'] // ❌ Not supported
        },
        'gpt-5-nano': {
            supportsFunctionCalling: true,
            supportsSystemMessages: true,
            supportsVision: true,
            supportsStructuredOutputs: true,
            supportsParallelFunctionCalling: true,
            maxTokens: 272000,
            outputTokens: 128000,
            supportsReasoningEffort: true,
            supportsVerbosity: true, // ✅ New GPT-5 feature
            supportsPreamble: true, // ✅ New GPT-5 feature
            supportsMinimalReasoningEffort: true, // ✅ GPT-5 supports "minimal"
            supportsCustomToolType: true, // ✅ Raw text outputs
            supportsLarkTool: true, // ✅ Python lark capabilities
            supportsDeveloperMessages: true,
            requiresMaxCompletionTokens: true, // ✅ Must use max_completion_tokens
            unsupportedParams: ['temperature', 'top_p', 'presence_penalty', 'frequency_penalty', 'max_tokens'] // ❌ Not supported
        },
        'gpt-5-chat': {
            supportsFunctionCalling: false, // ❌ Preview model - text only
            supportsSystemMessages: true,
            supportsVision: false, // ❌ Text only processing
            supportsStructuredOutputs: true,
            supportsParallelFunctionCalling: false,
            maxTokens: 128000,
            outputTokens: 16384,
            supportsReasoningEffort: false,
            supportsDeveloperMessages: true,
            requiresMaxCompletionTokens: true, // ✅ Still a reasoning model variant
            unsupportedParams: ['temperature', 'top_p', 'presence_penalty', 'frequency_penalty', 'max_tokens'] // ❌ Not supported
        },
        // ✅ New O-series models
        'o4-mini': {
            supportsFunctionCalling: true,
            supportsSystemMessages: true,
            supportsVision: true,
            supportsStructuredOutputs: true,
            supportsParallelFunctionCalling: true,
            maxTokens: 200000,
            outputTokens: 100000,
            supportsReasoningEffort: true,
            supportsReasoningSummary: true, // ✅ Limited access feature
            supportsDeveloperMessages: true,
            requiresMaxCompletionTokens: true, // ✅ Reasoning model
            unsupportedParams: ['temperature', 'top_p', 'presence_penalty', 'frequency_penalty', 'max_tokens'] // ❌ Not supported
        },
        'o3': {
            supportsFunctionCalling: true,
            supportsSystemMessages: true,
            supportsVision: true,
            supportsStructuredOutputs: true,
            supportsParallelFunctionCalling: true,
            maxTokens: 200000,
            outputTokens: 100000,
            supportsReasoningEffort: true,
            supportsReasoningSummary: true, // ✅ Limited access feature
            supportsDeveloperMessages: true,
            requiresMaxCompletionTokens: true, // ✅ Reasoning model
            unsupportedParams: ['temperature', 'top_p', 'presence_penalty', 'frequency_penalty', 'max_tokens'] // ❌ Not supported
        },
        'o3-mini': {
            supportsFunctionCalling: true,
            supportsSystemMessages: true,
            supportsVision: false, // ❌ Text-only processing
            supportsStructuredOutputs: true,
            supportsParallelFunctionCalling: true,
            maxTokens: 200000,
            outputTokens: 100000,
            supportsReasoningEffort: true,
            supportsDeveloperMessages: true,
            requiresMaxCompletionTokens: true, // ✅ Reasoning model
            unsupportedParams: ['temperature', 'top_p', 'presence_penalty', 'frequency_penalty', 'max_tokens'] // ❌ Not supported
        },
        // ✅ Azure AI Foundry GPT-5 models
        'gpt-5.2': {
            supportsFunctionCalling: true,
            supportsSystemMessages: true,
            supportsVision: true,
            supportsStructuredOutputs: true,
            supportsParallelFunctionCalling: true,
            maxTokens: 272000,
            outputTokens: 128000,
            supportsReasoningEffort: true,
            supportsReasoningSummary: true,
            supportsVerbosity: true,
            supportsPreamble: true,
            supportsMinimalReasoningEffort: true,
            supportsCustomToolType: true,
            supportsLarkTool: true,
            supportsDeveloperMessages: true,
            requiresMaxCompletionTokens: true,
            unsupportedParams: ['temperature', 'top_p', 'presence_penalty', 'frequency_penalty', 'max_tokens'],
            isFoundryModel: true // ✅ Indicates this uses Azure AI Foundry endpoint
        },
        'gpt-5.1': {
            supportsFunctionCalling: true,
            supportsSystemMessages: true,
            supportsVision: true,
            supportsStructuredOutputs: true,
            supportsParallelFunctionCalling: true,
            maxTokens: 272000,
            outputTokens: 128000,
            supportsReasoningEffort: true,
            supportsReasoningSummary: true,
            supportsVerbosity: true,
            supportsPreamble: true,
            supportsMinimalReasoningEffort: true,
            supportsCustomToolType: true,
            supportsLarkTool: true,
            supportsDeveloperMessages: true,
            requiresMaxCompletionTokens: true,
            unsupportedParams: ['temperature', 'top_p', 'presence_penalty', 'frequency_penalty', 'max_tokens'],
            isFoundryModel: true // ✅ Indicates this uses Azure AI Foundry endpoint
        }
    };

/**
 * Get API configuration based on model name
 * @param {string} model - Model name
 * @returns {Object} API configuration {apiKey, apiUrl}
 */
const getApiConfig = (model) => {
    let apiKey, apiUrl;
    
    switch (model) {
    case "gpt-4o":
        apiKey = apiKeys.gpt4o;
        apiUrl = apiUrls.gpt4o;
        break;
    case "gpt-4o-mini":
        apiKey = apiKeys.gpt4oMini;
        apiUrl = apiUrls.gpt4oMini;
        break;
    case "o1":
        apiKey = apiKeys.o1;
        apiUrl = apiUrls.o1;
        break;
    case "o1-mini":
        apiKey = apiKeys.o1Mini;
        apiUrl = apiUrls.o1Mini;
        break;
    case "o3":  // Add o3 configuration
        apiKey = apiKeys.o3;
        apiUrl = apiUrls.o3;
        break;
    case "o3-mini":
        apiKey = apiKeys.o3Mini;
        apiUrl = apiUrls.o3Mini;
        break;
    case "deepseek-r1":  // Add deepseek-r1 configuration
        apiKey = apiKeys.deepseek;
        apiUrl = apiUrls.deepseek;
        break;
    case "o4-mini":  // Add o4-mini configuration
        apiKey = apiKeys.o4Mini;
        apiUrl = apiUrls.o4Mini;
        break;
    case "gpt-4.5-preview":  // Add gpt-4.5-preview configuration
        apiKey = apiKeys.gpt45;
        apiUrl = apiUrls.gpt45;
        break;
    case "gpt-4.1":  // Add gpt-4.1 configuration
        apiKey = apiKeys.gpt41;
        apiUrl = apiUrls.gpt41;
        break;
    case "gpt-4.1-nano":  // Add gpt-4.1-nano configuration
        apiKey = apiKeys.gpt41Nano;
        apiUrl = apiUrls.gpt41Nano;
        break;
    case "gpt-4.1-mini":  // Add gpt-4.1-mini configuration
        apiKey = apiKeys.gpt41Mini;
        apiUrl = apiUrls.gpt41Mini;
        break;
    case "gpt-5":  // Add gpt-5 configuration
        apiKey = apiKeys.gpt5;
        apiUrl = apiUrls.gpt5;
        break;
    case "gpt-5-mini":  // Add gpt-5-mini configuration
        apiKey = apiKeys.gpt5Mini;
        apiUrl = apiUrls.gpt5Mini;
        break;
    case "gpt-5-nano":  // Add gpt-5-nano configuration
        apiKey = apiKeys.gpt5Nano;
        apiUrl = apiUrls.gpt5Nano;
        break;
    case "gpt-5-chat":  // Add gpt-5-chat configuration
        apiKey = apiKeys.gpt5Chat;
        apiUrl = apiUrls.gpt5Chat;
        break;
    case "gpt-5.2":  // Add gpt-5.2 configuration (Azure AI Foundry)
        apiKey = apiKeys.gpt52;
        apiUrl = apiUrls.gpt52;
        break;
    case "gpt-5.1":  // Add gpt-5.1 configuration (Azure AI Foundry)
        apiKey = apiKeys.gpt51;
        apiUrl = apiUrls.gpt51;
        break;
    default:
        // Default to GPT-4O if model not specified
        apiKey = apiKeys.gpt41;
        apiUrl = apiUrls.gpt41;
        break;
    }

    return { apiKey, apiUrl };
};

/**
 * Check if model supports specified feature
 * @param {string} model - Model name
 * @param {string} feature - Feature name
 * @returns {boolean} Whether the feature is supported
 */
const supportsFeature = (model, feature) => {
    const features = modelFeatures[model] || modelFeatures["gpt-4o"]; // Default to gpt-4o features
    return !!features[feature];
};

/**
 * Check if a model is a reasoning model that requires special parameter handling
 * All reasoning models require max_completion_tokens and don't support:
 * temperature, top_p, presence_penalty, frequency_penalty, max_tokens
 * @param {string} model - Model identifier
 * @returns {boolean} True if model is a reasoning model
 */
const isReasoningModel = (model) => {
    return [
        // O-series models
        "o1",
        "o1-mini",
        "o3",
        "o3-mini",
        "o4-mini",
        // GPT-5 series models
        "gpt-5",
        "gpt-5-mini",
        "gpt-5-nano",
        "gpt-5-chat",
        "gpt-5.2",
        "gpt-5.1",
        // Legacy
        "gpt-4.5-preview"
    ].includes(model);
};

/**
 * Get appropriate parameters for a model
 * @param {string} model - Model name
 * @param {object} userParams - User-provided parameters
 * @returns {object} Processed parameters for the model
 */
const getModelParameters = (model, userParams = {}) => {
    const features = modelFeatures[model] || modelFeatures["gpt-4o"];
    
    if (isReasoningModel(model)) {
        // For reasoning models, use only supported parameters
        const params = {};
        
        // Always use max_completion_tokens for reasoning models
        if (userParams.max_tokens) {
            params.max_completion_tokens = userParams.max_tokens;
        } else if (userParams.max_completion_tokens) {
            params.max_completion_tokens = userParams.max_completion_tokens;
        } else {
            params.max_completion_tokens = reasoningModelParams.max_completion_tokens;
        }
        
        // Add reasoning-specific parameters only if model supports them
        if (supportsFeature(model, 'supportsReasoningEffort')) {
            if (userParams.reasoning_effort) {
                params.reasoning_effort = userParams.reasoning_effort;
            } else {
                params.reasoning_effort = reasoningModelParams.reasoning_effort;
            }
        }
        
        // GPT-5 specific parameters
        if (supportsFeature(model, 'supportsVerbosity') && userParams.verbosity) {
            params.verbosity = userParams.verbosity;
        }
        
        return params;
    } else {
        // For non-reasoning models, use standard parameters
        return {
            temperature: userParams.temperature || defaultParams.temperature,
            top_p: userParams.top_p || defaultParams.top_p,
            frequency_penalty: userParams.frequency_penalty || defaultParams.frequency_penalty,
            presence_penalty: userParams.presence_penalty || defaultParams.presence_penalty,
            max_tokens: userParams.max_tokens || defaultParams.max_tokens
        };
    }
};

module.exports = {
    devMode,
    apiKeys,
    apiUrls,
    defaultParams,
    reasoningModelParams,
    modelFeatures,
    getApiConfig,
    supportsFeature,
    isReasoningModel,
    getModelParameters
};