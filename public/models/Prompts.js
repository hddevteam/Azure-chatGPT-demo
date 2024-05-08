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

    // 用来在profile message中替换system prompt和最后一个user prompt
    getPromptTextWithReplacement(externalSystemPrompt, replacementContent) {
        const systemPrompt = {
            role: "system",
            content: [{ type: "text", text: externalSystemPrompt }]
        };

        // 创建一个数据副本，以保持原始数据不变
        let modifiedData = [...this.data];

        // 检索并保存最后一个prompt的附件信息
        const lastPrompt = modifiedData.pop();  // 移除并获取最后一个prompt
        const attachmentUrls = lastPrompt ? lastPrompt.attachmentUrls : "";

        // 给新的内容添加替换的最后一个prompt，包括附件信息
        modifiedData.push({
            role: "user",
            content: replacementContent,
            attachmentUrls: attachmentUrls  // 保留附件信息
        });

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