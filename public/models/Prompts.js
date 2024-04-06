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

    /**
     * get the prompts array as a string
     * @returns - The prompts array as a string
     */
    getPromptText() {
        //combine the system prompt and the data array
        // system prompt is the first prompt
        // it looks like this: {role: "system", content: "Hello, I am a chatbot."}
        const systemPrompt = { role: "system", content: this.systemPrompt };
        const prompts = [systemPrompt, ...this.data];
        return JSON.stringify(prompts.map((p) => {
            return { role: p.role, content: p.content };
        }));
    }

    /**
     * get the prompts array as a string for GPT-4 v
     * @returns - The prompts array as a string
     */
    getGpt4vPromptText() {
        const systemPrompt = { 
            role: "system", 
            content: [{ type: "text", text: this.systemPrompt }]
        };
        const prompts = [systemPrompt, ...this.data];
        return JSON.stringify(prompts.map(p => {
            // 如果有attachmentUrls字段，我们将其转换为image_url对象数组
            const attachmentContent = p.attachmentUrls ?
                p.attachmentUrls.split(";")
                    .filter(url => url.trim() !== "") // 过滤空字符串
                    .map(url => ({ type: "image_url", image_url: { url } })) : [];
            // 确保content是一个数组
            let contentArray = Array.isArray(p.content) ? p.content : [{ type: "text", text: p.content }];
            // 将attachmentContent添加到content数组中
            contentArray = [...contentArray, ...attachmentContent];
            return {
                role: p.role,
                content: contentArray.map(c => {
                    // 直接返回c，因为这时c已是正确格式
                    return c;
                })
            };
        }));
    }
}
export default Prompts;