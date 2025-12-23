// Test configuration for GPT-5.2 and GPT-5.1 models
// This file validates the Azure AI Foundry endpoint configuration

// Load environment variables
require("dotenv").config();

const config = require("../services/gptService/config");
const AdapterFactory = require("../services/gptService/modelAdapters/AdapterFactory");

console.log("=== Testing GPT-5.2 and GPT-5.1 Configuration ===\n");

// Test models
const testModels = ["gpt-5.2", "gpt-5.1"];

testModels.forEach(model => {
    console.log(`\n--- Testing ${model} ---`);
    
    // Test 1: API Configuration
    const apiConfig = config.getApiConfig(model);
    console.log("API Configuration:");
    console.log("  - API Key:", apiConfig.apiKey ? "✓ Configured" : "✗ Missing");
    console.log("  - API URL:", apiConfig.apiUrl ? "✓ Configured" : "✗ Missing");
    console.log("  - Endpoint:", apiConfig.apiUrl || "Not configured");
    
    // Test 2: Model Features
    console.log("\nModel Features:");
    const features = config.modelFeatures[model];
    if (features) {
        console.log("  ✓ Function Calling:", features.supportsFunctionCalling);
        console.log("  ✓ Vision:", features.supportsVision);
        console.log("  ✓ Reasoning Effort:", features.supportsReasoningEffort);
        console.log("  ✓ Reasoning Summary:", features.supportsReasoningSummary);
        console.log("  ✓ Verbosity Control:", features.supportsVerbosity);
        console.log("  ✓ Max Tokens:", features.maxTokens);
        console.log("  ✓ Output Tokens:", features.outputTokens);
        console.log("  ✓ Foundry Model:", features.isFoundryModel);
    } else {
        console.log("  ✗ Features not configured");
    }
    
    // Test 3: Check if it's a reasoning model
    const isReasoning = config.isReasoningModel(model);
    console.log("\nReasoning Model:", isReasoning ? "✓ Yes" : "✗ No");
    
    // Test 4: Adapter
    const adapter = AdapterFactory.getAdapter(model, config);
    console.log("Adapter:", adapter.constructor.name);
    console.log("Adapter Model Name:", adapter.getModelName());
    
    // Test 5: Model Parameters
    const testParams = {
        max_tokens: 8000,
        temperature: 0.7,
        reasoning_effort: "medium"
    };
    const processedParams = config.getModelParameters(model, testParams);
    console.log("\nParameter Processing:");
    console.log("  - Input params:", JSON.stringify(testParams));
    console.log("  - Processed params:", JSON.stringify(processedParams));
    
    // Test 6: Request Body Generation
    console.log("\nRequest Body Test:");
    const testMessages = [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Hello!" }
    ];
    const requestBody = adapter.processRequestBody(testMessages, processedParams);
    console.log("  - Has 'model' field:", requestBody.model ? `✓ (${requestBody.model})` : "✗ Missing");
    console.log("  - Has messages:", requestBody.messages ? "✓" : "✗");
    console.log("  - Has max_completion_tokens:", requestBody.max_completion_tokens ? "✓" : "✗");
    console.log("  - Removed unsupported params:", !requestBody.temperature && !requestBody.top_p ? "✓" : "✗");
});

console.log("\n=== Configuration Test Complete ===");
console.log("\n📝 Key Points for Azure AI Foundry Models:");
console.log("  1. Both gpt-5.2 and gpt-5.1 share the same endpoint");
console.log("  2. Model differentiation is done via 'model' parameter in request body");
console.log("  3. Both use AzureFoundryAdapter which extends ReasoningAdapter");
console.log("  4. Request format follows Azure AI Foundry project API specification");
console.log("  5. Authentication uses api-key header");

// Test environment variables
console.log("\n📋 Environment Variables Check:");
console.log("  - AZURE_AI_FOUNDRY_ENDPOINT:", process.env.AZURE_AI_FOUNDRY_ENDPOINT ? "✓ Set" : "✗ Not set");
console.log("  - AZURE_AI_FOUNDRY_KEY:", process.env.AZURE_AI_FOUNDRY_KEY ? "✓ Set" : "✗ Not set");
