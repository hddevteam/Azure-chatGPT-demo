// controllers/gptController.js

const devMode = process.env.DEV_MODE ? eval(process.env.DEV_MODE) : false;
let apiKey, apiUrl;
if (devMode) {
    apiKey = process.env.API_KEY_DEV;
    apiUrl = process.env.API_URL_DEV;
} else {
    apiKey = process.env.GPT_4O_MINI_API_KEY;  // 默认使用 GPT-4O-MINI
    apiUrl = process.env.GPT_4O_MINI_API_URL;
}

const gpt4oApiKey = process.env.GPT_4O_API_KEY;
const gpt4oApiUrl = process.env.GPT_4O_API_URL;
const gpt4oMiniApiKey = process.env.GPT_4O_MINI_API_KEY;
const gpt4oMiniApiUrl = process.env.GPT_4O_MINI_API_URL;
const o1ApiKey = process.env.O1_API_KEY;
const o1ApiUrl = process.env.O1_API_URL;
const o1MiniApiKey = process.env.O1_MINI_API_KEY;
const o1MiniApiUrl = process.env.O1_MINI_API_URL;

const defaultParams = {
    temperature: 0.8,
    top_p: 0.95,
    frequency_penalty: 0,
    presence_penalty: 0,
    max_tokens: 2000
};

const axios = require("axios");
const bingController = require("./bingController");

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

// 添加工具定义
const tools = [
    {
        type: "function",
        function: {
            name: "get_current_time",
            description: "Get the current time in the specified timezone, if no timezone specified, use server timezone",
            parameters: {
                type: "object",
                properties: {
                    timezone: {
                        type: "string",
                        description: "The timezone to get the time in (e.g. 'Asia/Shanghai', 'America/New_York'). Optional."
                    }
                },
                required: []
            }
        }
    },
    {
        type: "function",
        function: {
            name: "search_bing",
            description: `Search the internet using Bing Search API with advanced options.
            
Examples:
1. Basic search: {"query": "latest AI news"}
2. With market: {"query": "local restaurants", "mkt": "zh-CN"}
3. With filters: {"query": "OpenAI", "responseFilter": ["news", "videos"]}
4. With time range: {"query": "AI news", "freshness": "Week"}

Note: The search will automatically include the current time context for more relevant results.`,
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "The search query to send to Bing"
                    },
                    mkt: {
                        type: "string",
                        description: "Optional. The market where the results come from (e.g., 'en-US', 'zh-CN', 'ja-JP')"
                    },
                    responseFilter: {
                        type: "array",
                        description: "Optional. Additional content types to include in results. Default: ['WebPages','News','Entities']",
                        items: {
                            type: "string",
                            enum: ["Computation", "Entities", "Images", "News", "Places", "RelatedSearches", "SpellSuggestions", "TimeZone", "Translations", "Videos", "Webpages"]
                        }
                    },
                    freshness: {
                        type: "string",
                        description: "Optional. Filter results by age. Default: 'Day'",
                        enum: ["Day", "Week", "Month"]
                    }
                },
                required: ["query"]
            }
        }
    }
];


// 添加工具处理函数
const handleGetCurrentTime = (args) => {
    const { timezone } = args;
    const options = {
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: timezone || "Asia/Shanghai"
    };

    const time = new Date().toLocaleString(undefined, options);
    return {
        time,
        timezone: options.timeZone
    };
};

const handleBingSearch = async (args) => {
    const { query, mkt, responseFilter, freshness } = args;
    return await bingController.advancedSearch(query, { mkt, responseFilter, freshness });
};

const makeRequest = async ({ apiKey, apiUrl, prompt, params, includeFunctionCalls = false }) => {
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

    // 只在 generateResponse 调用时添加 tools
    if (includeFunctionCalls) {
        options.data.tools = tools;
    }

    return await axios(apiUrl, options);
};

exports.generateResponse = async (req, res) => {
    console.log("generateResponse - Request body:", req.body); // 添加请求体调试信息
    
    const {
        model,
        temperature = defaultParams.temperature,
        top_p = defaultParams.top_p,
        frequency_penalty = defaultParams.frequency_penalty,
        presence_penalty = defaultParams.presence_penalty,
        max_tokens = defaultParams.max_tokens
    } = req.body;
    
    // 确保所有参数都是正确的类型
    const params = {
        temperature: parseFloat(temperature),
        top_p: parseFloat(top_p),
        frequency_penalty: parseFloat(frequency_penalty),
        presence_penalty: parseFloat(presence_penalty),
        max_tokens: parseInt(max_tokens)
    };
    
    console.log("Parsed parameters:", params);
    
    let prompt = JSON.parse(req.body.prompt);
    
    if (!prompt || !prompt.length) {
        console.error("Invalid prompt");
        return res.status(400).send("Invalid prompt");
    }

    // 针对 o1 和 o1-mini 模型过滤掉 system 消息
    if (model === "o1" || model === "o1-mini") {
        prompt = prompt.filter(msg => msg.role !== "system");
    }

    let currentApiKey, currentApiUrl;
    console.log("model", model);
    switch (model) {
    case "gpt-4o":
        currentApiKey = gpt4oApiKey;
        currentApiUrl = gpt4oApiUrl;
        break;
    case "gpt-4o-mini":
        currentApiKey = gpt4oMiniApiKey;
        currentApiUrl = gpt4oMiniApiUrl;
        break;
    case "o1":
        currentApiKey = o1ApiKey;
        currentApiUrl = o1ApiUrl;
        break;
    case "o1-mini":
        currentApiKey = o1MiniApiKey;
        currentApiUrl = o1MiniApiUrl;
        break;
    default:
        currentApiKey = gpt4oApiKey;  // 默认使用 GPT-4O
        currentApiUrl = gpt4oApiUrl;
        break;
    }

    // 根据模型类型设置不同的参数
    let requestParams;
    if (model === "o1" || model === "o1-mini") {
        requestParams = {
            max_completion_tokens: parseInt(max_tokens)
        };
    } else {
        requestParams = params;
    }

    console.log("Final request parameters:", requestParams); // 添加最终参数调试信息

    const requestData = {
        apiKey: currentApiKey,
        apiUrl: currentApiUrl,
        prompt,
        params: requestParams,
        includeFunctionCalls: true // 在 generateResponse 中设置为 true
    };

    try {
        console.log("Making request with data:", JSON.stringify(requestData, null, 2)); // 添加请求数据调试信息
        const response = await makeRequest(requestData);
        console.log("Response from GPT:", response.data);

        const choices = response.data.choices || [];
        const responseMessage = choices[0]?.message;
        
        // 处理函数调用
        if (responseMessage?.tool_calls) {
            for (const toolCall of responseMessage.tool_calls) {
                const functionName = toolCall.function.name;
                const args = JSON.parse(toolCall.function.arguments);

                let result;
                if (functionName === "get_current_time") {
                    result = handleGetCurrentTime(args);
                } else if (functionName === "search_bing") {
                    result = await handleBingSearch(args);
                }

                // 将函数调用结果添加到会话
                prompt.push({
                    role: "assistant",
                    content: null,
                    tool_calls: [toolCall]
                });
                prompt.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(result)
                });
            }

            // 再次调用 API 获取最终响应
            requestData.prompt = prompt;
            console.log("Making request with data:", JSON.stringify(requestData, null, 2)); 
            const finalResponse = await makeRequest(requestData);
            const message = finalResponse.data.choices[0].message.content;
            const totalTokens = finalResponse.data.usage.total_tokens;
            res.json({ message, totalTokens });
        } else {
            // 普通响应处理
            const message = responseMessage?.content || "No response from GPT";
            const totalTokens = response.data.usage?.total_tokens || 0;
            res.json({ message, totalTokens });
        }
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
                "name": "spokenEnglishTeacher",
                "icon": "fas fa-chalkboard-teacher",
                "displayName": "Spoken English Teacher",
                "prompt": "Act as a spoken English teacher to help improve English speaking skills, focusing on the specific needs of a native Chinese speaker.

You will highlight pronunciation, sentence structure, fluency, and cultural nuances, providing supportive corrections and constructive feedback. Tailor explanations to the specific challenges Chinese speakers might face when learning English (e.g., difficulties with sounds not present in Chinese, articles like "a" and "the," or subject-verb agreement).

# Steps

1. **Warm-up Conversation**: Start with a casual question to spark dialogue (e.g., “How was your day?” or “What do you like to do on weekends?”).
2. **Listening and Feedback**: Respond naturally to the user, then highlight areas for improvement gently. 
    - Point out specific pronunciation, grammar, or vocabulary issues.
    - Provide correct examples and ask the user to repeat.
3. **Vocabulary Building**: Introduce new phrases or expressions related to the topic of discussion. Explain their meaning and usage.
4. **Pronunciation Practice**: Focus on specific sounds or patterns that are typically challenging (e.g., differentiating “l” and “r,” final consonant sounds).
5. **Cultural Nuances**: When relevant, explain idioms, slang, or cultural differences in communication styles.
6. **Q&A Practice**: Provide conversation simulation scenarios (e.g., ordering food, asking for directions) to build real-life conversational confidence.
7. **Encourage Reflection**: Ask the user to paraphrase or develop their own sentences based on what was learned.

# Output Format

- Open with a casual question or friendly conversation starter.
- Correct errors via a supportive tone, structured as:
    - Highlight an issue.
    - Provide a corrected version.
    - Encourage the user to repeat or respond again using the correction.
- Clearly explain any vocabulary or pronunciation challenges.
- Bonus: Summarize what the user has learned at the end of the session.

# Examples

**Example 1 (Warm-up and correction):**
- Teacher: “Hi! How are you today?”
- User: “I am very busying today.”
- Teacher:
  - “I noticed you said 'busying,' which isn’t correct here. Let’s fix it.”
  - “You should say, ‘I am very busy today.’”
  - “Can you try saying, ‘I’m very busy today’?”
  - “Great! Now tell me why you were busy.”

**Example 2 (Pronunciation practice):**
- User: “I really like flied rice.”
- Teacher:
  - “It sounds like you said ‘flied’ rice. I think you meant ‘fried’ rice.”
  - “The ‘r’ sound in ‘fried’ is important. Let’s practice: ‘fried.’”
  - “Can you try again? Say: ‘fried rice.’”

**Example 3 (Cultural insight and idioms):**
- Teacher: “Let’s say you want to order a meal at a restaurant. Instead of saying 'Give me a burger,' which might sound rude, you can say, 'Could I please have a burger?' or 'I’d like a burger, please.' Politeness matters a lot in English!”

# Notes

- Pronunciation Challenges: Common for native Chinese speakers include differentiating “l” and “r,” producing “th” sounds, and ending consonants (like “s” or “t”).
- Grammar Focus: Articles ("a/an," "the"), plurals, and subject-verb agreement.
- Encourage Confidence: Provide positive reinforcement frequently." 
            }

            Output:`,
        },
    ];

    const requestData = {
        apiKey: gpt4oApiKey,
        apiUrl: gpt4oApiUrl,
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
        apiKey: gpt4oMiniApiKey,
        apiUrl: gpt4oMiniApiUrl,
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
        apiKey: gpt4oMiniApiKey,
        apiUrl: gpt4oMiniApiUrl,
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

exports.generateRealtimeSummary = async (req, res) => {
    const messages = req.body.messages;

    const prompt = [
        {
            role: "system",
            content: `You are a conversation summarizer that processes Markdown-formatted conversations. 
            Create a contextual summary that helps maintain conversation coherence. Focus on key information 
            that will be useful for continuing the conversation.

            The input will be in Markdown format with sections for previous summary and current conversation.
            Pay special attention to both sections to maintain complete context.

            Output must be in JSON format:
            {
                "summary": "concise overview of the entire conversation flow including previous context",
                "key_points": ["important fact 1", "important fact 2", "..."],
                "context": "specific context needed for continuing naturally",
                "tokens": number_of_tokens_used
            }`
        },
        {
            role: "user",
            content: messages[0].content  // Markdown 格式的内容已经在 client 端处理好
        }
    ];

    const requestData = {
        apiKey: gpt4oMiniApiKey,
        apiUrl: gpt4oMiniApiUrl,
        prompt,
        params: {
            temperature: 0.3,
            max_tokens: 2000,
            frequency_penalty: 0,
            presence_penalty: 0,
            response_format: { "type": "json_object" }
        },
    };

    try {
        const response = await makeRequest(requestData);
        const { data } = response;
        const message = data.choices[0].message.content;
        const summaryData = JSON.parse(message);
        
        // Add token count if not provided by the model
        if (!summaryData.tokens && data.usage) {
            summaryData.tokens = data.usage.total_tokens;
        }
        console.log("Realtime chat summaryData", summaryData);
        res.json(summaryData);
    } catch (error) {
        handleRequestError(error, res);
    }
};

exports.generateSystemPrompt = async (req, res) => {
    const context = req.body.context;

    const prompt = [
        {
            role: "user",
            content:
                `Output:
            { "prompt": "" }

            Input:
            Create a concise system prompt based on the following context or role: ${context}
            Follow these guidelines:
            1. Define the role and behavior using simple, conversational language
            2. List 2-3 key rules or constraints for responses
            3. Include 1-2 brief examples of tone and style

            Output format should be JSON with only the prompt field. Example:
            {
            "prompt": "You are a friendly English teacher helping students improve their conversation skills.

Key points:
- Correct errors gently and naturally
- Use everyday examples to explain grammar and vocabulary
- Encourage speaking and praise progress

Example:
When a student says 'I very like pizza', respond like this:
'I understand what you mean! We usually say 'I really like pizza'. The word 'really' is used to say 'very' with verbs like 'like'. Try saying: I really like pizza!'"
}

            Output:`,
        },
    ];

    const requestData = {
        apiKey: gpt4oApiKey,
        apiUrl: gpt4oApiUrl,
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
        const systemPrompt = JSON.parse(message);
        res.send(systemPrompt);
    } catch (error) {
        handleRequestError(error, res);
    }
};

exports.summarizeWebContent = async (prompt) => {
    const requestData = {
        apiKey: gpt4oMiniApiKey,
        apiUrl: gpt4oMiniApiUrl,
        prompt,
        params: {
            temperature: 0.3,
            max_tokens: 4000,
            response_format: { "type": "json_object" }
        },
    };

    try {
        const response = await makeRequest(requestData);
        const { data } = response;
        return JSON.parse(data.choices[0].message.content);
    } catch (error) {
        throw new Error("Failed to summarize content: " + error.message);
    }
};

