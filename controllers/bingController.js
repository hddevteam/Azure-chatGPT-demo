const axios = require("axios");

// 验证市场代码的辅助函数
const isValidMarket = (mkt) => {
    const validMarkets = [
        "en-US", "en-GB", "zh-CN", "ja-JP", "en-CA", "en-AU", "en-IN", "es-ES", 
        "fr-FR", "de-DE", "it-IT", "ko-KR", "pt-BR", "ru-RU"
    ];
    return validMarkets.includes(mkt);
};

const bingController = {
    search: async (req, res) => {
        try {
            const { query, mkt, responseFilter, freshness } = req.body;
            // 复用 advancedSearch 函数
            const results = await bingController.advancedSearch(query, { 
                mkt, 
                responseFilter, 
                freshness,
                count: req.body.count || 5
            });
            res.json(results);
        } catch (error) {
            console.error("Bing search error:", error);
            res.status(500).json({
                error: "Failed to perform search",
                details: error.message
            });
        }
    },

    // 新增: 高级搜索功能
    advancedSearch: async (query, options = {}) => {
        try {
            // 获取当前时间上下文
            const now = new Date();
            const timeContext = now.toLocaleString("en-US", { 
                hour: "numeric", 
                minute: "numeric",
                hour12: true,
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
                timeZoneName: "short"
            });

            const { mkt, responseFilter, freshness, count = 5 } = options;  // 设置默认值为5

            // 构建搜索参数
            const headers = {
                "Ocp-Apim-Subscription-Key": process.env.BING_SEARCH_API_KEY
            };
            
            const params = {
                q: `${query} (as of ${timeContext})`,
                count: count,  // 使用传入的 count 参数
                textDecorations: false,
                textFormat: "HTML",
                freshness: freshness || "Day",
                responseFilter: ["Webpages", "News", "Entities", ...(responseFilter || [])].join(","),
                mkt: mkt && isValidMarket(mkt) ? mkt : process.env.BING_SEARCH_API_LOCALE || "en-US"
            };

            console.log("Bing search params:", params);
            
            const response = await axios.get(
                `${process.env.BING_SEARCH_API_URL}v7.0/search`,
                { headers, params }
            );

            // 处理搜索结果
            let results = [];
            
            // 处理网页结果
            if (response.data.webPages?.value) {
                results.push(...response.data.webPages.value.map(result => ({
                    type: "webpage",
                    title: result.name,
                    snippet: result.snippet,
                    date: result.datePublished,
                    url: result.url
                })));
            }

            // 处理新闻结果
            if (response.data.news?.value) {
                results.push(...response.data.news.value.map(result => ({
                    type: "news",
                    title: result.name,
                    snippet: result.description,
                    date: result.datePublished,
                    url: result.url
                })));
            }

            // 处理实体结果
            if (response.data.entities?.value) {
                results.push(...response.data.entities.value.map(result => ({
                    type: "entity",
                    title: result.name,
                    snippet: result.description,
                    url: result.url
                })));
            }

            // 安全检查：确保不会因为结果数量不足而出错
            const availableResults = results.length;
            const actualCount = Math.min(count, availableResults);

            // 格式化结果
            const formattedResults = results
                .slice(0, actualCount)
                .map((r, i) => {
                    let resultText = `${i + 1}. [${r.type.toUpperCase()}] ${r.title}\n   ${r.snippet}\n   URL: ${r.url}`;
                    if (r.date) {
                        resultText += `\n   Published: ${new Date(r.date).toLocaleString()}`;
                    }
                    return resultText;
                })
                .join("\n\n");

            // 添加结果数量信息到返回值
            return {
                query: params.q,
                market: params.mkt,
                filters: params.responseFilter,
                freshness: params.freshness,
                results: formattedResults,
                resultCount: {
                    requested: count,
                    available: availableResults,
                    returned: actualCount
                }
            };

        } catch (error) {
            console.error("Bing search error:", error);
            return {
                error: "Failed to perform search",
                details: error.message
            };
        }
    }
};

module.exports = bingController;
