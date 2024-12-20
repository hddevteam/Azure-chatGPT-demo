// controllers/gptController.js

const devMode = process.env.DEV_MODE ? eval(process.env.DEV_MODE) : false;
let apiKey, apiUrl, gpt4Apikey, gpt4ApiUrl, gpt4LastApiKey, gpt4LastApiUrl;
if (devMode) {
    apiKey = process.env.API_KEY_DEV;
    apiUrl = process.env.API_URL_DEV;
} else {
    apiKey = process.env.API_KEY;
    apiUrl = process.env.API_URL;
}
gpt4Apikey = process.env.GPT_4_API_KEY;
gpt4ApiUrl = process.env.GPT_4_API_URL;
gpt4LastApiKey = process.env.GPT_4_LAST_API_KEY;
gpt4LastApiUrl = process.env.GPT_4_LAST_API_URL;


const defaultParams = {
    temperature: 0.8,
    top_p: 0.95,
    frequency_penalty: 0,
    presence_penalty: 0,
    max_tokens: 2000
};

const axios = require("axios");

exports.getDefaultParams = (req, res) => {
    res.json(defaultParams);
};

const handleRequestError = (error, res) => {
    console.error(error.message);
    console.error(error.stack);

    if (error.response) {
        console.error(error.response.data);
        console.error(error.response.status);
        return res.status(error.response.status).send(error.response.data);
    } else if (error.request) {
        console.error(error.request);
        return res.status(500).send("Request was made but no response was received");
    } else {
        return res.status(500).send("Error", error.message);
    }
};

const makeRequest = async ({ apiKey, apiUrl, prompt, params }) => {
    console.log("makeRequest", prompt);
    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "api-key": apiKey,
        },
        data: {
            messages: prompt,
            ...params
        },
    };

    return await axios(apiUrl, options);
};



exports.generateResponse = async (req, res) => {
    console.log("generateResponse");
    const {
        model,
        temperature = defaultParams.temperature,
        top_p = defaultParams.top_p,
        frequency_penalty = defaultParams.frequency_penalty,
        presence_penalty = defaultParams.presence_penalty,
        max_tokens = defaultParams.max_tokens
    } = req.body;
    console.log("promptText", req.body.prompt);
    let prompt = JSON.parse(req.body.prompt);
    // console.log("prompt", prompt);
    if (!prompt || !prompt.length) {
        console.error("Invalid prompt");
        return res.status(400).send("Invalid prompt");
    }

    let currentApiKey, currentApiUrl;
    console.log("model", model);
    switch (model) {
        case "gpt-3.5-turbo":
            currentApiKey = apiKey;
            currentApiUrl = apiUrl;
            // 为gpt-3.5-turbo移除图片URL
            prompt = prompt.map(entry => {
                const filteredContent = entry.content.filter(item => item.type !== "image_url");
                return {
                    ...entry,
                    content: filteredContent
                };
            });
            break;
        case "gpt-4":
            currentApiKey = gpt4Apikey;
            currentApiUrl = gpt4ApiUrl;
            break;
        case "gpt-4-last":
            currentApiKey = gpt4LastApiKey;
            currentApiUrl = gpt4LastApiUrl;
            break;
        default:
            return res.status(400).send("Invalid model specified");
    }


    const requestData = {
        apiKey: currentApiKey,
        apiUrl: currentApiUrl,
        prompt,
        params: {
            temperature,
            top_p,
            frequency_penalty,
            presence_penalty,
            max_tokens,
        },
    };

    try {
        console.log("requestData", requestData);
        const response = await makeRequest(requestData);
        console.log("Response from GPT:", response.data);

        // 假设数据结构和 generateResponse 中相同，我们提取 message 和 totalTokens
        const choices = response.data.choices || [];
        const message = choices.length > 0 ? choices[0].message.content : "No response from GPT";
        const totalTokens = response.data.usage ? response.data.usage.total_tokens : 0;
        const responseObj = { message, totalTokens };
        console.log("responseObj", responseObj);
        res.json(responseObj);
    } catch (error) {
        handleRequestError(error, res);
    }
};


exports.createChatProfile = async (req, res) => {
    const profession = req.body.profession;
    const prompt = [
        {
            role: "user",
            content:
                `Output:
            { "name": "", "icon": "", "displayName": "", "prompt": ""}

            Input:
            Please create a chat profile for the following profession or scenario: ${profession}. Please use the following template to generate the chat profile. The icon should be a font awesome icon code, for example, fas fa-robot, fab fa-js-square, etc. Please note that the output should be in JSON format.
            {
                "name": "dotNETCoreExpert",
                "icon": "fas fa-code",
                "displayName": ".NET Core Expert",
                "prompt": "I want you to act as an expert in .NET Core expert. I will provide some details about a project or problem, and it will be your job to come up with solutions using .NET Core. This could involve creating code snippets, debugging existing code, or providing advice on best practices. 
            }

            Output:`,
        },
    ];

    const requestData = {
        apiKey: gpt4Apikey,
        apiUrl: gpt4ApiUrl,
        prompt,
        params: {
            temperature: 0.8,
            top_p: defaultParams.top_p,
            frequency_penalty: defaultParams.frequency_penalty,
            presence_penalty: defaultParams.presence_penalty,
            max_tokens: defaultParams.max_tokens,
            response_format: { "type": "json_object" }
        },
    };

    try {
        const response = await makeRequest(requestData);
        const { data } = response;
        const message = data.choices[0].message.content;
        const chatProfile = JSON.parse(message);
        res.send(chatProfile);
    } catch (error) {
        handleRequestError(error, res);
    }
};

exports.summarizeConversation = async (req, res) => {
    const conversation = req.body.conversation;

    const prompt = [
        {
            role: "user",
            content:
                `Output:
            {
                "title":"",
                "summary":""
            }

            Input:
            Please summarize the following conversation into a title and a paragraph of no more than 200 words. Please note that the output should be in JSON format.
            ===
            ${conversation}
            ===
            
            Output:`,
        },
    ];

    const requestData = {
        apiKey: apiKey,
        apiUrl: apiUrl,
        prompt,
        params: {
            temperature: 0.3,
            top_p: defaultParams.top_p,
            frequency_penalty: defaultParams.frequency_penalty,
            presence_penalty: defaultParams.presence_penalty,
            max_tokens: 2000,
            response_format: { "type": "json_object" }
        },
    };

    try {
        const response = await makeRequest(requestData);
        const { data } = response;
        const message = data.choices[0].message.content;
        const conversationSummary = JSON.parse(message);
        res.send(conversationSummary);
    } catch (error) {
        handleRequestError(error, res);
    }
};

exports.generateTitle = async (req, res) => {
    const conversation = req.body.conversation;

    const prompt = [
        {
            role: "user",
            content: `
            Input:
            1. Please generate a short title in less than 10 words for the following content. 
            ===
            ${conversation}
            ===
            Please note that the language you are using must consider the context of the content. 
            Output:`,
        },
    ];

    const requestData = {
        apiKey: apiKey,
        apiUrl: apiUrl,
        prompt,
        params: {
            temperature: 0.3,
            top_p: defaultParams.top_p,
            frequency_penalty: defaultParams.frequency_penalty,
            presence_penalty: defaultParams.presence_penalty,
            max_tokens: 30,
        },
    };

    try {
        const response = await makeRequest(requestData);
        const { data } = response;
        const message = data.choices[0].message.content || "untitled";
        res.send(message);
    } catch (error) {
        handleRequestError(error, res);
    }
};

exports.generateFollowUpQuestions = async (req, res) => {
    console.log("generateFollowUpQuestions", req.body);
    const prompt = JSON.parse(req.body.prompt);

    const requestData = {
        apiKey: apiKey,
        apiUrl: apiUrl,
        prompt,
        params: {
            temperature: 0.8,
            max_tokens: 1000,
            presence_penalty: 0.0,
            frequency_penalty: 0.0,
            response_format: { "type": "json_object" }
        },
    };

    try {
        const response = await makeRequest(requestData);
        const { data } = response;
        const message = data.choices[0].message.content || "untitled";
        res.send(message);
    } catch (error) {
        handleRequestError(error, res);
    }
};

exports.generateChatOptions = async (req, res) => {
    const { message, language } = req.body;

    const prompt = [
        {
            role: "system",
            content: `You are an intelligent option assistant that analyzes user questions and generates appropriate configuration options in JSON format. Generate the options in ${language} language. The output must follow this exact structure:

{
    "basicSettings": {
        "title": "Basic Settings",
        "type": "radio",
        "options": [
            {"id": "basic", "label": "Basic", "description": "Quick overview"},
            {"id": "medium", "label": "Medium", "description": "Main details"},
            {"id": "detailed", "label": "Detailed", "description": "Technical details"}
        ]
    },
    "contentCustomization": {
        "title": "Content",
        "type": "checkbox",
        "options": [
            {"id": "overview", "label": "Overview"}
            ...
        ]
    },
    "expertiseLevel": {
        "title": "Expertise Level",
        "type": "slider",
        "min": 1,
        "max": 5,
        "default": 3,
        "labels": ["Beginner", "Intermediate", "Advanced", "Expert", "Technical"]
    }
}

Note: All text content including titles, labels, and descriptions should be in ${language} language.`
        },
        {
            role: "user",
            content: `Analyze this message and generate appropriate configuration options: ${message}`
        }
    ];

    const requestData = {
        apiKey: apiKey,
        apiUrl: apiUrl,
        prompt,
        params: {
            temperature: 0.7,
            max_tokens: 1000,
            response_format: { "type": "json_object" }
        },
    };

    try {
        const response = await makeRequest(requestData);
        const { data } = response;
        const message = data.choices[0].message.content;
        res.json(JSON.parse(message));
    } catch (error) {
        handleRequestError(error, res);
    }
};

