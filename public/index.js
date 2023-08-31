// purpose: entry point of the application. It is responsible for creating the App object and passing it to the UIManager object. It also contains the event listeners for the message form and the modal form.

import App from "./App.js";
import { getCurrentUsername } from "./storage.js";
import { getAppName, getPromptRepo } from "./api.js";
import UIManager from "./UIManager.js";
import { setupVoiceInput } from "./input-audio.js";
import swal from "sweetalert";
import ClipboardJS from "clipboard";

const app = new App();
const uiManager = new UIManager(app);

const switchElement = document.getElementById("model-switch");
const modelNameElement = document.getElementById("model-name");
const switchOptions = { color: "#1AB394", secondaryColor: "#ED5565" };
const modelSwitch = new Switchery(switchElement, switchOptions);

switchElement.addEventListener("change", function () {
    app.model = this.checked ? "gpt-4" : "gpt-3.5-turbo";
    modelNameElement.textContent = this.checked ? "GPT4" : "GPT3.5";
});


const slider = document.getElementById("slider");
const currentValue = document.getElementById("currentValue");
app.prompts.onLengthChange = function (newLength) {
    slider.value = newLength - 1;
    currentValue.textContent = newLength - 1;
};

slider.addEventListener("input", function () {
    const messages = document.querySelectorAll(".message");
    const sliderValue = parseInt(slider.value, 10);
    currentValue.textContent = sliderValue;

    messages.forEach((messageElement, index) => {
        if (index >= messages.length - sliderValue) {
            messageElement.classList.add("active");
        } else {
            messageElement.classList.remove("active");
        }
    });

    // save current onLengthChange callback
    const originalOnLengthChange = app.prompts.onLengthChange;
    app.prompts.onLengthChange = null;

    app.prompts.clearExceptFirst();
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
    handleInput();
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

const practiceMode = document.querySelector("#practice-mode");

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
        title: "Are you sure you want to delete messages in the current conversation?",
        text: `You are about to delete ${messageNumber} messages in the current conversation. This action cannot be undone.`,
        icon: "warning",
        buttons: ["Cancel", "Delete"], dangerMode: true
    })
        .then((confirmation) => {
            if (confirmation) {
                uiManager.deleteActiveMessages();
                swal("Messages in the current conversation have been deleted successfully!", { icon: "success", buttons: false, timer: 1000 });
            }
        });
});

// 获取模态对话框元素和触发器元素
const usernameLabel = document.querySelector("#username-label");

// generate current user menulist and render it
getPromptRepo(getCurrentUsername())
    .then(data => {
        uiManager.renderMenuList(data);
    })
    .catch(error => {
        console.error("Error:", error);
    });


// Send message on form submit
messageForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const message = messageInput.value.trim();
    if (message) {
        uiManager.sendMessage(message);
    }
    messageInput.blur();
    handleInput();
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

// toggle the menu when user click the ai profile
function toggleMenu() {
    const menu = document.getElementById("menu");
    const isVisible = menu.getAttribute("data-visible") === "true";

    menu.style.display = isVisible ? "none" : "block";
    menu.setAttribute("data-visible", !isVisible);

    if (!isVisible) {
        document.addEventListener("click", function hideMenuOnOutsideClick(event) {
            const profileListMenu = document.getElementById("profile-list-menu");

            if (event.target !== menu && event.target !== profileListMenu && !profileListMenu.contains(event.target)) {
                menu.style.display = "none";
                menu.setAttribute("data-visible", false);
                document.removeEventListener("click", hideMenuOnOutsideClick);
            }
        });
    }
}

// handle the click event on the ai profile
function handleClick(event) {
    event.stopPropagation();
    toggleMenu();
}

document.getElementById("profile-list-menu").addEventListener("click", handleClick);

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

const initialHeight = messageInput.style.height;
const halfScreenHeight = window.innerHeight / 2;
const initFocusHieght = window.innerHeight / 5;

// 设置textarea的max-height为屏幕高度的一半
messageInput.style.maxHeight = `${halfScreenHeight}px`;

messageInput.addEventListener("focus", function () {
    handleInput();
});

messageInput.addEventListener("blur", function () {
    handleInput();
    setTimeout(() => {
        window.scrollTo(0,document.body.scrollHeight);
    }, 100);
});

let composing = false;

messageInput.addEventListener("compositionstart", function () {
    composing = true;
});

messageInput.addEventListener("compositionend", function () {
    composing = false;
    // 在这里进行处理
    handleInput();
});

messageInput.addEventListener("input", function () {
    if (!composing) {
        // 在这里进行处理
        handleInput();
    }
});

function handleInput() {
    // 判断messageInput是否失去焦点
    if (!messageInput.matches(":focus")) {
        if (messageInput.value === "") {
            messageInput.style.height = initialHeight;
        }
        return;
    }
    // 如果输入框的内容为空，将高度恢复为初始高度
    if (messageInput.value === "") {
        messageInput.style.height = `${initFocusHieght}px`;
    } else {
        // 然后设为scrollHeight，但不超过屏幕的一半
        messageInput.style.height = `${Math.min(messageInput.scrollHeight, halfScreenHeight)}px`;
        if (messageInput.scrollHeight < initFocusHieght) {
            messageInput.style.height = `${initFocusHieght}px`;
        }
    }

}


function updateVh() {
    vh = window.innerHeight * 0.01;
    console.log(vh);
    document.documentElement.style.setProperty("--vh", `${vh}px`);
}
let vh;
// 获取视口高度，并将其设置为一个CSS变量
updateVh();

window.addEventListener("resize", () => {
    updateVh();
});

const messageInputContainer = document.querySelector(".message-input-container");
const appContainer = document.querySelector("#app-container");
let ro = new ResizeObserver(entries => {
    for (let entry of entries) {
        let newHeight = `calc(var(--vh, 1vh) * 100 - ${entry.contentRect.height}px)`;
        console.log("appContainer.style.height", vh * 100 - entry.contentRect.height);
        appContainer.style.height = newHeight;
    }
});

ro.observe(messageInputContainer);