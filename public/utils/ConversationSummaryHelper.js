export class ConversationSummaryHelper {
    static async generateSummary(messages, realtimeClient) {
        try {
            const allContentToSummarize = [];
            
            // Convert messages to the expected format
            const processedMessages = messages
                .filter(msg => msg.content && msg.content.trim() !== "")
                .map(msg => ({
                    role: msg.role,
                    content: msg.content
                }));
            
            allContentToSummarize.push(...processedMessages);

            if (allContentToSummarize.length > 0) {
                return await realtimeClient.generateSummary(allContentToSummarize);
            }
            
            return null;
        } catch (error) {
            console.error("Failed to generate summary:", error);
            return null;
        }
    }

    static buildUpdatedInstructions(originalInstructions, summaryResult) {
        const instructions = [];
        
        // 1. Add original instructions
        instructions.push(originalInstructions);
        
        // 2. Add current summary
        instructions.push(`
Current Conversation Summary:
${summaryResult.summary}

Key Discussion Points:
${summaryResult.keyPoints.map(point => `• ${point}`).join("\n")}

Current Context:
${summaryResult.context}

Please continue the conversation while maintaining consistency with the above context and key points.`);

        // Return the combined instructions
        return instructions.join("\n\n").trim();
    }
}
