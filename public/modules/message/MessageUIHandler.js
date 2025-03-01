// MessageUIHandler.js - 处理消息UI相关功能
import { marked } from "marked";
import { generateExcerpt } from "../../utils/textUtils.js";
import swal from "sweetalert";

class MessageUIHandler {
    constructor(messageManager) {
        this.messageManager = messageManager;
        this.uiManager = messageManager.uiManager;
        this.domManager = this.uiManager.domManager;
        this.eventManager = this.uiManager.eventManager;
        this.linkHandler = messageManager.linkHandler;
    }

    // 添加消息到DOM
    addMessage(sender, message, messageId, isActive = true, position = "bottom", isError = false, attachmentUrls = "") {
        // 清除欢迎消息
        const welcomeMessage = document.querySelector("#welcome-message");
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        // 创建消息元素
        const messageElement = this.domManager.createMessageElement(sender, messageId, isActive, isError);
        messageElement.dataset.message = message;
        messageElement.dataset.sender = sender;
        messageElement.dataset.attachmentUrls = attachmentUrls;
        
        // 从存储中获取完整的消息数据，包括搜索结果
        const storedMessage = this.uiManager.storageManager.getMessage(
            this.uiManager.currentChatId,
            messageId
        );

        if (storedMessage && storedMessage.searchResults) {
            // 更新消息管理器的搜索结果状态
            this.messageManager.searchResults = storedMessage.searchResults;
        }

        // 添加会话元素
        const conversationElement = this.domManager.createConversationElement();
        messageElement.appendChild(conversationElement);
        this.eventManager.attachToggleActiveMessageEventListener(conversationElement);

        // 添加最大化按钮
        const maximizeElement = this.domManager.createMaximizeButtonElement();
        messageElement.appendChild(maximizeElement);
        this.eventManager.attachMaximizeMessageEventListener(maximizeElement);

        // 添加菜单按钮
        const menuButtonElement = this.domManager.createMenuButtonElement();
        messageElement.appendChild(menuButtonElement);

        // 添加弹出菜单
        const popupMenuElement = this.domManager.createPopupMenuElement(!isActive);
        messageElement.appendChild(popupMenuElement);
        this.eventManager.attachMenuButtonEventListener(menuButtonElement);
        this.eventManager.attachPopupMenuItemEventListener(popupMenuElement);

        // 添加附件容器
        if (attachmentUrls !== "") {
            const attachmentContainer = this.domManager.createAttachmentThumbnails(attachmentUrls);
            messageElement.appendChild(attachmentContainer);
        }

        // 添加消息内容
        const messageContentElement = sender === "user" ? document.createElement("pre") : document.createElement("div");
        messageContentElement.classList.add("message-content");
        messageElement.appendChild(messageContentElement);

        // 处理引用和搜索结果
        if (sender === "assistant") {
            // 处理引用
            message = this.processCitationsInMessage(message);
            
            // 添加搜索结果（如果有）- 使用存储的搜索结果
            const currentSearchResults = storedMessage?.searchResults || this.messageManager.searchResults;
            if (currentSearchResults && Array.isArray(currentSearchResults) && currentSearchResults.length > 0) {
                messageElement.appendChild(this.createSearchSourcesElement(currentSearchResults));
            }
        }

        // 设置消息内容
        const codeBlocksWithCopyElements = this.setMessageContent(sender, messageElement, message, isActive);

        // 折叠非激活消息
        if (!isActive) {
            messageElement.classList.add("collapsed");
        }

        // 添加按钮组
        const iconGroup = this.domManager.createIconGroup();

        // 添加复制按钮
        const copyElement = this.domManager.createCopyElement();
        iconGroup.appendChild(copyElement);

        // 添加重试按钮（用户消息）
        if (sender === "user") {
            const retryElement = this.domManager.createRetryElement();
            iconGroup.appendChild(retryElement);
            this.eventManager.attachRetryMessageEventListener(retryElement, messageId);
        }

        // 添加语音朗读按钮（如果启用）
        if (this.uiManager.storageManager.getCurrentProfile() && this.uiManager.storageManager.getCurrentProfile().tts === "enabled") {
            const speakerElement = this.domManager.createSpeakerElement();
            iconGroup.appendChild(speakerElement);
        }

        // 将按钮组添加到消息元素
        messageElement.appendChild(iconGroup);

        // 将消息元素添加到消息容器
        const messagesContainer = document.querySelector("#messages");
        if (position === "top") {
            messagesContainer.insertBefore(messageElement, messagesContainer.firstChild);
        } else {
            messagesContainer.appendChild(messageElement);
        }

        // 添加事件监听器
        this.attachEventListeners(messageElement, codeBlocksWithCopyElements);

        // 自动滚动到底部
        if (position === "bottom") {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        return messageElement;
    }

    // 添加事件监听器
    attachEventListeners(messageElement, codeBlocksWithCopyElements) {
        const currentSpeaker = messageElement.querySelector(".message-speaker");
        this.eventManager.attachMessageSpeakerEvent(currentSpeaker);

        // 自动播放（如果启用）
        const autoPlay = this.uiManager.app.ttsPracticeMode && messageElement.dataset.sender === "assistant";
        if (autoPlay) {
            this.uiManager.playMessage(currentSpeaker);
        }

        // 添加复制功能
        const currentCopy = messageElement.querySelector(".message-copy:not(.code-block-copy)");
        this.eventManager.attachMessageCopyEvent(currentCopy);
        
        // 为代码块添加复制功能
        codeBlocksWithCopyElements.forEach(({ codeBlock, copyElement }) => {
            this.eventManager.attachCodeBlockCopyEvent(codeBlock, copyElement);
        });

        // 图片预览功能
        this.eventManager.attachImagePreviewEvent();
        
        // 更新最大化按钮可见性
        setTimeout(() => this.eventManager.updateMaximizeButtonVisibility(messageElement), 0);

        // 为引用添加事件监听器
        this.attachCitationListeners(messageElement.querySelectorAll(".citation"));
    }

    // 设置消息内容
    setMessageContent(sender, messageElem, message, isActive) {
        const replaceText = (input) => {
            if (!input) return "";
            
            // 替换单行数学表达式 \( ... \) 为 $ ... $
            let outputText = input.replace(/\\\((.*?)\\\)/g, " $$$1$$ ");
            // 替换多行数学表达式 \[ ... \] 为 $$ ... $$
            outputText = outputText.replace(/\\\[(.*?)\\\)/gs, "$$$$$1$$$$");
            return outputText;
        };
          
        // 替换内联公式
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
    
        // 处理代码块
        const codeBlocks = element.querySelectorAll("pre > code, pre code");
        const codeBlocksWithCopyElements = [];
    
        for (let i = 0; i < codeBlocks.length; i++) {
            const codeBlock = codeBlocks[i];
            const copyElement = this.domManager.createCopyElement();
    
            // 为代码块创建容器
            const wrapper = document.createElement("div");
            wrapper.classList.add("code-block-wrapper");
            wrapper.style.position = "relative";
            codeBlock.parentNode.insertBefore(wrapper, codeBlock);
            wrapper.appendChild(codeBlock);
            wrapper.appendChild(copyElement);
            copyElement.classList.add("code-block-copy");
    
            codeBlocksWithCopyElements.push({ codeBlock, copyElement });
        }

        // 处理链接
        if (sender === "assistant") {
            setTimeout(() => {
                this.linkHandler.attachLinkHandlers();
            }, 0);
        }
    
        return codeBlocksWithCopyElements;
    }

    // 创建搜索结果元素
    createSearchSourcesElement(searchResults = null) {
        const sources = searchResults || this.messageManager.searchResults;
        if (!sources || !Array.isArray(sources) || sources.length === 0) {
            return null;
        }

        const sourcesElement = document.createElement("div");
        sourcesElement.className = "search-sources";
        sourcesElement.innerHTML = `<details>
            <summary>Search Sources (${sources.length})</summary>
            <div class="sources-list">
                ${sources.map((result, index) => `
                    <div class="source-item">
                        <span class="source-number">[${index + 1}]</span>
                        <a href="${result.url}" target="_blank" rel="noopener noreferrer">
                            ${result.title}${result.date ? ` (${new Date(result.date).toLocaleDateString()})` : ""}
                        </a>
                    </div>
                `).join("")}
            </div>
        </details>`;
        return sourcesElement;
    }

    // 处理消息中的引用
    processCitationsInMessage(message) {
        if (!this.messageManager.searchResults || !Array.isArray(this.messageManager.searchResults)) {
            return message;
        }

        // 首先处理Markdown链接，避免与引用冲突
        const linkMap = new Map();
        let linkCounter = 0;
        message = message.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match) => {
            const placeholder = `__LINK_${linkCounter}__`;
            linkMap.set(placeholder, match);
            linkCounter++;
            return placeholder;
        });

        // 处理引用
        message = message.replace(/\[citation:(\d+)\]/g, (match, citationNum) => {
            const index = parseInt(citationNum) - 1;
            if (index < 0 || index >= this.messageManager.searchResults.length) {
                return match; // 如果引用编号超出范围，保留原始文本
            }
            const result = this.messageManager.searchResults[index];
            if (!result) return match;
            
            const date = result.date ? ` (${new Date(result.date).toLocaleDateString()})` : "";
            return `<span class="citation" data-url="${result.url}" data-title="${result.title}${date}">${match}</span>`;
        });

        // 恢复Markdown链接
        linkMap.forEach((value, key) => {
            message = message.replace(key, value);
        });

        return message;
    }

    // 为引用添加事件监听器
    attachCitationListeners(citations) {
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
                
                // 调整分屏模式下的提示位置
                if (isSplitView) {
                    const messageContainer = document.querySelector("#messages");
                    const containerRect = messageContainer.getBoundingClientRect();
                    tooltip.style.left = `${Math.min(rect.left, containerRect.right - tooltip.offsetWidth - 20)}px`;
                } else {
                    tooltip.style.left = `${rect.left}px`;
                }
                
                tooltip.style.top = `${rect.bottom + 5}px`;

                // 鼠标移出时移除提示
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
    }

    // 获取消息预览内容
    getMessagePreview(message, maxLength = 80) {
        let previewText = message.replace(/\n/g, " ");
        if (previewText.length > maxLength) {
            return previewText.substring(0, maxLength - 3) + "...";
        }
        return previewText;
    }

    // 切换消息折叠状态
    toggleCollapseMessage(messageElement, forceCollapse) {
        const isCurrentlyCollapsed = messageElement.classList.contains("collapsed");
        if ((forceCollapse && !isCurrentlyCollapsed) || (!forceCollapse && isCurrentlyCollapsed)) {
            const isCollapsed = messageElement.classList.toggle("collapsed");
            const updatedMessage = isCollapsed ? this.getMessagePreview(messageElement.dataset.message) : messageElement.dataset.message;
            const sender = messageElement.dataset.sender;

            const newCodeBlocksWithCopyElements = this.setMessageContent(sender, messageElement, updatedMessage, !isCollapsed);

            newCodeBlocksWithCopyElements.forEach(({ codeBlock, copyElement }) => {
                this.eventManager.attachCodeBlockCopyEvent(codeBlock, copyElement);
            });

            this.eventManager.updateMaximizeButtonVisibility(messageElement);

            this.updateToggleItemUI(messageElement, isCollapsed);
        }
    }

    // 更新切换项UI
    updateToggleItemUI(messageElement, isCollapsed) {
        const toggleItem = messageElement.querySelector(".toggle-item");
        if (toggleItem) {
            toggleItem.dataset.collapsed = isCollapsed ? "true" : "false";
            const span = toggleItem.querySelector("span");
            span.textContent = isCollapsed ? "Expand" : "Collapse";

            // 获取Font Awesome图标元素
            const icon = toggleItem.querySelector("i");
            // 根据消息是否折叠更改类
            if (isCollapsed) {
                icon.classList.replace("fa-chevron-up", "fa-chevron-down");
            } else {
                icon.classList.replace("fa-chevron-down", "fa-chevron-up");
            }
        }
    }

    // 添加后续问题按钮
    addFollowUpQuestions(questions) {
        const followUpQuestionsElement = document.createElement("div");
        followUpQuestionsElement.classList.add("follow-up-questions");

        questions.forEach((question) => {
            const questionElement = document.createElement("button");
            questionElement.textContent = question;
            this.eventManager.attachQuestionButtonEvent(questionElement, question);
            followUpQuestionsElement.appendChild(questionElement);
        });

        const messagesContainer = document.querySelector("#messages");
        messagesContainer.appendChild(followUpQuestionsElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // 清除后续问题
    clearFollowUpQuestions() {
        const followUpQuestionsElement = document.querySelector("#messages .follow-up-questions");
        if (followUpQuestionsElement) {
            followUpQuestionsElement.remove();
        }
    }

    // 删除消息
    deleteMessage(messageId, isMute = false) {
        if (isMute) {
            this.messageManager.deleteMessageInStorage(messageId);
        } else {
            const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);

            // 获取消息预览文本
            const message = messageElement.dataset.message;
            const previewText = this.getMessagePreview(message, 500);

            swal({
                title: "是否确定要删除或编辑此消息？",
                text: previewText,
                icon: "warning",
                buttons: {
                    cancel: "取消",
                    delete: {
                        text: "删除",
                        value: "delete",
                    },
                },
            }).then((value) => {
                if (value === "delete") {
                    this.messageManager.deleteMessageInStorage(messageId);
                    swal("消息已删除", { icon: "success", buttons: false, timer: 1000 });
                }
            });
        }
    }

    // 取消激活消息
    inactiveMessage(messageId) {
        const message = document.querySelector(`[data-message-id="${messageId}"]`);
        this.uiManager.app.prompts.removePrompt(messageId);
        if (message) {
            message.classList.remove("active");
            this.toggleCollapseMessage(message, true);
        }
    }
}

export default MessageUIHandler;