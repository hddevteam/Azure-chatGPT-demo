// controllers/gpt/summaryController.js
/**
 * 摘要控制器 - 处理会话摘要和标题生成的功能
 */

const gptService = require("../../services/gptService");

/**
 * 摘要一个会话内容
 */
exports.summarizeConversation = async (req, res) => {
    try {
        const conversation = req.body.conversation;
        const { apiKey, apiUrl } = gptService.getApiConfig();

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
            apiKey,
            apiUrl,
            prompt,
            params: {
                temperature: 0.3,
                top_p: gptService.defaultParams.top_p,
                frequency_penalty: gptService.defaultParams.frequency_penalty,
                presence_penalty: gptService.defaultParams.presence_penalty,
                max_tokens: 2000,
                response_format: { "type": "json_object" }
            },
        };

        const response = await gptService.makeRequest(requestData);
        const message = response.data.choices[0].message.content;
        const conversationSummary = JSON.parse(message);
        res.send(conversationSummary);
    } catch (error) {
        gptService.handleRequestError(error, res);
    }
};

/**
 * 为会话生成标题
 */
exports.generateTitle = async (req, res) => {
    try {
        const conversation = req.body.conversation;
        const { apiKey, apiUrl } = gptService.getApiConfig();

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
            apiKey,
            apiUrl,
            prompt,
            params: {
                temperature: 0.3,
                top_p: gptService.defaultParams.top_p,
                frequency_penalty: gptService.defaultParams.frequency_penalty,
                presence_penalty: gptService.defaultParams.presence_penalty,
                max_tokens: 30,
                response_format: { "type": "json_object" }
            },
        };

        const response = await gptService.makeRequest(requestData);
        const message = response.data.choices[0].message.content;
        const result = JSON.parse(message);
        res.send(result.title || "untitled");
    } catch (error) {
        gptService.handleRequestError(error, res);
    }
};

/**
 * 生成后续问题
 */
exports.generateFollowUpQuestions = async (req, res) => {
    try {
        console.log("generateFollowUpQuestions", req.body);
        const prompt = JSON.parse(req.body.prompt);
        const { apiKey, apiUrl } = gptService.getApiConfig("gpt-4o-mini");

        const requestData = {
            apiKey,
            apiUrl,
            prompt,
            params: {
                temperature: 0.8,
                max_tokens: 1000,
                presence_penalty: 0.0,
                frequency_penalty: 0.0,
                response_format: { "type": "json_object" }
            },
        };

        const response = await gptService.makeRequest(requestData);
        const message = response.data.choices[0].message.content || "untitled";
        res.send(message);
    } catch (error) {
        gptService.handleRequestError(error, res);
    }
};

/**
 * 生成实时会话摘要
 */
exports.generateRealtimeSummary = async (req, res) => {
    try {
        const messages = req.body.messages;
        const { apiKey, apiUrl } = gptService.getApiConfig("gpt-4o-mini");

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
            apiKey,
            apiUrl,
            prompt,
            params: {
                temperature: 0.3,
                max_tokens: 2000,
                frequency_penalty: 0,
                presence_penalty: 0,
                response_format: { "type": "json_object" }
            },
        };

        const response = await gptService.makeRequest(requestData);
        const responseContent = response.data.choices[0].message.content;
        const summaryData = JSON.parse(responseContent);
        
        // 如果模型没有提供token计数，添加token计数
        if (!summaryData.tokens && response.data.usage) {
            summaryData.tokens = response.data.usage.total_tokens;
        }
        
        console.log("Realtime chat summaryData", summaryData);
        res.json(summaryData);
    } catch (error) {
        gptService.handleRequestError(error, res);
    }
};