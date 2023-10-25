// controllers/gptController.js
//if DEV_MODE is not set then set it to true, else set it to eval(DEV_MODE)
const devMode = process.env.DEV_MODE ? eval(process.env.DEV_MODE) : false;
//if not devMode then use process.env.API_URL as apiUrl and process.env.API_KEY as apiKey
//else use process.env.API_URL_DEV as apiUrl and process.env.API_KEY_DEV as apiKey
let apiKey, apiUrl, gpt4Apikey, gpt4ApiUrl;
if (devMode) {
    apiKey = process.env.API_KEY_DEV;
    apiUrl = process.env.API_URL_DEV;
    gpt4Apikey = process.env.GPT_4_API_KEY_DEV;
    gpt4ApiUrl = process.env.GPT_4_API_URL_DEV;
} else {
    apiKey = process.env.API_KEY;
    apiUrl = process.env.API_URL;
    gpt4Apikey = process.env.GPT_4_API_KEY;
    gpt4ApiUrl = process.env.GPT_4_API_URL;
}

const defaultParams = {
    temperature: 0.8,
    top_p: 0.95,
    frequency_penalty: 0,
    presence_penalty: 0,
    max_tokens: 2000
};

// controllers/gptController.js
exports.getDefaultParams = (req, res) => {
    res.json(defaultParams);
};


exports.generateResponse = async (req, res) => {
    const prompt = JSON.parse(req.body.prompt);
    const model = req.body.model;

    // Get parameters from request or use default value
    const temperature = req.body.temperature || defaultParams.temperature;
    const top_p = req.body.top_p || defaultParams.top_p;
    const frequency_penalty = req.body.frequency_penalty || defaultParams.frequency_penalty;
    const presence_penalty = req.body.presence_penalty || defaultParams.presence_penalty;
    const max_tokens = req.body.max_tokens || defaultParams.max_tokens;

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
            temperature,
            top_p,
            frequency_penalty,
            presence_penalty,
            max_tokens,
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
        console.error(error.message);
        console.error(error.stack);
    
        // Check if there is a response from the server
        if (error.response) {
            // The request was made and the server responded with a status code that falls out of the range of 2xx
            console.error(error.response.data);
            console.error(error.response.status);
            console.error(error.response.headers);
            return res.status(error.response.status).send(error.response.data);
        } else if (error.request) {
            // The request was made but no response was received
            console.error(error.request);
            return res.status(500).send("Request was made but no response was received");
        } else {
            // Something happened in setting up the request that triggered an Error
            return res.status(500).send("Error", error.message);
        }
    }    
    
};

exports.createChatProfile = async (req, res) => {
    const profession = req.body.profession;
    const prompt = [
        {
            role: "user",
            content:
                `输出格式：
            { "name": "", "icon": "", "displayName": "", "prompt": ""}

            输入：
            请使用以下职业或场景:'${profession}',参考以下模板,生成AI对象配置文件。其中icon要使用font awesome图标代码, 例如fas fa-robot, fab fa-js-square等。请注意输出格式符合JSON规范:
            {
                "name": "dotNETCoreExpert",
                "icon": "fas fa-code",
                "displayName": ".NET Core Expert",
                "prompt": "I want you to act as a .NET Core expert. I will provide some details about a project or problem, and it will be your job to come up with solutions using .NET Core. This could involve creating code snippets, debugging existing code, or providing advice on best practices. 
            }

            输出：`,
        },
    ];
    console.log("Prompt:", prompt);

    const axios = require("axios");

    const currentApiKey = gpt4Apikey;
    const currentApiUrl = gpt4ApiUrl;

    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "api-key": currentApiKey,
        },
        data: {
            messages: prompt,
            temperature: 0.8,
            top_p: defaultParams.top_p,
            frequency_penalty: defaultParams.frequency_penalty,
            presence_penalty: defaultParams.presence_penalty,
            max_tokens: defaultParams.max_tokens,
            stop: null,
        },
    };

    try {
        // Send request to API endpoint
        const response = await axios(currentApiUrl, options);
        const { data } = response;

        // Get message content from response
        const message = data.choices[0].message.content;
        console.log(message);

        // Parse message and send as response
        const chatProfile = JSON.parse(message);
        res.send(chatProfile);

    } catch (error) {
        console.error(error);
        res.status(500).send(error);
    }
};

exports.summarizeConversation = async (req, res) => {
    const conversation = req.body.conversation;

    const prompt = [
        {
            role: "user",
            content:
                `输出格式:
            {
                "title":"",
                "summary":""
            }

            输入:
            请根据以下对话内容：
            ===
            ${conversation}
            ===
            以json格式, 生成标题和不超过1个段落, 200字的内容总结, 请注意输出格式符合JSON规范.

            输出:`,
        },
    ];
    console.log("Prompt:", prompt);

    const axios = require("axios");

    const currentApiKey = apiKey;
    const currentApiUrl = apiUrl;

    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "api-key": currentApiKey,
        },
        data: {
            messages: prompt,
            temperature: 0.3,
            top_p: defaultParams.top_p,
            frequency_penalty: defaultParams.frequency_penalty,
            presence_penalty: defaultParams.presence_penalty,
            max_tokens: 2000,
            stop: null,
        },
    };

    try {
        // Send request to API endpoint
        const response = await axios(currentApiUrl, options);
        const { data } = response;

        // Get message content from response
        const message = data.choices[0].message.content;
        console.log(message);

        // Parse message and send as response
        const conversationSummary = JSON.parse(message);
        res.send(conversationSummary);

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};


exports.generateTitle = async (req, res) => {
    const conversation = req.body.conversation;

    const prompt = [
        {
            role: "user",
            content: `
            输入:
            请根据以下内容生成一个简短的标题，10字以内。注意，标题需要突出主题或关键点。

            ===
            ${conversation}
            ===
        
            输出:`,
        },
    ];
    console.log("Prompt:", prompt);

    const axios = require("axios");

    const currentApiKey = apiKey;
    const currentApiUrl = apiUrl;

    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "api-key": currentApiKey,
        },
        data: {
            messages: prompt,
            temperature: 0.3,
            top_p: defaultParams.top_p,
            frequency_penalty: defaultParams.frequency_penalty,
            presence_penalty: defaultParams.presence_penalty,
            max_tokens: 20,
            stop: null,
        },
    };

    try {
        // Send request to API endpoint
        const response = await axios(currentApiUrl, options);
        const { data } = response;

        // Get message content from response
        const message = data.choices[0].message.content||"无题";
        console.log(message);

        // Parse message and send as response
        const conversationSummary = message;
        res.send(conversationSummary);

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

