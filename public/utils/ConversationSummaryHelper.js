import { generateRealtimeSummary } from "./api.js";

export class ConversationSummaryHelper {
    static async generateSummary(messages, previousSummary = null) {
        try {
            const allContentToSummarize = [];
            
            // Add previous summary if exists
            if (previousSummary) {
                allContentToSummarize.push({
                    role: "Previous Summary",
                    content: `${previousSummary.content.summary}\nKey Points: ${previousSummary.content.keyPoints.join(", ")}`
                });
            }
            
            // Add new messages
            const processedMessages = messages
                .filter(msg => msg.content && msg.content.trim() !== "")
                .map(msg => ({
                    role: msg.role,
                    content: msg.content
                }));
            
            allContentToSummarize.push(...processedMessages);

            if (allContentToSummarize.length > 0) {
                // Convert to markdown so that we can generate summary more effectively
                const markdownContent = this.convertToMarkdown(allContentToSummarize);
                
                // generateRealtimeSummary via markdownContent
                const summaryData = await generateRealtimeSummary([{
                    role: "user",
                    content: markdownContent
                }]);

                return {
                    id: `summary-${Date.now()}`,
                    type: "summary",
                    content: {
                        summary: summaryData.summary,
                        keyPoints: summaryData.key_points,
                        context: summaryData.context
                    },
                    tokens: summaryData.tokens,
                    timestamp: new Date(),
                    messageIds: messages.map(m => m.id || m.messageId).filter(Boolean)
                };
            }
            
            return null;
        } catch (error) {
            console.error("Failed to generate summary:", error);
            return null;
        }
    }

    static convertToMarkdown(messages) {
        const sections = [];

        // 1. Add previous summary section
        const previousSummary = messages.find(msg => msg.role === "Previous Summary");
        if (previousSummary) {
            sections.push(`## Previous Summary\n\n${previousSummary.content}\n`);
        }

        // 2. Add current conversation section
        const currentMessages = messages.filter(msg => msg.role !== "Previous Summary");
        if (currentMessages.length > 0) {
            sections.push("## Current Conversation\n");
            currentMessages.forEach(msg => {
                const role = msg.role === "assistant" ? "Assistant" : "User";
                sections.push(`### ${role}\n${msg.content}\n`);
            });
        }

        return sections.join("\n");
    }

    static buildSessionInstructions(prompt, summary = null) {
        const instructions = [prompt];
        
        if (summary) {
            instructions.push(`
Current Conversation Summary:
${summary.content.summary}

Key Discussion Points:
${summary.content.keyPoints.map(point => `• ${point}`).join("\n")}

Current Context:
${summary.content.context}

Please continue the conversation while maintaining consistency with the above context and key points.`);
        }

        return instructions.join("\n\n").trim();
    }

    static shouldGenerateNewSummary(currentSummary, messageHistory, ratio, messageLimit) {
        if (messageLimit === 0) return false;
        
        const lastSummaryIndex = currentSummary ? 
            messageHistory.findIndex(m => currentSummary.messageIds.includes(m.id)) :
            -1;
            
        const newMessagesCount = messageHistory.length - (lastSummaryIndex + 1);
        const dynamicThreshold = Math.floor(messageLimit * ratio);
        
        return newMessagesCount >= dynamicThreshold || 
               messageHistory.length > messageLimit;
    }
}
