// public/config/reasoningConfig.js
/**
 * Configuration for reasoning models UI controls
 * Based on Azure OpenAI reasoning models documentation
 */

const reasoningConfig = {
    // Models that support reasoning effort parameter
    reasoningEffortModels: ["o1", "o1-mini", "o3", "o3-mini", "o4-mini"],
    
    // Models that support reasoning summary (limited access)
    reasoningSummaryModels: ["o3", "o4-mini"],
    
    // Models that support developer messages instead of system messages
    developerMessageModels: ["o1", "o1-mini", "o3", "o3-mini", "o4-mini"],
    
    // Reasoning effort options
    reasoningEffortOptions: [
        { value: "low", label: "Low - Faster processing, fewer reasoning tokens" },
        { value: "medium", label: "Medium - Balanced processing (default)" },
        { value: "high", label: "High - Deeper reasoning, more tokens" }
    ],
    
    // Reasoning summary options
    reasoningSummaryOptions: [
        { value: "auto", label: "Auto - Summary when beneficial" },
        { value: "concise", label: "Concise - Brief reasoning summary" },
        { value: "detailed", label: "Detailed - Comprehensive reasoning summary" }
    ],
    
    // Check if model supports reasoning effort
    supportsReasoningEffort: function(model) {
        return this.reasoningEffortModels.includes(model);
    },
    
    // Check if model supports reasoning summary
    supportsReasoningSummary: function(model) {
        return this.reasoningSummaryModels.includes(model);
    },
    
    // Check if model uses developer messages
    usesDeveloperMessages: function(model) {
        return this.developerMessageModels.includes(model);
    },
    
    // Get model-specific UI hints
    getModelHints: function(model) {
        const hints = [];
        
        if (this.supportsReasoningEffort(model)) {
            hints.push("💡 This model supports reasoning effort control for deeper analysis");
        }
        
        if (this.supportsReasoningSummary(model)) {
            hints.push("🔍 Reasoning summary available (requires limited access)");
        }
        
        if (this.usesDeveloperMessages(model)) {
            hints.push("👨‍💻 System prompts will be converted to developer messages");
        }
        
        if (model === "o3-mini" || model === "o1") {
            hints.push("📝 Markdown formatting enhanced for better code display");
        }
        
        return hints;
    },
    
    // Get default reasoning effort based on model
    getDefaultReasoningEffort: function(model) {
        if (!this.supportsReasoningEffort(model)) return null;
        
        // Default to medium for most cases
        return "medium";
    },
    
    // Get token recommendations for reasoning models
    getTokenRecommendations: function(model, hasWebSearch = false) {
        if (!this.reasoningEffortModels.includes(model)) {
            return { min: 500, recommended: 2000, max: 4000 };
        }
        
        // O-series models need more tokens for reasoning
        if (hasWebSearch) {
            return { 
                min: 3000, 
                recommended: 6000, 
                max: 10000,
                note: "Higher tokens recommended for web search + reasoning"
            };
        }
        
        return { 
            min: 2000, 
            recommended: 4000, 
            max: 8000,
            note: "Reasoning models require more tokens"
        };
    }
};

// Export for use in browser environment
if (typeof module !== "undefined" && module.exports) {
    module.exports = reasoningConfig;
} else {
    window.reasoningConfig = reasoningConfig;
}
