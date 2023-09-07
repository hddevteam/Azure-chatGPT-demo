/* eslint-disable no-unused-vars */
import { setCurrentUsername, getCurrentUsername, getCurrentProfile, setCurrentProfile, saveMessages, getMessages } from "./storage.js";
import { getGpt, getTts, textToImage } from "./api.js";
import { marked } from "marked";
import ClipboardJS from "clipboard";
import swal from "sweetalert";

const modelConfig = {
    "gpt-4": 8000,
    "gpt-3.5-turbo": 16000,
};


// purpose to manage the ui interaction of the app
class UIManager {

    constructor(app) {
        this.app = app;
        this.messageLimit = 10;
        this.isDeleting = false;
        this.profiles = [];
        const messagesContainer = document.querySelector("#messages");
        messagesContainer.addEventListener("scroll", () => {
            if (messagesContainer.scrollTop === 0) {
                this.loadMoreMessages();
            }
        });
        this.messageInput = document.getElementById("message-input");
        this.messages = document.getElementById("messages");
    }

    clearMessageInput() {
        this.messageInput.value = "";
    }

    // generate unique id
    generateId() {
        return Math.random().toString(36).slice(2, 10);
    }

    showToast(message) {
        var toast = document.getElementById("toast");
        toast.innerHTML = message;
        toast.style.display = "block";
        setTimeout(function () {
            toast.style.display = "none";
        }, 3000);
    }

    // attach speaker event to message speaker
    attachMessageSpeakerEvent(speaker) {
        if (!speaker) {
            return;
        }
        speaker.addEventListener("click", async () => {
            await this.playMessage(speaker);
        });
    }

    turnOnPracticeMode() {
        const practiceMode = document.querySelector("#practice-mode");
        const practiceModeIcon = document.querySelector("#practice-mode-icon");
        practiceMode.innerText = "Auto";
        practiceModeIcon.classList.remove("fa-volume-off");
        practiceModeIcon.classList.add("fa-volume-up");
        this.app.setTtsPracticeMode(true);
    }


    turnOffPracticeMode() {
        const practiceMode = document.querySelector("#practice-mode");
        const practiceModeIcon = document.querySelector("#practice-mode-icon");
        practiceMode.innerText = "Man.";
        practiceModeIcon.classList.remove("fa-volume-up");
        practiceModeIcon.classList.add("fa-volume-off");
        this.app.setTtsPracticeMode(false);
    }

    // Create a new method for creating the conversation element
    createConversationElement() {
        const conversationElement = document.createElement("i");
        conversationElement.title = "Hide/Show the message in current conversation";
        conversationElement.classList.add("fas");
        conversationElement.classList.add("fa-quote-left");
        return conversationElement;
    }

    // Create a new method for creating the delete element
    createDeleteElement() {
        const deleteElement = document.createElement("i");
        deleteElement.classList.add("message-delete");
        deleteElement.classList.add("fas");
        deleteElement.classList.add("fa-times");
        return deleteElement;
    }

    // Create a new method for creating the icon group
    createIconGroup() {
        const iconGroup = document.createElement("div");
        iconGroup.classList.add("icon-group");
        return iconGroup;
    }

    // Create a new method for creating the copy element
    createCopyElement() {
        const copyElement = document.createElement("i");
        copyElement.classList.add("message-copy");
        copyElement.classList.add("fas");
        copyElement.classList.add("fa-copy");
        return copyElement;
    }

    // Create a new method for creating the speaker element
    createSpeakerElement() {
        const speakerElement = document.createElement("i");
        speakerElement.classList.add("message-speaker");
        speakerElement.classList.add("fas");
        speakerElement.classList.add("fa-volume-off");
        return speakerElement;
    }

    // Create a new method for creating the message element
    createMessageElement(sender, messageId, isActive) {
        const messageElement = document.createElement("div");
        messageElement.classList.add("message");
        messageElement.classList.add(`${sender}-message`);
        messageElement.dataset.sender = sender;
        messageElement.dataset.messageId = messageId;

        if (isActive) {
            messageElement.classList.add("active");
        }

        return messageElement;
    }

    // Create a new method for creating the message content element
    createMessageContentElement(sender, message, isActive) {
        if (sender === "user") {
            const pre = document.createElement("pre");
            pre.innerText = isActive ? message : this.getMessagePreview(message); // Set full text if active, else set preview text
            return { element: pre, codeBlocksWithCopyElements: [] };
        }
        else {
            const messageHtmlElement = document.createElement("div");
            const messageHtml = marked.parse(message);
            messageHtmlElement.innerHTML = isActive ? messageHtml : marked.parse(this.getMessagePreview(message));
            const codeBlocks = messageHtmlElement.querySelectorAll("pre > code, pre code");
            const codeBlocksWithCopyElements = []; // Create an array to store codeBlock and copyElement pairs

            for (let i = 0; i < codeBlocks.length; i++) {
                const codeBlock = codeBlocks[i];
                const copyElement = this.createCopyElement();

                const wrapper = document.createElement("div");
                wrapper.classList.add("code-block-wrapper");
                wrapper.style.position = "relative";
                codeBlock.parentNode.insertBefore(wrapper, codeBlock);
                wrapper.appendChild(codeBlock);
                wrapper.appendChild(copyElement);
                copyElement.classList.add("code-block-copy");

                codeBlocksWithCopyElements.push({ codeBlock, copyElement }); // Add the codeBlock and copyElement pair to the array
            }

            return { element: messageHtmlElement, codeBlocksWithCopyElements };
        }
    }

    toggleActiveMessage(event) {
        // Get the messageElement based on event type
        const messageElement = event.currentTarget.parentElement;

        if (messageElement.classList.contains("active")) {
            messageElement.classList.remove("active");
            const messageId = messageElement.dataset.messageId;
            this.app.prompts.removePrompt(messageId);
        } else {
            messageElement.classList.add("active");
            const activeMessages = document.querySelectorAll(".message.active");
            this.app.prompts.clear();
            activeMessages.forEach(activeMessage => {
                this.app.prompts.addPrompt({ role: activeMessage.dataset.sender, content: activeMessage.dataset.message, messageId: activeMessage.dataset.messageId });
            });
        }

        // Save the new active status of the message
        const isActive = messageElement.classList.contains("active");
        this.saveMessageActiveStatus(messageElement.dataset.messageId, isActive);
    }

    // Create a new method for attaching a toggle active message event listener
    attachToggleActiveMessageEventListener(element) {
        element.addEventListener("click", this.toggleActiveMessage.bind(this));
    }

    // Create a new method for attaching a delete message event listener
    attachDeleteMessageEventListener(element) {
        element.addEventListener("click", () => {
            const messageId = element.parentElement.dataset.messageId;
            this.deleteMessage(messageId);
        });
    }

    // Add this method to attach a retry message event listener
    attachRetryMessageEventListener(retryElement, messageId) {
        retryElement.addEventListener("click", async () => {
            await this.retryMessage(messageId);
        });
    }

    // Add this method to create a retry element
    createRetryElement() {
        const retryElement = document.createElement("i");
        retryElement.className = "fas fa-sync-alt message-retry";
        return retryElement;
    }

    // Add this method to handle retrying a message
    async retryMessage(messageId) {
        const messageElem = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElem) {
            const messageContent = messageElem.dataset.message;
            this.app.prompts.removePrompt(messageId);
            //add active class to message if it is not already active
            if (!messageElem.classList.contains("active")) {
                messageElem.classList.add("active");
            }
            await this.sendMessage(messageContent, true);
        }
    }

    //text to image
    async generateImage(caption) {
        try {
            const data = await textToImage(caption);
            const imageUrl = data.imageUrl;
            const messageId = this.generateId();
            // Set width and height attributes for the image
            const thumbnailWidth = 300;
            const thumbnailHeight = 300;
            // Wrap the <img> tag and caption text in a <div>
            this.addMessage(
                "assistant",
                `<div>
           <img src="${imageUrl}" alt="${caption}" width="${thumbnailWidth}" height="${thumbnailHeight}" style="object-fit: contain;" />
           <p style="margin-top: 4px;">${caption}</p>
         </div>`,
                messageId
            );
            this.saveCurrentProfileMessages();
        } catch (error) {
            console.error(error);
            let messageId = this.generateId();
            this.addMessage("assistant", error.message, messageId);
        }
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
            const copyElement = this.createCopyElement();

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

    setSystemMessage(message) {
        // 获取显示系统消息的元素
        this.app.prompts.setSystemPrompt(message);
        const systemMessageElement = document.querySelector("#system-message");
        systemMessageElement.innerHTML = message;

    }

    // Add message to DOM
    addMessage(sender, message, messageId, isActive = true, position = "bottom") {
        const messageElement = this.createMessageElement(sender, messageId, isActive);
        messageElement.dataset.message = message;

        const conversationElement = this.createConversationElement();
        messageElement.appendChild(conversationElement);
        this.attachToggleActiveMessageEventListener(conversationElement);

        const deleteElement = this.createDeleteElement();
        messageElement.appendChild(deleteElement);
        this.attachDeleteMessageEventListener(deleteElement);

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
                this.attachCodeBlockCopyEvent(codeBlock, copyElement);
            });

        });

        const iconGroup = this.createIconGroup();

        const copyElement = this.createCopyElement();
        iconGroup.appendChild(copyElement);

        if (sender === "user") {
            const retryElement = this.createRetryElement();
            iconGroup.appendChild(retryElement);
            this.attachRetryMessageEventListener(retryElement, messageId);
        }

        if (getCurrentProfile() && getCurrentProfile().tts === "enabled") {
            const speakerElement = this.createSpeakerElement();
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
        this.attachMessageSpeakerEvent(currentSpeaker);

        const autoPlay = this.app.ttsPracticeMode && sender === "assistant";
        if (autoPlay) {
            this.playMessage(currentSpeaker);
        }

        const currentCopy = messageElement.querySelector(".message-copy:not(.code-block-copy)");
        this.attachMessageCopyEvent(currentCopy);
        codeBlocksWithCopyElements.forEach(({ codeBlock, copyElement }) => {
            this.attachCodeBlockCopyEvent(codeBlock, copyElement);
        });

        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        this.updateSlider();
    }


    updateSlider() {
        const messageCount = document.querySelectorAll(".message").length;
        document.querySelector("#maxValue").textContent = messageCount;

        const counversationCount = this.app.prompts.length - 1;
        //slider.max will be 10 or the number of messages in the conversation, whichever is greater
        const maxSliderValue = Math.max(10, counversationCount);
        const slider = document.querySelector("#slider");
        slider.max = maxSliderValue;
    }

    getMessagePreview(message, maxLength = 50) {
        let previewText = message.replace(/\n/g, " ");
        if (previewText.length > maxLength) {
            return previewText.substring(0, maxLength - 3) + "...";
        }
        return previewText;
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
            self.showToast("copied successful");
        });
        clipboard.on("error", function () {
            self.showToast("copied failed");
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
            self.showToast("copied successful");
        });
        clipboard.on("error", function () {
            self.showToast("copied failed");
        });
    }

    deleteMessage(messageId, isMute = false) {
        if (isMute) {
            this.deleteMessageInSilent(messageId);
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
                    this.deleteMessageInSilent(messageId);
                    swal("Message deleted", { icon: "success", buttons: false, timer: 1000 });
                } else if (value === "edit") {
                    this.messageInput.value = message;
                    this.messageInput.focus();
                    this.deleteMessageInSilent(messageId);
                    swal("Message deleted but copied to input box.", { icon: "success", buttons: false, timer: 1000 });
                }
            });
        }
    }

    deleteMessageInSilent(messageId) {
        this.isDeleting = true;
        // Remove message from DOM and also from prompt array by message id
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        messageElement.remove();
        this.app.prompts.removePrompt(messageId);
        this.deleteMessageFromStorage(messageId);
        this.updateSlider();
        this.isDeleting = false;
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

    deleteMessageFromStorage(messageId) {
        const currentUsername = getCurrentUsername();
        const currentProfileName = getCurrentProfile().name;
        const savedMessages = getMessages(currentUsername, currentProfileName);

        const updatedMessages = savedMessages.filter(savedMessage => savedMessage.messageId !== messageId);

        saveMessages(currentUsername, currentProfileName, updatedMessages);
    }

    inactiveMessage(messageId) {
        const message = document.querySelector(`[data-message-id="${messageId}"]`);
        if (message) {
            message.classList.remove("active");
        }
    }

    // save the current message content to local storage by username and profile name
    saveCurrentProfileMessages() {
        const messages = document.querySelectorAll(".message");
        const savedMessages = getMessages(getCurrentUsername(), getCurrentProfile().name);
        const loadedMessages = [];

        messages.forEach(message => {
            if (message.dataset.sender === "user" || message.dataset.sender === "assistant") {
                if (message.dataset.messageId === "undefined") {
                    loadedMessages.push({ role: message.dataset.sender, content: message.dataset.message, messageId: this.generateId(), isActive: message.classList.contains("active") });
                } else {
                    loadedMessages.push({ role: message.dataset.sender, content: message.dataset.message, messageId: message.dataset.messageId, isActive: message.classList.contains("active") });
                }
            }
        });

        // Merge loaded messages with saved messages
        const updatedMessages = savedMessages.filter(savedMessage => {
            return !loadedMessages.find(loadedMessage => loadedMessage.messageId === savedMessage.messageId);
        }).concat(loadedMessages);

        saveMessages(getCurrentUsername(), getCurrentProfile().name, updatedMessages);
    }

    // Clear message input except the first message
    clearMessage() {
        const messagesContainer = document.getElementById("messages");
        // clear messages in DOM except the first message
        messagesContainer.innerHTML = "";
        this.saveCurrentProfileMessages();
        const messageInput = document.getElementById("message-input");
        messageInput.value = "";
    }

    getLastAssistantMessage() {
        const messagesDiv = document.getElementById("messages");
        const assistantMessages = messagesDiv.querySelectorAll(".assistant-message");
        return assistantMessages[assistantMessages.length - 1];
    }

    getLastLine(text) {
        const lines = text.split("\n");
        return lines[lines.length - 1];
    }


    // Send message on button click
    async sendMessage(message = "", isRetry = false) {
        let messageId = this.generateId();

        if (message.startsWith("/complete")) {
            const lastMessage = this.getLastAssistantMessage();
            const secondLastLine = this.getLastLine(lastMessage.dataset.message);
            message = `内容没有输出完整，请从\n${secondLastLine}\n这一行开始, 向下补充余下的内容`;
        }

        if (message === "/clear") {
            this.clearMessage();
            return;
        }

        if (message.startsWith("/image")) {
            const imageCaption = message.replace("/image", "").trim();
            this.addMessage("user", imageCaption, messageId);
            this.saveCurrentProfileMessages();
            this.generateImage(imageCaption);
            return;
        }

        if (!isRetry) {
            this.addMessage("user", message, messageId);
        }
        this.app.prompts.addPrompt({ role: "user", content: message, messageId: messageId, isActive: true });
        this.saveCurrentProfileMessages();

        let promptText;
        if (message.startsWith("@")) {
            const parts = message.split(":");
            if (parts.length >= 2) {
                const profileDisplayName = parts[0].substring(1).trim(); // Remove '@'
                const messageContent = parts.slice(1).join(":").trim();
                const profile = this.profiles.find(p => p.displayName === profileDisplayName);
                if (profile) {
                    const systemPrompt = { role: "system", content: profile.prompt };
                    let data = this.app.prompts.data.map(d => {
                        if (d.role === "assistant") {
                            return { ...d, role: "user" };
                        }
                        return d;
                    });
                    data.push({ role: "user", content: messageContent });
                    const prompts = [systemPrompt, ...data];
                    promptText = JSON.stringify(prompts.map((p) => {
                        return { role: p.role, content: p.content };
                    }));
                }
            }
        } else {
            promptText = this.app.prompts.getPromptText();
        }

        this.clearMessageInput();
        try {
            this.showToast("AI thinking...");
            console.log(this.app.model);
            console.log(promptText);
            const data = await getGpt(promptText, this.app.model);
            // If no response, pop last prompt and send a message
            if (!data) {
                messageId = this.generateId();
                const content = "AI没有返回结果，请再说一下你的问题，或者换个问题问我吧。";
                this.addMessage("assistant", content, messageId, false);
                this.app.prompts.addPrompt({ role: "assistant", content: content, messageId: messageId, isActive: false });
            } else {
                messageId = this.generateId();
                this.addMessage("assistant", data.message, messageId);
                this.app.prompts.addPrompt({ role: "assistant", content: data.message, messageId: messageId, isActive: true });
                const max_tokens = modelConfig[this.app.model] || 8000;
                console.log("max_tokens", max_tokens);
                const tokens = data.totalTokens;

                const tokensSpan = document.querySelector("#tokens");
                tokensSpan.textContent = `${tokens}t`;
                // If tokens are over 90% of max_tokens, remove the first round conversation
                if (tokens > max_tokens * 0.9) {
                    swal({
                        title: "The conersation tokens are over 90% of the limit, will remove the first round conversation from cache to maintain the conversation flow.",
                        icon: "warning",
                        buttons: false,
                        timer: 3000,
                    });
                    const removedPrompts = this.app.prompts.removeRange(1, 2);
                    removedPrompts.forEach((p) => {
                        this.inactiveMessage(p.messageId);
                    });
                }
            }
            this.saveCurrentProfileMessages();
        } catch (error) {
            let messageId = this.generateId();
            this.addMessage("assistant", error.message, messageId);
        }
    }

    loadMoreMessages() {
        if (this.isDeleting) {
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


    // render menu list from data
    // it only happens when user submit the username or the page is loaded
    renderMenuList(data) {
        this.profiles = data.profiles;
        setCurrentUsername(data.username);
        const usernameLabel = document.querySelector("#username-label");
        usernameLabel.textContent = getCurrentUsername();
        const messagesContainer = document.querySelector("#messages");
        messagesContainer.innerHTML = "";
        const savedCurrentProfile = getCurrentProfile();
        let currentProfileName = savedCurrentProfile ? savedCurrentProfile.name : this.profiles[0].name;
        let currentProfile = this.profiles.find(profile => profile.name === currentProfileName);
        // if currentProfile is not found, set it to the first profile, currentProfileName is also set to the first profile name
        if (!currentProfile) {
            currentProfile = this.profiles[0];
            currentProfileName = currentProfile.name;
        }

        setCurrentProfile(currentProfile);
        this.setupPracticeMode();

        this.setSystemMessage(getCurrentProfile().prompt);
        // read saved messages from local storage for current profile and current username
        const savedMessages = getMessages(getCurrentUsername(), getCurrentProfile().name);
        const startingIndex = savedMessages.length > this.messageLimit ? savedMessages.length - this.messageLimit : 0;
        savedMessages.slice(startingIndex).forEach((message, index, arr) => {
            let isActive = message.isActive || false;
            if (isActive) {
                this.app.prompts.addPrompt(message);
            }
            this.addMessage(message.role, message.content, message.messageId, isActive);
        });

        //empty menu list
        const menuList = document.querySelector("#menu-list");
        menuList.innerHTML = "";
        const aiProfile = document.querySelector("#ai-profile");
        aiProfile.innerHTML = `<i class="${getCurrentProfile().icon}"></i> ${getCurrentProfile().displayName}`;
        //add menu items
        this.profiles.forEach(item => {
            let li = document.createElement("li");
            li.dataset.profile = item.name;
            // set current selected menu item to active
            if (item.name === currentProfileName) {
                li.classList.add("active");
            }
            let icon = document.createElement("i");
            icon.className = `${item.icon}`;
            let span = document.createElement("span");
            span.textContent = item.displayName;
            li.appendChild(icon);
            li.appendChild(span);
            menuList.appendChild(li);
            // Capture the 'this' of UIManager instance
            const self = this;
            //add click event listener
            li.addEventListener("click", function () {
                // set current selected menu item to active and also remove active class from other menu items
                const activeItem = document.querySelector("#menu-list li.active");
                if (activeItem) {
                    activeItem.classList.remove("active");
                }
                this.classList.add("active");
                // reset practice mode
                self.turnOffPracticeMode();
                // change currentProfile
                var profileName = this.getAttribute("data-profile");
                setCurrentProfile(self.profiles.find(function (p) { return p.name === profileName; }));
                // 如果当前 profile 的 tts 属性为 enabled，则显示 ttsContainer
                self.setupPracticeMode();
                // 设置 profile 图标和名称
                const aiProfile = document.querySelector("#ai-profile");
                aiProfile.innerHTML = `<i class="${getCurrentProfile().icon}"></i> ${getCurrentProfile().displayName}`;
                messagesContainer.innerHTML = "";
                // 清空 prompts 数组
                self.app.prompts.clear();

                self.setSystemMessage(getCurrentProfile().prompt);
                // read saved messages from local storage for current profile and current username
                const savedMessages = getMessages(getCurrentUsername(), getCurrentProfile().name);

                const startingIndex = savedMessages.length > self.messageLimit ? savedMessages.length - self.messageLimit : 0;
                savedMessages.slice(startingIndex).forEach((message, index, arr) => {
                    let isActive = message.isActive || false;
                    if (isActive) {
                        self.app.prompts.addPrompt(message);
                    }
                    self.addMessage(message.role, message.content, message.messageId, isActive);
                });
            });
        });
    }

    setupPracticeMode() {
        const ttsContainer = document.querySelector("#tts-container");
        if (getCurrentProfile() && getCurrentProfile().tts === "enabled") {
            // if ttsContainer is not display, then display it
            ttsContainer.style.display = "inline-block";
        } else {
            // if ttsContainer is display, then hide it
            ttsContainer.style.display = "none";
        }
    }

    toggleSpeakerIcon(speaker) {
        speaker.classList.toggle("fa-volume-off");
        speaker.classList.toggle("fa-volume-up");
    }

    async playAudio(speaker) {
        return new Promise((resolve, reject) => {
            this.app.audio.onerror = () => {
                this.toggleSpeakerIcon(speaker);
                this.app.currentPlayingSpeaker = null;
                console.error("Error playing audio.");
                reject(new Error("Error playing audio."));
            };
            this.app.audio.onended = () => {
                this.toggleSpeakerIcon(speaker);
                this.app.currentPlayingSpeaker = null;
                resolve();
            };
            this.app.audio.onabort = () => {
                console.error("Audio play aborted.");
                resolve();
            };
            this.app.audio.play();
        });
    }

    // play the message with tts
    async playMessage(speaker) {
        // if the speaker is playing, stop it and return
        if (speaker.classList.contains("fa-volume-up")) {
            //if the audio is playing, stop it
            this.app.audio.pause();
            this.toggleSpeakerIcon(speaker);
            this.app.currentPlayingSpeaker = null;
            return;
        }
        // If there is a speaker currently playing, stop it and reset its icon
        if (this.app.currentPlayingSpeaker && this.app.currentPlayingSpeaker !== speaker) {
            this.app.audio.pause();
            this.toggleSpeakerIcon(this.app.currentPlayingSpeaker); // Reset the icon of the previous speaker
        }

        // Update the currentPlayingSpeaker variable
        this.app.setCurrentPlayingSpeaker(speaker);

        //get message from parent element dataset message attribute
        const message = speaker.parentElement.parentElement.dataset.message;

        try {
            this.toggleSpeakerIcon(speaker);
            const blob = await getTts(message);
            console.log("ready to play...");
            this.app.audio.src = URL.createObjectURL(blob);
            await this.playAudio(speaker);
        } catch (error) {
            this.toggleSpeakerIcon(speaker);
            console.error(error);
        }
    }

    saveMessageActiveStatus(messageId, isActive) {
        const currentUsername = getCurrentUsername();
        const currentProfileName = getCurrentProfile().name;
        const savedMessages = getMessages(currentUsername, currentProfileName);

        const updatedMessages = savedMessages.map(savedMessage => {
            if (savedMessage.messageId === messageId) {
                // Update the isActive status of the message
                return { ...savedMessage, isActive: isActive };
            } else {
                return savedMessage;
            }
        });
        saveMessages(currentUsername, currentProfileName, updatedMessages);
    }
}

export default UIManager;

