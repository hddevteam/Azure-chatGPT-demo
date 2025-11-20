require("dotenv").config();

const realtimeController = {
    getConfig: async (req, res) => {
        try {
            res.json({
                models: {
                    "gpt-realtime": {
                        name: "GPT Realtime",
                        description: "Standard real-time model, balanced performance and cost",
                        endpoint: process.env.GPT_REALTIME_API_URL,
                        apiKey: process.env.GPT_REALTIME_API_KEY
                    },
                    "gpt-realtime-mini": {
                        name: "GPT Realtime Mini",
                        description: "Lightweight version, faster and cheaper",
                        endpoint: process.env.GPT_REALTIME_MINI_API_URL,
                        apiKey: process.env.GPT_REALTIME_MINI_API_KEY
                    }
                },
                defaultModel: "gpt-realtime"
            });
        } catch (error) {
            res.status(500).json({ error: "Failed to get realtime config" });
        }
    }
};

module.exports = realtimeController;