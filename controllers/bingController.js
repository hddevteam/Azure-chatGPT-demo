const axios = require("axios");

const bingController = {
    search: async (req, res) => {
        try {
            const { query } = req.body;
            
            const headers = {
                "Ocp-Apim-Subscription-Key": process.env.Bing_Search_API_KEY
            };
            
            const params = {
                q: query,
                textDecorations: false,
                textFormat: "HTML",
                mkt: process.env.Bing_Search_API_Locale || "global"
            };
            
            const response = await axios.get(
                `${process.env.Bing_Search_API_URL}v7.0/search`,
                { headers, params }
            );

            // 格式化搜索结果
            const results = response.data.webPages.value.map(result => ({
                title: result.name,
                link: result.url,
                snippet: result.snippet
            }));

            res.json(results);
            
        } catch (error) {
            console.error("Bing search error:", error);
            res.status(500).json({
                error: "Failed to perform search",
                details: error.message
            });
        }
    }
};

module.exports = bingController;
