// services/gptService/tools.js
/**
 * Function calling tools for the GPT service
 * Handles capabilities like search, time, and webpage analysis
 */

const bingController = require("../../controllers/bingController");
const urlController = require("../../controllers/urlController");

// Tool definitions for function calling
const toolDefinitions = [
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

/**
 * Handles getting current time function call
 * @param {Object} args - Function call arguments
 * @returns {Object} Current time and timezone
 */
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

/**
 * Handles Bing search function call
 * @param {Object} args - Search function arguments
 * @returns {Object} Search results
 */
const handleBingSearch = async (args) => {
    const { query, responseFilter, freshness } = args;
    try {
        // For "news" queries, enhance with keywords for relevance
        let enhancedQuery = query;
        if (query.includes("要闻") || query.includes("新闻")) {
            enhancedQuery = `${query} 重要 最新`;
        }

        const result = await bingController.advancedSearch(enhancedQuery, { 
            responseFilter: responseFilter || ["News", "Webpages", "Entities"],
            freshness: freshness || "Month",
            count: 15  // Increase search result count
        });
        
        // Ensure we have valid results array
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

        // Sort results for diversity, prioritizing news and recency
        const sortedResults = result.results.sort((a, b) => {
            // Prioritize news first
            if (a.type === "news" && b.type !== "news") return -1;
            if (b.type === "news" && a.type !== "news") return 1;
            // Then sort by date
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

/**
 * Handles webpage analysis function call
 * @param {Object} args - Function call arguments
 * @returns {Object} Webpage analysis results
 */
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

/**
 * Process function calls in conversation
 * @param {Array} toolCalls - Array of tool calls from API response
 * @returns {Array} Results of tool calls for response
 */
const processToolCalls = async (toolCalls) => {
    const results = [];
    
    for (const toolCall of toolCalls) {
        const { function: { name, arguments: argsString }, id } = toolCall;
        const args = JSON.parse(argsString);
        
        let result;
        switch (name) {
        case "get_current_time":
            result = handleGetCurrentTime(args);
            break;
        case "search_bing":
            result = await handleBingSearch(args);
            break;
        case "analyze_webpage":
            result = await handleWebpageAnalysis(args);
            break;
        default:
            result = { error: `Unknown function: ${name}` };
        }
        
        results.push({
            toolCallId: id,
            result
        });
    }
    
    return results;
};

module.exports = {
    toolDefinitions,
    handleGetCurrentTime,
    handleBingSearch,
    handleWebpageAnalysis,
    processToolCalls
};