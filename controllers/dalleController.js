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
        res.status(400).json({ message: "Please enter a description to generate image" });
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

        console.log("Requesting image from DALL-E API", url, body);

        // Use axios to send POST request
        const submission = await axios.post(url, body, { headers });
        const { data } = submission.data; // API response data
        if (data && data.length > 0) {
            const { url, revised_prompt } = data[0];
            res.json({ url, revised_prompt }); // In normal cases, only return required fields        } else {
            // When data doesn't meet expectations, try to return content_filter_results
            const contentFilterResults = data[0]?.content_filter_results;
            throw new Error("API did not return expected image data.", { contentFilterResults });
        }
    } catch (error) {
        console.error(error);
        // Check if error carries content_filter_results based on error type
        if (error.contentFilterResults) {
            res.status(500).json({ message: error.message, contentFilterResults: error.contentFilterResults });
        } else {
            res.status(500).json({ message: error.message || "Error getting image, please try again later" });
        }
    }
}

module.exports = {
    textToImageHandler
};
