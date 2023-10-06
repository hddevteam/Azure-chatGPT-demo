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

}
export default Prompts;