// controllers/gpt/documentController.js
/**
 * Document controller - handles document queries and webpage content summarization functionality
 */

const gptService = require("../../services/gptService");

/**
 * Summarize web content
 * @param {Array} prompt - Conversation prompt
 * @returns {string} Summary content
 */
exports.summarizeWebContent = async (prompt) => {
    try {
        const { apiKey, apiUrl } = gptService.getApiConfig("gpt-4o-mini");

        const requestData = {
            apiKey,
            apiUrl,
            prompt,
            params: {
                temperature: 0.3,
                max_tokens: 4000
            },
        };

        const response = await gptService.makeRequest(requestData);
        return response.data.choices[0].message.content;
    } catch (error) {
        throw new Error("Failed to summarize content: " + error.message);
    }
};

/**
 * Handle queries against uploaded documents
 */
exports.processDocumentQuery = async (req, res) => {
    try {
        const { documents, question } = req.body;

        if (!documents || !Array.isArray(documents) || documents.length === 0) {
            return res.status(400).json({ error: "No documents provided" });
        }

        if (!question) {
            return res.status(400).json({ error: "No question provided" });
        }

        // Combine all document content and add to system prompt
        const combinedContent = documents.join("\n\n---\n\n");
        const systemPrompt = `You are an AI assistant analyzing the following documents. Please answer questions about their content:\n\n${combinedContent}`;

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: question }
        ];

        const { apiKey, apiUrl } = gptService.getApiConfig("gpt-4o");

        const requestData = {
            apiKey,
            apiUrl,
            prompt: messages,
            params: {
                temperature: 0.7,
                max_tokens: 2000,
                frequency_penalty: 0,
                presence_penalty: 0
            }
        };

        const response = await gptService.makeRequest(requestData);
        const message = response.data.choices[0].message.content;
        
        res.json({
            message: message,
            totalTokens: response.data.usage?.total_tokens || 0
        });
    } catch (error) {
        console.error("Error in document query:", error);
        res.status(500).json({
            error: "Failed to process document query",
            message: error.message
        });
    }
};