/* eslint-disable no-undef */
import { setCurrentUsername, getCurrentUsername, getCurrentProfile, setCurrentProfile } from "./storage.js";
import { getGpt, getTts } from "./api.js";

// purpose to manage the ui interaction of the app
class UIManager {

    constructor(app) {
        this.app = app;
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

    // Add message to DOM
    addMessage(sender, message, messageId, isActive = true) {
        const messageElement = document.createElement("div");
        messageElement.classList.add("message");
        messageElement.classList.add(`${sender}-message`);
        messageElement.dataset.message = message;
        messageElement.dataset.sender = sender;
        messageElement.dataset.messageId = messageId;
        const self = this;
        function toggleActiveMessage(event) {
            // Get the messageElement based on event type
            const messageElement = event.type === "dblclick" ? event.currentTarget : event.currentTarget.parentElement;
            // check if the element has class active
            if (messageElement.classList.contains("active")) {
                // if it has, remove the inactive class
                messageElement.classList.remove("active");
                // remove the message frmo prompts by message id
                messageId = messageElement.dataset.messageId;
                self.app.prompts.removePrompt(messageId);
            }
            else {
                // if it doesn't, add the inactive class
                messageElement.classList.add("active");
                // clear prompts except index 0
                self.app.prompts.clearExceptFirst();
                // add  all the active message to prompts
                const activeMessages = document.querySelectorAll(".message.active");
                activeMessages.forEach(activeMessage => {
                    self.app.prompts.addPrompt({ role: activeMessage.dataset.sender, content: activeMessage.dataset.message, messageId: activeMessage.dataset.messageId });
                });
            }
        }
        // if sender is not system
        if (sender !== "system") {
            //add fa-comments icon to message with class message-conversation and fas fa-comments
            const conversationElement = document.createElement("i");
            conversationElement.classList.add("fas");
            conversationElement.classList.add("fa-quote-left");
            messageElement.appendChild(conversationElement);

            //add onclick event listener to conversationElement
            conversationElement.addEventListener("click", toggleActiveMessage);
            messageElement.addEventListener("dblclick", toggleActiveMessage);

            //add fa-times icon to message with class message-delete and fas fa-trash
            const deleteElement = document.createElement("i");
            deleteElement.classList.add("message-delete");
            deleteElement.classList.add("fas");
            deleteElement.classList.add("fa-times");
            messageElement.appendChild(deleteElement);
            //add onclick event listener to deleteElement
            deleteElement.addEventListener("click", () => {
                // get the message id from messageElement's dataset
                const messageId = messageElement.dataset.messageId;
                this.deleteMessage(messageId);
            });

            if (isActive) {
                // if message is not active, add inactive class to messageElement and conversationElement
                messageElement.classList.add("active");
            }
        }

        //if send is user
        if (sender === "user") {
            const pre = document.createElement("pre");
            pre.innerText = message;
            messageElement.appendChild(pre);
        } else {
            const messageHtml = marked.parse(message);
            const messageHtmlElement = document.createElement("div");
            messageHtmlElement.innerHTML = messageHtml;
            messageElement.appendChild(messageHtmlElement);
        }

        const iconGroup = document.createElement("div");
        iconGroup.classList.add("icon-group");

        //add a copy icon to message with class message-copy and fas fa-copy
        const copyElement = document.createElement("i");
        copyElement.classList.add("message-copy");
        copyElement.classList.add("fas");
        copyElement.classList.add("fa-copy");
        //add message to copyElement dataset
        iconGroup.appendChild(copyElement);

        //check if current profile.tts is exist and value with "enabled"
        if (getCurrentProfile() && getCurrentProfile().tts === "enabled") {
            //create speaker icon
            const speakerElement = document.createElement("i");
            speakerElement.classList.add("message-speaker");
            speakerElement.classList.add("fas");
            speakerElement.classList.add("fa-volume-off");
            iconGroup.appendChild(speakerElement);
        }

        messageElement.appendChild(iconGroup);
        const messagesContainer = document.querySelector("#messages");
        messagesContainer.appendChild(messageElement);
        const messageSpeakers = document.querySelectorAll(".message-speaker");
        const lastSpeaker = messageSpeakers[messageSpeakers.length - 1];
        this.attachMessageSpeakerEvent(lastSpeaker);

        // Determine if the message should be played automatically
        const autoPlay = this.app.ttsPracticeMode && sender === "assistant";
        if (autoPlay) {
            this.playMessage(lastSpeaker);
        }

        // find the last message-copy and add click event listener to it
        const messageCopies = document.querySelectorAll(".message-copy");
        const lastCopy = messageCopies[messageCopies.length - 1];
        this.attachMessageCopyEvent(lastCopy);

        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // update slider max value
        // eslint-disable-next-line no-undef
        slider.max = Math.max(0, document.querySelectorAll(".message").length - 1);
        document.querySelector("#maxValue").textContent = slider.max;
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

    deleteMessage(messageId) {
        // remove message from DOM and also from prompt array by message id 
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        // update input value to messageElement's data-message
        const messageInput = document.querySelector("#message-input");
        messageInput.value = messageElement.dataset.message;
        messageElement.remove();
        this.app.prompts.removePrompt(messageId);
        this.saveCurrentProfileMessages();

        // update slider max value
        slider.max = Math.max(0, document.querySelectorAll(".message").length - 1);
        document.querySelector("#maxValue").textContent = slider.max;
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
        const savedMessages = [];
        messages.forEach(message => {
            // only save user and assistant messages
            if (message.dataset.sender === "user" || message.dataset.sender === "assistant") {
                if (message.dataset.messageId === "undefined") {
                    savedMessages.push({ role: message.dataset.sender, content: message.dataset.message, messageId: this.generateId() });
                } else {
                    savedMessages.push({ role: message.dataset.sender, content: message.dataset.message, messageId: message.dataset.messageId });
                }
            }
        });
        localStorage.setItem(getCurrentUsername() + "_" + getCurrentProfile().name, JSON.stringify(savedMessages));
    }

    // Clear message input except the first message
    clearMessage() {
        // clear mssages in DOM except the first message
        messagesContainer.innerHTML = "";
        app.prompts.clearExceptFirst();
        this.addMessage(app.prompts[0].role, app.prompts[0].content, app.prompts[0].messageId);
        this.saveCurrentProfileMessages();
        messageInput.value = "";

    }


    // Send message on button click
    async sendMessage(message = "") {

        if (message === "/clear") {
            clearMessage();
            return;
        }
        // if message look like: /system: xxx, then send xxx as system message
        if (message.startsWith("/system")) {
            message = message.replace("/system", "");
            let messageId = this.generateId();
            this.addMessage("system", message, messageId);
            this.app.prompts.clearPrompts();
            this.app.prompts.addPrompt({ role: "system", content: message, messageId: messageId });
            return;
        }
        let messageId = this.generateId();
        this.addMessage("user", message, messageId);
        this.app.prompts.addPrompt({ role: "user", content: message, messageId: messageId });
        this.saveCurrentProfileMessages();
        // join prompts except the messageId field to a string
        const promptText = this.app.prompts.getPromptText();
        console.log(promptText);

        const messageInput = document.querySelector("#message-input");
        messageInput.value = "";

        try {
            const data = await getGpt(promptText);
            // console.log(data);
            // If no response, pop last prompt and send a message
            if (!data) {
                messageId = this.generateId();
                const content = "AI没有返回结果，请再说一下你的问题，或者换个问题问我吧。";
                this.addMessage("assistant", content, messageId, false);
                this.app.prompts.addPrompt({ role: "assistant", content: content, messageId: messageId });
            } else {
                messageId = this.generateId();
                this.addMessage("assistant", data.message, messageId);
                this.app.prompts.addPrompt({ role: "assistant", content: data.message, messageId: messageId });
                const max_tokens = 4000;
                const tokens = data.totalTokens;

                const tokensSpan = document.querySelector("#tokens");
                tokensSpan.textContent = `${tokens}t`;
                // If tokens are over 80% of max_tokens, remove the first round conversation
                if (tokens > max_tokens * 0.8) {
                    const removedPrompts = this.app.prompts.removeRange(1, 2);
                    removedPrompts.forEach((p) => {
                        this.inactiveMessage(p.messageId);
                    });
                    this.app.prompts.updateFirstPrompt({ role: "system", content: this.app.currentProfile.prompt, messageId: generateId() });
                }
            }
            this.saveCurrentProfileMessages();
        } catch (error) {
            let messageId = this.generateId();
            this.addMessage("assistant", error.message, messageId);
        }
    }


    // render menu list from data
    // it only happens when user submit the username or the page is loaded
    renderMenuList(data) {
        const profiles = data.profiles;
        setCurrentUsername(data.username);
        const usernameLabel = document.querySelector("#username-label");
        usernameLabel.textContent = getCurrentUsername();
        const messagesContainer = document.querySelector("#messages");
        messagesContainer.innerHTML = "";
        // Get currentProfile from storage.js if available, otherwise set it to the first profile
        const savedCurrentProfile = getCurrentProfile();
        if (savedCurrentProfile) {
            setCurrentProfile(savedCurrentProfile);
        } else {
            setCurrentProfile(profiles[0]);
        }
        let messageId = this.generateId();
        this.app.prompts.addPrompt({ role: "system", content: getCurrentProfile().prompt, messageId: messageId });
        this.addMessage("system", getCurrentProfile().prompt, messageId);
        this.setupPracticeMode();

        // read saved messages from local storage for current profile and current username
        const savedMessages = JSON.parse(localStorage.getItem(getCurrentUsername() + "_" + getCurrentProfile().name) || "[]");
        // add saved messages to the message list and load last 2 messages(max) to prompts
        savedMessages.forEach((message, index) => {
            let isActive = false;
            if (index >= savedMessages.length - 2) {
                this.app.prompts.addPrompt(message);
                isActive = true;
            }
            this.addMessage(message.role, message.content, message.messageId, isActive);
        });
        //empty menu list
        const menuList = document.querySelector("#menu-list");
        menuList.innerHTML = "";
        const aiProfile = document.querySelector("#ai-profile");
        aiProfile.innerHTML = `<i class="${getCurrentProfile().icon}"></i> ${getCurrentProfile().displayName}`;
        //add menu items
        profiles.forEach(item => {
            let li = document.createElement("li");
            li.dataset.profile = item.name;
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
                // reset practice mode
                self.turnOffPracticeMode();
                // change currentProfile
                var profileName = this.getAttribute("data-profile");
                setCurrentProfile(profiles.find(function (p) { return p.name === profileName; }));
                // 如果当前 profile 的 tts 属性为 enabled，则显示 ttsContainer
                self.setupPracticeMode();
                // 设置 profile 图标和名称
                const aiProfile = document.querySelector("#ai-profile");
                aiProfile.innerHTML = `<i class="${getCurrentProfile().icon}"></i> ${getCurrentProfile().displayName}`;
                messagesContainer.innerHTML = "";
                // 清空 prompts 数组
                self.app.prompts.clear();
                let messageId = self.generateId();
                self.app.prompts.addPrompt({ role: "system", content: getCurrentProfile().prompt, messageId: messageId });
                self.addMessage("system", getCurrentProfile().prompt, messageId);
                // read saved messages from local storage for current profile and current username
                const savedMessages = JSON.parse(localStorage.getItem(getCurrentUsername() + "_" + getCurrentProfile().name) || "[]");
                // add saved messages to the message list and load last 2 messages(max) to prompts
                savedMessages.forEach((message, index) => {
                    let isActive = false;
                    if (index >= savedMessages.length - 2) {
                        self.app.prompts.addPrompt(message);
                        isActive = true;
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

    // split message into sentences chunks with max 160 words each
    splitMessage(message) {
        let sentenceArr = [];
        let words = message.split(" ");
        let sentence = "";
        let i = 0;
        while (i < words.length) {
            // if current sentence is empty, then add the first word to it
            if (sentence.length === 0) {
                sentence = words[i];
            } else {
                sentence = sentence + " " + words[i];
            }
            i++;
            // if current sentence is 160 words or it is the last word, then add it to sentenceArr
            if (sentence.split(" ").length === 160 || i === words.length) {
                sentenceArr.push(sentence);
                sentence = "";
            }
        }
        return sentenceArr;
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
                resolve();
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
            this.toggleSpeakerIcon(currentPlayingSpeaker); // Reset the icon of the previous speaker
        }

        // Update the currentPlayingSpeaker variable
        this.app.setCurrentPlayingSpeaker(speaker);

        //get message from parent element dataset message attribute
        const message = speaker.parentElement.parentElement.dataset.message;
        let sentenceArr = this.splitMessage(message);
        console.log(sentenceArr);

        // play sentences chunk one by one
        const playSentences = async () => {
            for (let sentence of sentenceArr) {
                this.toggleSpeakerIcon(speaker);
                try {
                    const blob = await getTts(sentence);
                    console.log("ready to play...");
                    this.app.audio.src = URL.createObjectURL(blob);
                    await this.playAudio(speaker);
                } catch (error) {
                    this.toggleSpeakerIcon(speaker);
                    console.error(error);
                }
            }
        };

        // 使用Promise.all确保异步操作完成
        await Promise.all([playSentences()]);
    }

}

export default UIManager;

