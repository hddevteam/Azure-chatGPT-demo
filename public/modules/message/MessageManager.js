// MessageManager.js - 重构后的消息管理器
import swal from "sweetalert";
import LinkHandler from "../utils/linkHandler.js";
import DocumentManager from "../components/DocumentManager.js";
import MessageProcessorFactory from "./message/MessageProcessorFactory.js";
import MessageUIHandler from "./message/MessageUIHandler.js";
import FollowUpQuestionHandler from "./message/FollowUpQuestionHandler.js";

class MessageManager {
    constructor(uiManager) {
        // 初始化基本依赖
        this.uiManager = uiManager;
        this.linkHandler = new LinkHandler(uiManager);
        this.documentManager = new DocumentManager(uiManager);
        
        // 初始化状态
        this.searchResults = null;
        this.webSearchEnabled = false;
        this.isDeleting = false;
        
        // 初始化关联的处理器
        this.uiHandler = new MessageUIHandler(this);
        this.followUpHandler = new FollowUpQuestionHandler(this);
        this.processorFactory = new MessageProcessorFactory(this);
    }

    // 切换网络搜索功能
    toggleWebSearch() {
        this.webSearchEnabled = !this.webSearchEnabled;
        const button = document.getElementById("web-search-toggle");
        button.classList.toggle("active", this.webSearchEnabled);
    }

    // 添加消息到DOM - 代理到UIHandler
    addMessage(sender, message, messageId, isActive = true, position = "bottom", isError = false, attachmentUrls = "") {
        return this.uiHandler.addMessage(sender, message, messageId, isActive, position, isError, attachmentUrls);
    }

    // 发送消息的主要方法
    async sendMessage(inputMessage = "", attachments = [], isRetry = false) {
        console.log("[MessageManager] Processing message:", { 
            inputMessage: inputMessage.substring(0, 100) + "...", 
            attachmentsCount: attachments.length, 
            isRetry 
        });
        
        // 清除跟进问题
        this.followUpHandler.clearFollowUpQuestions();
        
        // 初始化提交按钮状态
        this.uiManager.initSubmitButtonProcessing();

        try {
            // 选择合适的消息处理器
            const processor = this.processorFactory.getProcessor(inputMessage, attachments);
            
            // 处理消息
            await processor.process(inputMessage, attachments);
            
            // 完成处理
            this.uiManager.finishSubmitProcessing();
            
            // 生成跟进问题
            await this.followUpHandler.generateAndShowFollowUpQuestions();
            
        } catch (error) {
            console.error("Error in sendMessage:", error);
            this.uiManager.finishSubmitProcessing();
            
            // 处理网络错误的重试
            if (!isRetry && error.message === "Failed to fetch") {
                await this.retryMessage(inputMessage, attachments);
            } else {
                // 显示错误消息
                let errorMessage = error.message;
                if (!navigator.onLine) {
                    errorMessage = "您当前处于离线状态，请检查网络连接。";
                }
                swal("请求错误", errorMessage, { icon: "error" });
            }
        }
    }

    // 消息输入验证
    async validateInput(message, attachments = [], isRetry = false) {
        const validationResult = await this.uiManager.validateMessage(message);
        message = validationResult.message;
        let reEdit = validationResult.reEdit;
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
        const messageId = this.uiManager.generateId();
        const newMessage = { 
            role: "user", 
            content: message, 
            messageId: messageId, 
            isActive: true, 
            attachmentUrls: attachmentUrls,
            timestamp: timestamp,
            createdAt: timestamp
        };

        // 添加用户消息到界面
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

        validationResult.attachmentUrls = attachmentUrls;
        return validationResult;
    }

    // 重试消息
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

            // 重新发送消息
            await this.sendMessage(originalMessage.content, attachments, true);

        } catch (error) {
            console.error("Error retrying message:", error);
            swal("错误", "重试消息失败: " + error.message, "error");
        }
    }

    // 获取最后一条消息的ID
    getLastMessageId() {
        const messages = document.querySelectorAll(".message");
        return messages.length > 0 ? messages[messages.length - 1].dataset.messageId : null;
    }

    // 从DOM元素提取消息数据
    extractMessageData(messageElem) {
        return {
            role: messageElem.dataset.sender,
            content: messageElem.dataset.message,
            attachmentUrls: messageElem.dataset.attachmentUrls || "",
            searchResults: this.searchResults
        };
    }

    // 将消息标记为非激活
    inactiveMessage(messageId) {
        this.uiHandler.inactiveMessage(messageId);
    }

    // 编辑消息
    editMessage(message, messageId) {
        this.inactiveMessage(messageId);
        
        // 将之后的消息也标记为非激活
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

        // 将消息填入输入框
        this.uiManager.messageInput.value = message;
        this.uiManager.messageInput.focus();
    }

    // 删除消息
    deleteMessage(messageId, isMute = false) {
        this.uiHandler.deleteMessage(messageId, isMute);
    }

    // 从存储中删除消息
    async deleteMessageInStorage(messageId) {
        try {
            this.isDeleting = true;
            
            // 从DOM中移除消息
            const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
            if (messageElement) {
                messageElement.remove();
            }
            
            // 从提示数组中移除
            this.uiManager.app.prompts.removePrompt(messageId);
            
            // 与云存储同步删除并从本地存储中删除
            await this.uiManager.syncManager.syncMessageDelete(this.uiManager.currentChatId, messageId);
            
            // 检查是否删除了所有消息
            const remainingMessages = document.querySelectorAll(".message");
            if (remainingMessages.length === 0) {
                this.uiManager.showWelcomeMessage();
            }
        } catch (error) {
            console.error("Failed to delete message:", error);
            swal("删除消息失败", error.message, "error");
        } finally {
            this.isDeleting = false;
        }
    }

    // 删除所有激活的消息
    deleteActiveMessages() {
        const activeMessages = document.querySelectorAll(".message.active");
        for (let i = activeMessages.length - 1; i >= 0; i--) {
            const message = activeMessages[i];
            this.deleteMessage(message.dataset.messageId, true);
        }
    }

    // 删除所有非激活的消息
    deleteInactiveMessages() {
        const inactiveMessages = document.querySelectorAll(".message:not(.active)");
        for (let i = inactiveMessages.length - 1; i >= 0; i--) {
            const message = inactiveMessages[i];
            this.deleteMessage(message.dataset.messageId, true);
        }
    }

    // 删除所有消息
    deleteAllMessages() {
        const allMessages = document.querySelectorAll(".message");
        for (let i = allMessages.length - 1; i >= 0; i--) {
            const message = allMessages[i];
            this.deleteMessage(message.dataset.messageId, true);
        }
    }

    // 加载更多消息
    loadMoreMessages() {
        if (this.isDeleting) {
            return;
        }

        const messagesContainer = document.querySelector("#messages");
        const savedMessages = this.uiManager.storageManager.getMessages(this.uiManager.currentChatId);
        const currentMessagesCount = messagesContainer.children.length;
        const messageLimit = this.uiManager.messageLimit;
        const startingIndex = savedMessages.length - currentMessagesCount - messageLimit > 0 ? 
            savedMessages.length - currentMessagesCount - messageLimit : 0;
        
        // 记录当前滚动位置
        const currentScrollPosition = messagesContainer.scrollHeight - messagesContainer.scrollTop;

        // 获取当前消息ID列表
        const currentMessageIds = Array.from(messagesContainer.children).map(message => message.dataset.messageId);

        // 加载更多消息
        savedMessages.slice(startingIndex, savedMessages.length - currentMessagesCount)
            .reverse()
            .forEach(message => {
            // 检查消息是否已存在
                if (!currentMessageIds.includes(message.messageId)) {
                    let isActive = message.isActive || false;
                    this.addMessage(message.role, message.content, message.messageId, isActive, "top", false, message.attachmentUrls);
                }
            });

        // 恢复滚动位置
        messagesContainer.scrollTop = messagesContainer.scrollHeight - currentScrollPosition;
    }

    // Load messages for a specific chat
    async loadMessages(chatId) {
        const savedMessages = this.uiManager.storageManager.getMessages(chatId);
        const messagesContainer = document.querySelector("#messages");
        
        // Clear existing messages
        messagesContainer.innerHTML = "";

        // Load the most recent messages up to the limit
        const startIndex = Math.max(0, savedMessages.length - this.uiManager.messageLimit);
        savedMessages.slice(startIndex)
            .forEach(message => {
                let isActive = message.isActive || false;
                this.addMessage(
                    message.role,
                    message.content,
                    message.messageId,
                    isActive,
                    "bottom",
                    false,
                    message.attachmentUrls
                );
            });

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // 切换消息折叠状态
    toggleCollapseMessage(messageElement, forceCollapse) {
        this.uiHandler.toggleCollapseMessage(messageElement, forceCollapse);
    }
}

export default MessageManager;