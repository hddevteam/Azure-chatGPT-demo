// purpose: entry point of the application. It is responsible for creating the App object and passing it to the UIManager object. It also contains the event listeners for the message form and the modal form.

import { getCurrentUsername, getCurrentProfile, setCurrentProfile } from "./utils/storage.js";
import { getAppName, getPromptRepo } from "./utils/api.js";
import { setupVoiceInput } from "./utils/input-audio.js";
import swal from "sweetalert";
import ClipboardJS from "clipboard";
import setup from "./setup.js";

const uiManager = setup();
const app = uiManager.app;

const switchElement = document.querySelector("#model-switch");
let model = "gpt-3.5-turbo"; // default model

switchElement.addEventListener("click", function () {
    model = model === "gpt-3.5-turbo" ? "gpt-4" : "gpt-3.5-turbo";
    this.textContent = model === "gpt-4" ? "GPT4" : "GPT3.5";
    app.model = model;

    if (model === "gpt-4") {
        this.classList.remove("gpt-3");
        this.classList.add("gpt-4");
    } else {
        this.classList.remove("gpt-4");
        this.classList.add("gpt-3");
    }
});

const halfScreenHeight = window.innerHeight / 1.5;
const initFocusHeight = window.innerHeight / 5;


const slider = document.getElementById("slider");
const currentValue = document.getElementById("currentValue");
app.prompts.onLengthChange = function (newLength) {
    slider.value = newLength;
    currentValue.textContent = newLength;
};

slider.addEventListener("input", function () {
    const messages = document.querySelectorAll(".message");
    const sliderValue = parseInt(slider.value, 10);
    currentValue.textContent = sliderValue;

    messages.forEach((messageElement, index) => {
        const messageId = messageElement.dataset.messageId;
        if (index >= messages.length - sliderValue) {
            messageElement.classList.add("active");
            uiManager.storageManager.saveMessageActiveStatus(messageId, true);
        } else {
            messageElement.classList.remove("active");
            uiManager.storageManager.saveMessageActiveStatus(messageId, false);
        }
    });

    // save current onLengthChange callback
    const originalOnLengthChange = app.prompts.onLengthChange;
    app.prompts.onLengthChange = null;
    app.prompts.clear();
    const activeMessages = document.querySelectorAll(".message.active");
    activeMessages.forEach(activeMessage => {
        app.prompts.addPrompt({ role: activeMessage.dataset.sender, content: activeMessage.dataset.message, messageId: activeMessage.dataset.messageId });
    });

    // restore onLengthChange callback
    app.prompts.onLengthChange = originalOnLengthChange;
});


const messageForm = document.querySelector("#message-form");
const messageInput = document.querySelector("#message-input");
const clearInput = document.getElementById("clear-input");
clearInput.addEventListener("click", function () {
    uiManager.clearMessageInput();
    uiManager.handleInput(initFocusHeight, halfScreenHeight);
});

// get and set page title and header h1 text from /api/app-name
const pageTitle = document.querySelector("title");
const headerH1 = document.querySelector("#header h1");
// /api/app-name will return the app name from .env file
getAppName()
    .then(appName => {
        pageTitle.innerText = appName;
        headerH1.innerText = appName;
    });

// get tts container element
const ttsContainer = document.querySelector("#tts-container");
ttsContainer.style.display = "none";

const practiceMode = document.querySelector("#tts-container");

// add click event listener to practiceMode
practiceMode.addEventListener("click", () => {
    // if ttsPracticeMode is false, then set it to true
    if (!app.ttsPracticeMode) {
        uiManager.turnOnPracticeMode();
    } else {
        uiManager.turnOffPracticeMode();
        // reset all the speaker icon to fas fa-volume-off
        // so that if the speaker is broken, it will can be clicked again
        const speakerElements = document.querySelectorAll(".message-speaker");
        speakerElements.forEach(speakerElement => {
            speakerElement.classList.remove("fa-volume-up");
            speakerElement.classList.add("fa-volume-off");
        });
    }
});

document.getElementById("md-container").addEventListener("click", () => {
    // Getting all active messages
    const activeMessages = document.querySelectorAll(".message.active");

    // Extracting the values of data-message and data-sender, and combining them into a string
    let mdContent = "";
    activeMessages.forEach(message => {
        const dataSender = message.getAttribute("data-sender");
        const dataMessage = message.getAttribute("data-message");
        mdContent += `### ${dataSender}\n\n${dataMessage}\n\n`;
    });

    const filename = "messages.md";
    const contentType = "text/markdown;charset=utf-8;";
    const a = document.createElement("a");
    const area = document.createElement("textarea");
    area.value = mdContent;
    let blob;

    // Popup the Swal
    function popupSwal() {
        swal({
            title: "Generate Markdown File",
            content: area,
            buttons: {
                generate: {
                    text: "Generate Title and Summary",
                    value: "generate",
                    closeModal: false,
                },
                download: {
                    text: "Download",
                    value: "download",
                },
                copy: {
                    text: "Copy",
                    value: "copy",
                    className: "md-copy-button",
                },
                cancel: "Close"
            },
            className: "markdown-modal",
            closeOnClickOutside: false,
        })
            .then((value) => {
                switch (value) {
                case "generate":
                    // Call your API to generate the title and summary
                    fetch("/api/generate-summary", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ conversation: area.value }),
                    })
                        .then(response => response.json())
                        .then(data => {
                            console.log(data);
                            area.value = "# Title" + "\n\n" + data.title + "\n\n" + "## Summary" + "\n\n" + data.summary + "\n\n" + area.value;
                            swal.stopLoading();
                            popupSwal();
                        });
                    break;
                case "download":
                    // Create a Markdown file and download it
                    console.log(area.value);
                    blob = new Blob([area.value], { type: contentType });
                    a.href = URL.createObjectURL(blob);
                    a.download = filename;
                    a.style.display = "none";
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    swal.stopLoading();
                    popupSwal();
                    break;
                case "copy":
                    // Copy the content of the textarea
                    var clipboard = new ClipboardJS(".md-copy-button", {
                        text: function () {
                            return area.value;
                        },
                    });
                    clipboard.on("success", function () {
                        swal("Copied!", "The content of the textarea has been copied to the clipboard.", "success", { buttons: false, timer: 1000 });
                    });
                    clipboard.on("error", function () {
                        swal("Error!", "Failed to copy the content of the textarea to the clipboard.", "error");
                    });
                    break;
                }
            });
    }

    popupSwal();


});

document.getElementById("delete-container").addEventListener("click", () => {
    const messageNumber = document.querySelectorAll(".message.active").length;
    swal({
        title: `You are about to delete ${messageNumber} messages in the current conversation. This action cannot be undone.`,
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
        dangerMode: true
    })
        .then((value) => {
            if (value === "delete") {
                uiManager.messageManager.deleteActiveMessages();
                swal("Messages in the current conversation have been deleted successfully!", { icon: "success", buttons: false, timer: 1000 });
            } else if (value === "edit") {
                const activeMessages = document.querySelectorAll(".message.active");
                let mdContent = "";
                activeMessages.forEach(message => {
                    const dataSender = message.getAttribute("data-sender");
                    const dataMessage = message.getAttribute("data-message");
                    mdContent += `### ${dataSender}\n\n${dataMessage}\n\n`;
                });
                messageInput.value += mdContent;
                uiManager.messageManager.deleteActiveMessages();
                swal("Messages in the current conversation have been merged into the text box successfully!", { icon: "success", buttons: false, timer: 1000 });
                messageInput.focus();
            }
        });
});

// 获取模态对话框元素和触发器元素
const usernameLabel = document.querySelector("#username-label");

// generate current user menulist and render it
let profileNameList = [];

getPromptRepo(getCurrentUsername())
    .then(data => {
        uiManager.renderMenuList(data);
        profileNameList = data.profiles.map(profile => profile.displayName);
    })
    .catch(error => {
        console.error("Error:", error);
    });


// Send message on form submit
messageForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const message = messageInput.value.trim();
    if (message) {
        uiManager.messageManager.sendMessage(message);
    }
    messageInput.value = "";
    messageInput.blur();
    uiManager.handleInput(initFocusHeight, halfScreenHeight);
});

// popup the Swal when user click the username label
usernameLabel.addEventListener("click", function () {
    swal({
        text: "Enter your username",
        content: "input",
        button: {
            text: "Submit",
            closeModal: false,
        },
    })
        .then(username => {
            if (!username) throw null;

            return getPromptRepo(username);
        })
        .then(data => {
            uiManager.renderMenuList(data);
            //practice mode will be off when user submit the username
            uiManager.turnOffPracticeMode();

            swal({
                title: "Success",
                text: "The username has been set successfully",
                icon: "success",
            });
        })
        .catch(err => {
            if (err) {
                swal("Oh noes!", "The server request failed!", "error");
            } else {
                swal.stopLoading();
                swal.close();
            }
        });
});


document.getElementById("ai-profile").addEventListener("click", handleClick);

// 添加事件监听器到最小化窗口图标
const systemMessageWindowIcon = document.querySelector("#window-icon");

systemMessageWindowIcon.addEventListener("click", toggleSystemMessage);

// 切换系统消息
function toggleSystemMessage() {
    const systemMessage = document.querySelector("#system-message");
    if (systemMessage.style.display === "none") {
        systemMessage.style.display = "block";
        systemMessageWindowIcon.setAttribute("title", "Hide system message");
        systemMessageWindowIcon.classList.remove("fa-window-maximize");
        systemMessageWindowIcon.classList.add("fa-window-minimize");

    } else {
        systemMessage.style.display = "none";
        systemMessageWindowIcon.setAttribute("title", "Show system message");
        systemMessageWindowIcon.classList.remove("fa-window-minimize");
        systemMessageWindowIcon.classList.add("fa-window-maximize");

    }
}

setupVoiceInput(uiManager);

// 设置textarea的max-height为屏幕高度的一半
messageInput.style.maxHeight = `${halfScreenHeight}px`;

messageInput.addEventListener("focus", function () {
    uiManager.handleInput(initFocusHeight, halfScreenHeight);
});

messageInput.addEventListener("blur", function () {
    uiManager.handleInput(initFocusHeight, halfScreenHeight);

    // 滚动到底部,解决iphone键盘收起后页面不回弹的问题
    setTimeout(() => {
        window.scrollTo(0, document.body.scrollHeight);
    }, 100);
});

let composing = false;

messageInput.addEventListener("compositionstart", function () {
    composing = true;
});

messageInput.addEventListener("compositionend", function () {
    composing = false;
    // 在这里进行处理
    uiManager.handleInput(initFocusHeight, halfScreenHeight);
});

messageInput.addEventListener("input", function () {
    if (!composing) {
        // 在这里进行处理
        uiManager.handleInput(initFocusHeight, halfScreenHeight);
    }
});

function updateVh() {
    vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty("--vh", `${vh}px`);
}
let vh;
// 获取视口高度，并将其设置为一个CSS变量
updateVh();

window.addEventListener("resize", () => {
    updateVh();
    adjustChatContainer();
});

const messageInputContainer = document.querySelector(".message-input-container");
const appContainer = document.querySelector("#app-container");
let ro = new ResizeObserver(entries => {
    for (let entry of entries) {
        let newHeight = `calc(var(--vh, 1vh) * 99.5 - ${entry.contentRect.height}px)`;
        appContainer.style.height = newHeight;
    }
});

ro.observe(messageInputContainer);


const profileListMenu = document.getElementById("chat-profile-list-menu");
const profileListElement = document.getElementById("profile-list");


messageInput.addEventListener("keyup", function (event) {
    const value = event.target.value.trim();
    const cursorPosition = messageInput.selectionStart;
    if (value.charAt(0) === "@" && cursorPosition === 1) {
        loadProfileList();
        profileListMenu.classList.remove("hidden");
    } else {
        profileListMenu.classList.add("hidden");
    }
});

profileListMenu.addEventListener("click", function (event) {
    if (event.target.tagName.toLowerCase() === "li") {
        const selectedName = event.target.textContent;
        messageInput.value = `@${selectedName}: ` + messageInput.value.slice(1);
        messageInput.focus();
        profileListMenu.classList.add("hidden");
    }
});

function loadProfileList() {
    profileListElement.innerHTML = "";
    for (let name of profileNameList) {
        let li = document.createElement("li");
        li.textContent = name;
        profileListElement.appendChild(li);
    }
    // adjust menu height
    const inputRect = messageInput.getBoundingClientRect();
    const inputHeight = inputRect.height;
    const menuHeight = inputHeight - 16; // 1em = 16px
    profileListMenu.style.height = `${menuHeight}px`;
}

window.onload = function () {
    adjustChatContainer();
};

function adjustChatContainer() {
    const chatContainer = document.getElementById("chat-container");
    const menu = document.getElementById("menu");

    if (window.innerWidth <= 768) { // 如果是响应式布局
        chatContainer.style.flex = "1";
        menu.dataset.visible = false;
        menu.style.display = "none";
    } else { // 如果是桌面布局
        chatContainer.style.flex = "0 0 85%";
        menu.dataset.visible = true;
        menu.style.display = "block";
    }
}


// toggle the menu when user click the ai profile
function toggleMenu() {
    const menu = document.getElementById("menu");
    const chatContainer = document.getElementById("chat-container");
    const isVisible = menu.getAttribute("data-visible") === "true";

    menu.style.display = isVisible ? "none" : "block";
    menu.setAttribute("data-visible", !isVisible);

    if (isVisible) {
        chatContainer.style.flex = "1";
    } else {
        if (window.innerWidth > 768) {
            chatContainer.style.flex = "0 0 85%";
        }
        if (window.innerWidth <= 768) {
            document.addEventListener("click", function hideMenuOnOutsideClick(event) {
                const profileListMenu = document.getElementById("ai-profile");

                if (event.target !== menu && event.target !== profileListMenu && !profileListMenu.contains(event.target)) {
                    menu.style.display = "none";
                    menu.setAttribute("data-visible", false);
                    chatContainer.style.flex = "1";
                    document.removeEventListener("click", hideMenuOnOutsideClick);
                }
            });
        }
    }
}


// handle the click event on the ai profile
function handleClick(event) {
    event.stopPropagation();
    toggleMenu();
}

window.addEventListener("message", function(event) {
    if (event.data.type === "PROFILE_UPDATED") {
        const updatedProfile = event.data.data;
        // Check if the updated profile is the current profile
        if (updatedProfile.name === getCurrentProfile().name) {
            // Update the system message
            setCurrentProfile(updatedProfile);
            uiManager.setSystemMessage(updatedProfile.prompt);
        }
    }
}, false);

