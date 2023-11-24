// /public/workers/syncWorker.js
import {
    createCloudChatHistory,
    updateCloudChatHistory,
    deleteCloudChatHistory,
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
        
            self.postMessage({ action: "synced", payload: syncItem });
        } catch (error) {
            self.postMessage({ action: "failed", payload: syncItem });
        }
    }
  
    synchronize();
});
  
async function syncChatHistory(syncItem) {
    try{
        let response;
        switch (syncItem.action) {
        case "create":
            response = await createCloudChatHistory(syncItem.data);
            break;
        case "update":
            response = await updateCloudChatHistory(syncItem.data);
            break;
        case "update-local":
        // 已在主循环中通过fetchChatHistories处理
            break;
        case "download":
        // 已在主循环中通过fetchChatHistories处理
            break;
        case "delete":
            await deleteCloudChatHistory(syncItem.data.id);
            break;
        }
        if (response) {
            console.log("syncChatHistory Response in worker: ", response);
            console.log("syncItem in worker: ", syncItem);
            // 发送成功同步的res以及更新localStorage中的timestamp
            self.postMessage({ action: "synced", payload: { data: syncItem, res: response } });
        }
    } catch (error) {
        self.postMessage({ action: "failed", payload: syncItem });
        console.error(`Error syncing chat history: ${error}`);
    }
}

async function syncMessage(syncItem){
    console.log("syncMessage", syncItem);
    return;
}

  