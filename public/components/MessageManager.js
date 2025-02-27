// MessageManager.js
import { getGpt, getFollowUpQuestions, textToImage, uploadDocument, generateDocumentQuery } from "../utils/apiClient.js";
import swal from "sweetalert";
import { generateExcerpt } from "../utils/textUtils.js";
import { marked } from "marked";
import markedKatex from "marked-katex-extension";
import LinkHandler from "../utils/linkHandler.js";
import DocumentManager from "./DocumentManager.js";  // Updated path
import DocumentMessageBuilder from "../utils/DocumentMessageBuilder.js";

const options = {
    throwOnError: false
};
marked.use(markedKatex(options));

// const test = `初始角度是 $ \frac{\pi}{2} $ （即90度，向上）。`;
// const markedTest  = marked.parse(test);
// console.log("markedTest", markedTest);

class MessageManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.linkHandler = new LinkHandler(uiManager);
        this.searchResults = null;
        this.webSearchEnabled = false; // Add this line to track web search state
        this.documentManager = new DocumentManager(uiManager);
        this.documentMessageBuilder = new DocumentMessageBuilder(uiManager);
    }

    // Add a method to toggle web search
    toggleWebSearch() {
        this.webSearchEnabled = !this.webSearchEnabled;
        const button = document.getElementById("web-search-toggle");
        if (this.webSearchEnabled) {
            button.classList.add("active");
        } else {
            button.classList.remove("active");
        }
    }

    // Add message to DOM
    addMessage(sender, message, messageId, isActive = true, position = "bottom", isError = false, attachmentUrls = "") {
        // 清除欢迎消息
        const welcomeMessage = document.querySelector("#welcome-message");
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        const messageElement = this.uiManager.domManager.createMessageElement(sender, messageId, isActive, isError);
        messageElement.dataset.message = message;
        messageElement.dataset.attachmentUrls = attachmentUrls;

        const conversationElement = this.uiManager.domManager.createConversationElement();
        messageElement.appendChild(conversationElement);
        this.uiManager.eventManager.attachToggleActiveMessageEventListener(conversationElement);

        const maximizeElement = this.uiManager.domManager.createMaximizeButtonElement();
        messageElement.appendChild(maximizeElement);
        this.uiManager.eventManager.attachMaximizeMessageEventListener(maximizeElement);

        const menuButtonElement = this.uiManager.domManager.createMenuButtonElement();
        messageElement.appendChild(menuButtonElement);

        const popupMenuElement = this.uiManager.domManager.createPopupMenuElement(!isActive);
        messageElement.appendChild(popupMenuElement);

        this.uiManager.eventManager.attachMenuButtonEventListener(menuButtonElement);
        this.uiManager.eventManager.attachPopupMenuItemEventListener(popupMenuElement);

        if (attachmentUrls !== "") {
            const attachmentContainer = this.uiManager.domManager.createAttachmentThumbnails(attachmentUrls);
            messageElement.appendChild(attachmentContainer);
        }

        const messageContentElement = sender === "user" ? document.createElement("pre") : document.createElement("div");
        messageContentElement.classList.add("message-content");
        messageElement.appendChild(messageContentElement);

        // 处理 assistant 消息的特殊情况
        if (sender === "assistant") {
            // 创建一个临时消息对象
            const tempMessage = {
                messageId,
                role: sender,
                content: message,
                attachmentUrls,
                searchResults: this.searchResults,
                timestamp: new Date().toISOString(),
                isActive
            };
            
            // 先保存消息
            this.uiManager.storageManager.saveMessage(this.uiManager.currentChatId, tempMessage);

            // 再尝试获取搜索结果
            const savedMessage = this.uiManager.storageManager.getMessage(this.uiManager.currentChatId, messageId);
            if (savedMessage?.searchResults) {
                this.searchResults = savedMessage.searchResults;
            }

            // 添加搜索结果（如果有）
            if (this.searchResults && Array.isArray(this.searchResults) && this.searchResults.length > 0) {
                const sourcesElement = document.createElement("div");
                sourcesElement.className = "search-sources";
                sourcesElement.innerHTML = `<details>
                    <summary>Search Sources (${this.searchResults.length})</summary>
                    <div class="sources-list">
                        ${this.searchResults.map((result, index) => `
                            <div class="source-item">
                                <span class="source-number">[${index + 1}]</span>
                                <a href="${result.url}" target="_blank" rel="noopener noreferrer">
                                    ${result.title}${result.date ? ` (${new Date(result.date).toLocaleDateString()})` : ""}
                                </a>
                            </div>
                        `).join("")}
                    </div>
                </details>`;
                messageElement.appendChild(sourcesElement);
            }

            // 然后处理引用
            message = this.processCitationsInMessage(message);
        }

        // Set the message content with citations
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

        this.uiManager.eventManager.attachImagePreviewEvent();
        setTimeout(() => this.uiManager.eventManager.updateMaximizeButtonVisibility(messageElement), 0);

        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        // this.uiManager.updateSlider();

        // Add event listeners for citations
        const citations = messageElement.querySelectorAll(".citation");
        citations.forEach(citation => {
            citation.addEventListener("mouseover", () => {
                const tooltip = document.createElement("div");
                tooltip.className = "citation-tooltip";
                tooltip.innerHTML = `
                    <div class="tooltip-title">${citation.dataset.title}</div>
                    <div class="tooltip-url">${citation.dataset.url}</div>
                `;
                document.body.appendChild(tooltip);

                const rect = citation.getBoundingClientRect();
                const isSplitView = document.body.classList.contains("split-view");
                
                // Adjust tooltip position for split view
                if (isSplitView) {
                    const messageContainer = document.querySelector("#messages");
                    const containerRect = messageContainer.getBoundingClientRect();
                    tooltip.style.left = `${Math.min(rect.left, containerRect.right - tooltip.offsetWidth - 20)}px`;
                } else {
                    tooltip.style.left = `${rect.left}px`;
                }
                
                tooltip.style.top = `${rect.bottom + 5}px`;

                // Remove tooltip on mouseout
                const handleMouseOut = () => {
                    tooltip.remove();
                    citation.removeEventListener("mouseout", handleMouseOut);
                };
                citation.addEventListener("mouseout", handleMouseOut);
            });

            citation.addEventListener("click", (event) => {
                event.preventDefault();
                window.open(citation.dataset.url, "_blank", "noopener,noreferrer");
            });
        });

        return messageElement;
    }

    async sendTextMessage() {
        this.uiManager.showToast("AI is thinking...");
        const promptText = this.uiManager.app.prompts.getPromptText();
        const currentProfile = this.uiManager.storageManager.getCurrentProfile();
        
        // Extract parameters from profile and ensure correct types
        const params = {
            temperature: parseFloat(currentProfile.temperature) || 0.8,
            top_p: parseFloat(currentProfile.top_p) || 0.95,
            frequency_penalty: parseFloat(currentProfile.frequency_penalty) || 0,
            presence_penalty: parseFloat(currentProfile.presence_penalty) || 0,
            max_tokens: parseInt(currentProfile.max_tokens) || 2000,
            webSearchEnabled: this.webSearchEnabled // Add this line to pass web search state
        };
        
        console.log("Sending request with params:", params); // Add debug info
        return await getGpt(promptText, this.uiManager.app.model, params);
    }

    async sendProfileMessage(message) {
        const parts = message.split(":");
        if (parts.length >= 2) {
            const profileDisplayName = parts[0].substring(1).trim(); // Remove '@'
            const messageContent = parts.slice(1).join(":").trim();
            let externalSystemPrompt;
            const profile = this.uiManager.profiles.find(p => p.displayName === profileDisplayName);
    
            if (profile) {
                externalSystemPrompt = profile.prompt;
            } else {
                externalSystemPrompt = `You are an experienced ${profileDisplayName}.`;
            }
    
            const promptText = this.uiManager.app.prompts.getPromptTextWithReplacement(externalSystemPrompt, messageContent);
    
            // Send the new 'profile' message
            this.uiManager.showToast("AI is thinking...");
            return await getGpt(promptText, this.uiManager.app.model);
        }
    }
    

    async sendImageMessage(message) {
        try {
            this.uiManager.showToast("AI is generating image...");
    
            // 将 generateImage 中的逻辑直接集成到这里
            const imageCaption = message.replace("/image", "").trim();
            const data = await textToImage(imageCaption);  // 调用生成图像的API
            const imageUrl = data.url;
            const revisedCaption = data.revised_prompt || imageCaption;
    
            // 构建消息对象，但不在此处添加消息
            const newMessageItem = {
                message: revisedCaption, 
                attachmentUrls: imageUrl, // 假设消息对象中有一个附件URL数组
            };
    
            // 直接从函数返回新的消息对象，让 wrapWithGetGptErrorHandler 在外层处理它
            return newMessageItem;
        } catch (error) {
            // 向上抛出异常，让 wrapWithGetGptErrorHandler 处理
            throw new Error(error.message || "生成图像时遇到未知错误。");
        }
    }
    
    async sendMessage(inputMessage = "", attachments = [], isRetry = false) {
        console.log("[MessageManager] Processing message:", { 
            inputMessage: inputMessage.substring(0, 100) + "...", 
            attachmentsCount: attachments.length, 
            isRetry 
        });
        
        this.clearFollowUpQuestions();
        this.uiManager.initSubmitButtonProcessing();

        try {
            // 验证输入并显示用户消息（仅对非文档消息）
            if (!attachments.some(att => !att.content.startsWith("data:image/"))) {
                const validationResult = await this.validateInput(inputMessage, attachments, isRetry);
                if (!validationResult) {
                    return;
                }
            }

            // Set up message processing variables
            let executeFunction;

            if (attachments.length > 0) {
                // 检查附件类型
                const hasNonImageAttachments = attachments.some(
                    att => !att.content.startsWith("data:image/")
                );
                
                if (hasNonImageAttachments) {
                    // 处理文档类型的附件
                    executeFunction = () => this.processDocumentCommand(inputMessage, attachments);
                } else {
                    // 处理图片附件
                    executeFunction = async () => {
                        const attachmentUrls = await this.uiManager.uploadAttachments(attachments);
                        if (!attachmentUrls) {
                            throw new Error("Failed to upload attachments");
                        }
                        return await this.sendTextMessage(inputMessage, attachmentUrls);
                    };
                }
            } else if (inputMessage.startsWith("/image")) {
                executeFunction = () => this.processImageCommand(inputMessage);
            } else if (inputMessage.startsWith("@")) {
                executeFunction = () => this.processProfileMessage(inputMessage);
            } else {
                executeFunction = () => this.sendTextMessage(inputMessage);
            }

            // 执行消息处理并获取响应
            const timestamp = new Date().toISOString();
            const data = await this.wrapWithGetGptErrorHandler(executeFunction, timestamp);
            
            // 处理搜索结果
            if (data && data.searchResults) {
                this.searchResults = data.searchResults;
            } else {
                this.searchResults = null;
            }
            
            // 完成处理
            this.uiManager.finishSubmitProcessing();
            await this.sendFollowUpQuestions();
        } catch (error) {
            console.error("Error in sendMessage:", error);
            this.uiManager.finishSubmitProcessing();
            if (!isRetry && error.message === "Failed to fetch") {
                await this.retryMessage(inputMessage, attachments);
            } else {
                throw error;
            }
        }
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    async wrapWithGetGptErrorHandler(dataPromise, timestamp) {
        try {
            const data = await dataPromise();
            if (!data) {
                const errorMessage = "The AI did not return any results. Please repeat your question or ask a different question.";
                swal(errorMessage, { icon: "error" });
            } else {
                let messageId = this.uiManager.generateId();
                // Store search results before adding message
                if (data.searchResults && Array.isArray(data.searchResults)) {
                    // Sort search results by date and ensure they are unique
                    this.searchResults = data.searchResults
                        .filter((result, index, self) => 
                            index === self.findIndex(r => r.url === result.url))
                        .sort((a, b) => {
                            if (a.type === "news" && b.type !== "news") return -1;
                            if (b.type === "news" && a.type !== "news") return 1;
                            return new Date(b.date || "") - new Date(a.date || "");
                        });
                } else {
                    this.searchResults = null;
                }

                const newMessage = { 
                    role: "assistant", 
                    content: data.message, 
                    messageId: messageId, 
                    isActive: true, 
                    attachmentUrls: data.attachmentUrls || "",
                    searchResults: this.searchResults,
                    timestamp: timestamp || new Date().toISOString(),
                    createdAt: timestamp || new Date().toISOString()
                };

                this.addMessage(
                    newMessage.role, 
                    newMessage.content, 
                    newMessage.messageId, 
                    newMessage.isActive, 
                    "bottom", 
                    false, 
                    newMessage.attachmentUrls
                );

                this.uiManager.storageManager.saveMessage(this.uiManager.currentChatId, newMessage);
                this.uiManager.syncManager.syncMessageCreate(this.uiManager.currentChatId, newMessage);
                this.uiManager.app.prompts.addPrompt(newMessage);
                
                // 更新聊天历史并可能生成标题
                this.uiManager.chatHistoryManager.updateChatHistory(this.uiManager.currentChatId);
            }
            return data;
        } catch (error) {
            // Parse and display the thrown error message
            let errorMessage = error.message;
            if (!navigator.onLine) {
                errorMessage = "You are currently offline, please check your network connection.";
            }
            swal("Request Error", errorMessage, { icon: "error" });
            this.uiManager.finishSubmitProcessing();
            return null;
        }
    }

    async validateInput(message, attachments = [], isRetry = false) {
        const validationResult = await this.uiManager.validateMessage(message);
        message = validationResult.message;
        let reEdit = validationResult.reEdit;
        validationResult.attachmentUrls = "";
        let attachmentUrls = "";

        if (attachments.length > 0 && !isRetry) {
            attachmentUrls = await this.uiManager.uploadAttachments(attachments);
            if (attachmentUrls === "") {
                this.uiManager.finishSubmitProcessing();
                return false;
            }
        }

        if (reEdit) {
            this.uiManager.messageInput.value = message;
            this.uiManager.messageInput.focus();
            this.uiManager.finishSubmitProcessing();
            return false;
        }

        const timestamp = new Date().toISOString();
        let messageId = this.uiManager.generateId();
        const newMessage = { 
            role: "user", 
            content: message, 
            messageId: messageId, 
            isActive: true, 
            attachmentUrls: attachmentUrls,
            timestamp: timestamp,
            createdAt: timestamp
        };

        // 先添加用户消息到界面
        this.addMessage(
            newMessage.role,
            newMessage.content,
            newMessage.messageId,
            newMessage.isActive,
            "bottom",
            false,
            newMessage.attachmentUrls
        );

        // 保存到存储并同步
        this.uiManager.app.prompts.addPrompt(newMessage);
        this.uiManager.storageManager.saveMessage(this.uiManager.currentChatId, newMessage);
        this.uiManager.syncManager.syncMessageCreate(this.uiManager.currentChatId, newMessage);
        this.uiManager.chatHistoryManager.updateChatHistory(this.uiManager.currentChatId);

        return validationResult;
    }


    // Modify this method to handle retrying a message
    async retryMessage(messageId) {
        const messageElem = document.querySelector(`[data-message-id="${messageId}"]`);
        if (!messageElem) {
            console.error("Message element not found:", messageId);
            return;
        }

        try {
            // 提取原始消息数据
            const originalMessage = this.extractMessageData(messageElem);
            console.log("Retrying message:", originalMessage);

            // 判断是否为最后一条消息并处理
            const lastMessageId = this.getLastMessageId();
            if (messageId === lastMessageId) {
                await this.deleteMessageInStorage(messageId);
            } else {
                this.inactiveMessage(messageId);
            }

            // 构建新的消息对象
            const timestamp = new Date().toISOString();
            const newMessageId = this.uiManager.generateId();
            const newMessage = this.createMessageCopy({
                ...originalMessage,
                messageId: newMessageId,
                timestamp,
                createdAt: timestamp
            });

            // 准备附件数据（如果有）
            let attachments = [];
            if (originalMessage.attachmentUrls) {
                attachments = originalMessage.attachmentUrls.split(";")
                    .filter(url => url.trim())
                    .map(url => ({
                        fileName: url,
                        isExistingAttachment: true
                    }));
            }

            // 根据消息类型执行不同的重发逻辑
            let executeFunction;
            if (originalMessage.content.startsWith("/image")) {
                // 图片生成命令 - 需要重新生成
                executeFunction = () => this.processImageCommand(originalMessage.content);
            } else if (originalMessage.content.startsWith("@")) {
                // 角色消息 - 重新处理配置文本
                executeFunction = () => this.processProfileMessage(originalMessage.content);
            } else if (attachments.length > 0) {
                // 带附件的消息 - 复用已有附件URL
                executeFunction = () => this.sendTextMessage(originalMessage.content);
            } else {
                // 普通文本消息
                executeFunction = () => this.sendTextMessage(originalMessage.content);
            }

            // 先添加用户消息到界面
            this.addMessage(
                newMessage.role,
                newMessage.content,
                newMessage.messageId,
                true,
                "bottom",
                false,
                newMessage.attachmentUrls
            );

            // 保存并同步新消息
            this.uiManager.app.prompts.addPrompt(newMessage);
            await this.uiManager.storageManager.saveMessage(this.uiManager.currentChatId, newMessage);
            await this.uiManager.syncManager.syncMessageCreate(this.uiManager.currentChatId, newMessage);
            
            // 更新聊天历史并可能生成标题
            this.uiManager.chatHistoryManager.updateChatHistory(this.uiManager.currentChatId);

            // 执行服务器请求并处理响应
            const data = await this.wrapWithGetGptErrorHandler(executeFunction, timestamp);
            if (data) {
                // 服务器响应处理在 wrapWithGetGptErrorHandler 中完成
                this.uiManager.finishSubmitProcessing();
                await this.sendFollowUpQuestions();
            }

        } catch (error) {
            console.error("Error retrying message:", error);
            this.uiManager.finishSubmitProcessing();
            swal("Error", "Failed to retry message: " + error.message, "error");
        }
    }

    // Add this method to get the ID of the last message
    getLastMessageId() {
        const messages = document.querySelectorAll(".message");
        return messages.length > 0 ? messages[messages.length - 1].dataset.messageId : null;
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
        // inactive the following messages
        const messages = document.querySelectorAll(".message");
        let isFollowing = false;
        for (let i = 0; i < messages.length; i++) {
            if (messages[i].dataset.messageId === messageId) {
                isFollowing = true;
            }
            if (isFollowing) {
                const msgId = messages[i].dataset.messageId;
                this.inactiveMessage(msgId);
            }
        }

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

    async deleteMessageInStorage(messageId) {
        try {
            this.uiManager.isDeleting = true;
            // Remove message from DOM
            const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
            if (messageElement) {
                messageElement.remove();
            }
            
            // Remove from prompts array
            this.uiManager.app.prompts.removePrompt(messageId);
            
            // Sync deletion with cloud and then delete from local storage
            await this.uiManager.syncManager.syncMessageDelete(this.uiManager.currentChatId, messageId);
            
            // Check if all messages are deleted
            const remainingMessages = document.querySelectorAll(".message");
            if (remainingMessages.length === 0) {
                this.uiManager.showWelcomeMessage();
            }
        } catch (error) {
            console.error("Failed to delete message:", error);
            // If deletion fails, show error and restore message in UI if needed
            swal("Failed to delete message", error.message, "error");
        } finally {
            this.uiManager.isDeleting = false;
        }
    }

    setMessageContent(sender, messageElem, message, isActive) {
        const replaceText = (input) => {
            if (!input) return "";
            
            // Replace single-line math expressions \( ... \) with $ ... $
            let outputText = input.replace(/\\\((.*?)\\\)/g, " $$$1$$ ");
            // Replace multi-line math expressions \[ ... \] with $$ ... $$
            outputText = outputText.replace(/\\\[(.*?)\\\)/gs, "$$$$$1$$$$");
            return outputText;
        };
          
        // Replace inline formulas
        message = replaceText(message);
    
        let element;
        if (sender === "user") {
            element = messageElem.querySelector("pre");
            element.innerText = isActive ? message : this.getMessagePreview(message);
        } else {
            element = messageElem.querySelector("div.message-content");
            const messageHtml = marked.parse(message || "");
            element.innerHTML = isActive ? messageHtml : marked.parse(this.getMessagePreview(message || ""));
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

        // Handle links
        if (sender === "assistant") {
            setTimeout(() => {
                this.linkHandler.attachLinkHandlers();
            }, 0);
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

        savedMessages.slice(startingIndex, savedMessages.length - currentMessagesCount).reverse().forEach(message => {
            // Check if the message is already in the list
            if (!currentMessageIds.includes(message.messageId)) {
                let isActive = message.isActive || false;
                this.addMessage(message.role, message.content, message.messageId, isActive, "top", false, message.attachmentUrls);
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

            this.uiManager.eventManager.updateMaximizeButtonVisibility(messageElement);

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

        // this.uiManager.updateSlider();
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
        const lastMessages = activeMessages.slice(-2); // get last 2 messages
        lastMessages.forEach(message => {
            // const dataSender = message.getAttribute("data-sender");
            let dataMessage = message.getAttribute("data-message");
            // if dataMessage is longer than 5000 characters, truncate first 1000 characters, add ellipsis, then get middle 500 characters, add ellipsis, then get last 1000 characters.
            dataMessage = generateExcerpt(dataMessage, 500, 250, 500);

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

        const systemPrompt = {
            role: "system",
            content: ` You are a critical thinker. You are talking with ${currentProfile.displayName},
            Here is his/her profile:
                      ===
                      ${currentProfile.prompt}
                      ===
                      ` };
        console.log(this.uiManager.clientLanguage);
        const userPrompt = {
            role: "user",
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

    // Add this method to process citations in messages
    processCitationsInMessage(message) {
        if (!this.searchResults || !Array.isArray(this.searchResults)) {
            return message;
        }

        // First handle markdown links to avoid interference with citations
        const linkMap = new Map();
        let linkCounter = 0;
        message = message.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match) => {
            const placeholder = `__LINK_${linkCounter}__`;
            linkMap.set(placeholder, match);
            linkCounter++;
            return placeholder;
        });

        // Process citations
        message = message.replace(/\[citation:(\d+)\]/g, (match, citationNum) => {
            const index = parseInt(citationNum) - 1;
            if (index < 0 || index >= this.searchResults.length) {
                return match; // Keep original if citation number is out of range
            }
            const result = this.searchResults[index];
            if (!result) return match;
            
            const date = result.date ? ` (${new Date(result.date).toLocaleDateString()})` : "";
            return `<span class="citation" data-url="${result.url}" data-title="${result.title}${date}">${match}</span>`;
        });

        // Restore markdown links
        linkMap.forEach((value, key) => {
            message = message.replace(key, value);
        });

        return message;
    }

    async processDocuments(attachments, question) {
        // Upload all documents first
        const uploadPromises = attachments.map(attachment => {
            const blob = this.uiManager.base64ToBlob(attachment.content);
            return uploadDocument(blob, attachment.fileName);
        });

        try {
            const uploadResults = await Promise.all(uploadPromises);
            const processedUrls = uploadResults.map(result => result.processedUrl);
            
            // Generate response using the template format
            const response = await generateDocumentQuery(processedUrls, question);
            return response;
        } catch (error) {
            console.error("Error processing documents:", error);
            throw error;
        }
    }

    async processImageCommand(message) {
        const imageCaption = message.replace("/image", "").trim();
        const data = await textToImage(imageCaption);
        return {
            message: data.revised_prompt || imageCaption,
            attachmentUrls: data.url
        };
    }

    async processDocumentCommand(message, attachments) {
        // 处理文档并创建包含文档内容的消息
        const documentMessage = await this.documentManager.processDocuments(attachments, message);
        
        // 将文档消息添加到对话中
        this.addMessage(
            documentMessage.role,
            documentMessage.content,
            documentMessage.messageId,
            documentMessage.isActive,
            "bottom",
            false,
            ""
        );

        // 保存并同步文档消息
        this.uiManager.app.prompts.addPrompt(documentMessage);
        this.uiManager.storageManager.saveMessage(this.uiManager.currentChatId, documentMessage);
        this.uiManager.syncManager.syncMessageCreate(this.uiManager.currentChatId, documentMessage);
        
        // 更新聊天历史并可能生成标题
        this.uiManager.chatHistoryManager.updateChatHistory(this.uiManager.currentChatId);

        // 生成文档查询响应
        // 注意：此时 documentMessage.documents 已经是字符串，需要解析回对象
        const documents = JSON.parse(documentMessage.documents);
        const response = await this.documentManager.generateQuery(documents, message);
        
        return response;
    }

    // 创建消息副本时保留必要的属性但生成新ID
    createMessageCopy(originalMessage) {
        return {
            role: originalMessage.role,
            content: originalMessage.content,
            messageId: this.uiManager.generateId(),
            isActive: true,
            attachmentUrls: originalMessage.attachmentUrls || "",
            timestamp: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            searchResults: originalMessage.searchResults
        };
    }

    // 从DOM元素中提取消息数据
    extractMessageData(messageElem) {
        return {
            role: messageElem.dataset.sender,
            content: messageElem.dataset.message,
            attachmentUrls: messageElem.dataset.attachmentUrls || "",
            searchResults: this.searchResults
        };
    }
}
    

export default MessageManager;
