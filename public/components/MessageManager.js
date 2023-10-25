// MessageManager.js
import { getGpt } from "../utils/api.js";
import { getCurrentProfile, getCurrentUsername } from "../utils/storage.js";
import swal from "sweetalert";
import { marked } from "marked";


const modelConfig = {
    "gpt-4": 32000,
    "gpt-3.5-turbo": 16000,
};


class MessageManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
    }

    // Add message to DOM
    addMessage(sender, message, messageId, isActive = true, position = "bottom", isError = false) {
        const messageElement = this.uiManager.domManager.createMessageElement(sender, messageId, isActive, isError);
        messageElement.dataset.message = message;

        const conversationElement = this.uiManager.domManager.createConversationElement();
        messageElement.appendChild(conversationElement);
        this.uiManager.eventManager.attachToggleActiveMessageEventListener(conversationElement);

        const deleteElement = this.uiManager.domManager.createDeleteElement();
        messageElement.appendChild(deleteElement);
        this.uiManager.eventManager.attachDeleteMessageEventListener(deleteElement);

        const messageContentElement = sender === "user" ? document.createElement("pre") : document.createElement("div");
        messageElement.appendChild(messageContentElement);
        const codeBlocksWithCopyElements = this.setMessageContent(sender, messageElement, message, isActive);

        if (!isActive) {
            messageElement.classList.add("collapsed");
        }

        const messageElem = messageElement;

        messageElement.addEventListener("dblclick", (event) => {
            const isCollapsed = messageElem.classList.toggle("collapsed");
            const updatedMessage = isCollapsed ? this.getMessagePreview(messageElem.dataset.message) : messageElem.dataset.message;

            // Update the message content and get the new codeBlocksWithCopyElements
            const newCodeBlocksWithCopyElements = this.setMessageContent(sender, messageElem, updatedMessage, !isCollapsed);

            newCodeBlocksWithCopyElements.forEach(({ codeBlock, copyElement }) => {
                this.uiManager.eventManager.attachCodeBlockCopyEvent(codeBlock, copyElement);
            });

        });

        const iconGroup = this.uiManager.domManager.createIconGroup();

        const copyElement = this.uiManager.domManager.createCopyElement();
        iconGroup.appendChild(copyElement);

        if (sender === "user") {
            const retryElement = this.uiManager.domManager.createRetryElement();
            iconGroup.appendChild(retryElement);
            this.uiManager.eventManager.attachRetryMessageEventListener(retryElement, messageId);
        }

        if (getCurrentProfile() && getCurrentProfile().tts === "enabled") {
            const speakerElement = this.uiManager.domManager.createSpeakerElement();
            iconGroup.appendChild(speakerElement);
        }

        messageElement.appendChild(iconGroup);
        const messagesContainer = document.querySelector("#messages");

        if (position === "top") {
            messagesContainer.insertBefore(messageElement, messagesContainer.firstChild.nextSibling);
        } else {
            messagesContainer.appendChild(messageElement);
        }

        const currentSpeaker = messageElement.querySelector(".message-speaker");
        this.uiManager.eventManager.attachMessageSpeakerEvent(currentSpeaker);

        const autoPlay = this.uiManager.app.ttsPracticeMode && sender === "assistant";
        if (autoPlay) {
            this.uiManager.playMessage(currentSpeaker);
        }

        const currentCopy = messageElement.querySelector(".message-copy:not(.code-block-copy)");
        this.uiManager.eventManager.attachMessageCopyEvent(currentCopy);
        codeBlocksWithCopyElements.forEach(({ codeBlock, copyElement }) => {
            this.uiManager.eventManager.attachCodeBlockCopyEvent(codeBlock, copyElement);
        });

        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        this.uiManager.updateSlider();
    }

    async sendMessage(message = "") {
        this.uiManager.initSubmitButtonProcessing();

        let messageId = this.uiManager.generateId();
        const validationResult = await this.uiManager.validateMessage(message);
        message = validationResult.message;
        let isSkipped = validationResult.isSkipped;
        let reEdit = validationResult.reEdit;

        if (reEdit) {
            this.uiManager.messageInput.value = message;
            this.uiManager.messageInput.focus();
            this.uiManager.finishSubmitProcessing();
            return;
        }

        this.addMessage("user", message, messageId);
        this.uiManager.app.prompts.addPrompt({ role: "user", content: message, messageId: messageId, isActive: true });
        this.uiManager.storageManager.saveCurrentProfileMessages();
        this.uiManager.chatHistoryManager.updateChatHistory(this.uiManager.currentChatId);

        if (message.startsWith("/image")) {
            const imageCaption = message.replace("/image", "").trim();
            this.uiManager.showToast("AI is generating image...");
            this.uiManager.generateImage(imageCaption);
            return;
        }

        let promptText;
        if (message.startsWith("@") && !isSkipped) {
            const parts = message.split(":");
            if (parts.length >= 2) {
                const profileDisplayName = parts[0].substring(1).trim(); // Remove '@'
                const messageContent = parts.slice(1).join(":").trim();
                let systemPrompt;
                const profile = this.uiManager.profiles.find(p => p.displayName === profileDisplayName);
                if (profile) {
                    systemPrompt = { role: "system", content: profile.prompt };
                } else {
                    systemPrompt = { role: "system", content: `You are an experienced ${profileDisplayName}.` };
                }
                let data = this.uiManager.app.prompts.data.map(d => {
                    if (d.role === "assistant") {
                        return { ...d, role: "user" };
                    }
                    return d;
                });
                // remove the last prompt
                data.pop();
                data.push({ role: "user", content: messageContent });
                const prompts = [systemPrompt, ...data];
                promptText = JSON.stringify(prompts.map((p) => {
                    return { role: p.role, content: p.content };
                }));
            }
        } else {
            promptText = this.uiManager.app.prompts.getPromptText();
        }

        try {
            this.uiManager.showToast("AI is thinking...");
            console.log(this.uiManager.app.model);
            console.log(promptText);
            const data = await getGpt(promptText, this.uiManager.app.model);

            // 停止动画，恢复按钮初始状态
            this.uiManager.finishSubmitProcessing();

            // If no response, pop last prompt and send a message
            if (!data) {
                messageId = this.uiManager.generateId();
                const content = "The AI did not return any results. Please repeat your question or ask me a different question.";
                this.addMessage("assistant", content, messageId, false);
                this.uiManager.app.prompts.addPrompt({ role: "assistant", content: content, messageId: messageId, isActive: false });
            } else {
                messageId = this.uiManager.generateId();
                this.addMessage("assistant", data.message, messageId);
                this.uiManager.app.prompts.addPrompt({ role: "assistant", content: data.message, messageId: messageId, isActive: true });
                const max_tokens = modelConfig[this.uiManager.app.model] || 8000;
                console.log("max_tokens", max_tokens);
                const tokens = data.totalTokens;
                const tokensSpan = document.querySelector("#tokens");
                tokensSpan.textContent = `${tokens}t`;
                tokensSpan.parentNode.classList.add("updated");
                setTimeout(() => {
                    tokensSpan.parentNode.classList.remove("updated");
                }, 500);

                // If tokens are over 90% of max_tokens, remove the first round conversation
                if (tokens > max_tokens * 0.9) {
                    swal({
                        title: "The conersation tokens are over 90% of the limit, will remove the first round conversation from cache to maintain the conversation flow.",
                        icon: "warning",
                        buttons: false,
                        timer: 3000,
                    });
                    const removedPrompts = this.uiManager.app.prompts.removeRange(1, 2);
                    removedPrompts.forEach((p) => {
                        this.inactiveMessage(p.messageId);
                    });
                }
            }
            this.uiManager.storageManager.saveCurrentProfileMessages();
        } catch (error) {
            let messageId = this.uiManager.generateId();
            this.addMessage("assistant", error.message, messageId, true, "bottom", true);
            this.uiManager.finishSubmitProcessing();
        }
    }

    // Add this method to get the ID of the last message
    getLastMessageId() {
        const messages = document.querySelectorAll(".message");
        return messages.length > 0 ? messages[messages.length - 1].dataset.messageId : null;
    }

    // Modify this method to handle retrying a message
    async retryMessage(messageId) {
        const messageElem = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElem) {
            const messageContent = messageElem.dataset.message;

            // Check if the message to retry is the last message
            const lastMessageId = this.getLastMessageId();
            if (messageId === lastMessageId) {
                // If it is, delete it
                this.deleteMessageInStorage(messageId);
            } else {
                // If not, just set it as inactive
                this.inactiveMessage(messageId);
            }

            // Then resend the message
            await this.sendMessage(messageContent, true);
        }
    }

    inactiveMessage(messageId) {
        const message = document.querySelector(`[data-message-id="${messageId}"]`);
        this.uiManager.app.prompts.removePrompt(messageId);
        if (message) {
            message.classList.remove("active");
        }
    }

    deleteMessage(messageId, isMute = false) {
        if (isMute) {
            this.deleteMessageInStorage(messageId);
        } else {
            const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);

            // get first 500 characters of the message as preview text
            const message = messageElement.dataset.message;
            const previewText = this.getMessagePreview(message, 500);

            swal({
                title: "Are you sure you want to delete or edit this message?",
                text: previewText,
                icon: "warning",
                buttons: {
                    cancel: "Cancel",
                    delete: {
                        text: "Delete",
                        value: "delete",
                    },
                    edit: {
                        text: "Edit",
                        value: "edit",
                    },
                },
            }).then((value) => {
                if (value === "delete") {
                    this.deleteMessageInStorage(messageId);
                    swal("Message deleted", { icon: "success", buttons: false, timer: 1000 });
                } else if (value === "edit") {
                    this.uiManager.messageInput.value = message;
                    this.uiManager.messageInput.focus();
                    this.deleteMessageInStorage(messageId);
                    swal("Message deleted but copied to input box.", { icon: "success", buttons: false, timer: 1000 });
                }
            });
        }
    }

    deleteMessageInStorage(messageId) {
        this.uiManager.isDeleting = true;
        // Remove message from DOM and also from prompt array by message id
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        messageElement.remove();
        this.uiManager.app.prompts.removePrompt(messageId);
        this.uiManager.storageManager.deleteMessageFromStorage(messageId);
        this.uiManager.updateSlider();
        this.uiManager.isDeleting = false;
    }

    setMessageContent(sender, messageElem, message, isActive) {
        let element;
        if (sender === "user") {
            element = messageElem.querySelector("pre");
            element.innerText = isActive ? message : this.getMessagePreview(message);
        } else {
            element = messageElem.querySelector("div");
            const messageHtml = marked.parse(message);
            element.innerHTML = isActive ? messageHtml : marked.parse(this.getMessagePreview(message));
        }

        const codeBlocks = element.querySelectorAll("pre > code, pre code");
        const codeBlocksWithCopyElements = [];

        for (let i = 0; i < codeBlocks.length; i++) {
            const codeBlock = codeBlocks[i];
            const copyElement = this.uiManager.domManager.createCopyElement();

            const wrapper = document.createElement("div");
            wrapper.classList.add("code-block-wrapper");
            wrapper.style.position = "relative";
            codeBlock.parentNode.insertBefore(wrapper, codeBlock);
            wrapper.appendChild(codeBlock);
            wrapper.appendChild(copyElement);
            copyElement.classList.add("code-block-copy");

            codeBlocksWithCopyElements.push({ codeBlock, copyElement });
        }

        return codeBlocksWithCopyElements;
    }

    getMessagePreview(message, maxLength = 50) {
        let previewText = message.replace(/\n/g, " ");
        if (previewText.length > maxLength) {
            return previewText.substring(0, maxLength - 3) + "...";
        }
        return previewText;
    }

    // delete active messages one by one from message list, prompts and local storage
    deleteActiveMessages() {
        const activeMessages = document.querySelectorAll(".message.active");
        // delete active messages one by one from last to first, and dont't delete the system prompt
        for (let i = activeMessages.length - 1; i >= 0; i--) {
            const message = activeMessages[i];
            this.deleteMessage(message.dataset.messageId, true);
        }
    }

    loadMoreMessages() {
        if (this.uiManager.isDeleting) {
            return;
        }

        const messagesContainer = document.querySelector("#messages");
        const savedMessages = JSON.parse(localStorage.getItem(getCurrentUsername() + "_" + getCurrentProfile().name) || "[]");
        const currentMessagesCount = messagesContainer.children.length;
        const messageLimit = 10;
        const startingIndex = savedMessages.length - currentMessagesCount - messageLimit > 0 ? savedMessages.length - currentMessagesCount - messageLimit : 0;
        // Record the current scroll position
        const currentScrollPosition = messagesContainer.scrollHeight - messagesContainer.scrollTop;

        // Get the current list of message IDs
        const currentMessageIds = Array.from(messagesContainer.children).map(message => message.dataset.messageId);

        savedMessages.slice(startingIndex, savedMessages.length - currentMessagesCount).reverse().forEach((message, index) => {
            // Check if the message is already in the list
            if (!currentMessageIds.includes(message.messageId)) {
                let isActive = message.isActive || false;
                this.addMessage(message.role, message.content, message.messageId, isActive, "top");
            }
        });

        // Set the scroll position back to the original position after loading more messages
        messagesContainer.scrollTop = messagesContainer.scrollHeight - currentScrollPosition;
    }

}

export default MessageManager;
