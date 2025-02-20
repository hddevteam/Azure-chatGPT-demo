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
    // console.log("syncItem in worker: ", syncItem);
  
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
    const { data, action, token } = syncItem; // 确保从syncItem中提取token
    switch (action) {
    case "upsert":
        // console.log("syncChatHistory upsert in worker: ", data);
        response = await createOrUpdateCloudChatHistory(data, token); // 将token传递给API函数
        break;
    case "delete":
        // console.log("syncChatHistory delete in worker: ", data);
        await deleteCloudChatHistory(data.id, token); // 将token传递给API函数
        response = { deleted: true };
        break;
    }

    // console.log("syncChatHistory Response in worker: ", response);
    // console.log("syncItem in worker: ", syncItem);
    // 发送成功同步的res以及更新localStorage中的timestamp
    self.postMessage({ action: "synced", payload: syncItem, res: response });
}


// syncWorker.js
async function syncMessage(syncItem) {
    // console.log("syncMessage in worker: ", syncItem);
    let response;
    const { data, action, token } = syncItem; // 确保从syncItem中提取token
    switch (action) {
    case "create":
        // console.log("syncMessage create in worker: ", data);
        response = await createCloudMessage(data.message, data.chatId, token); // 将token传递给API函数
        break;
    case "update":
        // console.log("syncMessage update in worker: ", data);
        response = await updateCloudMessage(data.message, data.chatId, data.message.messageId, token); // 将token传递给API函数
        break;
    case "delete":
        // console.log("syncMessage delete in worker: ", data);
        await deleteCloudMessage(data.chatId, data.messageId, token); // 将token传递给API函数
        response = { deleted: true };
        break;
    }

    // console.log("syncMessage Response in worker: ", response);
    // console.log("syncItem in worker: ", syncItem);
    // 如果有响应，意味着同步操作成功
    self.postMessage({ action: "synced", payload: syncItem, res: response });
}



  