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
    o3Mini: process.env.O3_API_KEY, // API Key for o3-mini model
    deepseek: process.env.DEEPSEEK_API_KEY, // API Key for DeepSeek
    o4Mini: process.env.O4_MINI_API_KEY, // API Key for o4-mini model
    gpt45: process.env.GPT_4_5_API_KEY, // API Key for gpt-4.5-preview model
    gpt41: process.env.GPT_4_1_API_KEY, // API Key for gpt-4.1 model
    gpt41Nano: process.env.GPT_4_1_NANO_API_KEY, // API Key for gpt-4.1-nano model
    gpt41Mini: process.env.GPT_4_1_MINI_API_KEY, // API Key for gpt-4.1-mini model
    // Default key based on environment
    default: devMode ? process.env.API_KEY_DEV : process.env.GPT_4_1_API_KEY
};

// API URLs Configuration
const apiUrls = {
    gpt4o: process.env.GPT_4O_API_URL,
    gpt4oMini: process.env.GPT_4O_MINI_API_URL,
    o1: process.env.O1_API_URL,
    o1Mini: process.env.O1_MINI_API_URL,
    o3Mini: process.env.O3_API_URL,
    deepseek: `${process.env.DEEPSEEK_API_URL}/chat/completions`,
    o4Mini: process.env.O4_MINI_API_URL, // URL for o4-mini model
    gpt45: process.env.GPT_4_5_API_URL, // URL for gpt-4.5-preview model
    gpt41: process.env.GPT_4_1_API_URL, // URL for gpt-4.1 model
    gpt41Nano: process.env.GPT_4_1_NANO_API_URL, // URL for gpt-4.1-nano model
    gpt41Mini: process.env.GPT_4_1_MINI_API_URL, // URL for gpt-4.1-mini model
    // Default URL based on environment
    default: devMode ? process.env.API_URL_DEV : process.env.GPT_4_1_API_URL
};

// Default parameters for API requests
const defaultParams = {
    temperature: 0.8,
    top_p: 0.95,
    frequency_penalty: 0,
    presence_penalty: 0,
    max_tokens: 2000
};

/**
 * Get model supported features
 * @type {Object}
 */
const modelFeatures = {
    "gpt-4o": { supportsFunctionClls: true, supportsSystemMessages: true },
    "gpt-4o-mini": { supportsFunctionCalls: true, supportsSystemMessages: true },
    "o1": { supportsFunctionCalls: false, supportsSystemMessages: false },
    "o1-mini": { supportsFunctionCalls: false, supportsSystemMessages: false },
    "o3-mini": { supportsFunctionCalls: true, supportsSystemMessages: true },
    "deepseek-r1": { supportsFunctionCalls: true, supportsSystemMessages: true },
    "o4-mini": { supportsFunctionCalls: true, supportsSystemMessages: true }, // Support for o4-mini features
    "gpt-4.5-preview": { supportsFunctionCalls: true, supportsSystemMessages: true }, // Support for gpt-4.5 features
    "gpt-4.1": { supportsFunctionCalls: true, supportsSystemMessages: true }, // Support for gpt-4.1 features
    "gpt-4.1-nano": { supportsFunctionCalls: true, supportsSystemMessages: true }, // Support for gpt-4.1-nano features
    "gpt-4.1-mini": { supportsFunctionCalls: true, supportsSystemMessages: true } // Support for gpt-4.1-mini features
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
    case "o3-mini":
        apiKey = apiKeys.o3Mini;
        apiUrl = apiUrls.o3Mini;
        break;
    case "deepseek-r1":  // 添加 deepseek-r1 的配置
        apiKey = apiKeys.deepseek;
        apiUrl = apiUrls.deepseek;
        break;
    case "o4-mini":  // 添加 o4-mini 的配置
        apiKey = apiKeys.o4Mini;
        apiUrl = apiUrls.o4Mini;
        break;
    case "gpt-4.5-preview":  // 添加 gpt-4.5-preview 的配置
        apiKey = apiKeys.gpt45;
        apiUrl = apiUrls.gpt45;
        break;
    case "gpt-4.1":  // 添加 gpt-4.1 的配置
        apiKey = apiKeys.gpt41;
        apiUrl = apiUrls.gpt41;
        break;
    case "gpt-4.1-nano":  // 添加 gpt-4.1-nano 的配置
        apiKey = apiKeys.gpt41Nano;
        apiUrl = apiUrls.gpt41Nano;
        break;
    case "gpt-4.1-mini":  // 添加 gpt-4.1-mini 的配置
        apiKey = apiKeys.gpt41Mini;
        apiUrl = apiUrls.gpt41Mini;
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
 * 检查模型是否支持指定的功能
 * @param {string} model - 模型名称
 * @param {string} feature - 功能名称
 * @returns {boolean} 是否支持该功能
 */
const supportsFeature = (model, feature) => {
    const features = modelFeatures[model] || modelFeatures["gpt-4o"]; // 默认使用 gpt-4o 的特性
    return !!features[feature];
};

module.exports = {
    devMode,
    apiKeys,
    apiUrls,
    defaultParams,
    modelFeatures,
    getApiConfig,
    supportsFeature
};