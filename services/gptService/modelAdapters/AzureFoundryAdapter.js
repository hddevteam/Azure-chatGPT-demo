// AzureFoundryAdapter.js - Adapter for Azure AI Foundry project models
// Handles models deployed through Azure AI Foundry project endpoints (gpt-5.2, gpt-5.1, etc.)
// Reference: https://learn.microsoft.com/en-us/azure/ai-foundry/foundry-models/how-to/quickstart-ai-project
const ReasoningAdapter = require("./ReasoningAdapter");

class AzureFoundryAdapter extends ReasoningAdapter {
    constructor(config, modelName) {
        super(config);
        this.modelName = modelName; // Store the actual model name (e.g., "gpt-5.2")
    }

    // Process request body - extends ReasoningAdapter with model parameter
    // Azure AI Foundry endpoints require explicit model specification in request body
    processRequestBody(prompt, params) {
        // Get the base reasoning model request body
        const requestBody = super.processRequestBody(prompt, params);

        // Add the model parameter required by Azure AI Foundry
        requestBody.model = this.modelName;
        console.log(`Added model parameter for Azure AI Foundry: ${this.modelName}`);

        return requestBody;
    }

    // Get model name for logging
    getModelName() {
        return `Azure AI Foundry (${this.modelName})`;
    }
}

module.exports = AzureFoundryAdapter;
