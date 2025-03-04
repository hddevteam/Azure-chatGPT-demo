// controllers/gpt/basicController.js
/**
 * 基本对话控制器 - 处理基本的文本生成请求
 * 拆分为更小的函数以增强可维护性
 */

const gptService = require("../../services/gptService");

/**
 * 返回默认的GPT请求参数
 */
exports.getDefaultParams = (req, res) => {
    res.json(gptService.defaultParams);
};

/**
 * 从请求中提取参数
 * @param {Object} req - 请求对象
 * @returns {Object} 提取的参数
 */
const extractParameters = (req) => {
    // 从顶层获取模型参数
    const model = req.body.model || "gpt-4o";
    
    // 从params对象获取其他参数
    const {
        temperature = gptService.defaultParams.temperature,
        top_p = gptService.defaultParams.top_p,
        frequency_penalty = gptService.defaultParams.frequency_penalty,
        presence_penalty = gptService.defaultParams.presence_penalty,
        max_tokens = gptService.defaultParams.max_tokens,
        webSearchEnabled = false
    } = req.body.params || {};
    
    return {
        model,
        temperature,
        top_p,
        frequency_penalty,
        presence_penalty,
        max_tokens,
        webSearchEnabled
    };
};

/**
 * 解析和验证提示内容
 * @param {string} promptString - JSON格式的提示字符串
 * @returns {Array} 解析后的提示数组
 */
const parseAndValidatePrompt = (promptString) => {
    try {
        const prompt = JSON.parse(promptString);
        if (!prompt || !Array.isArray(prompt) || !prompt.length) {
            throw new Error("Invalid prompt format");
        }
        return prompt;
    } catch (error) {
        console.error("Failed to parse prompt:", error);
        throw new Error(`Invalid prompt: ${error.message}`);
    }
};

/**
 * 处理搜索结果
 * @param {Array} prompt - 提示数组
 * @param {Array} searchResults - 搜索结果
 * @param {Object} options - 搜索选项
 * @returns {Object} 更新后的提示
 */
const processSearchResults = (prompt, searchResults, { language }) => {
    if (!searchResults) return prompt;
    
    // 格式化搜索结果
    const formattedResults = gptService.formatSearchResults(searchResults);
    
    // 获取当前日期
    const curDate = new Date().toLocaleDateString(
        language === "zh" ? "zh-CN" : "en-US",
        { year: "numeric", month: "long", day: "numeric" }
    );
    
    // 根据语言选择模板
    const template = language === "zh" 
        ? gptService.searchAnswerZhTemplate 
        : gptService.searchAnswerEnTemplate;
    
    // 格式化最终提示
    const searchPrompt = template
        .replace("{search_results}", formattedResults)
        .replace("{cur_date}", curDate)
        .replace("{question}", prompt[prompt.length - 1].content);
    
    // 返回更新后的提示
    return [...prompt, {
        role: "system",
        content: searchPrompt
    }];
};

/**
 * 从GPT API生成响应
 */
exports.generateResponse = async (req, res) => {
    console.log("generateResponse - Request body:", req.body);
    
    try {
        // 提取参数
        const {
            model,
            temperature,
            top_p,
            frequency_penalty, 
            presence_penalty,
            max_tokens,
            webSearchEnabled
        } = extractParameters(req);
        
        console.log(`Using model: ${model} with params:`, {
            temperature, top_p, frequency_penalty, presence_penalty, max_tokens, webSearchEnabled
        });
        
        // 处理用户参数
        const params = gptService.processModelParameters(model, {
            temperature,
            top_p,
            frequency_penalty,
            presence_penalty,
            max_tokens
        });
        
        console.log("Processed parameters:", params);
        
        // 解析并验证提示
        let prompt;
        try {
            prompt = parseAndValidatePrompt(req.body.prompt);
        } catch (error) {
            return res.status(400).send(error.message);
        }

        // 根据模型过滤消息
        prompt = gptService.filterMessagesByModel(prompt, model);

        // 获取请求的模型的API配置
        const { apiKey, apiUrl } = gptService.getApiConfig(model);

        console.log("API config:", { apiKey, apiUrl });

        // 初始请求数据
        let requestData = {
            apiKey,
            apiUrl,
            model,  // 确保传递模型参数
            prompt,
            params,
            includeFunctionCalls: webSearchEnabled
        };

        // 初始API请求
        let response = await gptService.makeRequest(requestData);
        console.log("Initial API response received");

        // 如果启用了函数调用功能，处理函数调用
        let needsFurtherProcessing = webSearchEnabled;
        let maxIterations = 5;
        let currentIteration = 0;
        let searchResults = null;

        while (needsFurtherProcessing && currentIteration < maxIterations) {
            currentIteration++;
            console.log(`Processing iteration ${currentIteration}`);

            const choices = response.data.choices || [];
            const responseMessage = choices[0]?.message;
            
            // 检查是否有工具调用需要处理
            if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
                // 处理所有工具调用
                const toolCallResults = await gptService.processToolCalls(responseMessage.tool_calls);
                
                // 如果这是搜索，存储结果以供模板使用
                const searchToolCall = responseMessage.tool_calls.find(
                    call => call.function.name === "search_bing"
                );
                if (searchToolCall) {
                    const searchResult = toolCallResults.find(r => r.toolCallId === searchToolCall.id);
                    searchResults = searchResult?.result?.results || null;
                }

                // 将函数调用和结果添加到对话中
                for (const { toolCallId, result } of toolCallResults) {
                    // 找到产生此结果的工具调用
                    const toolCall = responseMessage.tool_calls.find(tc => tc.id === toolCallId);
                    if (toolCall) {
                        // 添加助手的工具调用
                        prompt.push({
                            role: "assistant",
                            content: null,
                            tool_calls: [toolCall]
                        });
                        
                        // 添加工具的响应
                        prompt.push({
                            role: "tool",
                            tool_call_id: toolCallId,
                            content: JSON.stringify(result)
                        });
                    }
                }

                // 更新请求数据并再次调用API
                requestData.prompt = prompt;
                console.log(`Making follow-up request (iteration ${currentIteration})`);
                response = await gptService.makeRequest(requestData);
                
                // 检查是否需要继续处理
                const newChoices = response.data.choices || [];
                const newResponseMessage = newChoices[0]?.message;
                needsFurtherProcessing = newResponseMessage?.tool_calls?.length > 0;
            } else {
                // 没有工具调用，结束处理
                needsFurtherProcessing = false;
            }
        }

        if (currentIteration >= maxIterations) {
            console.warn("Reached maximum number of tool call iterations");
        }

        // 检查是否应使用搜索模板格式化响应
        const hasSearchContent = prompt.some(msg => {
            const content = msg.content;
            return typeof content === "string" && content.toLowerCase().includes("search");
        });

        if (hasSearchContent && searchResults) {
            // 处理搜索结果并更新提示
            prompt = processSearchResults(prompt, searchResults, { language: req.body.language });
            
            // 使用搜索结果再次请求
            requestData.prompt = prompt;
            response = await gptService.makeRequest(requestData);
        }

        // 返回最终响应
        const finalMessage = response.data.choices[0].message.content;
        const totalTokens = response.data.usage?.total_tokens || 0;
        res.json({ 
            message: finalMessage, 
            totalTokens,
            searchResults: searchResults || [] 
        });
    } catch (error) {
        gptService.handleRequestError(error, res);
    }
};