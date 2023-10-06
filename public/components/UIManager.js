// UIManager.js
import DOMManager from "./DOMManager.js";
import EventManager from "./EventManager.js";
import MessageManager from "./MessageManager.js";
import StorageManager from "./StorageManager.js";
import { getCurrentUsername, getCurrentProfile, setCurrentUsername, setCurrentProfile, getMessages } from "../utils/storage.js";
import { textToImage, getTts } from "../utils/api.js";
import swal from "sweetalert";


class UIManager {
    constructor(app) {
        this.app = app;
        this.messageLimit = 15;
        this.isDeleting = false;
        this.profiles = [];
        const messagesContainer = document.querySelector("#messages");
        messagesContainer.addEventListener("scroll", () => {
            if (messagesContainer.scrollTop === 0) {
                this.messageManager.loadMoreMessages();
            }
        });
        this.messageInput = document.getElementById("message-input");
        this.domManager = new DOMManager();
        this.eventManager = new EventManager(this);
        this.messageManager = new MessageManager(this);
        this.storageManager = new StorageManager(this);
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

    // text to image
    async generateImage(caption) {
        try {
            const data = await textToImage(caption);
            const imageUrl = data.imageUrl;
            const messageId = this.generateId();
            // Set width and height attributes for the image
            const thumbnailWidth = 300;
            const thumbnailHeight = 300;
            // Wrap the <img> tag and caption text in a <div>
            this.messageManager.addMessage(
                "assistant",
                `<div>
           <img src="${imageUrl}" alt="${caption}" width="${thumbnailWidth}" height="${thumbnailHeight}" style="object-fit: contain;" />
           <p style="margin-top: 4px;">${caption}</p>
         </div>`,
                messageId
            );
            this.storageManager.saveCurrentProfileMessages();
        } catch (error) {
            console.error(error);
            let messageId = this.generateId();
            this.messageManager.addMessage("assistant", error.message, messageId);
        } finally {
            this.finishSubmitProcessing();
        }
    }

    setSystemMessage(message) {
        // 获取显示系统消息的元素
        this.app.prompts.setSystemPrompt(message);
        const systemMessageElement = document.querySelector("#system-message");
        systemMessageElement.innerHTML = message;
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


    // Clear message input except the first message
    clearMessage() {
        const messagesContainer = document.getElementById("messages");
        // clear messages in DOM except the first message
        messagesContainer.innerHTML = "";
        this.storageManager.saveCurrentProfileMessages();
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

    async validateMessage(message) {
        if (message.startsWith("@") && !message.substring(0, 50).includes(":")) {
            const firstColonIndex = message.indexOf("："); // Find the index of the first Chinese colon
            const firstSpaceIndex = message.indexOf(" "); // Find the index of the first space
            const firstNewLineIndex = message.indexOf("\n"); // Find the index of the first newline
            let correctedMessage;
            let minIndex = Math.min(
                firstColonIndex !== -1 ? firstColonIndex : Infinity,
                firstSpaceIndex !== -1 ? firstSpaceIndex : Infinity,
                firstNewLineIndex !== -1 ? firstNewLineIndex : Infinity
            );
            if (minIndex < 50) {
                correctedMessage = message.substring(0, minIndex) + ":" + message.substring(minIndex + 1);
            } else {
                correctedMessage = message; // Keep the original message
            }
            const option = await swal({
                title: "Incorrect format",
                text: `The format should be @Role: Message. \n Would you like me to correct it to \n${correctedMessage.substring(0, 50)} ...?`,
                icon: "warning",
                buttons: {
                    continue: {
                        text: "Continue",
                        value: "continue",
                    },
                    edit: {
                        text: "Edit",
                        value: "edit",
                    },
                    correct: {
                        text: "Correct",
                        value: "correct",
                    }
                },
            });

            if (option === "correct") {
                return { message: correctedMessage, isSkipped: false, reEdit: false };
            }

            if (option === "edit") {
                return { message: "", isSkipped: false, reEdit: true };
            }

            if (option === "continue") {
                return { message, isSkipped: true, reEdit: false };
            }
        }

        return { message, isSkipped: false, reEdit: false };
    }

    finishSubmitProcessing() {
        const submitButton = document.getElementById("submitButton");
        const buttonIcon = document.getElementById("submit-button-icon");
        const loader = document.getElementById("submit-loader");
        submitButton.disabled = false;
        buttonIcon.classList.remove("hidden");
        loader.classList.add("hidden");
    }

    initSubmitButtonProcessing() {
        const submitButton = document.getElementById("submitButton");
        const buttonIcon = document.getElementById("submit-button-icon");
        const loader = document.getElementById("submit-loader");
        // 设置按钮为处理中状态
        submitButton.disabled = true;
        buttonIcon.classList.add("hidden");
        loader.classList.remove("hidden");
        return { submitButton, buttonIcon, loader };
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
        let startingIndex = 0;

        if (savedMessages.length <= this.messageLimit) {
            startingIndex = 0;
        } else {
            const firstActiveMessageIndex = savedMessages.findIndex(message => message.isActive);
            if (firstActiveMessageIndex !== -1 && firstActiveMessageIndex < savedMessages.length - this.messageLimit) {
                startingIndex = firstActiveMessageIndex;
            } else {
                startingIndex = savedMessages.length - this.messageLimit;
            }
        }

        savedMessages.slice(startingIndex).forEach((message, index, arr) => {
            let isActive = message.isActive || false;
            if (isActive) {
                this.app.prompts.addPrompt(message);
            }
            this.messageManager.addMessage(message.role, message.content, message.messageId, isActive);
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
                    self.messageManager.addMessage(message.role, message.content, message.messageId, isActive);
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

    // play the message with tts
    async playMessage(speaker) {
        // if the speaker is playing, stop it and return
        if (speaker.classList.contains("fa-volume-up")) {
            //if the audio is playing, stop it
            this.app.audio.pause();
            this.domManager.toggleSpeakerIcon(speaker);
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
            this.domManager.toggleSpeakerIcon(speaker);
            const blob = await getTts(message);
            console.log("ready to play...");
            this.app.audio.src = URL.createObjectURL(blob);
            await this.playAudio(speaker);
        } catch (error) {
            this.domManager.toggleSpeakerIcon(speaker);
            console.error(error);
        }
    }

    async playAudio(speaker) {
        return new Promise((resolve, reject) => {
            this.app.audio.onerror = () => {
                this.domManager.toggleSpeakerIcon(speaker);
                this.app.currentPlayingSpeaker = null;
                console.error("Error playing audio.");
                reject(new Error("Error playing audio."));
            };
            this.app.audio.onended = () => {
                this.domManager.toggleSpeakerIcon(speaker);
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

    handleMessageFormSubmit(messageInput) {
        // Prevent form submission
        event.preventDefault();

        // Get the message from the input field
        const message = messageInput.value.trim();

        // If the message is not empty, send it
        if (message) {
            this.messageManager.sendMessage(message);
        }

        // Clear the input field and handle the UI
        this.clearMessageInput();
        this.messageInput.blur();
        this.handleInput();
    }

    handleProfileListMenuClick(event) {
        if (event.target.tagName.toLowerCase() === "li") {
            const selectedName = event.target.textContent;
            this.messageManager.addProfileToMessageInput(selectedName);
            this.clearProfileListMenu();
        }
    }

    handleInput(initFocusHieght, halfScreenHeight) {
        // 判断messageInput是否失去焦点
        if (!this.messageInput.matches(":focus")) {
            if (this.messageInput.value === "") {
                this.messageInput.style.height = "";
            }
            return;
        }
        // 如果输入框的内容为空，将高度恢复为初始高度
        if (this.messageInput.value === "") {
            this.messageInput.style.height = `${initFocusHieght}px`;
        } else {
            // 然后设为scrollHeight，但不超过屏幕的一半
            this.messageInput.style.height = `${Math.min(this.messageInput.scrollHeight, halfScreenHeight)}px`;
            if (this.messageInput.scrollHeight < initFocusHieght) {
                this.messageInput.style.height = `${initFocusHieght}px`;
            }
        }

    }

}

export default UIManager;
