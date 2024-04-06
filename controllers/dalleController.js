const axios = require("axios");

const devMode = process.env.DEV_MODE ? eval(process.env.DEV_MODE) : false;
let apiKey;
if(devMode){
    apiKey = process.env.API_KEY_DEV;
}else{
    apiKey = process.env.API_DALLE_KEY;
}


async function textToImageHandler(req, res) {
    const caption = req.body.caption;
    if (!caption) {
        res.status(400).json({ message: "请输入一个描述以生成图像" });
        return;
    }

    try {
        const url = process.env.API_DALLE_URL;
        const headers = { "api-key": apiKey, "Content-Type": "application/json" };
        const body = {
            prompt: caption,
            n: 1,
            size: "1024x1024",
            quality: "hd",
            style: "vivid"
        };

        console.log("Requesting image from DALL-E API", url, headers, body);

        // 使用axios发送POST请求
        const submission = await axios.post(url, body, { headers });
        const { data } = submission.data; // API的响应数据
        if (data && data.length > 0) {
            const { url, revised_prompt } = data[0];
            res.json({ url, revised_prompt }); // 正常情况下只返回需要的字段
        } else {
            // 当数据不符合预期时，尝试返回content_filter_results
            const contentFilterResults = data[0]?.content_filter_results;
            throw new Error("API未返回预期的图像数据。", { contentFilterResults });
        }
    } catch (error) {
        console.error(error);
        // 根据错误类型判断是否携带了content_filter_results
        if (error.contentFilterResults) {
            res.status(500).json({ message: error.message, contentFilterResults: error.contentFilterResults });
        } else {
            res.status(500).json({ message: error.message || "获取图像时出错，请稍后重试" });
        }
    }
}

module.exports = {
    textToImageHandler
};
