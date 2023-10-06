// EventManager.js
import ClipboardJS from "clipboard";
class EventManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
    }

    // attach speaker event to message speaker
    attachMessageSpeakerEvent(speaker) {
        if (!speaker) {
            return;
        }
        speaker.addEventListener("click", async () => {
            await this.uiManager.playMessage(speaker);
        });
    }
    
    toggleActiveMessage(event) {
        const messageElement = event.currentTarget.parentElement;
        const messageId = messageElement.dataset.messageId;

        if (messageElement.classList.contains("active")) {
            messageElement.classList.remove("active");
            this.uiManager.app.prompts.removePrompt(messageId);
        } else {
            messageElement.classList.add("active");
            this.uiManager.app.prompts.clear();
            const activeMessages = this.uiManager.domManager.getActiveMessages();
            activeMessages.forEach(activeMessage => {
                this.uiManager.app.prompts.addPrompt({ role: activeMessage.dataset.sender, content: activeMessage.dataset.message, messageId: activeMessage.dataset.messageId });
            });
        }

        console.log(messageElement.classList.contains("active"));
        console.log(this.uiManager.app.prompts);

        const isActive = messageElement.classList.contains("active");
        this.uiManager.storageManager.saveMessageActiveStatus(messageId, isActive);
    }

    // Create a new method for attaching a toggle active message event listener
    attachToggleActiveMessageEventListener(element) {
        element.addEventListener("click", this.toggleActiveMessage.bind(this));
    }

    // Create a new method for attaching a delete message event listener
    attachDeleteMessageEventListener(element) {
        element.addEventListener("click", () => {
            const messageId = element.parentElement.dataset.messageId;
            const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);

            // Check if the message is an error message
            const isError = messageElement.classList.contains("error-message");

            // If it's an error message, delete it without confirmation
            if (isError) {
                this.uiManager.messageManager.deleteMessageInSilent(messageId);
            } else {
                this.uiManager.messageManager.deleteMessage(messageId);
            }
        });
    }

    // Add this method to attach a retry message event listener
    attachRetryMessageEventListener(retryElement, messageId) {
        retryElement.addEventListener("click", async () => {
            await this.uiManager.messageManager.retryMessage(messageId);
        });
    }

    // implement attachMessageCopyEvent function
    attachMessageCopyEvent(messageCopy) {
        // 实例化clipboard.js
        var clipboard = new ClipboardJS(messageCopy, {
            text: function (trigger) {
                // 获取爷爷节点的data-message属性内容
                var message = trigger.parentNode.parentNode.getAttribute("data-message");
                //convert the html escape characters to normal characters
                const textElement = document.createElement("textarea");
                textElement.innerHTML = message;
                message = textElement.value;
                return message;
            }
        });

        const self = this;
        clipboard.on("success", function () {
            self.uiManager.showToast("copied successful");
        });
        clipboard.on("error", function () {
            self.uiManager.showToast("copied failed");
        });
    }

    attachCodeBlockCopyEvent(codeBlock, copyElement) {
        // 实例化clipboard.js
        var clipboard = new ClipboardJS(copyElement, {
            text: function () {
                // 获取code元素的文本内容
                const codeText = codeBlock.textContent;
                console.log(codeText);
                return codeText;
            }
        });

        const self = this;
        clipboard.on("success", function () {
            self.uiManager.showToast("copied successful");
        });
        clipboard.on("error", function () {
            self.uiManager.showToast("copied failed");
        });
    }
}

export default EventManager;
