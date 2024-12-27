const axios = require("axios");

const bingController = {
    search: async (req, res) => {
        try {
            const { query } = req.body;
            const count = req.body.count || 5; 
            
            const headers = {
                "Ocp-Apim-Subscription-Key": process.env.BING_SEARCH_API_KEY
            };
            
            const params = {
                q: query,
                count: count, 
                textDecorations: false,
                textFormat: "HTML",
                mkt: process.env.BING_SEARCH_API_LOCALE || "global"
            };
            
            const response = await axios.get(
                `${process.env.BING_SEARCH_API_URL}v7.0/search`,
                { headers, params }
            );

            const results = response.data.webPages.value.map(result => ({
                title: result.name,
                link: result.url,
                snippet: result.snippet
            }));
            console.log("Bing search results:", results);
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
