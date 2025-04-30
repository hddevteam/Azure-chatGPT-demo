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

    // 检查是否是图片相关的消息
    isImageRelatedMessage(message) {
        return message.startsWith("/dalle") || 
               message.startsWith("/gpt-image-1") || 
               message.startsWith("/gpt-image-1-edit");
    }

    // 从消息中提取提示内容
    extractPromptFromCommand(message) {
        return message.replace(/^\/[^ ]+ /, "").trim();
    }

    // 处理图片相关的跟进问题
    async handleImageFollowUpQuestions(userMessage, assistantMessage, currentProfile) {
        const { imagePromptTemplates } = await import("../../prompts/imagePromptTemplates.js");
        const prompt = this.extractPromptFromCommand(userMessage.getAttribute("data-message"));
        const isEditCommand = userMessage.getAttribute("data-message").startsWith("/gpt-image-1-edit");
        
        // 构建完整的提示
        const systemPrompt = {
            role: "system",
            content: `${imagePromptTemplates.systemPrompt}
            You are talking with ${currentProfile.displayName}.
            Profile: ${currentProfile.prompt}`
        };
        
        const template = isEditCommand ? 
            imagePromptTemplates.imageEditingFollowUp(this.uiManager.clientLanguage) : 
            imagePromptTemplates.imageGenerationFollowUp(this.uiManager.clientLanguage);

        const userPrompt = {
            role: "user",
            content: template.replace("{{prompt}}", prompt)
        };

        const prompts = [systemPrompt, userPrompt];
        const promptText = JSON.stringify(prompts);
        const response = await getFollowUpQuestions(promptText);

        console.log("Image follow-up responses:", response.suggestedUserResponses);
        
        return response.suggestedUserResponses || [];
    }

    // 生成跟进问题
    async generateFollowUpQuestions() {
        const currentProfile = this.uiManager.storageManager.getCurrentProfile();
        const activeMessages = [...document.querySelectorAll(".message.active")];
        
        if (activeMessages.length < 2) {
            return []; // 需要至少两条消息才能生成有意义的跟进问题
        }
        
        const lastMessages = activeMessages.slice(-2); // 获取最后两条消息
        const [userMessage, assistantMessage] = lastMessages;

        // 检查是否是图片相关的消息
        if (userMessage.getAttribute("data-sender") === "user" && 
            this.isImageRelatedMessage(userMessage.getAttribute("data-message"))) {
            return await this.handleImageFollowUpQuestions(userMessage, assistantMessage, currentProfile);
        }
        
        // 处理普通对话消息
        let content = "";
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