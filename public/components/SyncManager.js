// /public/components/SyncManager.js
import { fetchCloudChatHistories, fetchCloudMessages } from "../utils/apiClient.js";
import { getToken } from "../utils/authRedirect.js";
  
class SyncManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.syncQueue = [];
        this.maxRetryAttempts = 3;
        // Use modular Worker in SyncManager class constructor
        this.webWorker = new Worker(new URL("../workers/syncWorker.js", import.meta.url), { type: "module" });
        this.initializeSyncWorker();
        this.isWorkerBusy = false;
        this.cachedToken = null;
    }

    // Get and update Token
    async updateToken() {
        this.cachedToken = await getToken();
        // console.log("Token updated in SyncManager");
    }

    initializeSyncWorker() {
        this.webWorker.onmessage = (event) => {
        // Handle messages from web worker
            // console.log("SyncManager onmessage: ");
            const { action, payload, res} = event.data;
            // console.log("action: ", action);
            // console.log("payload: ", payload);
            // console.log("res: ", res);
            
            switch (action) {
            case "synced":
                this.handleSyncedItem(payload, res);
                break;
            case "failed":
                // If Token is expired, try to update Token and retry sync
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
        
        // For cloudHistories, compare each history with localHistories
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
        // Add create operation to sync queue
        this.enqueueSyncItem({ type: "chatHistory", action: "upsert", data: chatHistory });
    }

    async syncChatHistoryDelete(chatHistoryId) {
        try {
            // First, check if this chat history exists in the cloud by checking for a timestamp
            const localChatHistory = this.uiManager.storageManager.readChatHistory(chatHistoryId);
            console.debug("Deleting chat history, local data:", localChatHistory);
            
            // Create a sync item for cloud deletion
            const syncItem = {
                type: "chatHistory",
                action: "delete",
                data: {
                    id: chatHistoryId
                }
            };

            // First delete from local storage
            this.uiManager.storageManager.deleteChatHistory(chatHistoryId);
            
            // Then sync deletion to cloud
            this.enqueueSyncItem(syncItem);
            
            // Notify UI components about the deletion
            this.uiManager.handleChatHistoryChange("delete", { id: chatHistoryId });
            
        } catch (error) {
            console.error(`Error during chat history deletion (${chatHistoryId}):`, error);
            // If cloud sync fails, still ensure local deletion is complete
            this.uiManager.storageManager.deleteChatHistory(chatHistoryId);
            // And notify UI
            this.uiManager.handleChatHistoryChange("delete", { id: chatHistoryId });
        }
    }


    // /public/components/SyncManager.js

    async syncMessages(chatId) {
        console.log(`Starting message sync for chat: ${chatId}`);
        
        try {
            // Get local messages
            const localMessages = this.uiManager.storageManager.getMessages(chatId);
            
            // Calculate last timestamp for incremental sync
            const lastTimestamp = localMessages.reduce((maxStr, message) => {
                if (!message.timestamp) return maxStr;
                
                const currentTimestamp = new Date(message.timestamp);
                const maxTimestamp = new Date(maxStr);
                
                return currentTimestamp > maxTimestamp ? message.timestamp : maxStr;
            }, "1970-01-01T00:00:00.000Z"); // ISO string representation for new Date(0)
            
            console.log(`Fetching cloud messages since: ${lastTimestamp}`);
            
            // Ensure we have a valid token
            if (!this.cachedToken) {
                await this.updateToken();
            }
            
            // Fetch cloud messages
            const cloudMessages = await fetchCloudMessages(chatId, lastTimestamp, this.cachedToken);
            console.log(`Received ${cloudMessages.length} messages from cloud for ${chatId}`);
            
            // Process cloud messages - handle deletions and updates
            if (cloudMessages && cloudMessages.length > 0) {
                cloudMessages.forEach(cloudMessage => {
                    const localMessage = localMessages.find(lm => lm.messageId === cloudMessage.messageId);
                    
                    if (cloudMessage.isDeleted) {
                        // Handle deleted messages
                        if (localMessage) {
                            console.log(`Removing locally deleted message: ${cloudMessage.messageId}`);
                            this.uiManager.storageManager.deleteMessage(chatId, cloudMessage.messageId);
                        }
                    } else if (localMessage) {
                        // Handle existing messages - compare timestamps
                        const localMessageTimestamp = localMessage.timestamp ? new Date(localMessage.timestamp) : new Date(0);
                        const cloudMessageTimestamp = new Date(cloudMessage.timestamp);
                        
                        if (!localMessage.timestamp || localMessageTimestamp < cloudMessageTimestamp) {
                            // Cloud message is newer - update local
                            console.log(`Updating local message: ${cloudMessage.messageId}`);
                            this.uiManager.storageManager.saveMessage(chatId, cloudMessage);
                        } else if (localMessageTimestamp > cloudMessageTimestamp) {
                            // Local message is newer - update cloud
                            console.log(`Local message is newer, queueing for upload: ${localMessage.messageId}`);
                            this.enqueueSyncItem({ 
                                type: "message", 
                                action: "update", 
                                data: { chatId, message: localMessage } 
                            });
                        }
                    } else {
                        // New message from cloud - add to local storage
                        console.log(`Adding new message from cloud: ${cloudMessage.messageId}`);
                        this.uiManager.storageManager.saveMessage(chatId, cloudMessage);
                    }
                });
            }
            
            // Upload any local messages that don't have timestamps (never synced)
            localMessages.forEach(localMessage => {
                if (!localMessage.timestamp) {
                    console.log(`Queueing unsynced message for upload: ${localMessage.messageId}`);
                    this.enqueueSyncItem({ 
                        type: "message", 
                        action: "create", 
                        data: { 
                            chatId, 
                            message: {
                                ...localMessage,
                                timestamp: new Date().toISOString()
                            }
                        } 
                    });
                }
            });
            
            // Refresh UI with updated message data
            if (this.uiManager && typeof this.uiManager.refreshMessagesUI === "function") {
                await this.uiManager.refreshMessagesUI(chatId);
            } else {
                console.warn("refreshMessagesUI function not available in UIManager");
            }
            
            console.log(`Message synchronization completed for chat ${chatId}`);
        } catch (error) {
            console.error(`Error syncing messages for chat ${chatId}:`, error);
            throw error; // Re-throw to allow caller to handle
        }
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
        // console.log("enqueueSyncItem syncQueue: ", this.syncQueue.length);
        this.processNextSyncItem();
    }
  
    async processNextSyncItem() {
        // console.log("processNextSyncItem syncQueue: ", this.syncQueue.length);
        if (this.isWorkerBusy || !this.syncQueue.length) {
            // console.log ("processNextSyncItem return because isWorkerBusy: ", this.isWorkerBusy, " syncQueue: ", this.syncQueue.length);
            return;
        }
        const nextItem = this.syncQueue.shift();
        await this.updateToken();
        nextItem.token = this.cachedToken;
        // console.log("processNextSyncItem nextItem: ", nextItem);
        // console.log("current syncQueue: ", this.syncQueue);
        this.isWorkerBusy = true;
        this.webWorker.postMessage(nextItem);
    }
  
    async handleSyncedItem(syncedItem, res) {
        console.log("handleSyncedItem", syncedItem, res);
        try {
            const { action, data } = syncedItem;  // Remove unused 'type' destructuring
            const chatId = data.chatId || data.id;
            
            switch (action) {
            case "create":
            case "update":
            case "upsert": // Add support for upsert action
                if (data.messageId) {
                    // Handle message sync
                    // Wait to ensure message exists in local storage
                    const messageExists = await this.uiManager.storageManager.waitForMessage(chatId, data.messageId);
                    if (!messageExists) {
                        console.warn(`Message ${data.messageId} not found after waiting, creating it now`);
                        // If message doesn't exist, create it with search results preserved
                        const savedMessage = this.uiManager.storageManager.saveMessage(chatId, {
                            ...data,
                            timestamp: data.timestamp || new Date().toISOString(),
                            searchResults: data.searchResults || null
                        });
                        console.log("Created missing message:", savedMessage);
                    } else {
                        // Message exists, update timestamp and search results
                        const messageToUpdate = this.uiManager.storageManager.getMessage(chatId, data.messageId);
                        if (messageToUpdate) {
                            messageToUpdate.timestamp = data.timestamp || new Date().toISOString();
                            messageToUpdate.searchResults = data.searchResults || messageToUpdate.searchResults;
                            this.uiManager.storageManager.saveMessage(chatId, messageToUpdate);
                        }
                    }

                    // Refresh UI if this is the current chat
                    if (chatId === this.uiManager.currentChatId) {
                        const messageElement = document.querySelector(`[data-message-id="${data.messageId}"]`);
                        if (messageElement) {
                            // Remove and re-add message to refresh search results
                            messageElement.remove();
                            this.uiManager.messageManager.addMessage(
                                data.role,
                                data.content,
                                data.messageId,
                                data.isActive,
                                "bottom",
                                false,
                                data.attachmentUrls || ""
                            );
                        }
                    }
                } else {
                    // Handle chat history sync
                    if (res && res.timestamp) {
                        await this.uiManager.storageManager.updateChatHistoryTimestamp(chatId, res.timestamp);
                    }
                    if (action !== "create") {
                        // Only update UI for update/upsert actions
                        this.uiManager.handleChatHistoryChange(action, data);
                    }
                }
                break;

            case "delete":
                if (data.messageId) {
                    await this.uiManager.storageManager.deleteMessage(chatId, data.messageId);
                } else {
                    await this.uiManager.storageManager.deleteChatHistory(chatId);
                    this.uiManager.handleChatHistoryChange(action, { id: chatId });
                }
                break;

            default:
                console.warn("Unknown sync action:", action);
            }

        } catch (error) {
            console.error("Error handling synced item:", error);
        }
    }

    syncMessageCreate(chatId, message) {
        if (!this.webWorker) return;
        
        // Ensure message exists locally before syncing
        const savedMessage = this.uiManager.storageManager.getMessage(chatId, message.messageId);
        if (!savedMessage) {
            console.debug(`Message ${message.messageId} not found in local storage, saving first`);
            this.uiManager.storageManager.saveMessage(chatId, message);
        }
        
        const syncItem = {
            type: "message",
            action: "create",
            data: {
                chatId,
                message: {
                    ...message,
                    searchResults: message.searchResults || null,
                    timestamp: message.timestamp || new Date().toISOString()
                }
            }
        };
        
        this.enqueueSyncItem(syncItem);
    }

    syncMessageUpdate(chatId, message) {
        if (!this.webWorker) return;
        
        // Ensure search results are included in sync data
        const syncItem = {
            action: "update",
            chatId,
            data: {
                ...message,
                searchResults: message.searchResults || null,
                timestamp: message.timestamp || new Date().toISOString()
            }
        };
        
        // Add delay to ensure local storage is completed
        setTimeout(() => {
            this.webWorker.postMessage(syncItem);
        }, 100);
    }

    async syncMessageDelete(chatId, messageId) {
        if (!this.webWorker) return;
        
        const syncItem = {
            type: "message",
            action: "delete",
            data: {
                chatId,
                messageId
            }
        };

        // Regardless of result, delete local message first to maintain consistency
        console.log(`Deleting message ${messageId} from local storage`);
        this.uiManager.storageManager.deleteMessage(chatId, messageId);
        
        try {
            // Try to delete message in cloud
            await new Promise((resolve, reject) => {
                const handleWorkerMessage = (event) => {
                    const { action, payload } = event.data;
                    if (payload && payload.data && payload.data.messageId === messageId) {
                        if (action === "synced") {
                            this.webWorker.removeEventListener("message", handleWorkerMessage);
                            console.log(`Message ${messageId} successfully deleted from cloud`);
                            resolve();
                        } else if (action === "failed") {
                            this.webWorker.removeEventListener("message", handleWorkerMessage);
                            console.warn(`Failed to delete message ${messageId} from cloud`);
                            reject(new Error("Failed to delete message in cloud"));
                        }
                    }
                };
                
                this.webWorker.addEventListener("message", handleWorkerMessage);
                this.enqueueSyncItem(syncItem);
            });
            
            return true; // Successfully deleted
        } catch (error) {
            console.error(`Error during cloud message deletion (${messageId}):`, error);
            // Even if cloud deletion fails, local deletion is completed, so no exception is thrown
            return false;
        }
    }
  
   
}
  
export default SyncManager;