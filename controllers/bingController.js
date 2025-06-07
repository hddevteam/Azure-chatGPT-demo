const axios = require("axios");

// Helper function to validate market codes
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
            // Reuse advancedSearch function
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

    // New: Advanced search functionality
    advancedSearch: async (query, options = {}) => {
        console.log("Performing advanced search for:", query, options);
        try {
            // Get current time context
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

            // Separate different types of search targets
            const newsParams = {
                q: query,
                count: Math.ceil(count * 0.6), // 60% of quota for news results
                textDecorations: false,
                textFormat: "HTML",
                freshness: freshness || "Month",
                responseFilter: "News"
            };

            const webParams = {
                q: query,
                count: Math.ceil(count * 0.4), // 40% of quota for web results
                textDecorations: false,
                textFormat: "HTML",
                freshness: freshness || "Month",
                responseFilter: "Webpages"
            };

            const headers = {
                "Ocp-Apim-Subscription-Key": process.env.BING_SEARCH_API_KEY
            };

            // Request news and web results in parallel
            const [newsResponse, webResponse] = await Promise.all([
                axios.get(`${process.env.BING_SEARCH_API_URL}v7.0/search`, { headers, params: newsParams }),
                axios.get(`${process.env.BING_SEARCH_API_URL}v7.0/search`, { headers, params: webParams })
            ]);

            let results = [];

            // Process news results
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

            // Process web page results
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

            // Deduplicate and sort results
            results = results.reduce((unique, item) => {
                // Check if content with same source and similar title already exists
                const exists = unique.find(x => 
                    x.provider === item.provider && 
                    (x.title.includes(item.title) || item.title.includes(x.title))
                );
                
                if (!exists) {
                    unique.push(item);
                } else if (new Date(item.date) > new Date(exists.date)) {
                    // If new content is more recent, replace old content
                    const index = unique.indexOf(exists);
                    unique[index] = item;
                }
                return unique;
            }, []);

            // Sort by date
            results.sort((a, b) => new Date(b.date) - new Date(a.date));

            // Limit results count
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
