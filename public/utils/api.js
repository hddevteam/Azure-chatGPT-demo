// public/api.js
// purpose: client-side code to make requests to the server side api.

import axios from "axios";
import swal from "sweetalert";


axios.defaults.baseURL = "/api";
axios.defaults.headers.post["Content-Type"] = "application/json";
axios.defaults.headers.put["Content-Type"] = "application/json";

export async function uploadAttachment(fileContent, fileName) {
    try {
        const formData = new FormData();
        formData.append("fileContent", fileContent);
        formData.append("originalFileName", fileName);

        // 注意：移除axios默认的Content-Type头部，让浏览器自动设置，便于正确处理边界
        const response = await axios.post("/attachments/upload", formData, {
            headers: {
                "Content-Type": undefined
            }
        });
        console.log(response.data);
        return response.data; // 返回后端响应中的附件信息
    } catch (error) {
        console.error("Failed to upload attachment:", error);
        throw error;
    }
}


// get app name
export async function getAppName() {
    const response = await fetch("/api/app_name");
    return await response.text();
}

// get prompt repo by username
export async function getPromptRepo(username) {
    const response = await fetch(`/api/prompt_repo?username=${username}`);
    return await response.json();
}

// text to image
export async function textToImage(caption) {
    const response = await fetch("/api/text-to-image", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ caption }),
    });

    if (!response.ok) {
        throw new Error("获取图像时出错，请稍后重试");
    }

    return await response.json();
}

//get gpt response
export async function getGpt(promptText, model) {
    try {
        const response = await axios.post("/gpt", {
            prompt: promptText,
            model: model
        });
        return response.data; // Axios automatically handles the response as JSON
    } catch (error) {
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            let errMsg = error.response.data.error ? error.response.data.error.message : "Error generating response.";
            throw new Error(`Error ${error.response.status}: ${errMsg}`);
        } else if (error.request) {
            // The request was made but no response was received
            throw new Error("The server did not respond. Please try again later.");
        } else {
            // Something happened in setting up the request that triggered an Error
            throw new Error(error.message);
        }
    }
}




// get tts response
export async function getTts(message) {
    const url = "/api/tts";
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
    });
    return await response.blob();
}

// get stt response
export async function getStt(audioBlob) {
    const formData = new FormData();
    formData.append("file", audioBlob);
    const response = await fetch("/api/auto-speech-to-text", {
        method: "POST",
        body: formData,
    });
    return response;
}

export async function getDefaultParams() {
    const response = await fetch("/api/gpt-default-params");
    if (!response.ok) {
        throw new Error("Error getting default params.");
    }
    return await response.json();
}

export async function generateTitle(content) {
    const response = await fetch("/api/generate-title", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ conversation: content })
    });
    return await response.text();
}

export async function getFollowUpQuestions(prompt) {
    const response = await fetch("/api/generate-followup-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt }),
    });

    // Get the response data
    const responseText = await response.text();
    console.log(responseText);
    const data = JSON.parse(responseText);

    // If the response is not okay, throw an error with the status and message
    if (!response.ok) {
        let errMsg = data.error ? data.error.message : "Error generating follow up questions.";
        throw new Error(`Error ${response.status}: ${errMsg}`);
    }

    return data;
}

// public/utils/api.js
// Use interceptors to handle errors globally
axios.interceptors.response.use(null, error => {
    const expectedError = error.response && error.response.status >= 400 && error.response.status < 500;
    if (!expectedError) {
        console.log("Logging the error", error);
        // alert("An unexpected error occurred. ");
        swal("An unexpected error occurred, please try to refresh the page.", {
            icon: "error",
        });
    }
    return Promise.reject(error);
});

export async function fetchCloudChatHistories(username, lastTimestamp = null) {
    const queryParams = lastTimestamp ? `?lastTimestamp=${encodeURIComponent(lastTimestamp)}` : "";
    const url = `/chatHistories/${encodeURIComponent(username)}${queryParams}`;

    const response = await axios.get(url);
    // 响应应当是聊天历史数组
    return response.data.data;
}

export async function createOrUpdateCloudChatHistory(chatHistoryData) {
    const response = await axios.post("/chatHistories", chatHistoryData);
    // The response should be the created entity
    return response.data.data;
}

export async function deleteCloudChatHistory(chatId) {
    await axios.delete(`/chatHistories/${encodeURIComponent(chatId)}`);
    // Server should be returning the just-deleted entity
    // If that's not the case, we might need to adjust the server or this method according to that.
}

export async function fetchCloudMessages(chatId, lastTimestamp = null) {
    const queryParams = lastTimestamp ? `?lastTimestamp=${encodeURIComponent(lastTimestamp)}` : "";
    const response = await axios.get(`/messages/${encodeURIComponent(chatId)}${queryParams}`);
    // The response should be an array of messages
    return response.data.data || [];
}

export async function createCloudMessage(messageData, chatId) {
    const response = await axios.post(`/messages/${encodeURIComponent(chatId)}`, messageData);
    // The response should be the created entity
    return response.data.data;
}

export async function updateCloudMessage(messageData, chatId, messageId) {
    const response = await axios.put(`/messages/${encodeURIComponent(chatId)}/${encodeURIComponent(messageId)}`, messageData);
    // The response should be the updated entity
    return response.data.data;
}

export async function deleteCloudMessage(chatId, messageId) {
    await axios.delete(`/messages/${encodeURIComponent(chatId)}/${encodeURIComponent(messageId)}`);
    // Similar to deleteCloudChatHistory, the response handling might need revision based on actual server response.
}
