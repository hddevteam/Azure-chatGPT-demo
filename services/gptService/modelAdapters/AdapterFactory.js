// AdapterFactory.js - Adapter factory
const BaseAdapter = require("./BaseAdapter");
const DeepSeekAdapter = require("./DeepSeekAdapter");
const ReasoningAdapter = require("./ReasoningAdapter");

class AdapterFactory {
    static getAdapter(model, config) {
        switch (model) {
        case "deepseek-r1":
            return new DeepSeekAdapter(config);
        // All reasoning models (GPT-5 series and O-series) use the same adapter
        case "o1":
        case "o1-mini":
        case "o3":
        case "o3-mini":
        case "o4-mini":
        case "gpt-5":
        case "gpt-5-mini":
        case "gpt-5-nano":
        case "gpt-5-chat":
            return new ReasoningAdapter(config);
        default:
            return new BaseAdapter(config);
        }
    }
}

module.exports = AdapterFactory;