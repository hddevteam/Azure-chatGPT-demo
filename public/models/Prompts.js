// purpose: to manage the prompts of current conversation

class Prompts {
    constructor() {
        this.data = [];
        this.onLengthChange = null;
        this.systemPrompt = "";
    }
    /**
     * Adds a prompt to the data array
     * @param {*} prompt - The prompt to add {messageId, role, content}
     */
    addPrompt(prompt) {
        this.data.push(prompt);
        this.notifyLengthChange();
    }

    setSystemPrompt(prompt) {
        this.systemPrompt = prompt;
    }

    /**
     * get prompt data length
     */
    get length() {
        return this.data.length;
    }

    notifyLengthChange() {
        if (this.onLengthChange) {
            this.onLengthChange(this.data.length);
        }
    }

    /**
     * Removes a prompt from the data array based on the messageId
     * @param {String} messageId - The id of the prompt to remove
     */
    removePrompt(messageId) {
        this.data = this.data.filter(prompt => prompt.messageId !== messageId);
        this.notifyLengthChange();
    }

    /**
     * Removes all prompts from the data array
     */
    clear() {
        this.data.splice(0, this.data.length);
        this.notifyLengthChange();
    }

    /**
     * Removes a range of prompts from the data array based on the startIndex and deleteCount
     * @param {*} startIndex - The index of the prompt to start removing
     * @param {*} deleteCount - The number of prompts to remove
     * @returns - The removed prompts
     */
    removeRange(startIndex, deleteCount) {
        const removedItems = this.data.splice(startIndex, deleteCount);
        this.notifyLengthChange();
        return removedItems;
    }

    // Used to replace system prompt and last user prompt in profile message
    getPromptTextWithReplacement(externalSystemPrompt, replacementContent) {
        const systemPrompt = {
            role: "system",
            content: [{ type: "text", text: externalSystemPrompt }]
        };

        // Create a data copy to keep the original data unchanged
        let modifiedData = [...this.data];

        // Retrieve and save attachment info from the last prompt
        const lastPrompt = modifiedData.pop();  // Remove and get the last prompt
        const attachmentUrls = lastPrompt ? lastPrompt.attachmentUrls : "";

        // Add replacement content for the last prompt, including attachment info
        modifiedData.push({
            role: "user",
            content: replacementContent,
            attachmentUrls: attachmentUrls  // Retain attachment info
        });

        const prompts = [systemPrompt, ...modifiedData];
        return JSON.stringify(prompts.map(p => this.formatPrompt(p)));
    }

    // NEW: Used when @ mentioning profiles - keeps all context but overrides system prompt
    getPromptTextWithProfileOverride(externalSystemPrompt, newUserMessage) {
        const systemPrompt = {
            role: "system",
            content: [{ type: "text", text: externalSystemPrompt }]
        };

        // Create a copy of all conversation history
        let modifiedData = [...this.data];

        // Get the last message (which is the @ mention message we want to replace)
        const lastPrompt = modifiedData.pop();
        const attachmentUrls = lastPrompt ? lastPrompt.attachmentUrls : "";

        // Replace only the last user message content (strip the @profile: part)
        modifiedData.push({
            role: "user",
            content: newUserMessage,
            attachmentUrls: attachmentUrls
        });

        // Return all messages with the new system prompt
        const prompts = [systemPrompt, ...modifiedData];
        return JSON.stringify(prompts.map(p => this.formatPrompt(p)));
    }

    formatPrompt(p) {
        const attachmentContent = p.attachmentUrls ?
            p.attachmentUrls.split(";")
                .filter(url => url.trim() !== "")
                .map(url => ({ type: "image_url", image_url: { url } })) : [];

        let contentArray = Array.isArray(p.content) ? p.content : [{ type: "text", text: p.content }];
        contentArray = [...contentArray, ...attachmentContent];
        return {
            role: p.role,
            content: contentArray
        };
    }

    getPromptText() {
        return this.getPromptTextWithSystemPrompt(this.systemPrompt);
    }

    getPromptTextWithSystemPrompt(externalSystemPrompt) {
        const systemPrompt = {
            role: "system",
            content: [{ type: "text", text: externalSystemPrompt }]
        };
        const prompts = [systemPrompt, ...this.data];
        return JSON.stringify(prompts.map(p => this.formatPrompt(p)));
    }

}
export default Prompts;