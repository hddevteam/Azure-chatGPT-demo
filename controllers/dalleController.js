const axios = require("axios");

const devMode = process.env.DEV_MODE ? eval(process.env.DEV_MODE) : false;
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
            prompt: caption,
            n: 1,
            size: "1024x1024"
        };

        const submission = await axios.post(url, body, { headers: headers });
        const operation_location = submission.headers["operation-location"];
        const retry_after = submission.headers["retry-after"];
        let status = "";
        let image_url = "";
        
        while (status !== "succeeded" && status !== "failed") {
            await new Promise((resolve) => setTimeout(resolve, parseInt(retry_after) * 1000));
            const response = await axios.get(operation_location, { headers: headers });
            status = response.data["status"];
            console.log(status);
            console.log(response.data);
            
            if (status === "succeeded") {
                image_url = response.data["result"]["data"][0]["url"];
                console.log(response.data["result"]["data"][0]);
            } else if (status === "failed") {
                res.status(500).json({ message: "生成图像时出错，请稍后重试" });
                return;
            }
        }

        if (image_url) {
            res.json({ imageUrl: image_url });
        } else {
            res.status(500).json({ message: "生成图像时出错，请稍后重试" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "生成图像时出错，请稍后重试" });
    }
}

module.exports = {
    textToImageHandler
};
