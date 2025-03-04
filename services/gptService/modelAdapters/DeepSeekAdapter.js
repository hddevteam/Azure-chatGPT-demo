// DeepSeekAdapter.js - DeepSeek 模型专用适配器
const BaseAdapter = require("./BaseAdapter");

class DeepSeekAdapter extends BaseAdapter {
    constructor(config) {
        super(config);
    }

    // 重写请求头处理方法，添加 Bearer token
    getHeaders(apiKey) {
        return {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        };
    }

    // 重写参数处理方法
    processRequestParameters(params) {
        // 确保所有参数都是正确的类型
        const processedParams = {
            temperature: params.temperature ? parseFloat(params.temperature) : 0.7,
            top_p: params.top_p ? parseFloat(params.top_p) : 1,
            max_tokens: params.max_tokens ? parseInt(params.max_tokens) : 2048,
            stream: params.stream || false
        };
        return processedParams;
    }

    // 重写请求体处理方法
    processRequestBody(prompt, params) {
        // 确保消息格式正确
        if (!Array.isArray(prompt)) {
            prompt = [{ role: "user", content: prompt }];
        }

        // 构造标准的请求体
        return {
            model: "deepseek-r1", // 明确指定模型名称
            messages: prompt.map(msg => ({
                role: msg.role,
                content: msg.content
            })),
            ...this.processRequestParameters(params)
        };
    }
}

module.exports = DeepSeekAdapter;