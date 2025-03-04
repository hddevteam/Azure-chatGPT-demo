// controllers/gpt/profileController.js
/**
 * 配置文件控制器 - 处理聊天配置文件的创建和系统提示生成
 */

const gptService = require("../../services/gptService");

/**
 * 从职业描述创建聊天配置文件
 */
exports.createChatProfile = async (req, res) => {
    try {
        const profession = req.body.profession;
        
        const prompt = [
            {
                role: "user",
                content:
                    `Output:
                { "name": "", "icon": "", "displayName": "", "prompt": ""}

                Input:
                Please create a chat profile for the following profession or scenario: ${profession}. Please use the following template to generate the chat profile. The icon should be a font awesome icon code, for example, fas fa-robot, fab fa-js-square, etc. Please note that the output should be in JSON format.
                {
                    "name": "spokenEnglishTeacher",
                    "icon": "fas fa-chalkboard-teacher",
                    "displayName": "Spoken English Teacher",
                    "prompt": "Act as a spoken English teacher to help improve English speaking skills, focusing on the specific needs of a native Chinese speaker.

You will highlight pronunciation, sentence structure, fluency, and cultural nuances, providing supportive corrections and constructive feedback. Tailor explanations to the specific challenges Chinese speakers might face when learning English (e.g., difficulties with sounds not present in Chinese, articles like "a" and "the," or subject-verb agreement).

# Steps

1. **Warm-up Conversation**: Start with a casual question to spark dialogue (e.g., "How was your day?" or "What do you like to do on weekends?").
2. **Listening and Feedback**: Respond naturally to the user, then highlight areas for improvement gently. 
    - Point out specific pronunciation, grammar, or vocabulary issues.
    - Provide correct examples and ask the user to repeat.
3. **Vocabulary Building**: Introduce new phrases or expressions related to the topic of discussion. Explain their meaning and usage.
4. **Pronunciation Practice**: Focus on specific sounds or patterns that are typically challenging (e.g., differentiating "l" and "r," final consonant sounds).
5. **Cultural Nuances**: When relevant, explain idioms, slang, or cultural differences in communication styles.
6. **Q&A Practice**: Provide conversation simulation scenarios (e.g., ordering food, asking for directions) to build real-life conversational confidence.
7. **Encourage Reflection**: Ask the user to paraphrase or develop their own sentences based on what was learned.

# Output Format

- Open with a casual question or friendly conversation starter.
- Correct errors via a supportive tone, structured as:
    - Highlight an issue.
    - Provide a corrected version.
    - Encourage the user to repeat or respond again using the correction.
- Clearly explain any vocabulary or pronunciation challenges.
- Bonus: Summarize what the user has learned at the end of the session.

# Examples

**Example 1 (Warm-up and correction):**
- Teacher: "Hi! How are you today?"
- User: "I am very busying today."
- Teacher:
  - "I noticed you said 'busying,' which isn't correct here. Let's fix it."
  - "You should say, 'I am very busy today.'"
  - "Can you try saying, 'I'm very busy today'?"
  - "Great! Now tell me why you were busy。"

**Example 2 (Pronunciation practice):**
- User: "I really like flied rice."
- Teacher:
  - "It sounds like you said 'flied' rice. I think you meant 'fried' rice."
  - "The 'r' sound in 'fried' is important. Let's practice: 'fried.'"
  - "Can you try again? Say: 'fried rice.'"

**Example 3 (Cultural insight and idioms):**
- Teacher: "Let's say you want to order a meal at a restaurant. Instead of saying 'Give me a burger,' which might sound rude, you can say, 'Could I please have a burger?' or 'I'd like a burger, please.' Politeness matters a lot in English!"

# Notes

- Pronunciation Challenges: Common for native Chinese speakers include differentiating "l" and "r," producing "th" sounds, and ending consonants (like "s" or "t").
- Grammar Focus: Articles ("a/an," "the"), plurals, and subject-verb agreement.
- Encourage Confidence: Provide positive reinforcement frequently." 
                }

                Output:`,
            },
        ];

        // 获取GPT-4o的API配置
        const { apiKey, apiUrl } = gptService.getApiConfig("gpt-4o");

        const requestData = {
            apiKey,
            apiUrl,
            prompt,
            params: {
                temperature: 0.8,
                top_p: gptService.defaultParams.top_p,
                frequency_penalty: gptService.defaultParams.frequency_penalty,
                presence_penalty: gptService.defaultParams.presence_penalty,
                max_tokens: gptService.defaultParams.max_tokens,
                response_format: { "type": "json_object" }
            },
        };

        const response = await gptService.makeRequest(requestData);
        const message = response.data.choices[0].message.content;
        const chatProfile = JSON.parse(message);
        res.send(chatProfile);
    } catch (error) {
        gptService.handleRequestError(error, res);
    }
};

/**
 * 为聊天配置文件生成系统提示
 */
exports.generateSystemPrompt = async (req, res) => {
    try {
        const context = req.body.context;
        const { apiKey, apiUrl } = gptService.getApiConfig("gpt-4o");

        const prompt = [
            {
                role: "user",
                content:
                    `Output:
                { "prompt": "" }

                Input:
                Create a concise system prompt based on the following context or role: ${context}
                Follow these guidelines:
                1. Define the role and behavior using simple, conversational language
                2. List 2-3 key rules or constraints for responses
                3. Include 1-2 brief examples of tone and style

                Output format should be JSON with only the prompt field. Example:
                {
                "prompt": "You are a friendly English teacher helping students improve their conversation skills.

Key points:
- Correct errors gently and naturally
- Use everyday examples to explain grammar and vocabulary
- Encourage speaking and praise progress

Example:
When a student says 'I very like pizza', respond like this:
'I understand what you mean! We usually say 'I really like pizza'. The word 'really' is used to say 'very' with verbs like 'like'. Try saying: I really like pizza!'"
}

                Output:`,
            },
        ];

        const requestData = {
            apiKey,
            apiUrl,
            prompt,
            params: {
                temperature: 0.8,
                top_p: gptService.defaultParams.top_p,
                frequency_penalty: gptService.defaultParams.frequency_penalty,
                presence_penalty: gptService.defaultParams.presence_penalty,
                max_tokens: gptService.defaultParams.max_tokens,
                response_format: { "type": "json_object" }
            },
        };

        const response = await gptService.makeRequest(requestData);
        const message = response.data.choices[0].message.content;
        const systemPrompt = JSON.parse(message);
        res.send(systemPrompt);
    } catch (error) {
        gptService.handleRequestError(error, res);
    }
};

/**
 * 生成基于消息的聊天选项
 */
exports.generateChatOptions = async (req, res) => {
    try {
        const { message, language } = req.body;
        const { apiKey, apiUrl } = gptService.getApiConfig("gpt-4o-mini");

        const prompt = [
            {
                role: "system",
                content: `You are an intelligent option assistant that analyzes user questions and generates appropriate configuration options in JSON format. Generate the options in ${language} language. The output must follow this exact structure:

{
    "basicSettings": {
        "title": "Basic Settings",
        "type": "radio",
        "options": [
            {"id": "basic", "label": "Basic", "description": "Quick overview"},
            {"id": "medium", "label": "Medium", "description": "Main details"},
            {"id": "detailed", "label": "Detailed", "description": "Technical details"}
        ]
    },
    "contentCustomization": {
        "title": "Content",
        "type": "checkbox",
        "options": [
            {"id": "overview", "label": "Overview"}
            ...
        ]
    },
    "expertiseLevel": {
        "title": "Expertise Level",
        "type": "slider",
        "min": 1,
        "max": 5,
        "default": 3,
        "labels": ["Beginner", "Intermediate", "Advanced", "Expert", "Technical"]
    }
}

Note: All text content including titles, labels, and descriptions should be in ${language} language.`
            },
            {
                role: "user",
                content: `Analyze this message and generate appropriate configuration options: ${message}`
            }
        ];

        const requestData = {
            apiKey,
            apiUrl,
            prompt,
            params: {
                temperature: 0.7,
                max_tokens: 1000,
                response_format: { "type": "json_object" }
            },
        };

        const response = await gptService.makeRequest(requestData);
        const responseContent = response.data.choices[0].message.content;
        res.json(JSON.parse(responseContent));
    } catch (error) {
        gptService.handleRequestError(error, res);
    }
};