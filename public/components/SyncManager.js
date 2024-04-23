// /public/components/SyncManager.js
import { fetchCloudChatHistories, fetchCloudMessages } from "../utils/api.js";
import { getToken } from "../utils/authRedirect.js";
  
class SyncManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.syncQueue = [];
        this.maxRetryAttempts = 3;
        // 在SyncManager类的构造器中使用模块化Worker
        this.webWorker = new Worker(new URL("../workers/syncWorker.js", import.meta.url), { type: "module" });
        this.initializeSyncWorker();
        this.isWorkerBusy = false;
        this.cachedToken = null;
    }

    // 获取并更新Token
    async updateToken() {
        this.cachedToken = await getToken();
        console.log("Token updated in SyncManager");
    }

    initializeSyncWorker() {
        this.webWorker.onmessage = (event) => {
        // Handle messages from web worker
            console.log("SyncManager onmessage: ");
            const { action, payload, res} = event.data;
            console.log("action: ", action);
            console.log("payload: ", payload);
            console.log("res: ", res);
            
            switch (action) {
            case "synced":
                this.handleSyncedItem(payload, res);
                break;
            case "failed":
                // 如果Token过期，尝试更新Token并重新尝试同步
                this.enqueueSyncItem(payload, true); // re-enqueue with retry incremented
                break;
            }
  
            // Process next item in the queue
            this.isWorkerBusy = false;
            this.processNextSyncItem();
        };
    }

    async syncChatHistories() {
        console.log("syncChatHistories");
        const username = this.uiManager.storageManager.getCurrentUsername();
        const localHistories = await this.uiManager.storageManager.getChatHistory(username);
        // get max timestamp from localHistories
        const lastTimestamp = localHistories.reduce((maxStr, history) => {
            const currentTimestamp = new Date(history.timestamp);
            const maxTimestamp = new Date(maxStr);
            
            return currentTimestamp > maxTimestamp ? history.timestamp : maxStr;
        }, "1970-01-01T00:00:00.000Z"); // ISO string representation for new Date(0)
        console.log("lastTimestamp: ", lastTimestamp);
        await this.updateToken();
        const cloudHistories = await fetchCloudChatHistories(username, lastTimestamp, this.cachedToken).catch(e => console.error(e));
        console.log("syncChatHistories: ", {localHistories}, {cloudHistories});
        
        // 对于cloudHistories，将每个history与localHistories进行比较
        cloudHistories.forEach(cloudHistory => {
            const localHistory = localHistories.find(lh => lh.id === cloudHistory.id);
            if (cloudHistory.isDeleted) {
                // If it's marked as deleted, remove it from Local Storage
                if (localHistory) {
                    console.log("deleteLocalChatHistory: ", localHistory.id);
                    this.uiManager.storageManager.deleteChatHistory(cloudHistory.id);
                }
            } else if (localHistory) {
                // Check if localHistory has a timestamp
                if (!localHistory.timestamp) {
                    // If there's no timestamp field, update the local chat history with the cloud version
                    this.uiManager.storageManager.updateChatHistory(cloudHistory);
                } else {
                    // Compare and take action based on the newer timestamp
                    const localTimestamp = new Date(localHistory.timestamp);
                    const cloudTimestamp = new Date(cloudHistory.timestamp);
            
                    if (localTimestamp > cloudTimestamp) {
                        this.enqueueSyncItem({ type: "chatHistory", action: "upsert", data: localHistory });
                    } else if (localTimestamp < cloudTimestamp) {
                        this.uiManager.storageManager.updateChatHistory(cloudHistory);
                    }
                }
            } else {
                // If there's no local history and it's not marked as deleted, download the cloud chat history to local
                this.uiManager.storageManager.createChatHistory(cloudHistory);
            }                       
        });

        // find the localHistory do not have .timestamp property
        localHistories.forEach(localHistory => {
            if (!localHistory.timestamp) {
                this.enqueueSyncItem({ type: "chatHistory", action: "upsert", data: localHistory });
            }
        });

        await this.uiManager.refreshChatHistoryUI();
        this.uiManager.storageManager.cleanUpUserChatHistories(username);
    }

    syncChatHistoryCreateOrUpdate(chatHistory) {
        // 将创建操作添加到同步队列
        this.enqueueSyncItem({ type: "chatHistory", action: "upsert", data: chatHistory });
    }

    syncChatHistoryDelete(chatHistoryId) {
        // 将删除操作添加到同步队列
        this.enqueueSyncItem({ type: "chatHistory", action: "delete", data: { id: chatHistoryId } });
    }


    // /public/components/SyncManager.js

    async syncMessages(chatId) {
        console.log("syncMessages: ", chatId);
        const localMessages = this.uiManager.storageManager.getMessages(chatId);
        const lastTimestamp = localMessages.reduce((maxStr, message) => {
            const currentTimestamp = new Date(message.timestamp);
            const maxTimestamp = new Date(maxStr);
            
            return currentTimestamp > maxTimestamp ? message.timestamp : maxStr;
        }, "1970-01-01T00:00:00.000Z"); // ISO string representation for new Date(0)
        console.log("lastTimestamp: ", lastTimestamp);

        const cloudMessages = await fetchCloudMessages(chatId, lastTimestamp, this.cachedToken).catch(e => console.error(e));
        console.log("syncMessages: ", {localMessages}, {cloudMessages});

        cloudMessages.forEach(cloudMessage => {
            const localMessage = localMessages.find(lm => lm.messageId === cloudMessage.messageId);
            if (cloudMessage.isDeleted) {
                // 如果云端消息标记为删除，删除本地消息
                if (localMessage) {
                    this.uiManager.storageManager.deleteMessage(chatId, cloudMessage.messageId);
                }
            } else if (localMessage) {
            // 比较时间戳，以确定是否需要更新本地消息
                const localMessageTimestamp = new Date(localMessage.timestamp);
                const cloudMessageTimestamp = new Date(cloudMessage.timestamp);

                if (!localMessage.timestamp || localMessageTimestamp < cloudMessageTimestamp) {
                // 如果本地消息较旧或不存在时间戳，使用云端消息更新本地存储
                    this.uiManager.storageManager.saveMessage(chatId, cloudMessage);
                } else if (localMessageTimestamp > cloudMessageTimestamp) {
                // 如果本地消息较新，上传更新到云端
                    this.enqueueSyncItem({ type: "message", action: "update", data: { chatId, message: localMessage } });
                }
            } else {
                this.uiManager.storageManager.saveMessage(chatId, cloudMessage);
            }
        });

        // 遍历本地消息，如果在云端不存在，则上传
        localMessages.forEach(localMessage => {
            if (!localMessage.timestamp) {
                this.enqueueSyncItem({ type: "message", action: "create", data: { chatId, message: localMessage } });
            }
        });

        this.uiManager.refreshMessagesUI(chatId);
    }

    syncMessageCreate(chatId, newMessage) {
        this.enqueueSyncItem({ type: "message", action: "create", data: { chatId, message: newMessage } });
    }

    syncMessageUpdate(chatId, updatedMessage) {
        this.enqueueSyncItem({ type: "message", action: "update", data: { chatId, message: updatedMessage } });
    }

    syncMessageDelete(chatId, messageId) {
        this.enqueueSyncItem({ type: "message", action: "delete", data: { chatId, messageId } });
    }


  
    enqueueSyncItem(syncItem, retry = false) {
        if (retry) {
            syncItem.retryCount = (syncItem.retryCount || 0) + 1;
            if (syncItem.retryCount >= this.maxRetryAttempts) {
                // Handle max retries exceeded, maybe notify user or log
                return;
            }
        } 

        this.syncQueue.push(syncItem);
        console.log("enqueueSyncItem syncQueue: ", this.syncQueue.length);
        this.processNextSyncItem();
    }
  
    async processNextSyncItem() {
        console.log("processNextSyncItem syncQueue: ", this.syncQueue.length);
        if (this.isWorkerBusy || !this.syncQueue.length) {
            console.log ("processNextSyncItem return because isWorkerBusy: ", this.isWorkerBusy, " syncQueue: ", this.syncQueue.length);
            return;
        }
        const nextItem = this.syncQueue.shift();
        await this.updateToken();
        nextItem.token = this.cachedToken;
        console.log("processNextSyncItem nextItem: ", nextItem);
        console.log("current syncQueue: ", this.syncQueue);
        this.isWorkerBusy = true;
        this.webWorker.postMessage(nextItem);
    }
  
    handleSyncedItem(syncedItem, res) {
        console.log("handleSyncedItem: ", syncedItem, res);
        if (syncedItem && ["create", "update"].includes(syncedItem.action) && res && syncedItem.type === "chatHistory") {
            console.log("syncedItem: ", syncedItem);
            // 更新LocalStorage中的timestamp
            this.uiManager.storageManager.updateChatHistoryTimestamp(res.id, res.timestamp);
        } else if (syncedItem && ["create", "update"].includes(syncedItem.action) && res && syncedItem.type === "message") {
            console.log("syncedItem: ", syncedItem);
            // 更新LocalStorage中的timestamp
            this.uiManager.storageManager.updateMessageTimestamp(syncedItem.data.chatId, res.rowKey, res.timestamp);
        }
    }
  
   
}
  
export default SyncManager;