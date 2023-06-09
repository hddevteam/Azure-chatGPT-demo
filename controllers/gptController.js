//if DEV_MODE is not set then set it to true, else set it to eval(DEV_MODE)
const devMode = process.env.DEV_MODE ? eval(process.env.DEV_MODE) : false;
//if not devMode then use process.env.API_URL as apiUrl and process.env.API_KEY as apiKey
//else use process.env.API_URL_DEV as apiUrl and process.env.API_KEY_DEV as apiKey
let apiKey, apiUrl, gpt4Apikey, gpt4ApiUrl;
if(devMode){
    apiKey = process.env.API_KEY_DEV;
    apiUrl = process.env.API_URL_DEV;
    gpt4Apikey = process.env.GPT_4_API_KEY_DEV;
    gpt4ApiUrl = process.env.GPT_4_API_URL_DEV;
}else{
    apiKey = process.env.API_KEY;
    apiUrl = process.env.API_URL;
    gpt4Apikey = process.env.GPT_4_API_KEY;
    gpt4ApiUrl = process.env.GPT_4_API_URL;
}

exports.generateResponse = async (req, res) => {
    const prompt = JSON.parse(req.body.prompt);
    const model = req.body.model;
    
    // Check for valid prompt
    if (!prompt || !prompt.length) {
        console.error("Invalid prompt");
        return res.status(400).send("Invalid prompt");
    }

    const axios = require("axios");

    const currentApiKey = model === "gpt-3.5-turbo" ? apiKey : gpt4Apikey;
    const currentApiUrl = model === "gpt-3.5-turbo" ? apiUrl : gpt4ApiUrl;
    console.log(currentApiUrl);

    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "api-key": currentApiKey,
        },
        data: {
            messages: prompt,
            temperature: 0.8,
            top_p: 0.95,
            frequency_penalty: 0,
            presence_penalty: 0,
            max_tokens: 800,
            stop: null,
        },
    };

    try {
        // Send request to API endpoint
        const response = await axios(currentApiUrl, options);
        const { data } = response;
        
        // Get message content and total tokens from response
        const message = data.choices[0].message.content || data.choices[0].finish_reason;
        console.log(data);
        const totalTokens = data.usage.total_tokens;

        // Create response object
        const responseObj = { message, totalTokens };
        console.log(responseObj);

        // Send response
        res.send(responseObj);
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};