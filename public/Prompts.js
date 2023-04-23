// purpose: to manage the prompts of current conversation

class Prompts {
    constructor() {
        this.data = [];
        this.onLengthChange = null;
    }
    /**
     * Adds a prompt to the data array
     * @param {*} prompt - The prompt to add {messageId, role, content}
     */
    addPrompt(prompt) {
        this.data.push(prompt);
        this.notifyLengthChange();
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
     * Removes all prompts from the data array except the first prompt
     * @returns - The removed prompts
     */
    clearExceptFirst() {
        this.data = this.data.slice(0, 1);
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
        return JSON.stringify(this.data.map((p) => {
            return { role: p.role, content: p.content };
        }));
    }

    /**
     * update the first prompt's content
     * @param {*} newPrompt - The new prompt content
     */
    updateFirstPrompt(newPrompt) {
        this.data[0] = newPrompt;
        this.notifyLengthChange();
    }
}
export default Prompts;