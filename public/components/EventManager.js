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
            // Call the method with forceCollapse = true
            this.toggleCollapseMessage(messageElement, true);
        } else {
            messageElement.classList.add("active");
            this.uiManager.app.prompts.clear();
            const activeMessages = this.uiManager.domManager.getActiveMessages();
            activeMessages.forEach(activeMessage => {
                this.uiManager.app.prompts.addPrompt({ role: activeMessage.dataset.sender, content: activeMessage.dataset.message, messageId: activeMessage.dataset.messageId });
            });
            // Call the method with forceCollapse = false
            this.toggleCollapseMessage(messageElement, false);
        }

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
                this.uiManager.messageManager.deleteMessageInStorage(messageId);
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

    attachMenuButtonEventListener(menuButton) {
        menuButton.addEventListener("click", (event) => {
            const popupMenu = menuButton.nextSibling;
            popupMenu.style.display = popupMenu.style.display === "none" ? "block" : "none";
            event.stopPropagation();
        });

        document.addEventListener("click", () => {
            menuButton.nextSibling.style.display = "none";
        });
    }

    attachPopupMenuItemEventListener(popupMenu) {
        const deleteItem = popupMenu.querySelector(".delete-item");
        deleteItem.addEventListener("click", () => {
            const messageId = popupMenu.parentElement.dataset.messageId;
            this.uiManager.messageManager.deleteMessage(messageId);
        });

        const copyItem = popupMenu.querySelector(".copy-item");
        copyItem.addEventListener("click", () => {
            const message = popupMenu.parentElement.dataset.message;
            navigator.clipboard.writeText(message);
            this.uiManager.showToast("copied successful");
        });

        const toggleItem = popupMenu.querySelector(".toggle-item");
        toggleItem.addEventListener("click", () => {
            const messageElement = popupMenu.parentElement;
            const isCurrentlyCollapsed = messageElement.classList.contains("collapsed");

            // If the message is collapsed, we expand it, and vice versa.
            this.toggleCollapseMessage(messageElement, !isCurrentlyCollapsed);
        });
    }

    toggleCollapseMessage(messageElement, forceCollapse) {
        const isCurrentlyCollapsed = messageElement.classList.contains("collapsed");
        if ((forceCollapse && !isCurrentlyCollapsed) || (!forceCollapse && isCurrentlyCollapsed)) {
            const isCollapsed = messageElement.classList.toggle("collapsed");
            const updatedMessage = isCollapsed ? this.uiManager.messageManager.getMessagePreview(messageElement.dataset.message) : messageElement.dataset.message;
            const sender = messageElement.dataset.sender;

            const newCodeBlocksWithCopyElements = this.uiManager.messageManager.setMessageContent(sender, messageElement, updatedMessage, !isCollapsed);

            newCodeBlocksWithCopyElements.forEach(({ codeBlock, copyElement }) => {
                this.attachCodeBlockCopyEvent(codeBlock, copyElement);
            });

            const toggleItem = messageElement.querySelector(".toggle-item");
            if (toggleItem) {
                toggleItem.dataset.collapsed = isCollapsed ? "true" : "false";
                const span = toggleItem.querySelector("span");
                span.textContent = isCollapsed ? "Expand" : "Collapse";

                // Get the Font Awesome icon element
                const icon = toggleItem.querySelector("i");
                // Change the class depending on whether the message is collapsed or not
                if (isCollapsed) {
                    icon.classList.replace("fa-chevron-up", "fa-chevron-down");
                } else {
                    icon.classList.replace("fa-chevron-down", "fa-chevron-up");
                }
            }
        }
    }
}

export default EventManager;
