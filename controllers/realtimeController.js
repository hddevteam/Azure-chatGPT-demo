require("dotenv").config();

const realtimeController = {
    getConfig: async (req, res) => {
        try {
            res.json({
                endpoint: process.env.GPT_4O_REALTIME_API_URL,
                apiKey: process.env.GPT_4O_REALTIME_API_KEY,
                deployment: process.env.GPT_4O_REALTIME_DEPLOYMENT
            });
        } catch (error) {
            res.status(500).json({ error: "Failed to get realtime config" });
        }
    }
};

module.exports = realtimeController;