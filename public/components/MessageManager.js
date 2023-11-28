// MessageManager.js
import { getGpt, getFollowUpQuestions } from "../utils/api.js";
import swal from "sweetalert";
import { marked } from "marked";
import { generateExcerpt } from "../utils/textUtils.js";


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

        const menuButtonElement = this.uiManager.domManager.createMenuButtonElement();
        messageElement.appendChild(menuButtonElement);

        const popupMenuElement = this.uiManager.domManager.createPopupMenuElement(!isActive);
        messageElement.appendChild(popupMenuElement);

        this.uiManager.eventManager.attachMenuButtonEventListener(menuButtonElement);
        this.uiManager.eventManager.attachPopupMenuItemEventListener(popupMenuElement);

        const messageContentElement = sender === "user" ? document.createElement("pre") : document.createElement("div");
        messageContentElement.classList.add("message-content");
        messageElement.appendChild(messageContentElement);
        const codeBlocksWithCopyElements = this.setMessageContent(sender, messageElement, message, isActive);

        if (!isActive) {
            messageElement.classList.add("collapsed");
        }

        const iconGroup = this.uiManager.domManager.createIconGroup();

        const copyElement = this.uiManager.domManager.createCopyElement();
        iconGroup.appendChild(copyElement);

        if (sender === "user") {
            const retryElement = this.uiManager.domManager.createRetryElement();
            iconGroup.appendChild(retryElement);
            this.uiManager.eventManager.attachRetryMessageEventListener(retryElement, messageId);
        }

        if (this.uiManager.storageManager.getCurrentProfile() && this.uiManager.storageManager.getCurrentProfile().tts === "enabled") {
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

    async validateInput(message) {
        const validationResult = await this.uiManager.validateMessage(message);
        message = validationResult.message;
        let reEdit = validationResult.reEdit;

        if (reEdit) {
            this.uiManager.messageInput.value = message;
            this.uiManager.messageInput.focus();
            this.uiManager.finishSubmitProcessing();
            return false;
        }

        let messageId = this.uiManager.generateId();
        const newMessage = { role: "user", content: message, messageId: messageId, isActive: true };
        this.addMessage(newMessage.role, newMessage.content, newMessage.messageId, newMessage.isActive);
        this.uiManager.app.prompts.addPrompt(newMessage);
        this.uiManager.storageManager.saveMessage(this.uiManager.currentChatId,newMessage);
        this.uiManager.syncManager.syncMessageCreate(this.uiManager.currentChatId, newMessage);
        this.uiManager.chatHistoryManager.updateChatHistory(this.uiManager.currentChatId);

        // return validationResult if input is valid and processed successfully.
        return validationResult;
    }



    async sendTextMessage() {
        this.uiManager.showToast("AI is thinking...");
        const promptText = this.uiManager.app.prompts.getPromptText();
        // Code for getGpt, check it's proper implementation in your code.
        return await getGpt(promptText, this.uiManager.app.model);
    }

    async sendImageMessage(message) {
        const imageCaption = message.replace("/image", "").trim();
        this.uiManager.showToast("AI is generating image...");
        return await this.uiManager.generateImage(imageCaption);
    }


    async wrapWithGetGptErrorHandler(dataPromise) {
        try {
            const data = await dataPromise;
            if (!data) {
                let messageId = this.uiManager.generateId();
                const content = "The AI did not return any results. Please repeat your question or ask me a different question.";
                this.addMessage("assistant", content, messageId, false);
                this.uiManager.app.prompts.addPrompt({ role: "assistant", content: content, messageId: messageId, isActive: false });
            } else {
                let messageId = this.uiManager.generateId();
                const newMessage = { role: "assistant", content: data.message, messageId: messageId, isActive: true };
                this.addMessage(newMessage.role, newMessage.content, newMessage.messageId, newMessage.isActive);
                this.uiManager.storageManager.saveMessage(this.uiManager.currentChatId, newMessage);
                this.uiManager.syncManager.syncMessageCreate(this.uiManager.currentChatId, newMessage);
                this.uiManager.app.prompts.addPrompt(newMessage);
                await this.sendFollowUpQuestions();
            }
            return data;
        } catch (error) {
            let messageId = this.uiManager.generateId();
            this.addMessage("assistant", error.message, messageId, true, "bottom", true);
            this.uiManager.finishSubmitProcessing();
        }
    }


    checkTokensAndWarn(tokens) {

        const tokensSpan = document.querySelector("#tokens");
        tokensSpan.textContent = `${tokens}t`;
        tokensSpan.parentNode.classList.add("updated");
        setTimeout(() => {
            tokensSpan.parentNode.classList.remove("updated");
        }, 500);

        const max_tokens = modelConfig[this.uiManager.app.model] || 8000;
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

    async sendProfileMessage(message) {
        // Profile-specific logic
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
            console.log(prompts);
            const promptText = JSON.stringify(prompts.map((p) => {
                return { role: p.role, content: p.content };
            }));

            // Send the new 'profile' message
            this.uiManager.showToast("AI is thinking...");
            return await getGpt(promptText, this.uiManager.app.model);
        }
    }

    async sendMessage(inputMessage = "") {
        this.clearFollowUpQuestions();

        this.uiManager.initSubmitButtonProcessing();

        const validationResult = await this.validateInput(inputMessage);

        if (!validationResult) {
            return;
        }

        const { message, isSkipped } = validationResult;
        let data;

        if (message.startsWith("/image")) {
            data = await this.sendImageMessage(message);
        } else if (message.startsWith("@") && !isSkipped) {
            data = await this.sendProfileMessage(message);
        } else {
            data = await this.sendTextMessage(message);
        }

        data = await this.wrapWithGetGptErrorHandler(data);
        this.uiManager.finishSubmitProcessing();

        // Don't forget to perform follow-up actions after the response if any

        this.checkTokensAndWarn(data.totalTokens);
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
            this.toggleCollapseMessage(message, true);
        }
    }

    editMessage(message, messageId) {
        this.inactiveMessage(messageId);
        this.uiManager.messageInput.value = message;
        this.uiManager.messageInput.focus();
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
                },
            }).then((value) => {
                if (value === "delete") {
                    this.deleteMessageInStorage(messageId);
                    swal("Message deleted", { icon: "success", buttons: false, timer: 1000 });
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
        this.uiManager.storageManager.deleteMessage(messageId);
        this.uiManager.syncManager.syncMessageDelete(this.uiManager.currentChatId, messageId);
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

    getMessagePreview(message, maxLength = 80) {
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

    deleteInactiveMessages() {
        const inactiveMessages = document.querySelectorAll(".message:not(.active)");
        for (let i = inactiveMessages.length - 1; i >= 0; i--) {
            const message = inactiveMessages[i];
            this.deleteMessage(message.dataset.messageId, true);
        }
    }

    deleteAllMessages() {
        const allMessages = document.querySelectorAll(".message");
        for (let i = allMessages.length - 1; i >= 0; i--) {
            const message = allMessages[i];
            this.deleteMessage(message.dataset.messageId, true);
        }
    }

    loadMoreMessages() {
        if (this.uiManager.isDeleting) {
            return;
        }

        const messagesContainer = document.querySelector("#messages");
        const savedMessages = this.uiManager.storageManager.getMessages(this.uiManager.currentChatId);
        const currentMessagesCount = messagesContainer.children.length;
        const messageLimit = this.uiManager.messageLimit;
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

    toggleCollapseMessage(messageElement, forceCollapse) {
        const isCurrentlyCollapsed = messageElement.classList.contains("collapsed");
        if ((forceCollapse && !isCurrentlyCollapsed) || (!forceCollapse && isCurrentlyCollapsed)) {
            const isCollapsed = messageElement.classList.toggle("collapsed");
            const updatedMessage = isCollapsed ? this.getMessagePreview(messageElement.dataset.message) : messageElement.dataset.message;
            const sender = messageElement.dataset.sender;

            const newCodeBlocksWithCopyElements = this.setMessageContent(sender, messageElement, updatedMessage, !isCollapsed);

            newCodeBlocksWithCopyElements.forEach(({ codeBlock, copyElement }) => {
                this.uiManager.eventManager.attachCodeBlockCopyEvent(codeBlock, copyElement);
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
    // MessageManager.js
    addFollowUpQuestions(questions) {
        const followUpQuestionsElement = document.createElement("div");
        followUpQuestionsElement.classList.add("follow-up-questions");

        questions.forEach((question) => {
            const questionElement = document.createElement("button");
            questionElement.textContent = question;
            this.uiManager.eventManager.attachQuestionButtonEvent(questionElement, question);
            followUpQuestionsElement.appendChild(questionElement);
        });

        const messagesContainer = document.querySelector("#messages");
        messagesContainer.appendChild(followUpQuestionsElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        this.uiManager.updateSlider();
    }

    // MessageManager.js
    clearFollowUpQuestions() {
        const followUpQuestionsElement = document.querySelector("#messages .follow-up-questions");
        if (followUpQuestionsElement) {
            followUpQuestionsElement.remove();
        }
    }

    async sendFollowUpQuestions() {       
        const currentProfile = this.uiManager.storageManager.getCurrentProfile();
        const activeMessages = [...document.querySelectorAll(".message.active")];
        let content = "";
        const lastMessages = activeMessages.slice(-2); // This will still work even if there are fewer than 4 messages
        lastMessages.forEach(message => {
            // const dataSender = message.getAttribute("data-sender");
            let dataMessage = message.getAttribute("data-message");
            // if dataMessage is longer than 5000 characters, truncate first 1000 characters, add ellipsis, then get middle 500 characters, add ellipsis, then get last 1000 characters.
            dataMessage = generateExcerpt(dataMessage, 1000, 500, 1000);

            const dataRole = message.getAttribute("data-sender");
            if (dataRole === "user") {
                content += ` You: \n\n
                 ${dataMessage}\n\n`;
            } else {
                content += `
                Him/Her (${currentProfile.displayName}): \n\n
                : ${dataMessage}\n\n`;
            }
            content += `${dataMessage}\n\n`;
        });
        
        const systemPrompt = { role: "system", 
            content: ` You are a critical thinker. You are talking with ${currentProfile.displayName},
            Here is his/her profile:
                      ===
                      ${currentProfile.prompt}
                      ===
                      ` };
        console.log(this.uiManager.clientLanguage);
        const userPrompt = { role: "user", 
            content: `Output json format: {
                "suggestedUserResponses": []
            }
            Please give your follow-up ideas less than 15 words, limit to 3 follow-up ideas based on the following context or his/her profile above.
            ===
            ${content}
            ===
            Please use the tone of: I'd like to know, How can I, How does it work, I'd like to find out, I'd like to learn, I'd like to understand, I'd like to explore, I'd like to discover, I'd like to know more about...
            Please use ${this.uiManager.clientLanguage}.
            Output:` };
        const prompts = [systemPrompt, userPrompt];
        console.log(prompts);
        const questionPromptText = JSON.stringify(prompts.map((p) => {
            return { role: p.role, content: p.content };
        }));

        const followUpResponsesData = await getFollowUpQuestions(questionPromptText);
        console.log(followUpResponsesData.suggestedUserResponses);

        this.addFollowUpQuestions(followUpResponsesData.suggestedUserResponses);
    }

}

export default MessageManager;
