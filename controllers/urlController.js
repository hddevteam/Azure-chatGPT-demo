const axios = require("axios");
const cheerio = require("cheerio");
const gptController = require("./gptController");

// Define elements to remove
const ELEMENTS_TO_REMOVE = [
    "script",
    "style",
    "nav",
    "header",
    "footer",
    "iframe",
    "noscript",
    "ad",
    ".advertisement",
    "#cookie-notice",
    ".social-share",
    ".comments"
];

// Default summary prompt template
const DEFAULT_SUMMARY_PROMPT = `Please provide a concise summary of this webpage content in simple terms.
Focus on:
1. Main ideas and key points
2. Important conclusions
3. Practical implications
4. Source of the information (if available)
5. Author of the content (if available)
6. Neutrality of the viewpoints presented(if applicable)

Keep the summary clear and easy to understand. Use simple language and short sentences.`;

// Get and clean webpage content
async function fetchAndCleanContent(url) {
    console.log("[URL Controller] Fetching webpage content...");
    const response = await axios.get(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
    });

    const $ = cheerio.load(response.data);
    console.log("[URL Controller] Webpage content loaded successfully");

    // Remove unnecessary elements
    ELEMENTS_TO_REMOVE.forEach(selector => {
        const count = $(selector).length;
        if(count > 0) {
            console.log(`[URL Controller] Removing ${count} ${selector} elements`);
        }
        $(selector).remove();
    });

    const title = $("title").text().trim();
    const content = $("body").text().trim()
        .replace(/(\s{2,}|\n{2,})/g, "\n")
        .replace(/\t/g, "")
        .substring(0, 15000);

    return { title, content };
}

// Build GPT prompt
function buildPrompt(title, content, customPrompt = "", language = "en") {
    let promptContent;
    
    if (customPrompt) {
        promptContent = `Title: ${title}\nContent: ${content}\n\n${customPrompt}`;
    } else {
        promptContent = `Title: ${title}\nContent: ${content}\n\n${DEFAULT_SUMMARY_PROMPT}\n\nPlease write the summary in ${language}.`;
    }
    // console.log("[URL Controller] Generated GPT prompt:", promptContent);

    return [{
        role: "user",
        content: promptContent
    }];
}

// Core summarization function
async function summarizeUrl(url, customPrompt = "", language = "en") {
    try {
        const { title, content } = await fetchAndCleanContent(url);
        const prompt = buildPrompt(title, content, customPrompt, language);
        return await gptController.summarizeWebContent(prompt);
    } catch (error) {
        console.error("[URL Controller] Error in summarizeUrl:", error);
        throw error;
    }
}

// API endpoint handler
async function handleApiRequest(req, res) {
    try {
        const { url, prompt, language } = req.body;
        const summary = await summarizeUrl(url, prompt, language);
        res.json({ success: true, summary });
    } catch (error) {
        console.error("[URL Controller] API Error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to process URL",
            message: error.message
        });
    }
}

exports.getUrlSummary = handleApiRequest;
exports.summarizeUrl = summarizeUrl;
