// index.js
// purpose: entry point of the application. It is responsible for creating the App object and passing it to the UIManager object. It also contains the event listeners for the message form and the modal form.

import { getAppName, getPromptRepo } from "./utils/api.js";
import { setupVoiceInput } from "./utils/input-audio.js";
import swal from "sweetalert";
import MarkdownManager from "./components/MarkdownManager.js";
import setup from "./setup.js";

const uiManager = setup();
const app = uiManager.app;

//get client language
const clientLanguage = navigator.language;
console.log(clientLanguage);
uiManager.setClientLanguage(clientLanguage);

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

const halfScreenHeight = window.innerHeight / 2;
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
        const updatedMessage = uiManager.storageManager.getMessage(messageId);
        uiManager.syncManager.syncMessageUpdate(uiManager.currentChatId, updatedMessage);
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
    const markdownManager = new MarkdownManager();
    markdownManager.processMarkdown();
});

document.getElementById("delete-container").addEventListener("click", () => {
    const messageNumber = document.querySelectorAll(".message.active").length;
    const inactiveMessageNumber = document.querySelectorAll(".message:not(.active)").length;
    const allMessageNumber = document.querySelectorAll(".message").length;

    swal({
        title: "What kind of messages you want to delete?",
        icon: "warning",
        buttons: {
            cancel: "Cancel",
            deleteActive: {
                text: `Delete Active(${messageNumber})`,
                value: "deleteActive",
            },
            deleteInactive: {
                text: `Delete Inactive(${inactiveMessageNumber})`,
                value: "deleteInactive",
            },
            deleteAll: {
                text: `Delete All(${allMessageNumber})`,
                value: "deleteAll",
            }
        },
        dangerMode: true
    })
        .then((value) => {
            if (value === "deleteActive") {
                uiManager.messageManager.deleteActiveMessages();
                swal("Active messages in the current conversation have been deleted successfully!", { icon: "success", buttons: false, timer: 1000 });
            } else if (value === "deleteInactive") {
                uiManager.messageManager.deleteInactiveMessages();
                swal("Inactive messages in the current conversation have been deleted successfully!", { icon: "success", buttons: false, timer: 1000 });
            } else if (value === "deleteAll") {
                uiManager.messageManager.deleteAllMessages();
                swal("All messages in the current conversation have been deleted successfully!", { icon: "success", buttons: false, timer: 1000 });
            }
        });
});

// 获取模态对话框元素和触发器元素
const usernameLabel = document.querySelector("#username-label");

// generate current user menulist and render it
let profileNameList = [];

getPromptRepo(uiManager.storageManager.getCurrentUsername())
    .then(data => {
        uiManager.renderMenuList(data);
        profileNameList = data.profiles.map(profile => profile.displayName);
    })
    .catch(error => {
        console.error("Error:", error);
    });

    
// Send message on form submit
messageForm.addEventListener("submit", (event) => {
    //uiManager.js中已经写过这个方法，直接调用
    uiManager.handleMessageFormSubmit(messageInput);
});
// Listening for keydown event
document.addEventListener("keydown", (event) => {
    // Check if Option/Alt + S was pressed on macOS
    if (event.getModifierState("Alt") && event.code === "KeyS") {
        uiManager.handleMessageFormSubmit(messageInput);
    }
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
document.getElementById("new-chat-button").addEventListener("click",handleAIActor);
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

messageInput.addEventListener("focus", function () {
    uiManager.handleInput(initFocusHeight, halfScreenHeight);
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
});

const messageInputContainer = document.querySelector("#message-input-container");
const mainContainer = document.querySelector("#app-container");
let ro = new ResizeObserver(entries => {
    if (mainContainer.classList.contains("split-view")) {
        // 在 split-view 模式下，我们不改变 mainContainer 的高度，因为 message-input-container 高度是固定的
        return;
    }
    for (let entry of entries) {
        let newHeight = `calc(var(--vh, 1vh) * 99.5 - ${entry.contentRect.height + 40}px)`;
        mainContainer.style.height = newHeight;
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


function handleAIActor(event){
    event.stopPropagation();
    uiManager.toggleAIActorList();
} 

// toggle the menu when user click the ai profile
function toggleMenu() {
    const menu = document.getElementById("menu");

    // Toggle the 'is-visible' class instead of using inline styles
    menu.classList.toggle("hidden");

    // If the menu is now visible, attach the click listener to hide the menu
    if (menu.classList.contains("hidden") && window.innerWidth <= 768) {
        attachOutsideClickListener();
    }
}

function attachOutsideClickListener() {
    function hideMenuOnOutsideClick(event) {
        const menu = document.getElementById("menu");
        const profileListMenu = document.getElementById("ai-profile");

        // Check if the menu or profile list menu is not the event target
        if (!menu.contains(event.target) && !profileListMenu.contains(event.target)) {
            menu.classList.remove("hidden");
            // Remove the click listener since the menu is now hidden
            document.removeEventListener("click", hideMenuOnOutsideClick);
        }
    }

    // Delay the attachment of the click listener to avoid immediately triggering after the click that opened the menu
    setTimeout(() => {
        document.addEventListener("click", hideMenuOnOutsideClick);
    }, 0);
}



const chatHistoryContainer = document.getElementById("chat-history-container");
const toggleButton = document.getElementById("toggle-chat-topic");

toggleButton.addEventListener("click", function (event) {
    event.stopPropagation();
    chatHistoryContainer.style.display = chatHistoryContainer.style.display === "none" ? "block" : "none";
    chatHistoryContainer.style.minWidth = "300px";
});

// handle the click event on the ai profile
function handleClick(event) {
    event.stopPropagation();
    toggleMenu();
}

window.addEventListener("message", function (event) {
    if (event.data.type === "PROFILE_UPDATED") {
        const updatedProfile = event.data.data;
        // Check if the updated profile is the current profile
        if (updatedProfile.name === uiManager.storageManager.getCurrentProfile().name) {
            // Update the system message
            uiManager.storageManager.setCurrentProfile(updatedProfile);
            uiManager.setSystemMessage(updatedProfile.prompt);
        }
    }
}, false);

// split layout

// Selecting elements that will be changed by layout toggling
const appBar = document.getElementById("app-outer-wrapper");
const messageContainer = document.getElementById("messages");

// Selecting buttons for adding event listeners
const toggleLayoutBtn = document.getElementById("toggle-layout");

// Function to toggle the CSS class for the split layout
function toggleLayout() {
    mainContainer.classList.toggle("split-view");
    appBar.classList.toggle("split-view");
    messageContainer.classList.toggle("split-view");
    messageInputContainer.classList.toggle("split-view");
    if (mainContainer.classList.contains("split-view")) {
        mainContainer.style.height = "";
        messageInput.style.maxHeight = "";
    }
}

// Adding event listeners to buttons
toggleLayoutBtn.addEventListener("click", toggleLayout);