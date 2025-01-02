const axios = require("axios");
const cheerio = require("cheerio");
const gptController = require("./gptController");

// 定义需要移除的标签选择器
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

exports.getUrlSummary = async (req, res) => {
    console.log("[URL Controller] Processing URL summary request:", req.body.url);
    console.log("[URL Controller] Target language:", req.body.language);
    try {
        const { url, language } = req.body;
        
        console.log("[URL Controller] Fetching webpage content...");
        const response = await axios.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
        });

        // 使用cheerio加载HTML
        const $ = cheerio.load(response.data);
        console.log("[URL Controller] Webpage content loaded successfully");

        // 移除不需要的元素
        ELEMENTS_TO_REMOVE.forEach(selector => {
            const count = $(selector).length;
            if(count > 0) {
                console.log(`[URL Controller] Removing ${count} ${selector} elements`);
            }
            $(selector).remove();
        });

        // 获取清理后的正文内容
        const title = $("title").text().trim();
        console.log("[URL Controller] Extracted title:", title);
        
        const content = $("body").text().trim()
            .replace(/(\s{2,}|\n{2,})/g, "\n")  // 移除多余空白
            .replace(/\t/g, "")                  // 移除制表符
            .substring(0, 15000);                // 限制长度

        console.log(`[URL Controller] Cleaned content length: ${content.length} characters`);

        // 修改 GPT 提示，使其生成更详细的总结
        console.log("[URL Controller] Sending content to GPT for summarization in", language);
        const prompt = [
            {
                role: "user",
                content: `As an expert content analyst, please provide a comprehensive summary of this webpage content in ${language}. 

Title: ${title}
Content: ${content}
                
Please provide a detailed analysis in JSON format with the following structure:

{
    "title": "extracted or generated title, capturing the main subject",
    "topic": "detailed explanation of the main subject and purpose (2-3 sentences)",
    "keyPoints": [
        "main point 1 with supporting details",
        "main point 2 with supporting details",
        "main point 3 with supporting details",
        "main point 4 with key examples or data",
        "main point 5 with significant implications"
    ],
    "additionalInfo": {
        "context": "broader context or background information",
        "significance": "why this content matters or its potential impact",
        "targetAudience": "who this content is most relevant for"
    },
    "conclusion": "comprehensive conclusion synthesizing the main insights and implications (3-4 sentences)",
    "relatedTopics": ["topic1", "topic2", "topic3"]
}

Guidelines:
1. Ensure all content is in ${language}
2. Provide specific examples, data, or quotes where relevant
3. Maintain technical accuracy while being accessible
4. Include practical implications or applications
5. Keep each key point detailed but concise (20-30 words each)

Note: If certain information is not available in the original content, provide logical inferences based on the context.`
            }
        ];

        // 调用GPT进行总结
        const summary = await gptController.summarizeWebContent(prompt);
        console.log("[URL Controller] Received summary from GPT:", summary);
        
        // 返回结果
        res.json({
            url,
            summary,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("[URL Controller] Error processing URL:", error.message);
        console.error("[URL Controller] Stack trace:", error.stack);
        res.status(500).json({
            error: "Failed to process URL",
            message: error.message
        });
    }
};
