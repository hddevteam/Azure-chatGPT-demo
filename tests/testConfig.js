/**
 * Test Configuration for New Models
 * 
 * This file contains configuration settings and utilities for testing
 * the new GPT-5 series and O3-PRO model integrations.
 */

const dotenv = require("dotenv");
dotenv.config();

/**
 * Test Configuration Object
 */
const testConfig = {
    // API Endpoints for Testing
    endpoints: {
        gpt5: process.env.GPT_5_API_URL || "https://gpt-5.openai.azure.com/",
        gpt5Mini: process.env.GPT_5_MINI_API_URL || "https://gpt-5-mini.openai.azure.com/",
        gpt5Nano: process.env.GPT_5_NANO_API_URL || "https://gpt-5-nano.openai.azure.com/",
        gpt5Chat: process.env.GPT_5_CHAT_API_URL || "https://gpt-5-chat.openai.azure.com/",
        o3Pro: process.env.O3_PRO_API_URL || "https://o3-pro.openai.azure.com/"
    },

    // API Keys for Testing
    apiKeys: {
        gpt5: process.env.GPT_5_API_KEY,
        gpt5Mini: process.env.GPT_5_MINI_API_KEY,
        gpt5Nano: process.env.GPT_5_NANO_API_KEY,
        gpt5Chat: process.env.GPT_5_CHAT_API_KEY,
        o3Pro: process.env.O3_PRO_API_KEY
    },

    // Test Timeouts (in milliseconds)
    timeouts: {
        short: 10000,      // 10 seconds - for quick tests
        medium: 30000,     // 30 seconds - for standard API calls
        long: 60000,       // 60 seconds - for complex operations
        extended: 120000   // 2 minutes - for O3-PRO reasoning
    },

    // Model Feature Matrix for Testing
    modelFeatures: {
        "gpt-5": {
            functionCalling: true,
            vision: true,
            systemMessages: true,
            structuredOutputs: true,
            reasoningEffort: false,
            verbosity: true,
            preamble: true,
            contextWindow: 272000
        },
        "gpt-5-mini": {
            functionCalling: true,
            vision: true,
            systemMessages: true,
            structuredOutputs: true,
            reasoningEffort: false,
            verbosity: true,
            preamble: true,
            contextWindow: 272000
        },
        "gpt-5-nano": {
            functionCalling: true,
            vision: true,
            systemMessages: true,
            structuredOutputs: true,
            reasoningEffort: false,
            verbosity: true,
            preamble: true,
            contextWindow: 272000
        },
        "gpt-5-chat": {
            functionCalling: false,
            vision: false,
            systemMessages: true,
            structuredOutputs: true,
            reasoningEffort: false,
            verbosity: false,
            preamble: false,
            contextWindow: 128000
        },
        "o3-pro": {
            functionCalling: true,
            vision: false,
            systemMessages: true,
            structuredOutputs: true,
            reasoningEffort: true,
            verbosity: false,
            preamble: false,
            contextWindow: 200000,
            requiresBackgroundMode: true
        }
    },

    // Test Data Templates
    testPrompts: {
        simple: [
            { role: "user", content: "Say hello in one word." }
        ],
        
        reasoning: [
            { 
                role: "user", 
                content: "Solve this step by step: If a train travels 120 km in 2 hours, what is its average speed in km/h?" 
            }
        ],
        
        vision: [
            { 
                role: "user", 
                content: [
                    {
                        type: "text",
                        text: "What do you see in this image?"
                    },
                    {
                        type: "image_url",
                        image_url: {
                            url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
                        }
                    }
                ]
            }
        ],

        functionCalling: [
            { 
                role: "user", 
                content: "What's the current weather in Beijing? Use the weather function to get accurate information." 
            }
        ],

        complex: [
            { 
                role: "user", 
                content: "Analyze the philosophical implications of artificial consciousness. Consider multiple perspectives including functionalism, integrated information theory, and global workspace theory. Provide a structured argument with clear reasoning." 
            }
        ]
    },

    // Sample Function Definitions for Testing
    testFunctions: [
        {
            name: "get_weather",
            description: "Get current weather information for a specified location",
            parameters: {
                type: "object",
                properties: {
                    location: {
                        type: "string",
                        description: "The city name or location"
                    },
                    units: {
                        type: "string",
                        enum: ["celsius", "fahrenheit"],
                        description: "Temperature units"
                    }
                },
                required: ["location"]
            }
        },
        {
            name: "calculate_math",
            description: "Perform mathematical calculations",
            parameters: {
                type: "object",
                properties: {
                    expression: {
                        type: "string",
                        description: "Mathematical expression to evaluate"
                    }
                },
                required: ["expression"]
            }
        }
    ],

    // Performance Benchmarks
    performanceBenchmarks: {
        responseTime: {
            "gpt-5": 15000,
            "gpt-5-mini": 10000,
            "gpt-5-nano": 8000,
            "gpt-5-chat": 12000,
            "o3-pro": 60000
        },
        
        tokenEfficiency: {
            maxTokensPerRequest: 4000,
            expectedMinTokens: 10,
            reasonableTokenRange: [50, 2000]
        },
        
        memoryUsage: {
            maxMemoryIncreaseMB: 100,
            maxConcurrentRequests: 10
        }
    }
};

/**
 * Utility Functions for Testing
 */
const testUtils = {
    /**
     * Check if a model supports a specific feature
     * @param {string} model - Model name
     * @param {string} feature - Feature to check
     * @returns {boolean}
     */
    supportsFeature(model, feature) {
        const modelConfig = testConfig.modelFeatures[model];
        return modelConfig ? !!modelConfig[feature] : false;
    },

    /**
     * Get appropriate timeout for a model and operation type
     * @param {string} model - Model name
     * @param {string} operationType - Type of operation
     * @returns {number} Timeout in milliseconds
     */
    getTimeout(model, operationType = "medium") {
        if (model === "o3-pro" && operationType !== "short") {
            return testConfig.timeouts.extended;
        }
        return testConfig.timeouts[operationType] || testConfig.timeouts.medium;
    },

    /**
     * Validate environment variables for testing
     * @returns {object} Validation result
     */
    validateEnvironment() {
        const missing = [];
        const available = [];

        Object.entries(testConfig.apiKeys).forEach(([model, key]) => {
            if (!key) {
                missing.push(`${model.toUpperCase()}_API_KEY`);
            } else {
                available.push(model);
            }
        });

        Object.entries(testConfig.endpoints).forEach(([model, url]) => {
            const envVar = `${model.toUpperCase().replace("5", "_5")}_API_URL`;
            if (!url || url.includes("undefined")) {
                missing.push(envVar);
            }
        });

        return {
            isValid: missing.length === 0,
            missingVariables: missing,
            availableModels: available,
            canRunTests: available.length > 0
        };
    },

    /**
     * Create a test request payload
     * @param {string} model - Model name
     * @param {string} promptType - Type of prompt
     * @param {object} additionalParams - Additional parameters
     * @returns {object} Request payload
     */
    createTestRequest(model, promptType = "simple", additionalParams = {}) {
        const prompt = testConfig.testPrompts[promptType];
        if (!prompt) {
            throw new Error(`Unknown prompt type: ${promptType}`);
        }

        const baseRequest = {
            prompt: JSON.stringify(prompt),
            model: model,
            params: {
                temperature: 0.3,
                max_tokens: 200,
                ...additionalParams
            }
        };

        // Add model-specific parameters
        if (model === "o3-pro" && additionalParams.reasoningEffort) {
            baseRequest.params.reasoningEffort = additionalParams.reasoningEffort;
        }

        if (this.supportsFeature(model, "verbosity") && additionalParams.verbosity) {
            baseRequest.params.verbosity = additionalParams.verbosity;
        }

        // Add functions if the prompt type requires them and model supports it
        if (promptType === "functionCalling" && this.supportsFeature(model, "functionCalling")) {
            baseRequest.functions = testConfig.testFunctions;
        }

        return baseRequest;
    },

    /**
     * Log test results in a formatted way
     * @param {string} testName - Name of the test
     * @param {object} result - Test result
     * @param {string} model - Model being tested
     */
    logTestResult(testName, result, model) {
        const timestamp = new Date().toISOString();
        const status = result.success ? "✅ PASS" : "❌ FAIL";
        
        console.log(`[${timestamp}] ${status} ${testName} (${model})`);
        
        if (result.responseTime) {
            console.log(`  ⏱️  Response Time: ${result.responseTime}ms`);
        }
        
        if (result.tokens) {
            console.log(`  🔢 Tokens Used: ${result.tokens}`);
        }
        
        if (result.error) {
            console.log(`  ❗ Error: ${result.error}`);
        }
        
        if (result.details) {
            console.log(`  📋 Details: ${JSON.stringify(result.details, null, 2)}`);
        }
    }
};

module.exports = {
    testConfig,
    testUtils
};
