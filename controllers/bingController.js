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
        console.log("Performing advanced search for:", query, options);
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

            const { responseFilter, freshness, count = 10 } = options;

            // 分离不同类型的搜索目标
            const newsParams = {
                q: query,
                count: Math.ceil(count * 0.6), // 60% 的配额给新闻结果
                textDecorations: false,
                textFormat: "HTML",
                freshness: freshness || "Month",
                responseFilter: "News"
            };

            const webParams = {
                q: query,
                count: Math.ceil(count * 0.4), // 40% 的配额给网页结果
                textDecorations: false,
                textFormat: "HTML",
                freshness: freshness || "Month",
                responseFilter: "Webpages"
            };

            const headers = {
                "Ocp-Apim-Subscription-Key": process.env.BING_SEARCH_API_KEY
            };

            // 并行请求新闻和网页结果
            const [newsResponse, webResponse] = await Promise.all([
                axios.get(`${process.env.BING_SEARCH_API_URL}v7.0/search`, { headers, params: newsParams }),
                axios.get(`${process.env.BING_SEARCH_API_URL}v7.0/search`, { headers, params: webParams })
            ]);

            let results = [];

            // 处理新闻结果
            if (newsResponse.data.news?.value) {
                results.push(...newsResponse.data.news.value.map(result => ({
                    type: "news",
                    title: result.name || "",
                    snippet: result.description || "",
                    date: result.datePublished || "",
                    url: result.url || "",
                    provider: result.provider?.[0]?.name || "",
                    category: result.category || "general"
                })));
            }

            // 处理网页结果
            if (webResponse.data.webPages?.value) {
                results.push(...webResponse.data.webPages.value.map(result => ({
                    type: "webpage",
                    title: result.name || "",
                    snippet: result.snippet || "",
                    date: result.dateLastCrawled || "",
                    url: result.url || "",
                    provider: new URL(result.url).hostname,
                    language: result.language || "zh-CN"
                })));
            }

            // 结果去重和排序
            results = results.reduce((unique, item) => {
                // 检查是否已经存在相同来源和相似标题的内容
                const exists = unique.find(x => 
                    x.provider === item.provider && 
                    (x.title.includes(item.title) || item.title.includes(x.title))
                );
                
                if (!exists) {
                    unique.push(item);
                } else if (new Date(item.date) > new Date(exists.date)) {
                    // 如果新内容更新，替换旧内容
                    const index = unique.indexOf(exists);
                    unique[index] = item;
                }
                return unique;
            }, []);

            // 按日期排序
            results.sort((a, b) => new Date(b.date) - new Date(a.date));

            // 限制结果数量
            results = results.slice(0, count);

            return {
                query,
                results,
                resultCount: {
                    requested: count,
                    available: results.length,
                    returned: results.length
                }
            };

        } catch (error) {
            console.error("Bing search error:", error);
            throw error;
        }
    }
};

module.exports = bingController;
