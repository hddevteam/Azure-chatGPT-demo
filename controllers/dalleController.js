const axios = require("axios");
//if DEV_MODE is not set then set it to true, else set it to eval(DEV_MODE)
const devMode = process.env.DEV_MODE ? eval(process.env.DEV_MODE) : false;
//if not devMode then use process.env.API_URL as apiUrl and process.env.API_KEY as apiKey
//else use process.env.API_URL_DEV as apiUrl and process.env.API_KEY_DEV as apiKey
let apiKey;
if(devMode){
    apiKey = process.env.API_KEY_DEV;
}else{
    apiKey = process.env.API_KEY;
}

async function textToImageHandler(req, res) {
    const caption = req.body.caption;

    if (!caption) {
        res.status(400).json({ message: "请输入一个描述以生成图像" });
        return;
    }

    try {
        const url = process.env.API_DALLE_URL;

        const headers = {
            "api-key": apiKey,
            "Content-Type": "application/json"
        };

        const body = {
            caption: caption,
            resolution: "1024x1024"
        };

        const submission = await axios.post(url, body, { headers: headers });
        const operation_location = submission.headers["operation-location"];
        const retry_after = submission.headers["retry-after"];
        let status = "";

        while (status !== "Succeeded") {
            await new Promise((resolve) => setTimeout(resolve, parseInt(retry_after) * 1000));
            const response = await axios.get(operation_location, { headers: headers });
            status = response.data["status"];
            if (status === "Succeeded") {
                const image_url = response.data["result"]["contentUrl"];
                res.json({ imageUrl: image_url });
            }
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "生成图像时出错，请稍后重试" });
    }
}

module.exports = {
    textToImageHandler
};