// OSeriesAdapter.js - O-series models (o1, o1-mini, o3, o3-mini, etc.) dedicated adapter
const BaseAdapter = require("./BaseAdapter");

class OSeriesAdapter extends BaseAdapter {
    constructor(config) {
        super(config);
    }

    // Process request body - optimized for O-series models
    processRequestBody(prompt, params) {
        // O-series models need more completion tokens for reasoning process
        const optimizedParams = {
            ...params
        };

        // If using max_completion_tokens, ensure sufficient tokens for reasoning and generation
        if (optimizedParams.max_completion_tokens) {
            // Dynamically adjust token count based on task complexity
            const originalTokens = optimizedParams.max_completion_tokens;
            const minTokensForReasoning = 3000;  // Base tokens needed for reasoning process
            const minTokensForOutput = 500;     // Base tokens needed for output content
            const recommendedTokens = minTokensForReasoning + minTokensForOutput;
            
            if (originalTokens < recommendedTokens) {
                console.log(`O-series model token optimization: increased from ${originalTokens} to ${recommendedTokens} (reasoning:${minTokensForReasoning} + output:${minTokensForOutput})`);
                optimizedParams.max_completion_tokens = recommendedTokens;
            } else {
                console.log(`O-series model token setting: ${originalTokens} tokens (sufficient)`);
            }
        }

        return {
            messages: prompt,
            ...optimizedParams
        };
    }

    // Get model name for logging
    getModelName() {
        // Return generic name for O-series models
        return "O-series Model";
    }
}

module.exports = OSeriesAdapter;
