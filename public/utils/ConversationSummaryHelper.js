import { generateRealtimeSummary } from "./api.js";

export class ConversationSummaryHelper {
    static extractMessageContent(msg) {
        if (!msg) return "";

        // deal with content as array
        if (Array.isArray(msg.content)) {
            return msg.content
                .map(content => {
                    if (content.type === "text") return content.text;
                    if (content.type === "input_audio" && content.transcript) return content.transcript;
                    if (content.type === "audio" && content.transcript) return content.transcript;
                    return "";
                })
                .filter(Boolean)
                .join(" ");
        }

        // 处理直接是字符串的情况
        if (typeof msg.content === "string") {
            return msg.content;
        }

        // 处理text属性的情况
        if (msg.text) {
            return msg.text;
        }

        return "";
    }

    static async generateSummary(messages, previousSummary = null) {
        try {
            if (!messages || messages.length === 0) return null;

            // 过滤并提取消息内容
            const validMessages = messages
                .filter(msg => msg && (msg.content || msg.text))
                .map(msg => ({
                    role: msg.role,
                    content: this.extractMessageContent(msg)
                }))
                .filter(msg => msg.content.length > 0);

            if (validMessages.length === 0) {
                console.log("No valid messages to summarize");
                return null;
            }

            const allContentToSummarize = [];
            
            // Add previous summary if exists
            if (previousSummary) {
                allContentToSummarize.push({
                    role: "Previous Summary",
                    content: `${previousSummary.content.summary}\nKey Points: ${previousSummary.content.keyPoints.join(", ")}`
                });
            }
            
            // Add new messages
            const processedMessages = validMessages
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
        console.log("instructions", instructions);
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
