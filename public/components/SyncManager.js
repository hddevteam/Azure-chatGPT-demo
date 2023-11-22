// /public/components/SyncManager.js
import { fetchCloudChatHistories } from "../utils/api.js";
  
class SyncManager {
    constructor(storageManager) {
        this.storageManager = storageManager;
        this.syncQueue = [];
        this.isSyncing = false;
        this.maxRetryAttempts = 3;
        this.webWorker = new Worker("../workers/syncWorker.js");
        this.initializeSyncWorker();
    }

    initializeSyncWorker() {
        this.webWorker.onmessage = (event) => {
        // Handle messages from web worker
            const { action, payload } = event.data;
  
            switch (action) {
            case "synced":
                this.handleSyncedItem(payload);
                break;
            case "update-local":
                // 处理来自服务器的最新数据
                this.storageManager.updateLocalChatHistory(payload);
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
            if(cloudHistory.isDeleted) {
                // 如果是被标记为删除的，从LocalStorage中移除
                if(localHistory) {
                    this.storageManager.deleteLocalChatHistory(cloudHistory.id); 
                    this.storageManager.removeMessagesByChatId(cloudHistory.id);
                }
            } else if(localHistory) {
                if (new Date(localHistory.timestamp) > new Date(cloudHistory.timestamp)) {
                    this.enqueueSyncItem({ type: "chatHistory", action: "update", data: localHistory });
                } else if (new Date(localHistory.timestamp) < new Date(cloudHistory.timestamp)) {
                    this.enqueueSyncItem({ type: "chatHistory", action: "update-local", data: cloudHistory });
                }
            } else {
                // 如果本地没有，且没有被标记为删除，则将云端的聊天历史下载到本地
                this.storageManager.insertLocalChatHistory(cloudHistory);
                
            }
        });

        // 遍历本地历史，如果在云端不存在，则上传
        localHistories.forEach(localHistory => {
            if(!cloudHistories.find(ch => ch.id === localHistory.id)) {
                this.enqueueSyncItem({ type: "chatHistory", action: "create", data: localHistory });
            }
        });
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
      
        if (!this.isSyncing) {
            this.processNextSyncItem();
        }
    }
  
    processNextSyncItem() {
        if (this.syncQueue.length === 0) {
            this.isSyncing = false;
            return;
        }
  
        this.isSyncing = true;
        const nextItem = this.syncQueue.shift();
  
        this.webWorker.postMessage(nextItem);
    }
  
    handleSyncedItem(syncedItem) {
        if (syncedItem.data.type === "chatHistory") {
            // 更新LocalStorage中的timestamp
            this.storageManager.updateChatHistoryTimestamp(syncedItem.data.id, syncedItem.res.timestamp);
        } else if (syncedItem.data.type === "message") {
            // 消息类型的处理逻辑
            // this.storageManager.updateMessageTimestamp(syncedItem.data.id, syncedItem.res.timestamp);
        }
    }
  
   
}
  
export default SyncManager;