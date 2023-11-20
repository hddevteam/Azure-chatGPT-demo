// public/components/CloudStorageManager.js
import * as api from "../utils/api.js";

class CloudStorageManager {
    constructor() {
        // 可以持有必要的配置，例如API的base URL等
    }
    
    async syncChatHistories(username) {
        console.log("Syncing chat histories for user", username);
        try {
            const localChatHistoryKey = `chatHistory_${username}`;
            let localChatHistories = JSON.parse(localStorage.getItem(localChatHistoryKey)) || [];
        
            // Fetch cloud chat histories
            const cloudChatHistoriesResponse = await api.fetchCloudChatHistories(username);
            const cloudChatHistories = cloudChatHistoriesResponse.data || [];
            // Sync deletions first
            console.log("Syncing deletions");
            localChatHistories = localChatHistories.filter(localHistory => {
                const cloudHistory = cloudChatHistories.find(hist => hist.id === localHistory.id);
                if (cloudHistory && cloudHistory.isDeleted) {
                    // Remove messages for deleted chat history from local storage
                    localStorage.removeItem(localHistory.id);
                    return false; // Remove the chat history from local storage as well
                }
                return true;
            });
            console.log("Local chat histories after deletions:", localChatHistories);
            console.log("Syncing creations and updates");
            for (let localHistory of localChatHistories) {
                const cloudHistory = cloudChatHistories.find(hist => hist.id === localHistory.id);
                const isLocalNewer = cloudHistory && new Date(localHistory.updatedAt) > new Date(cloudHistory.updatedAt);
                if (!cloudHistory || (isLocalNewer && !cloudHistory.isDeleted)) {
                    // If the local history is newer, push it to the cloud
                    await api.createCloudChatHistory(localHistory);  // This API call needs to handle both create or update
                    const messages = JSON.parse(localStorage.getItem(localHistory.id)) || [];
                    for (let message of messages) {
                        await api.createCloudMessage(message, localHistory.id);  // this API should handle upserting based on existence of message id
                    }
                }
            }

            // Sync all valid cloud histories to local storage
            console.log("Syncing local storage for chat histories");
            localStorage.setItem(localChatHistoryKey, JSON.stringify(cloudChatHistories.filter(hist => !hist.isDeleted)));

            // // Refresh messages for each valid cloud history
            // console.log("Syncing local storage for messages");
            // for (let cloudHistory of cloudChatHistories.filter(hist => !hist.isDeleted)) {
            //     const messages = await api.fetchCloudMessages(cloudHistory.id);
            //     localStorage.setItem(cloudHistory.id, JSON.stringify(messages));
            // }

        } catch (error) {
            console.error("Error syncing chat histories:", error);
            // Additional error handling can be added here
        }
    }

    async syncMessages(chatId, localUpdatedAt) {
        try {
            console.log("Syncing messages for chat", chatId);
            const cloudChatHistory = await api.fetchCloudChatHistories(chatId);

            
            
            // Check if the cloud chat history has been updated since the last sync
            if (new Date(cloudChatHistory.updatedAt) > new Date(localUpdatedAt)) {
                // Proceed with syncing messages because there is an update
                const cloudMessages = await api.fetchCloudMessages(chatId);

                // Sort messages by sequenceNumber for consistency
                cloudMessages.sort((a, b) => a.sequenceNumber - b.sequenceNumber);

                // Sync local storage with the latest version of messages
                localStorage.setItem(chatId, JSON.stringify(cloudMessages));
            }
            console.log("Syncing messages complete");
        } catch (error) {
            console.error("Error syncing messages:", error);
            // Additional error handling can be added here
        }
    }
    
}

export default CloudStorageManager;
