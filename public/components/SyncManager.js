// /public/components/SyncManager.js
import { fetchCloudChatHistories } from "../utils/api.js";
  
class SyncManager {
    constructor(storageManager) {
        this.storageManager = storageManager;
        this.syncQueue = [];
        this.isSyncing = false;
        this.maxRetryAttempts = 3;
        // 在SyncManager类的构造器中使用模块化Worker
        this.webWorker = new Worker(new URL("../workers/syncWorker.js", import.meta.url), { type: "module" });
        this.initializeSyncWorker();
    }

    initializeSyncWorker() {
        this.webWorker.onmessage = (event) => {
        // Handle messages from web worker
            console.log("event: ", event);
            const { action, payload } = event.data;
            console.log("action: ", action);
  
            switch (action) {
            case "synced":
                this.handleSyncedItem(payload);
                break;
            case "update-local":
                // 处理来自服务器的最新数据
                this.storageManager.updateChatHistory(payload);
                break;
            case "failed":
                this.enqueueSyncItem(payload, true); // re-enqueue with retry incremented
                break;
            }
  
            // Process next item in the queue
            this.processNextSyncItem();
        };
    }

    async syncChatHistories() {
        const username = this.storageManager.getCurrentUsername();
        const localHistories = await this.storageManager.getChatHistory(username);
    
        const cloudHistories = await fetchCloudChatHistories(username).catch(e => console.error(e));
        
        // 对于cloudHistories，将每个history与localHistories进行比较
        cloudHistories.forEach(cloudHistory => {
            const localHistory = localHistories.find(lh => lh.id === cloudHistory.id);
            console.log("cloudHistory: ", cloudHistory);
            console.log("localHistory: ", localHistory);
            if (cloudHistory.isDeleted) {
                // If it's marked as deleted, remove it from Local Storage
                if (localHistory) {
                    console.log("deleteLocalChatHistory: ", localHistory.id);
                    this.storageManager.deleteChatHistory(cloudHistory.id);
                    this.storageManager.removeMessagesByChatId(cloudHistory.id);
                }
            } else if (localHistory) {
                // Check if localHistory has a timestamp
                if (!localHistory.timestamp) {
                    // If there's no timestamp field, update the local chat history with the cloud version
                    this.storageManager.updateChatHistory(cloudHistory);
                } else {
                    // Compare and take action based on the newer timestamp
                    const localTimestamp = new Date(localHistory.timestamp);
                    const cloudTimestamp = new Date(cloudHistory.timestamp);
            
                    if (localTimestamp > cloudTimestamp) {
                        this.enqueueSyncItem({ type: "chatHistory", action: "update", data: localHistory });
                    } else if (localTimestamp < cloudTimestamp) {
                        this.storageManager.updateChatHistory(cloudHistory);
                    }
                }
            } else {
                // If there's no local history and it's not marked as deleted, download the cloud chat history to local
                this.storageManager.createChatHistory(cloudHistory);
            }                       
        });

        // 遍历本地历史，如果在云端不存在，则上传
        localHistories.forEach(localHistory => {
            if(!cloudHistories.find(ch => ch.id === localHistory.id)) {
                this.enqueueSyncItem({ type: "chatHistory", action: "create", data: localHistory });
            }
        });
    }

    syncChatHistoryCreate(newChatHistory) {
        // 将创建操作添加到同步队列
        this.enqueueSyncItem({ type: "chatHistory", action: "create", data: newChatHistory });
    }


    syncChatHistoryDelete(chatHistoryId) {
        // 将删除操作添加到同步队列
        this.enqueueSyncItem({ type: "chatHistory", action: "delete", data: { id: chatHistoryId } });
    }

    syncChatHistoryUpdate(updatedChatHistory) {
        // 将更新操作添加到同步队列
        this.enqueueSyncItem({ type: "chatHistory", action: "update", data: updatedChatHistory });
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
        console.log("syncQueue: ", this.syncQueue.length);
        if (!this.isSyncing) {
            this.processNextSyncItem();
        }
    }
  
    processNextSyncItem() {
        console.log("syncQueue: ", this.syncQueue.length);
        if (this.syncQueue.length === 0) {
            this.isSyncing = false;
            return;
        }
        this.isSyncing = true;
        const nextItem = this.syncQueue.shift();
        this.webWorker.postMessage(nextItem);
    }
  
    handleSyncedItem(syncedItem) {
        console.log("handleSyncedItem: ", syncedItem);
        if (syncedItem.data.type === "chatHistory") {
            console.log("syncedItem: ", syncedItem);
            // 更新LocalStorage中的timestamp
            this.storageManager.updateChatHistoryTimestamp(syncedItem.res.id, syncedItem.res.timestamp);
        } else if (syncedItem.data.type === "message") {
            // 消息类型的处理逻辑
            // this.storageManager.updateMessageTimestamp(syncedItem.data.id, syncedItem.res.timestamp);
        }
    }
  
   
}
  
export default SyncManager;