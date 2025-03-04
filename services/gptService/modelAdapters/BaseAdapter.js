// BaseAdapter.js - 基础模型适配器接口
class BaseAdapter {
    constructor(config) {
        this.config = config;
    }

    // 处理请求头
    getHeaders(apiKey) {
        return {
            "Content-Type": "application/json",
            "api-key": apiKey
        };
    }

    // 处理请求参数
    processRequestParameters(params) {
        return params;
    }

    // 处理请求体
    processRequestBody(prompt, params) {
        return {
            messages: prompt,
            ...params
        };
    }
}

module.exports = BaseAdapter;