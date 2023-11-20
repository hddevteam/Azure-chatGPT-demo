// public/api.js
// purpose: client-side code to make requests to the server side api.

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
    const response = await fetch("/api/gpt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText, model: model }),
    });

    // Get the response data
    const data = await response.json();

    // If the response is not okay, throw an error with the status and message
    if (!response.ok) {
        let errMsg = data.error ? data.error.message : "Error generating response.";
        throw new Error(`Error ${response.status}: ${errMsg}`);
    }

    return data;
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
// Base URL for the API
const API_BASE_URL = "/api";

/**
 * Fetch all chat histories for a given username
 * @param {string} username - The username for which to fetch chat histories.
 * @return {Promise<Array>} - A promise that resolves to an array of chat history objects.
 */
export async function fetchCloudChatHistories(username) {
    const response = await fetch(`${API_BASE_URL}/chatHistories?username=${encodeURIComponent(username)}`);
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return await response.json();
}

/**
 * Create a new chat history
 * @param {Object} chatHistoryData - The data for the new chat history.
 * @return {Promise<Object>} - A promise that resolves to the created chat history object.
 */
export async function createCloudChatHistory(chatHistoryData) {
    const response = await fetch(`${API_BASE_URL}/chatHistories`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(chatHistoryData),
    });
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return await response.json();
}

/**
 * Update a chat history
 * @param {Object} chatHistoryData - The data to update the chat history.
 * @param {string} chatId - The ID of the chat history to update.
 * @return {Promise<Object>} - A promise that resolves to the updated chat history object.
 */
export async function updateCloudChatHistory(chatHistoryData, chatId) {
    const response = await fetch(`${API_BASE_URL}/chatHistories/${encodeURIComponent(chatId)}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(chatHistoryData),
    });
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return await response.json();
}

/**
 * Delete a chat history and all its messages
 * @param {string} chatId - The ID of the chat history to delete.
 * @return {Promise<undefined>} - A promise that resolves once the chat history has been deleted
 */
export async function deleteCloudChatHistory(chatId) {
    const response = await fetch(`${API_BASE_URL}/chatHistories/${encodeURIComponent(chatId)}`, {
        method: "DELETE",
    });
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return await response.text(); // Assuming the server responds with some text on successful deletion
}

/**
 * Fetch all messages for a given chatId
 * @param {string} chatId - The chatId for which to fetch messages.
 * @return {Promise<Array>} - A promise that resolves to an array of message objects.
 */
export async function fetchCloudMessages(chatId) {
    const response = await fetch(`${API_BASE_URL}/messages/${encodeURIComponent(chatId)}`);
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return await response.json();
}

/**
 * Create a new message
 * @param {Object} messageData - The data for the new message.
 * @param {string} chatId - The ID of the chat history to which the message belongs.
 * @return {Promise<Object>} - A promise that resolves to the created message object.
 */
export async function createCloudMessage(messageData, chatId) {
    const response = await fetch(`${API_BASE_URL}/messages/${encodeURIComponent(chatId)}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(messageData),
    });
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return await response.json();
}

/**
 * Update a message
 * @param {Object} messageData - The data to update the message with.
 * @param {string} messageId - The ID of the message to update.
 * @return {Promise<Object>} - A promise that resolves to the updated message object.
 */
export async function updateCloudMessage(messageData, messageId) {
    const response = await fetch(`${API_BASE_URL}/messages/${encodeURIComponent(messageId)}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(messageData),
    });
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return await response.json();
}

/**
 * Delete a message
 * @param {string} messageId - The ID of the message to delete.
 * @return {Promise<undefined>} - A promise that resolves once the message has been deleted.
 */
export async function deleteCloudMessage(messageId) {
    const response = await fetch(`${API_BASE_URL}/messages/${encodeURIComponent(messageId)}`, {
        method: "DELETE",
    });
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return await response.text(); // Assuming the server responds with some text on successful deletion
}

