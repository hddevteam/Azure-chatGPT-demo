// index.js
// purpose: entry point of the application. It is responsible for creating the App object and passing it to the UIManager object. It also contains the event listeners for the message form and the modal form.
import { signIn } from "./utils/authRedirect.js";
import { getAppName, getPromptRepo } from "./utils/api.js";
import swal from "sweetalert";
import MarkdownManager from "./components/MarkdownManager.js";
import ModelDropdownManager from "./utils/ModelDropdownManager.js";
import { addHorizontalResizeHandleListeners } from "./utils/horizontal-resize.js";
import { addVerticalResizeHandleListeners } from "./utils/vertical-resize.js";
import fileUploader from "./utils/fileUploader.js";
import setup from "./setup.js";
import audioModal from "./utils/audioModal.js";
import ChatOptionsModal from "./components/ChatOptionsModal.js";

(async () => {
    try {
        const username = await signIn();  // 等待signIn执行完成，并获取用户名
        if (username) {
            initializeApp(username);  // 如果用户名存在，则初始化应用并传递用户名
        } else {
            console.error("No user signed in.");
        }
    } catch (error) {
        console.error("SignIn failed:", error);
    }
})();

function initializeApp(username) {  // 接收传入的 username 参数
    console.log("initializeApp");
    const uiManager = setup();  // 设置UI管理器
    uiManager.storageManager.updateCurrentUserInfo(username);  // 使用传入的 username 更新用户名信息
    const app = uiManager.app;
    
    // 初始化显示欢迎信息
    uiManager.showWelcomeMessage();
    
    new ModelDropdownManager(app, "#model-switch", "#model-dropdown");

    //get client language
    const clientLanguage = navigator.language;
    console.log(clientLanguage);
    uiManager.setClientLanguage(clientLanguage);

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
    uiManager.hiddenElement(ttsContainer);

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

    // generate current user menulist and render it
    console.log("Current user name:", uiManager.storageManager.getCurrentUsername());
    getPromptRepo(uiManager.storageManager.getCurrentUsername())
        .then(data => {
            uiManager.renderMenuList(data);
        })
        .catch(error => {
            console.error("Error:", error);
        });


    const messageInput = document.querySelector("#message-input");
    // Listening for keydown event
    document.addEventListener("keydown", (event) => {
    // Check if Option/Alt + S was pressed on macOS
        if (event.getModifierState("Alt") && event.code === "KeyS") {
            uiManager.handleMessageFormSubmit(messageInput);
        }
    });

    const messageForm = document.querySelector("#message-form");

    messageInput.addEventListener("keyup", function (event) {
        const value = event.target.value.trim();
        const cursorPosition = messageInput.selectionStart;
        if (value.charAt(0) === "@" && cursorPosition === 1) {
            const inputRect = messageInput.getBoundingClientRect();
            const inputHeight = inputRect.height;
            const menuHeight = inputHeight - 16; // 1em = 16px
            profileListMenu.style.height = `${menuHeight}px`;
            profileListMenu.classList.remove("hidden");
        } else {
            profileListMenu.classList.add("hidden");
        }
    });

    // Send message on form submit
    messageForm.addEventListener("submit", (event) => {
    //uiManager.js中已经写过这个方法，直接调用
        uiManager.handleMessageFormSubmit(messageInput);
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


    profileListMenu.addEventListener("click", function (event) {
        if (event.target.tagName.toLowerCase() === "li") {
            const selectedName = event.target.textContent;
            messageInput.value = `@${selectedName}: ` + messageInput.value.slice(1);
            messageInput.focus();
            profileListMenu.classList.add("hidden");
        }
    });

    function handleAIActor(event) {
        event.stopPropagation();
        uiManager.toggleAIActorList();
    }

    document.getElementById("new-chat-button").addEventListener("click", handleAIActor);

    const toggleButton = document.getElementById("toggle-chat-topic");
    toggleButton.addEventListener("click", function (event) {
        event.stopPropagation();
        const chatHistoryContainer = document.getElementById("chat-history-container");
        const isChatHistoryVisible = chatHistoryContainer.classList.contains("visible");
        // 更新 chatHistoryVisible 状态
        uiManager.storageManager.getCurrentUserData().uiState.chatHistoryVisible  = !isChatHistoryVisible;
        uiManager.storageManager.saveCurrentUserData();

        uiManager.toggleVisibility(chatHistoryContainer);

    });

    const aiProfile = document.getElementById("ai-profile");
    aiProfile.addEventListener("click", function (event) {
        event.stopPropagation();
        const aiActorSettings = document.getElementById("ai-actor-settings-wrapper");
        const isAiActorSettingsVisible = aiActorSettings.classList.contains("visible");
        // 更新 aiActorSettingsVisible 状态
        uiManager.storageManager.getCurrentUserData().uiState.aiActorSettingsVisible = !isAiActorSettingsVisible;
        uiManager.storageManager.saveCurrentUserData();

        uiManager.toggleVisibility(aiActorSettings);

    });

    const refreshTopic = document.getElementById("refresh-topic");
    refreshTopic.addEventListener("click", function (event) {
        event.stopPropagation();
        uiManager.syncManager.syncChatHistories();
    });

    const topicFilter = document.getElementById("topic-filter");
    topicFilter.addEventListener("click", function (event) {
        event.stopPropagation();
        // 切换显示所有聊天历史的状态
        uiManager.showAllChatHistories = !uiManager.showAllChatHistories;

        // 基于新的状态更新UI显示
        uiManager.showChatHistory().then(() => {
            console.log("Chat histories updated successfully.");
        }).catch(err => {
            console.error("An error occurred while updating chat histories:", err);
        });

        // 根据filter状态切换按钮的active类
        if (uiManager.showAllChatHistories) {
            topicFilter.classList.remove("active");
        } else {
            topicFilter.classList.add("active");
        }
    });



    // split layout
    // Selecting elements that will be changed by layout toggling
    const appBar = document.getElementById("app-outer-wrapper");
    const messageContainer = document.getElementById("messages");

    // Selecting buttons for adding event listeners
    const toggleLayoutBtn = document.getElementById("toggle-layout");

    // Function to toggle the CSS class for the split layout
    function toggleLayout() {
        const actorSettingsWrapper = document.getElementById("ai-actor-settings-wrapper");
        const chatHistoryContainer = document.getElementById("chat-history-container");
        const inputContainter = document.querySelector("#input-container");
        const appContainer = document.querySelector("#app-container");

        const isSplitView = mainContainer.classList.contains("split-view");
        // 更新 splitView 状态
        uiManager.storageManager.getCurrentUserData().uiState.splitView = !isSplitView;
        uiManager.storageManager.saveCurrentUserData();

        // 重置高度
        inputContainter.style = "";
        messageInputContainer.style = "";
        appContainer.style = "";

        mainContainer.classList.toggle("split-view");
        appBar.classList.toggle("split-view");
        messageContainer.classList.toggle("split-view");
        messageInputContainer.classList.toggle("split-view");
        if (mainContainer.classList.contains("split-view")) {
            mainContainer.style.height = "";
            messageInput.style.maxHeight = "";
            uiManager.hiddenElement(actorSettingsWrapper);
            uiManager.hiddenElement(chatHistoryContainer);
        } else {
            uiManager.visibleElement(actorSettingsWrapper);
            uiManager.visibleElement(chatHistoryContainer);
        }
    }

    // Adding event listeners to buttons
    toggleLayoutBtn.addEventListener("click", toggleLayout);

    // Call this function to set initial display status based on the device type
    // 在页面加载时设置初始可见性状态
    function setInitialVisibility() {
        const aiActorSettings = document.getElementById("ai-actor-settings-wrapper");
        const chatHistoryContainer = document.getElementById("chat-history-container");
        const inputContainter = document.querySelector("#input-container");
        const messageInputContainer = document.querySelector("#message-input-container");

        inputContainter.style = "";
        messageInputContainer.style = "";

        const currentUserData = uiManager.storageManager.getCurrentUserData();
        if (!currentUserData.uiState) {
        // 如果 uiState 未定义，则进行初始化
            currentUserData.uiState = {
                splitView: false,
                chatHistoryVisible: true,
                aiActorSettingsVisible: true
            };
            uiManager.storageManager.saveCurrentUserData();
        }
        const uiState = currentUserData.uiState;
    
        // 设置视图模式
        if (uiState.splitView) {
            mainContainer.classList.add("split-view");
            appBar.classList.add("split-view");
            messageContainer.classList.add("split-view");
            messageInputContainer.classList.add("split-view");
            mainContainer.style.height = "";
            messageInput.style.maxHeight = "";
        } else {
            mainContainer.classList.remove("split-view");
            appBar.classList.remove("split-view");
            messageContainer.classList.remove("split-view");
            messageInputContainer.classList.remove("split-view");
        }

        // 根据保存的状态设置可见性
        uiManager.setElementVisibility(aiActorSettings, uiState.aiActorSettingsVisible);
        uiManager.setElementVisibility(chatHistoryContainer, uiState.chatHistoryVisible);


        if (window.innerWidth <= 768) {
        // 如果是移动设备，则默认隐藏菜单和聊天历史记录
            uiManager.hiddenElement(aiActorSettings);
            uiManager.hiddenElement(chatHistoryContainer);
        } 
    }

    async function handleFiles(event) {
        const files = event.target.files;
        if (files.length === 0) {
            return;
        }
        // 调用fileUploader中的方法进行文件处理
        await fileUploader.handleFileUpload(files);
    }

    console.log("initVisibilityAfterDataLoaded");
    const chatHistoryContainer = document.getElementById("chat-history-container");
    const aiActorSettings = document.getElementById("ai-actor-settings-wrapper");

    // 根据元素初始的显示状态来初始化按钮状态
    uiManager.updateButtonActiveState(chatHistoryContainer.id, chatHistoryContainer.classList.contains("visible"));
    uiManager.updateButtonActiveState(aiActorSettings.id, aiActorSettings.classList.contains("visible"));

    const generateImg = document.getElementById("generate-img");
    generateImg.addEventListener("click", () => {
        const content = messageInput.value;
        if (content.trim() === "") {
            swal("Please enter the description of the image you want to generate, such as 'a cat playing guitar'.", { icon:"warning",
                buttons: false, timer: 3000 });
            return;
        }
        messageInput.value = `/image ${messageInput.value}`;
        uiManager.handleMessageFormSubmit(messageInput);
    });

    // 绑定上传按钮的change事件
    const attachButton = document.getElementById("attachments-container");
    attachButton.addEventListener("click", () => {
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";
        fileInput.onchange = handleFiles;
        fileInput.click();
    });

    audioModal.init();
    const openModalBtn = document.getElementById("audio-file-container");
    openModalBtn.addEventListener("click", () => {
        audioModal.showModal();
    });

    setInitialVisibility();
    addHorizontalResizeHandleListeners(); // Add horizontal resize functionality
    addVerticalResizeHandleListeners(); // Add vertical resize functionality

    let initialWindowSize = {
        width: window.innerWidth,
        height: window.innerHeight
    };
      
    window.addEventListener("load", () => {
        initialWindowSize = {
            width: window.innerWidth,
            height: window.innerHeight
        };
    });

    // 初始化聊天选项模态框，传入clientLanguage
    const chatOptionsModal = new ChatOptionsModal(clientLanguage);
    
    // 添加点击事件处理
    document.getElementById("chat-options-button").addEventListener("click", () => {
        const messageInput = document.getElementById("message-input");
        const message = messageInput.value.trim();
        
        if (message) {
            chatOptionsModal.showModal(message);
        } else {
            swal("Please enter your message first", "", "warning");
        }
    });
    
    // Resize event listener to help to fix the issue of the chat history container not showing properly after resizing the window on mobile devices
    function handleWindowResize() {
        const currentWindowSize = {
            width: window.innerWidth,
            height: window.innerHeight
        };
      
        const widthChanged = initialWindowSize.width !== currentWindowSize.width;
        const heightDifference = Math.abs(initialWindowSize.height - currentWindowSize.height);
      
        if (widthChanged || heightDifference > 150) {
            setInitialVisibility();
      
            initialWindowSize = {
                width: currentWindowSize.width,
                height: currentWindowSize.height
            };
        }
    }
      
    window.addEventListener("resize", handleWindowResize);
}





