// MessageContextManager.js
// 负责管理聊天消息的上下文，确保在页面刷新后能够正确恢复

class MessageContextManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
    }

    /**
     * 初始化聊天上下文，包括设置系统提示和恢复活跃消息
     * @param {Object} profile - 包含系统提示的配置文件
     * @param {Array} messages - 消息数组
     */
    initializeContext(profile, messages) {
        // 清除现有提示
        this.uiManager.app.prompts.clear();

        // 设置系统提示
        if (profile?.prompt) {
            this.uiManager.app.prompts.setSystemPrompt(profile.prompt);
        }

        // 恢复活跃消息
        if (messages && messages.length > 0) {
            this.restoreActiveMessages(messages);
        }
    }

    /**
     * 恢复活跃消息到上下文
     * @param {Array} messages - 消息数组
     */
    restoreActiveMessages(messages) {
        // 先按时间顺序排序消息
        const sortedMessages = [...messages].sort((a, b) => {
            const aTime = new Date(a.createdAt || a.timestamp || 0);
            const bTime = new Date(b.createdAt || b.timestamp || 0);
            return aTime - bTime;
        });

        // 将活跃消息添加到提示上下文
        sortedMessages.forEach(message => {
            if (message.isActive) {
                // 构建完整的消息对象，确保包含搜索结果
                const promptMessage = {
                    role: message.role,
                    content: message.content,
                    messageId: message.messageId,
                    attachmentUrls: message.attachmentUrls || "",
                    searchResults: message.searchResults || null
                };
                
                this.uiManager.app.prompts.addPrompt(promptMessage);
            }
        });

        console.log("Restored active messages to context:", 
            this.uiManager.app.prompts.length, 
            "messages");
    }

    /**
     * 添加消息到上下文
     * @param {Object} message - 消息对象
     */
    addMessageToContext(message) {
        if (message.isActive) {
            this.uiManager.app.prompts.addPrompt(message);
        }
    }

    /**
     * 从上下文移除消息
     * @param {String} messageId - 消息ID
     */
    removeMessageFromContext(messageId) {
        this.uiManager.app.prompts.removePrompt(messageId);
    }

    /**
     * 更新消息在上下文中的状态
     * @param {String} messageId - 消息ID
     * @param {Boolean} isActive - 是否活跃
     * @param {Object} message - 消息对象（可选）
     */
    updateMessageActiveState(messageId, isActive, message = null) {
        if (isActive) {
            // 如果消息变为活跃，需要添加到上下文
            if (message) {
                this.addMessageToContext(message);
            } else {
                // 从存储中获取消息
                const storedMessage = this.uiManager.storageManager.getMessage(
                    this.uiManager.currentChatId, messageId);
                if (storedMessage) {
                    this.addMessageToContext(storedMessage);
                }
            }
        } else {
            // 如果消息变为非活跃，从上下文中移除
            this.removeMessageFromContext(messageId);
        }
    }

    /**
     * 获取当前上下文中的活跃消息数量
     */
    getActiveMessagesCount() {
        return this.uiManager.app.prompts.length;
    }

    /**
     * 打印当前上下文状态（用于调试）
     */
    logCurrentContext() {
        console.log("Current context:", this.uiManager.app.prompts);
    }
}

export default MessageContextManager;