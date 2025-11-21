// ReasoningAdapter.js - Unified adapter for all reasoning models
// Supports: GPT-5 series (gpt-5, gpt-5-mini, gpt-5-nano, gpt-5-chat) and O-series (o1, o1-mini, o3, o3-mini, o4-mini)
// Reference: https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/reasoning
const BaseAdapter = require("./BaseAdapter");

class ReasoningAdapter extends BaseAdapter {
    constructor(config) {
        super(config);
    }

    // Process request body - optimized for all reasoning models
    // All reasoning models require max_completion_tokens and don't support:
    // temperature, top_p, presence_penalty, frequency_penalty, max_tokens
    processRequestBody(prompt, params) {
        // All reasoning models require max_completion_tokens instead of max_tokens
        const optimizedParams = {
            ...params
        };

        // Remove max_tokens if present (not supported by reasoning models)
        if (optimizedParams.max_tokens) {
            delete optimizedParams.max_tokens;
            console.log("Removed unsupported 'max_tokens' parameter for reasoning model");
        }

        // Ensure max_completion_tokens is present
        // For reasoning models, max_completion_tokens includes visible output + reasoning_tokens
        // Reference: https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/reasoning
        if (!optimizedParams.max_completion_tokens) {
            optimizedParams.max_completion_tokens = 16000; // Increased default for reasoning models
            console.log("Added default max_completion_tokens: 16000 (includes reasoning tokens)");
        } else if (optimizedParams.max_completion_tokens < 4000) {
            console.warn(`⚠️  Warning: max_completion_tokens (${optimizedParams.max_completion_tokens}) is low for reasoning models. May cause incomplete responses. Recommended: 4000+`);
        }

        // Remove other unsupported parameters for reasoning models
        const unsupportedParams = ["temperature", "top_p", "presence_penalty", "frequency_penalty"];
        unsupportedParams.forEach(param => {
            if (optimizedParams[param] !== undefined) {
                delete optimizedParams[param];
                console.log(`Removed unsupported '${param}' parameter for reasoning model`);
            }
        });

        // Build request body
        const requestBody = {
            messages: prompt,
            ...optimizedParams
        };

        // Handle reasoning effort parameter if present
        if (optimizedParams.reasoning_effort) {
            requestBody.reasoning_effort = optimizedParams.reasoning_effort;
            console.log(`Added reasoning effort: ${optimizedParams.reasoning_effort}`);
        }

        // Handle reasoning summary parameter if present
        if (optimizedParams.reasoning) {
            requestBody.reasoning = optimizedParams.reasoning;
            console.log(`Added reasoning summary config: ${JSON.stringify(optimizedParams.reasoning)}`);
        }

        // Handle verbosity parameter (GPT-5 specific feature)
        if (optimizedParams.verbosity) {
            requestBody.verbosity = optimizedParams.verbosity;
            console.log(`Added verbosity: ${optimizedParams.verbosity}`);
        }

        // Handle preamble parameter (GPT-5 specific feature)
        if (optimizedParams.preamble) {
            requestBody.preamble = optimizedParams.preamble;
            console.log(`Added preamble: ${optimizedParams.preamble}`);
        }

        console.log("Reasoning model request body prepared:", JSON.stringify(requestBody, null, 2));

        return requestBody;
    }

    // Get model name for logging
    getModelName() {
        return "Reasoning Model";
    }
}

module.exports = ReasoningAdapter;
