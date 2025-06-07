// /public/workers/syncWorker.js
import {
    createOrUpdateCloudChatHistory,
    deleteCloudChatHistory,
    createCloudMessage,
    updateCloudMessage,
    deleteCloudMessage
} from "../utils/apiClient.js";

self.addEventListener("message", (event) => {
    const syncItem = event.data;
    
    async function synchronize() {
        try {
            switch(syncItem.type) {
            case "chatHistory":
                await syncChatHistory(syncItem);
                break;
            case "message":
                await syncMessage(syncItem);
                break;
            }
        } catch (error) {
            console.error("Sync error:", error);
            self.postMessage({ action: "failed", payload: syncItem });
        }
    }
  
    synchronize();
});
  
async function syncChatHistory(syncItem) {
    console.log("syncChatHistory in worker: ", syncItem);
    let response;
    const { data, action, token } = syncItem;
    try {
        switch (action) {
        case "upsert":
            response = await createOrUpdateCloudChatHistory(data, token);
            break;
        case "delete":
            await deleteCloudChatHistory(data.id, token);
            response = { deleted: true };
            break;
        }
        self.postMessage({ action: "synced", payload: syncItem, res: response });
    } catch (error) {
        console.error("syncChatHistory error:", error);
        throw error;
    }
}

async function syncMessage(syncItem) {
    console.log("syncMessage in worker: ", syncItem);
    let response;
    const { data, action, token } = syncItem;
    
    try {
        switch (action) {
        case "create":
            response = await createCloudMessage(data.message, data.chatId, token);
            break;
        case "update":
            response = await updateCloudMessage(data.message, data.chatId, data.message.messageId, token);
            break;
        case "delete":
            console.log("Deleting cloud message:", data.chatId, data.messageId);
            await deleteCloudMessage(data.chatId, data.messageId, token);
            response = { deleted: true };
            break;
        }
        
        // Only send sync success message after operation completes successfully
        console.log("Message operation completed successfully:", action);
        self.postMessage({ action: "synced", payload: syncItem, res: response });
    } catch (error) {
        console.error("syncMessage error:", error);
        throw error;
    }
}



