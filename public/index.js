// index.js
import { signIn } from "./utils/authRedirect.js";
import { getAppName, getPromptRepo } from "./utils/apiClient.js";
import swal from "sweetalert";
import MarkdownManager from "./components/MarkdownManager.js";
import { addHorizontalResizeHandleListeners } from "./utils/horizontal-resize.js";
import { addVerticalResizeHandleListeners } from "./utils/vertical-resize.js";
import fileUploader from "./utils/fileUploader.js";
import setup from "./setup.js";
import AudioProcessingModal from "./components/AudioProcessingModal.js";
import ChatOptionsModal from "./components/ChatOptionsModal.js";
import ModelDropdownManager from "./utils/ModelDropdownManager.js";
import { addChatHistoryResizeHandleListeners } from "./utils/chat-history-resize.js";
import GptImageManager from "./components/GptImageManager.js";

(async () => {
    try {
        const username = await signIn(); 
        if (username) {
            initializeApp(username);  
        } else {
            console.error("User not signed in");
        }
    } catch (error) {
        console.error("Error:", error);
    }
})();

async function initializeApp(username) {  
    console.log("initializeApp");
    const uiManager = setup();  
    uiManager.storageManager.updateCurrentUserInfo(username);  
    const app = uiManager.app;
    
    // Initialize ModelDropdownManager for model selection
    const modelDropdownManager = new ModelDropdownManager(app, "#model-switch");
    
    // Initialize GPT-Image-1 manager
    const gptImageManager = new GptImageManager();
    
    // 初始化显示欢迎信息
    uiManager.showWelcomeMessage();

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
            
            // 在数据加载完成后，检查当前话题状态
            checkAndEnterFirstTopic(uiManager);
        })
        .catch(error => {
            console.error("Error:", error);
        });

    // 功能：检查并进入最近的历史话题
    function checkAndEnterFirstTopic(uiManager) {
        // 获取当前聊天ID和聊天历史
        const currentChatId = uiManager.currentChatId;
        const chatHistory = uiManager.chatHistoryManager.getChatHistory();
        
        // 如果没有当前话题，或者缓存的话题在历史记录中不存在
        if (!currentChatId || (chatHistory.length > 0 && !chatHistory.find(history => history.id === currentChatId))) {
            console.log("No valid current topic, entering most recent historical topic");
            
            if (chatHistory && chatHistory.length > 0) {
                // 由于 getChatHistory 已经按 updatedAt 降序排序，第一个就是最近的话题
                const mostRecentTopic = chatHistory[0];
                console.log("Entering most recent topic:", mostRecentTopic.id);
                
                // 获取该话题对应的配置文件
                const profile = uiManager.aiProfileManager.getProfileByName(mostRecentTopic.profileName);
                
                if (profile) {
                    // 切换到对应的配置文件并加载话题
                    uiManager.aiProfileManager.switchToProfile(profile, false);
                    uiManager.changeChatTopic(mostRecentTopic.id, false);
                }
            }
        }
    }


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
        event.preventDefault(); // 防止表单默认提交行为
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
        
        // 切换 AI Actor 列表的显示状态
        const aiActorWrapper = document.getElementById("ai-actor-wrapper");
        const isVisible = aiActorWrapper.classList.contains("visible");
        
        if (isVisible) {
            uiManager.hideAIActorList();
        } else {
            // 确保在显示列表前，列表内容已更新
            uiManager.showAIActorList();
        }
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

    // Add new click handler for ai-profile button
    const aiProfileButton = document.getElementById("ai-profile");
    aiProfileButton.addEventListener("click", function(event) {
        event.stopPropagation();
        
        // Get the current profile to edit
        const currentProfile = uiManager.storageManager.getCurrentProfile();
        if (currentProfile) {
            // Show the edit modal with the current profile data
            uiManager.uiStateManager.showEditAIActorModal(currentProfile);
        }
    });

    const refreshTopic = document.getElementById("refresh-topic");
    refreshTopic.addEventListener("click", function (event) {
        event.stopPropagation();
        uiManager.syncManager.syncChatHistories();
    });

    const topicFilter = document.getElementById("topic-filter");
    topicFilter.addEventListener("click", function (event) {
        event.stopPropagation();
        uiManager.showActorFilterModal();
    });

    // split layout
    // Selecting elements that will be changed by layout toggling
    const appBar = document.getElementById("app-outer-wrapper");
    const messageContainer = document.getElementById("messages");

    // Selecting buttons for adding event listeners
    const toggleLayoutBtn = document.getElementById("toggle-layout");

    // Function to toggle the CSS class for the split layout
    function toggleLayout() {
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
        } else {
            uiManager.visibleElement(chatHistoryContainer);
        }
    }

    // Adding event listeners to buttons
    toggleLayoutBtn.addEventListener("click", toggleLayout);

    // Call this function to set initial display status based on the device type
    // 在页面加载时设置初始可见性状态
    function setInitialVisibility() {
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
                aiActorSettingsVisible: false  // 初始隐藏 AI Actor 设置对话框
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
        // 这里修改：不要以 uiState 中保存的状态来控制 ai-actor-settings-wrapper 的可见性
        // 该元素现在由 AIActorSettingsModal 组件控制
        uiManager.setElementVisibility(chatHistoryContainer, uiState.chatHistoryVisible);

        if (window.innerWidth <= 768) {
            // 如果是移动设备，则隐藏聊天历史记录
            uiManager.hiddenElement(chatHistoryContainer);
        } 
    }

    // Function to handle responsive layout based on screen width
    function handleResponsiveLayout() {
        const isSplitView = mainContainer.classList.contains("split-view");
        if (window.innerWidth < 768 && isSplitView) {
            // If screen width is less than 768px and currently in split-view, switch to mobile layout
            const chatHistoryContainer = document.getElementById("chat-history-container");
            const inputContainter = document.querySelector("#input-container");
            const appContainer = document.querySelector("#app-container");
            
            // 更新 splitView 状态为 false (关闭分屏)
            uiManager.storageManager.getCurrentUserData().uiState.splitView = false;
            uiManager.storageManager.saveCurrentUserData();
            
            // 重置高度
            inputContainter.style = "";
            messageInputContainer.style = "";
            appContainer.style = "";
            
            // 移除分屏相关的类
            mainContainer.classList.remove("split-view");
            appBar.classList.remove("split-view");
            messageContainer.classList.remove("split-view");
            messageInputContainer.classList.remove("split-view");
            
            // 隐藏聊天历史
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

    // 根据元素初始的显示状态来初始化按钮状态
    uiManager.updateButtonActiveState(chatHistoryContainer.id, chatHistoryContainer.classList.contains("visible"));
    // 不再需要控制 ai-actor-settings-wrapper 的按钮状态，由 AIActorSettingsModal 负责
    
    const generateImg = document.getElementById("generate-img");
    generateImg.addEventListener("click", () => {
        const content = messageInput.value;
        if (content.trim() === "") {
            swal("Please enter the description of the image you want to generate, such as 'a cat playing guitar'.", { icon:"warning",
                buttons: false, timer: 3000 });
            return;
        }
        messageInput.value = `/dalle ${messageInput.value}`;
        uiManager.handleMessageFormSubmit(messageInput);
    });

    // 绑定上传按钮的change事件
    const attachButton = document.getElementById("attachments-container");
    attachButton.addEventListener("click", () => {
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.multiple = true; // 允许多文件选择
        // 移除文件类型限制，允许上传所有类型的文件
        fileInput.onchange = handleFiles;
        fileInput.click();
    });

    // Initialize the AudioProcessingModal component
    const audioProcessingModal = new AudioProcessingModal();
    audioProcessingModal.init();
    
    // Add click event listener to the audio file container button
    const openModalBtn = document.getElementById("audio-file-container");
    openModalBtn.addEventListener("click", () => {
        audioProcessingModal.showModal();
    });

    // Add close button handler for mobile
    const closeChatHistoryBtn = document.getElementById("close-chat-history");
    closeChatHistoryBtn.addEventListener("click", function(event) {
        event.stopPropagation();
        uiManager.hiddenElement(chatHistoryContainer);
    });

    setInitialVisibility();
    addHorizontalResizeHandleListeners(); // Add horizontal resize functionality
    addVerticalResizeHandleListeners(); // Add vertical resize functionality
    addChatHistoryResizeHandleListeners(); // Add chat history resize functionality

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
            handleResponsiveLayout(); // 添加对响应式布局的处理
      
            initialWindowSize = {
                width: currentWindowSize.width,
                height: currentWindowSize.height
            };
        }
    }
      
    window.addEventListener("resize", handleWindowResize);
    
    // 初始调用确保正确的布局
    handleResponsiveLayout();

    // 初始化 AI Actor Filter Modal
    await uiManager.initializeActorFilterModal();
}





