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
    o3Mini: process.env.O3_API_KEY, // 添加 o3-mini 模型的 API Key
    deepseek: process.env.DEEPSEEK_API_KEY, // 添加DeepSeek的API密钥
    // Default key based on environment
    default: devMode ? process.env.API_KEY_DEV : process.env.GPT_4O_MINI_API_KEY
};

// API URLs Configuration
const apiUrls = {
    gpt4o: process.env.GPT_4O_API_URL,
    gpt4oMini: process.env.GPT_4O_MINI_API_URL,
    o1: process.env.O1_API_URL,
    o1Mini: process.env.O1_MINI_API_URL,
    o3Mini: process.env.O3_API_URL,
    deepseek: `${process.env.DEEPSEEK_API_URL}/chat/completions`, // 添加正确的端点路径
    // Default URL based on environment
    default: devMode ? process.env.API_URL_DEV : process.env.GPT_4O_MINI_API_URL
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
 * 获取模型支持的特性
 * @type {Object}
 */
const modelFeatures = {
    "gpt-4o": { supportsFunctionCalls: true, supportsSystemMessages: true },
    "gpt-4o-mini": { supportsFunctionCalls: true, supportsSystemMessages: true },
    "o1": { supportsFunctionCalls: false, supportsSystemMessages: false },
    "o1-mini": { supportsFunctionCalls: false, supportsSystemMessages: false },
    "o3-mini": { supportsFunctionCalls: true, supportsSystemMessages: true }, // 添加 o3-mini 的功能支持配置
    "deepseek-r1": { supportsFunctionCalls: true, supportsSystemMessages: true } // 添加DeepSeek-R1的功能支持
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
    default:
        // Default to GPT-4O if model not specified
        apiKey = apiKeys.gpt4o;
        apiUrl = apiUrls.gpt4o;
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