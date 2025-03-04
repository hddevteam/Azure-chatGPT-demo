// AdapterFactory.js - 适配器工厂
const BaseAdapter = require("./BaseAdapter");
const DeepSeekAdapter = require("./DeepSeekAdapter");

class AdapterFactory {
    static getAdapter(model, config) {
        switch (model) {
        case "deepseek-r1":
            return new DeepSeekAdapter(config);
        default:
            return new BaseAdapter(config);
        }
    }
}

module.exports = AdapterFactory;