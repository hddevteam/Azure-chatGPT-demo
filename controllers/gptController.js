// controllers/gptController.js

const devMode = process.env.DEV_MODE ? eval(process.env.DEV_MODE) : false;
let apiKey, apiUrl;
if (devMode) {
    apiKey = process.env.API_KEY_DEV;
    apiUrl = process.env.API_URL_DEV;
} else {
    apiKey = process.env.GPT_4O_MINI_API_KEY;  // Default using GPT-4O-MINI
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
const urlController = require("./urlController");

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

// Add tool definitions
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
3. With filters: {"query": "OpenAI", "responseFilter": ['WebPages','News','Entities']}
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
    },
    {
        type: "function",
        function: {
            name: "analyze_webpage",
            description: `Analyze and summarize webpage content with advanced options.

Examples:
1. Basic summary: {"url": "https://example.com/article"}
2. With specific question: {"url": "https://example.com/tech", "question": "What are the key technical features mentioned?"}
3. With language preference: {"url": "https://example.com/news", "language": "zh-CN"}
4. Complex analysis: {"url": "https://example.com/research", "question": "What are the main findings and methodology?", "language": "en"}

The function will:
1. Extract main content from the webpage
2. Remove ads and irrelevant elements
3. Generate comprehensive or focused analysis based on input
4. Support multilingual output
5. Handle different types of content (articles, news, research, etc.)

Note: Use specific questions to get more focused analysis of the webpage content.`,
            parameters: {
                type: "object",
                properties: {
                    url: {
                        type: "string",
                        description: "The URL of the webpage to analyze"
                    },
                    question: {
                        type: "string",
                        description: "Optional. Specific question or analysis focus (e.g., 'What are the main arguments?', 'Summarize the methodology')"
                    },
                    language: {
                        type: "string",
                        description: "Optional. The language for the analysis response (e.g., 'en', 'zh-CN', 'ja'). Default is 'en'"
                    }
                },
                required: ["url"]
            }
        }
    }
];

// Add these templates at the top of the file
const search_answer_zh_template = `# 以下内容是基于用户发送的消息的搜索结果:
{search_results}
在我给你的搜索结果中，每个结果都是[webpage X begin]...[webpage X end]格式的，X代表每篇文章的数字索引。请在适当的情况下在句子末尾引用上下文。请按照引用编号[citation:X]的格式在答案中对应部分引用上下文。如果一句话源自多个上下文，请列出所有相关的引用编号，例如[citation:3][citation:5]。

在回答时，请注意以下几点：
- 今天是{cur_date}。
- 必须从多个不同的新闻源或网页中提取信息，不要仅仅依赖单一来源。
- 新闻类内容要注意信息的时效性，优先使用最新的信息源。
- 对于每个重要论点，至少要引用2-3个不同来源的内容以确保信息的可靠性。
- 对于时效性内容，要明确标注信息的发布时间。
- 信息的分类整理要条理清晰，使用小标题或者要点的形式组织内容。
- 如果不同来源的信息有冲突，需要指出这些差异并说明可能的原因。
- 在合适的时候，可以添加"延伸阅读"部分，提供更多相关资源的链接。
- 除非用户要求，否则你回答的语言需要和用户提问的语言保持一致。

# 用户消息为：
{question}`;

const search_answer_en_template = `# The following contents are the search results related to the user's message:
{search_results}
In the search results I provide to you, each result is formatted as [webpage X begin]...[webpage X end], where X represents the numerical index of each article. Please cite the context at the end of the relevant sentence when appropriate. Use the citation format [citation:X] in the corresponding part of your answer. If a sentence is derived from multiple contexts, list all relevant citation numbers, such as [citation:3][citation:5]. Be sure not to cluster all citations at the end; instead, include them in the corresponding parts of the answer.
When responding, please keep the following points in mind:
- Today is {cur_date}.
- Not all content in the search results is closely related to the user's question. You need to evaluate and filter the search results based on the question.
- For listing-type questions, try to limit the answer to 10 key points and inform the user that they can refer to the search sources for complete information. Prioritize providing the most complete and relevant items in the list. Avoid mentioning content not provided in the search results unless necessary.
- For creative tasks, ensure that references are cited within the body of the text, such as [citation:3][citation:5], rather than only at the end of the text. You need to interpret and summarize the user's requirements, choose an appropriate format, fully utilize the search results, extract key information, and generate an answer that is insightful, creative, and professional. Extend the length of your response as much as possible, addressing each point in detail and from multiple perspectives, ensuring the content is rich and thorough.
- If the response is lengthy, structure it well and summarize it in paragraphs. If a point-by-point format is needed, try to limit it to 5 points and merge related content.
- For objective Q&A, if the answer is very brief, you may add one or two related sentences to enrich the content.
- Choose an appropriate and visually appealing format for your response based on the user's requirements and the content of the answer, ensuring strong readability.
- Your answer should synthesize information from multiple relevant webpages and avoid repeatedly citing the same webpage.
- Unless the user requests otherwise, your response should be in the same language as the user's question.

# The user's message is:
{question}`;

// add tool handling functions
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

// Update handleBingSearch function to better handle responses
const handleBingSearch = async (args) => {
    const { query, responseFilter, freshness } = args;
    try {
        // 对于"要闻"类的查询，增加一些关键词以提高相关性
        let enhancedQuery = query;
        if (query.includes("要闻") || query.includes("新闻")) {
            enhancedQuery = `${query} 重要 最新`;
        }

        const result = await bingController.advancedSearch(enhancedQuery, { 
            responseFilter: responseFilter || ["News", "Webpages", "Entities"],
            freshness: freshness || "Month",
            count: 15  // 增加搜索结果数量
        });
        
        // Ensure we have a valid results array
        if (!result.results || !Array.isArray(result.results)) {
            console.warn("No valid search results returned from Bing");
            return {
                query: enhancedQuery,
                results: [],
                resultCount: {
                    requested: args.count || 15,
                    available: 0,
                    returned: 0
                }
            };
        }

        // 对结果按照来源进行多样性排序
        const sortedResults = result.results.sort((a, b) => {
            // 优先保证新闻在前面
            if (a.type === "news" && b.type !== "news") return -1;
            if (b.type === "news" && a.type !== "news") return 1;
            // 然后按照日期排序
            return new Date(b.date) - new Date(a.date);
        });

        return {
            query: enhancedQuery,
            results: sortedResults,
            resultCount: {
                requested: args.count || 15,
                available: result.results.length,
                returned: sortedResults.length
            }
        };
    } catch (error) {
        console.error("Bing search error:", error);
        return {
            query,
            results: [],
            error: error.message,
            resultCount: {
                requested: args.count || 15,
                available: 0,
                returned: 0
            }
        };
    }
};

const handleWebpageAnalysis = async (args) => {
    const { url, question, language = "en" } = args;
    try {
        const summary = await urlController.summarizeUrl(url, question, language);
        console.log("Webpage analysis summary:", summary);
        return summary;
    } catch (error) {
        return `Error analyzing webpage: ${error.message}`;
    }
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

    // Only add tools when generateResponse is called
    if (includeFunctionCalls) {
        options.data.tools = tools;
    }

    return await axios(apiUrl, options);
};

const formatSearchResults = (results) => {
    return results.map((result, index) => {
        return `[webpage ${index + 1} begin]
Title: ${result.title}
Content: ${result.snippet}
URL: ${result.url}
[webpage ${index + 1} end]
`;
    }).join("\n\n");
};

// Modify the generateResponse function
exports.generateResponse = async (req, res) => {
    console.log("generateResponse - Request body:", req.body); // Adding request body debug info
    
    const {
        model,
        temperature = defaultParams.temperature,
        top_p = defaultParams.top_p,
        frequency_penalty = defaultParams.frequency_penalty,
        presence_penalty = defaultParams.presence_penalty,
        max_tokens = defaultParams.max_tokens,
        webSearchEnabled = false
    } = req.body.params || {};
    
    // Ensure all parameters are of correct type
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

    // Filter out system messages for o1 and o1-mini models
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
        currentApiKey = gpt4oApiKey;  // Default to GPT-4O
        currentApiUrl = gpt4oApiUrl;
        break;
    }

    // Set different parameters based on model type
    let requestParams;
    if (model === "o1" || model === "o1-mini") {
        requestParams = {
            max_completion_tokens: parseInt(max_tokens)
        };
    } else {
        requestParams = params;
    }

    console.log("Final request parameters:", requestParams); // Add final parameters debug info

    const requestData = {
        apiKey: currentApiKey,
        apiUrl: currentApiUrl,
        prompt,
        params: requestParams,
        includeFunctionCalls: webSearchEnabled // Only include function calls if web search is enabled
    };

    try {
        console.log("Making request with data:", JSON.stringify(requestData, null, 2));
        let response = await makeRequest(requestData);
        console.log("Response from GPT:", response.data);

        // Check if further tool call processing is needed
        let needsFurtherProcessing = webSearchEnabled; // Only process tool calls if web search is enabled
        let maxIterations = 5; // Set maximum iterations to prevent infinite loops
        let currentIteration = 0;
        let searchResults = null;

        while (needsFurtherProcessing && currentIteration < maxIterations) {
            currentIteration++;
            console.log(`Processing iteration ${currentIteration}`);

            const choices = response.data.choices || [];
            const responseMessage = choices[0]?.message;
            
            // Check if there are tool calls
            if (responseMessage?.tool_calls) {
                for (const toolCall of responseMessage.tool_calls) {
                    const functionName = toolCall.function.name;
                    const args = JSON.parse(toolCall.function.arguments);

                    let result;
                    if (functionName === "get_current_time") {
                        result = handleGetCurrentTime(args);
                    } else if (functionName === "search_bing") {
                        const searchResponse = await handleBingSearch({
                            query: args.query,
                            freshness: args.freshness || "Day",
                            responseFilter: args.responseFilter || ["Webpages", "News", "Entities"]
                        });
                        result = searchResponse;
                        searchResults = searchResponse.results; // Store search results for later use
                    } else if (functionName === "analyze_webpage") {
                        result = await handleWebpageAnalysis(args);
                    }

                    // Add function call results to the conversation
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

                // Update request data and call API again
                requestData.prompt = prompt;
                console.log(`Making follow-up request (iteration ${currentIteration}):`, prompt);
                response = await makeRequest(requestData);
                
                // Check if the new response still contains tool calls
                const newChoices = response.data.choices || [];
                const newResponseMessage = newChoices[0]?.message;
                needsFurtherProcessing = newResponseMessage?.tool_calls?.length > 0;
            } else {
                // No tool calls, end processing
                needsFurtherProcessing = false;
            }
        }

        if (currentIteration >= maxIterations) {
            console.warn("Reached maximum number of tool call iterations");
        }

        // Check if we should format the response with search template
        const hasSearchContent = prompt.some(msg => {
            const content = msg.content;
            return typeof content === "string" && content.toLowerCase().includes("search");
        });

        if (hasSearchContent && searchResults) {
            // Format the results
            const formattedResults = formatSearchResults(searchResults);
            
            // Get current date
            const curDate = new Date().toLocaleDateString(
                req.body.language === "zh" ? "zh-CN" : "en-US",
                { year: "numeric", month: "long", day: "numeric" }
            );

            // Choose template based on language
            const template = req.body.language === "zh" 
                ? search_answer_zh_template 
                : search_answer_en_template;

            // Format the final prompt
            const searchPrompt = template
                .replace("{search_results}", formattedResults)
                .replace("{cur_date}", curDate)
                .replace("{question}", prompt[prompt.length - 1].content);

            // Add the formatted search results to the conversation
            prompt.push({
                role: "system",
                content: searchPrompt
            });

            // Make another request with the search results
            requestData.prompt = prompt;
            response = await makeRequest(requestData);
        }

        // Return final response
        const finalMessage = response.data.choices[0].message.content;
        const totalTokens = response.data.usage?.total_tokens || 0;
        res.json({ 
            message: finalMessage, 
            totalTokens,
            searchResults: searchResults || [] 
        });

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
  - “Great! Now tell me why you were busy。”

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
            Output:
            { "title": "" }

            Input:
            Please generate a short title in less than 10 words for the following content. 
            Return the result in JSON format with a single "title" field.
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
            response_format: { "type": "json_object" }
        },
    };

    try {
        const response = await makeRequest(requestData);
        const { data } = response;
        const message = data.choices[0].message.content;
        const result = JSON.parse(message);
        res.send(result.title || "untitled");
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
            content: messages[0].content  // Markdown formatted content processed on client side
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
            max_tokens: 4000
        },
    };

    try {
        const response = await makeRequest(requestData);
        const { data } = response;
        return data.choices[0].message.content; // Return text content directly
    } catch (error) {
        throw new Error("Failed to summarize content: " + error.message);
    }
};

exports.processDocumentQuery = async (req, res) => {
    try {
        const { documents, question } = req.body;

        if (!documents || !Array.isArray(documents) || documents.length === 0) {
            return res.status(400).json({ error: "No documents provided" });
        }

        if (!question) {
            return res.status(400).json({ error: "No question provided" });
        }

        // 将所有文档内容合并并添加到系统提示中
        const combinedContent = documents.join("\n\n---\n\n");
        const systemPrompt = `You are an AI assistant analyzing the following documents. Please answer questions about their content:\n\n${combinedContent}`;

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: question }
        ];

        const requestData = {
            apiKey: gpt4oApiKey,
            apiUrl: gpt4oApiUrl,
            prompt: messages,
            params: {
                temperature: 0.7,
                max_tokens: 2000,
                frequency_penalty: 0,
                presence_penalty: 0
            }
        };

        const response = await makeRequest(requestData);
        const message = response.data.choices[0].message.content;
        
        res.json({
            message: message,
            totalTokens: response.data.usage?.total_tokens || 0
        });
    } catch (error) {
        console.error("Error in document query:", error);
        res.status(500).json({
            error: "Failed to process document query",
            message: error.message
        });
    }
};

