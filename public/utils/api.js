// public/api.js
// purpose: client-side code to make requests to the server side api.

import axios from "axios";
import swal from "sweetalert";
import { signIn, getToken, getUserId, getUserName } from "./authRedirect.js";

axios.defaults.baseURL = "/api";
axios.defaults.headers.post["Content-Type"] = "application/json";
axios.defaults.headers.put["Content-Type"] = "application/json";


// 使用改进后的getToken方法更新axios请求拦截器
axios.interceptors.request.use(async config => {
    if (!config.headers.Authorization) {
        try {
            const token = await getToken(); // 获取Token
            config.headers.Authorization = `Bearer ${token}`; // 将Token加入请求头部
        } catch (error) {
            console.error("在请求中添加Token失败", error);
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
 * 删除当前用户的指定配置文件
 * @param {string} profileName 要删除的配置文件名
 * @param {string} username 当前用户名
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
 * 生成AI角色的配置文件
 * @param {Object} profileData 包含创建配置文件所需数据的对象
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
 * 保存或更新配置文件
 * @param {Object} profile 配置文件数据
 * @param {string} username 用户名
 * @param {boolean} isNewProfile 是否是新配置文件（决定是创建还是更新）
 * @param {string} [oldName] 旧配置文件的名称（更新时需要）
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

        // 获取当前用户的username
        const username = getUserName();
        formData.append("username", username);  // 将username添加到formData

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

export async function uploadAudiofile(fileContent, fileName) {
    try {
        const formData = new FormData();
        formData.append("fileContent", fileContent);
        formData.append("originalFileName", fileName);
        
        // 获取当前用户的username
        const username = getUserName();
        formData.append("username", username);  // 将username添加到formData

        const response = await axios.post("/audiofiles/upload", formData, {
            headers: {
                "Content-Type": undefined
            }
        });
        
        swal("上传成功!", "音频文件已成功上传", "success");
        return response.data; // 返回后端响应中的附件信息
    } catch (error) {
        console.error("Failed to upload audio file:", error);
        swal("上传失败!", "无法上传音频文件", "error");
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
        console.error("获取已上传音频文件列表失败：", error);
        return {
            success: false,
            message: "无法获取已上传的音频文件列表",
        };
    }
}


export async function submitTranscriptionJob(audioUrl, { languages, identifySpeakers, maxSpeakers }) {
    try {
        // 构造请求体，包括音频文件的URL、文件名，以及新的识别选项
        const requestBody = {
            audioUrl: audioUrl,
            audioName: audioUrl.split("/").pop(), // 假设URL的最后一部分是文件名
            languages: languages, // 用户选择的语种列表
            identifySpeakers: identifySpeakers, // 是否识别说话人
            maxSpeakers: maxSpeakers, // 说话人数最大值
        };
        console.log("requestBody", requestBody);

        // 发送带有识别选项的请求
        const response = await axios.post("/audiofiles/transcribe", requestBody);
        
        return response.data; // 返回后端的响应，包含 transcriptionId 和 audioName
    } catch (error) {
        console.error("提交转录任务失败：", error);
        throw error; // 将错误抛出，以便调用函数可以处理
    }
}


export async function fetchTranscriptionStatus(transcriptionId, blobName) {
    try {
        const response = await axios.get("/audiofiles/transcript/status", {
            params: { transcriptionId, blobName }
        });
        return response.data; // 假设返回的数据包括转录状态以及可选的其他信息
    } catch (error) {
        console.error(`获取转录状态失败：${error}`);
        throw error; // 向调用者抛出异常，以便可以进行进一步处理
    }
}

// 前端API调用
export async function fetchTranscriptText(transcriptionBlobName) {
    try {
        const response = await axios.get("/audiofiles/transcript/text", {
            params: { transcriptionBlobName }
        });
        if (response.data && response.data.success) {
            return response.data.transcriptText; // 返回已解析的转录文本
        } else {
            throw new Error("Failed to fetch transcription text");
        }
    } catch (error) {
        console.error("获取转录文本失败：", error);
        throw error; // 向调用者抛出异常，以便可以进行进一步处理
    }
}

export async function deleteAudioFile(blobName) {
    try {
        await axios.delete("/audiofiles/delete", { data: { blobName: blobName } });
    } catch (error) {
        console.error("删除音频文件失败：", error);
        swal("删除失败!", "无法删除音频文件", "error");
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
        // 当axios抛出错误时，error对象中的response属性包含了响应对象
        if (error.response) {
            const { status, data } = error.response;
            console.error(`请求失败，状态码: ${status}`, data);

            // 检查是否存在特定的错误信息
            if (data.contentFilterResults) {
                const filterResultsString = JSON.stringify(data.contentFilterResults);
                throw new Error(`${data.message} 内容过滤结果: ${filterResultsString}`);
            } else {
                // 抛出通用错误消息
                throw new Error(data.message || "请求未成功");
            }
        } else {
            // 没有响应对象的其他错误（例如网络问题等）
            throw new Error("网络错误或服务器无响应");
        }
    }
}

//get gpt response
export async function getGpt(prompt, model = "gpt-4o", params = {}) {
    try {
        console.log("getGpt params:", { prompt, model, params }); // 添加调试信息
        
        const response = await axios.post("/gpt", {
            prompt,
            model,
            ...params  // 添加其他参数的传递
        });

        console.log("GPT API response:", response.data); // 添加响应调试信息
        return response.data;
    } catch (error) {
        console.error("Error in getGpt:", error); // 添加错误调试信息
        
        // 处理 axios 错误
        if (error.response) {
            // 服务器返回了错误状态码
            console.error("GPT API error:", error.response.data);
            throw new Error(error.response.data);
        } else if (error.request) {
            // 请求已经发出，但没有收到响应
            console.error("No response received:", error.request);
            throw new Error("No response received from server");
        } else {
            // 发生了一些错误，阻止了请求的发送
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
            responseType: "blob", // 很重要，因为TTS API应该返回音频文件
        });

        return response.data;
    } catch (error) {
        console.error(error);
        throw error;
    }
}


// get stt response - 使用 axios
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
        console.error("获取默认参数时出错:", error);
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
        // axios默认处理response.data, 这里获取文本，可以直接返回response.data如果API返回的是JSON格式
        return response.data; 
    } catch (error) {
        console.error("标题生成时出错:", error);
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

        return response.data; // 直接返回解析后的JSON
    } catch (error) {
        console.error("获取后续问题时出错:", error);
        if (error.response) {
            // 处理具体的错误信息
            const errMsg = error.response.data && error.response.data.error ? error.response.data.error.message : "Error generating follow up questions.";
            throw new Error(`Error ${error.response.status}: ${errMsg}`);
        } else {
            // 没有响应时的错误处理
            throw new Error("网络错误或服务器无响应");
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
    const response = await axios.put(`·/messages/${encodeURIComponent(chatId)}/${encodeURIComponent(messageId)}`, messageData, {
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
        console.error("生成实时对话摘要时出错:", error);
        throw error;
    }
}

export async function searchBing(query) {
    try {
        const response = await axios.post("/bing-search", { query });
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
        console.error("生成系统提示时出错:", error);
        throw error;
    }
}
