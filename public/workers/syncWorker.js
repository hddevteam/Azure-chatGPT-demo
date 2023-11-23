// /public/workers/syncWorker.js
import {
    createCloudChatHistory,
    updateCloudChatHistory,
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
    let response;
    switch (syncItem.action) {
    case "create":
        response = await createCloudChatHistory(syncItem.data);
        break;
    case "update":
        response = await updateCloudChatHistory(syncItem.data, syncItem.data.username, syncItem.data.id);
        break;
    case "update-local":
        // 无需更新操作，仅下载最新记录
        self.postMessage({ action: "update-local", payload: syncItem.data });
        break;
    case "download":
        // 已在主循环中通过fetchChatHistories处理
        break;
    }
    if (response) {
        // 发送成功同步的res以及更新localStorage中的timestamp
        self.postMessage({ action: "synced", payload: { data: syncItem.data, res: response } });
    }
}

async function syncMessage(syncItem){
    console.log("syncMessage", syncItem);
    return;
}

  