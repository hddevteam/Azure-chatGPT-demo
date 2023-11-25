// /public/workers/syncWorker.js
import {
    createCloudChatHistory,
    updateCloudChatHistory,
    deleteCloudChatHistory,
    createCloudMessage,
    updateCloudMessage,
    deleteCloudMessage
} from "../utils/api.js";

self.addEventListener("message", (event) => {
    const syncItem = event.data;
  
    // Perform synchronization based on the type of sync item
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
            self.postMessage({ action: "failed", payload: syncItem });
        }
    }
  
    synchronize();
});
  
async function syncChatHistory(syncItem) {
    console.log("syncChatHistory in worker: ", syncItem);
    let response;
    switch (syncItem.action) {
    case "create":
        response = await createCloudChatHistory(syncItem.data);
        break;
    case "update":
        console.log("syncChatHistory update in worker: ", syncItem.data);
        response = await updateCloudChatHistory(syncItem.data);
        break;
    case "delete":
        await deleteCloudChatHistory(syncItem.data.id);
        break;
    }
    if (response) {
        console.log("syncChatHistory Response in worker: ", response);
        console.log("syncItem in worker: ", syncItem);
        // 发送成功同步的res以及更新localStorage中的timestamp
        self.postMessage({ action: "synced", payload: syncItem, res: response });
    }

}

// syncWorker.js
async function syncMessage(syncItem){
    
    let response;
    switch(syncItem.action) {
    case "create":
        response = await createCloudMessage(syncItem.data.message, syncItem.data.chatId);
        break;
    case "update":
        response = await updateCloudMessage(syncItem.data.message, syncItem.data.chatId, syncItem.data.message.messageId);
        break;
    case "delete":
        await deleteCloudMessage(syncItem.data.chatId, syncItem.data.messageId);
        break;
    }
    if(response) {
        // If there's a response, it means the sync action succeeded
        self.postMessage({ action: "synced", payload: syncItem, res: response });
    }

}


  