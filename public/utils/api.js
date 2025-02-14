// public/api.js
// purpose: client-side code to make requests to the server side api.

import axios from "axios";
import swal from "sweetalert";
import { signIn, getToken, getUserId, getUserName } from "./authRedirect.js";

axios.defaults.baseURL = "/api";
axios.defaults.headers.post["Content-Type"] = "application/json";
axios.defaults.headers.put["Content-Type"] = "application/json";


// Update axios request interceptor with improved getToken method
axios.interceptors.request.use(async config => {
    if (!config.headers.Authorization) {
        try {
            const token = await getToken(); // Get Token
            config.headers.Authorization = `Bearer ${token}`; // Add Token to request header
        } catch (error) {
            console.error("Failed to add token to request", error);
            swal("Login required", "Will be redirected to login page, if not, please try to refresh the page manually.", {"buttons": false, "timer": 1500});
            return Promise.reject("Cannot add token to request. The request will not be sent.");
        }
    }
    return config;
}, error => {
    return Promise.reject(error);
});

axios.interceptors.response.use(response => {
    return response;
}, error => {
    const expectedError = error.response && error.response.status >= 400 && error.response.status < 500;
    if (error.response && error.response.status === 401) {
        console.error("Access denied, redirecting to login...");
        signIn();
    } else {
        console.log("Error during response:", error);
        if (!expectedError) {
            console.log("Logging the error", error);
        }
    }
    return Promise.reject(error);
});

export async function fetchRealtimeConfig() {
    try {
        const response = await axios.get("/realtime-config");
        return response.data;
    } catch (error) {
        console.error("Failed to fetch realtime config:", error);
        throw error;
    }
}

export async function getAppName() {
    try {
        const response = await axios.get("/app_name");
        return response.data;
    } catch (error) {
        console.error("Failed to get app name:", error);
        throw error;
    }
}

export async function getPromptRepo(username) {
    try {
        const response = await axios.get(`/prompt_repo?username=${username}`);
        return response.data;
    } catch (error) {
        console.error("Failed to get prompt repo:", error);
        throw error;

    }
}

/**
 * Delete user profile configuration
 * @param {string} profileName - Name of the profile to delete
 * @param {string} username - Current username
 */
export async function deleteProfile(profileName, username) {
    try {
        const response = await axios.delete(`/profiles/${profileName}?username=${username}`);
        return response.data;
    } catch (error) {
        console.error("Error during profile deletion:", error);
        throw error; 
    }
}

/**
 * Generate AI role profile configuration
 * @param {Object} profileData - Object containing profile creation data
 */
export async function createChatProfile(profileData) {
    try {
        const response = await axios.post("/create-chat-profile", profileData);
        return response.data;
    } catch (error) {
        console.error("Error generating profile:", error);
        throw error; 
    }
}

/**
 * Save or update profile configuration
 * @param {Object} profile - Profile data
 * @param {string} username - Username
 * @param {boolean} isNewProfile - Whether it's a new profile (determines create or update)
 * @param {string} [oldName] - Old profile name (required for updates)
 */
export async function saveOrUpdateProfile(profile, username, isNewProfile, oldName = "") {
    const endpoint = `/profiles${isNewProfile ? "" : `/${oldName}`}?username=${username}`;
    try {
        const response = await axios({
            method: isNewProfile ? "POST" : "PUT",
            url: endpoint,
            data: profile,
        });
        return response.data;
    } catch (error) {
        console.error("Error saving profile:", error);
        throw error; 
    }
}


export async function uploadAttachment(fileContent, fileName) {
    try {
        const formData = new FormData();
        formData.append("fileContent", fileContent);
        formData.append("originalFileName", fileName);

        // Get current username
        const username = getUserName();
        formData.append("username", username);  // Add username to formData

        // Note: Remove axios default Content-Type header to let browser handle boundary correctly
        const response = await axios.post("/attachments/upload", formData, {
            headers: {
                "Content-Type": undefined
            }
        });
        console.log(response.data);
        return response.data; // Return attachment info from backend response
    } catch (error) {
        console.error("Failed to upload attachment:", error);
        throw error;
    }
}

export async function uploadAudiofile(fileContent, fileName) {
    try {
        const formData = new FormData();
        formData.append("fileContent", fileContent);
        formData.append("originalFileName", fileName);
        
        const username = getUserName();
        formData.append("username", username);

        const response = await axios.post("/audiofiles/upload", formData, {
            headers: {
                "Content-Type": undefined
            }
        });
        
        swal("Upload Success!", "Audio file has been uploaded successfully", "success");
        return response.data;
    } catch (error) {
        console.error("Failed to upload audio file:", error);
        swal("Upload Failed!", "Unable to upload audio file", "error");
        throw error;
    }
}

export async function fetchUploadedAudioFiles() {
    console.log("fetchUploadedAudioFiles");
    try {
        const username = getUserName();
        console.log("username", username);
        const response = await axios.get("/audiofiles/list", { params: { username } });
        if (response && response.data) {
            return {
                success: true,
                data: response.data,
            };
        }
    } catch (error) {
        console.error("Failed to get uploaded audio files list:", error);
        return {
            success: false,
            message: "Unable to fetch uploaded audio files list",
        };
    }
}


export async function submitTranscriptionJob(audioUrl, { languages, identifySpeakers, maxSpeakers }) {
    try {
        const requestBody = {
            audioUrl: audioUrl,
            audioName: audioUrl.split("/").pop(),
            languages: languages,
            identifySpeakers: identifySpeakers,
            maxSpeakers: maxSpeakers,
        };
        console.log("requestBody", requestBody);

        const response = await axios.post("/audiofiles/transcribe", requestBody);
        return response.data;
    } catch (error) {
        console.error("Failed to submit transcription job:", error);
        throw error;
    }
}


export async function fetchTranscriptionStatus(transcriptionId, blobName) {
    try {
        const response = await axios.get("/audiofiles/transcript/status", {
            params: { transcriptionId, blobName }
        });
        return response.data; // Returns transcription status and optional info
    } catch (error) {
        console.error(`Failed to fetch transcription status: ${error}`);
        throw error; // Throw error to caller for further handling
    }
}

// Frontend API call
export async function fetchTranscriptText(transcriptionBlobName) {
    try {
        const response = await axios.get("/audiofiles/transcript/text", {
            params: { transcriptionBlobName }
        });
        if (response.data && response.data.success) {
            return response.data.transcriptText;
        } else {
            throw new Error("Failed to fetch transcription text");
        }
    } catch (error) {
        console.error("Failed to fetch transcript text:", error);
        throw error;
    }
}

export async function deleteAudioFile(blobName) {
    try {
        await axios.delete("/audiofiles/delete", { data: { blobName: blobName } });
    } catch (error) {
        console.error("Failed to delete audio file:", error);
        swal("Delete Failed!", "Unable to delete audio file", "error");
        throw error;
    }
}

// text to image
export async function textToImage(caption) {
    try {
        const response = await axios.post("/text-to-image", {
            caption,
        });

        return response.data;
    } catch (error) {
        // When axios throws error, response property contains response object
        if (error.response) {
            const { status, data } = error.response;
            console.error(`Request failed with status: ${status}`, data);

            // Check for specific error information
            if (data.contentFilterResults) {
                const filterResultsString = JSON.stringify(data.contentFilterResults);
                throw new Error(`${data.message} Content filter results: ${filterResultsString}`);
            } else {
                // Throw generic error message
                throw new Error(data.message || "Request failed");
            }
        } else {
            // Other errors without response object (e.g., network issues)
            throw new Error("Network error or server not responding");
        }
    }
}

//get gpt response
export async function getGpt(prompt, model = "gpt-4o", params = {}) {
    try {
        console.log("getGpt params:", { prompt, model, params });
        
        const response = await axios.post("/gpt", {
            prompt,
            model,
            ...params
        });

        console.log("GPT API response:", response.data);
        return response.data;
    } catch (error) {
        console.error("Error in getGpt:", error);
        
        if (error.response) {
            console.error("GPT API error:", error.response.data);
            throw new Error(error.response.data);
        } else if (error.request) {
            console.error("No response received:", error.request);
            throw new Error("No response received from server");
        } else {
            console.error("Request error:", error.message);
            throw error;
        }
    }
}


// get tts response
export async function getTts(message) {
    try {
        const response = await axios.post("/tts", {
            message,
        }, {
            responseType: "blob", // Very important, as TTS API should return audio file
        });

        return response.data;
    } catch (error) {
        console.error(error);
        throw error;
    }
}


// get stt response
export async function getStt(audioBlob) {
    try {
        const formData = new FormData();
        formData.append("file", audioBlob);

        const response = await axios.post("/auto-speech-to-text", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        console.log(response.data);
        return response.data;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function sendAudioBlob(audioBlob) {

    const userId = getUserId(); 
    const formData = new FormData();
    formData.append("file", audioBlob);
    formData.append("userId", userId); 

    try {
        console.log("Sending audio to server");
        await axios.post("/auto-speech-to-text", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        console.log("Audio sent successfully");
    } catch (error) {
        console.error(error);
        throw error;
    }
}


export async function getDefaultParams() {
    try {
        const response = await axios.get("/gpt-default-params");
        return response.data;
    } catch (error) {
        console.error("Error getting default parameters:", error);
        throw new Error("Error getting default params.");
    }
}

export async function generateTitle(content) {
    try {
        const response = await axios.post("/generate-title", {
            conversation: content
        }, {
            headers: {
                "Content-Type": "application/json"
            }
        });
        // axios handles response.data by default, return response.data if API returns JSON format
        return response.data; 
    } catch (error) {
        console.error("Error generating title:", error);
        throw new Error("Error generating title.");
    }
}


export async function getFollowUpQuestions(prompt) {
    try {
        const response = await axios.post("/generate-followup-questions", {
            prompt: prompt
        }, {
            headers: {
                "Content-Type": "application/json"
            }
        });

        console.log(response.data);

        return response.data; // Return parsed JSON directly
    } catch (error) {
        console.error("Error getting follow-up questions:", error);
        if (error.response) {
            // Handle specific error message
            const errMsg = error.response.data && error.response.data.error ? error.response.data.error.message : "Error generating follow up questions.";
            throw new Error(`Error ${error.response.status}: ${errMsg}`);
        } else {
            // Handle no response error
            throw new Error("Network error or server not responding");
        }
    }
}

export async function fetchCloudChatHistories(username, lastTimestamp = null, token = null) {
    if (!token) {
        throw new Error("Token is not available. Please sign in.");
    }
    const queryParams = lastTimestamp ? `?lastTimestamp=${encodeURIComponent(lastTimestamp)}` : "";
    const url = `/chatHistories/${encodeURIComponent(username)}${queryParams}`;

    const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
}

export async function createOrUpdateCloudChatHistory(chatHistoryData, token) {
    if (!token) {
        throw new Error("Token is not available. Please sign in.");
    }
    const response = await axios.post("/chatHistories", chatHistoryData, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
}

export async function deleteCloudChatHistory(chatId, token = null) {
    if (!token) {
        throw new Error("Token is not available. Please sign in.");
    }
    await axios.delete(`/chatHistories/${encodeURIComponent(chatId)}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
}

export async function fetchCloudMessages(chatId, lastTimestamp = null, token = null) {
    if (!token) {
        throw new Error("Token is not available. Please sign in.");
    }
    const queryParams = lastTimestamp ? `?lastTimestamp=${encodeURIComponent(lastTimestamp)}` : "";
    const response = await axios.get(`/messages/${encodeURIComponent(chatId)}${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data || [];
}

export async function createCloudMessage(messageData, chatId, token) {
    if (!token) {
        throw new Error("Token is not available. Please sign in.");
    }
    const response = await axios.post(`/messages/${encodeURIComponent(chatId)}`, messageData, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
}

export async function updateCloudMessage(messageData, chatId, messageId, token) {
    if (!token) {
        throw new Error("Token is not available. Please sign in.");
    }
    const response = await axios.put(`/messages/${encodeURIComponent(chatId)}/${encodeURIComponent(messageId)}`, messageData, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
}

export async function deleteCloudMessage(chatId, messageId, token) {
    if (!token) {
        throw new Error("Token is not available. Please sign in.");
    }
    await axios.delete(`/messages/${encodeURIComponent(chatId)}/${encodeURIComponent(messageId)}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
}

export async function generateChatOptions(message, language) {
    try {
        const response = await axios.post("/generate-chat-options", {
            message: message,
            language: language
        });
        return response.data;
    } catch (error) {
        console.error("Error generating chat options:", error);
        throw error;
    }
}

export async function generateRealtimeSummary(messages) {
    try {
        const response = await axios.post("/realtime-summary", {
            messages: messages
        });
        return response.data;
    } catch (error) {
        console.error("Error generating realtime conversation summary:", error);
        throw error;
    }
}

export async function searchBing(query, options = {}) {
    try {
        const response = await axios.post("/bing-search", { 
            query,
            ...options 
        });
        return response.data;
    } catch (error) {
        console.error("Bing search error:", error);
        throw error;
    }
}

export async function generateSystemPrompt(context) {
    try {
        const response = await axios.post("/generate-system-prompt", {
            context
        });
        return response.data;
    } catch (error) {
        console.error("Error generating system prompt:", error);
        throw error;
    }
}

// URL summary API
export async function getUrlSummary(url, language, prompt = "") {
    console.log("[API] Sending URL for summarization:", url, "Language:", language);
    try {
        const response = await axios.post("/url-summary", { 
            url,
            language,
            prompt // Add prompt parameter
        });
        console.log("[API] Received URL summary response:", response.data);
        return response.data;
    } catch (error) {
        console.error("[API] Error in URL summarization:", error);
        throw new Error(`Failed to summarize URL content: ${error.message}`);
    }
}
