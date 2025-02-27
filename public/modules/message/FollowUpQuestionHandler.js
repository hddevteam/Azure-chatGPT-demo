// FollowUpQuestionHandler.js - 处理跟进问题功能
import { getFollowUpQuestions } from "../../utils/apiClient.js";
import { generateExcerpt } from "../../utils/textUtils.js";

class FollowUpQuestionHandler {
    constructor(messageManager) {
        this.messageManager = messageManager;
        this.uiManager = messageManager.uiManager;
        this.uiHandler = messageManager.uiHandler;
    }

    // 生成并显示跟进问题
    async generateAndShowFollowUpQuestions() {
        try {
            const questions = await this.generateFollowUpQuestions();
            if (questions && questions.length > 0) {
                this.uiHandler.addFollowUpQuestions(questions);
            }
        } catch (error) {
            console.error("Error generating follow-up questions:", error);
        }
    }

    // 生成跟进问题
    async generateFollowUpQuestions() {
        const currentProfile = this.uiManager.storageManager.getCurrentProfile();
        const activeMessages = [...document.querySelectorAll(".message.active")];
        
        if (activeMessages.length < 2) {
            return []; // 需要至少两条消息才能生成有意义的跟进问题
        }
        
        let content = "";
        const lastMessages = activeMessages.slice(-2); // 获取最后两条消息
        
        lastMessages.forEach(message => {
            let dataMessage = message.getAttribute("data-message");
            // 如果消息太长，提取精华部分
            dataMessage = generateExcerpt(dataMessage, 500, 250, 500);

            const dataRole = message.getAttribute("data-sender");
            if (dataRole === "user") {
                content += ` You: \n\n${dataMessage}\n\n`;
            } else {
                content += `Him/Her (${currentProfile.displayName}): \n\n: ${dataMessage}\n\n`;
            }
        });

        const systemPrompt = {
            role: "system",
            content: ` You are a critical thinker. You are talking with ${currentProfile.displayName},
            Here is his/her profile:
                      ===
                      ${currentProfile.prompt}
                      ===
                      ` };
        
        const userPrompt = {
            role: "user",
            content: `Output json format: {
                "suggestedUserResponses": []
            }
            Please give your follow-up ideas less than 15 words, limit to 3 follow-up ideas based on the following context or his/her profile above.
            ===
            ${content}
            ===
            Please use the tone of: I'd like to know, How can I, How does it work, I'd like to find out, I'd like to learn, I'd like to understand, I'd like to explore, I'd like to discover, I'd like to know more about...
            Please use ${this.uiManager.clientLanguage}.
            Output:` };
            
        const prompts = [systemPrompt, userPrompt];
        console.log("Follow-up question prompts:", prompts);
        
        const promptText = JSON.stringify(prompts.map((p) => {
            return { role: p.role, content: p.content };
        }));

        const followUpResponsesData = await getFollowUpQuestions(promptText);
        console.log("Follow-up responses:", followUpResponsesData.suggestedUserResponses);
        
        return followUpResponsesData.suggestedUserResponses;
    }

    // 清除跟进问题
    clearFollowUpQuestions() {
        this.uiHandler.clearFollowUpQuestions();
    }
}

export default FollowUpQuestionHandler;