// public/api.js
// purpose: client-side code to make requests to the server side api.

import axios from "axios";
import swal from "sweetalert";
import { signIn, getToken } from "./authRedirect.js";

axios.defaults.baseURL = "/api";
axios.defaults.headers.post["Content-Type"] = "application/json";
axios.defaults.headers.put["Content-Type"] = "application/json";

let cachedToken = null; // 模块级别的Token缓存

export function updateCachedToken(token) {
    cachedToken = token;
}

axios.interceptors.request.use(async config => {
    if (!config.headers.Authorization) { // 如果请求头中没有Authorization信息
        console.log("No Authorization header found, trying to get token...");
        // 尝试使用缓存的Token
        if (cachedToken) {
            console.log("Using cached token:", cachedToken);
            config.headers.Authorization = `Bearer ${cachedToken}`;
        } else {
            try {
                console.log("No cached token found, trying to login get token...");
                await signIn(); // 尝试登录
                const token = await getToken(); // 获取Token
                cachedToken = token; // 更新缓存的Token
                config.headers.Authorization = `Bearer ${token}`; // 将Token加入请求头部
            } catch (error) {
                console.error("在请求中添加Token失败, 错误:", error);
                // 这里我们判断如果是因为用户取消登录导致的错误，可能就不需要将错误抛出
                // 可以根据错误类型作更细致的判断和处理
                // 对于无法处理的错误或者确实需要用户注意的错误，应当提醒用户
                swal("无法获取授权", "请重新尝试登录。", "error");
                return Promise.reject("无法获取Token，请求被取消"); // 取消当前的请求
            }
        }
    }
    return config; // 确保只有在设置了Token后才继续执行请求
}, error => {
    return Promise.reject(error);
});


axios.interceptors.response.use(response => {
    return response;
}, error => {
    if (error.response && error.response.status === 401) {
        console.error("Access denied, redirecting to login...");
        signIn();
    }
    return Promise.reject(error);
});

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

export async function getGpt4V(promptText, enhancements=false, ocr = false, grounding = false) {
    try {
        const response = await axios.post("/gpt4v", {
            prompt: promptText, 
            enhancements: enhancements,
            ocr: ocr,
            grounding: grounding,
        });
        return response.data; // Axios 会自动处理响应数据为 JSON
    } catch (error) {
        if (error.response) {
            // 请求成功发出，但服务器以外的 2xx 状态码回复
            let errMsg = error.response.data.error ? error.response.data.error.message : "Error generating GPT-4-Vision response.";
            throw new Error(`Error ${error.response.status}: ${errMsg}`);
        } else if (error.request) {
            // 请求发出了，但没有收到回应
            throw new Error("The server did not respond. Please try again later.");
        } else {
            // 设置请求时触发了某些错误
            throw new Error(error.message);
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
    if (!cachedToken) {
        throw new Error("Token is not available. Please sign in.");
    }
    const queryParams = lastTimestamp ? `?lastTimestamp=${encodeURIComponent(lastTimestamp)}` : "";
    const url = `/chatHistories/${encodeURIComponent(username)}${queryParams}`;

    const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${cachedToken}` }
    });
    return response.data.data;
}

export async function createOrUpdateCloudChatHistory(chatHistoryData) {
    if (!cachedToken) {
        throw new Error("Token is not available. Please sign in.");
    }
    const response = await axios.post("/chatHistories", chatHistoryData, {
        headers: { Authorization: `Bearer ${cachedToken}` }
    });
    return response.data.data;
}

export async function deleteCloudChatHistory(chatId) {
    if (!cachedToken) {
        throw new Error("Token is not available. Please sign in.");
    }
    await axios.delete(`/chatHistories/${encodeURIComponent(chatId)}`, {
        headers: { Authorization: `Bearer ${cachedToken}` }
    });
}

export async function fetchCloudMessages(chatId, lastTimestamp = null) {
    if (!cachedToken) {
        throw new Error("Token is not available. Please sign in.");
    }
    const queryParams = lastTimestamp ? `?lastTimestamp=${encodeURIComponent(lastTimestamp)}` : "";
    const response = await axios.get(`/messages/${encodeURIComponent(chatId)}${queryParams}`, {
        headers: { Authorization: `Bearer ${cachedToken}` }
    });
    return response.data.data || [];
}

export async function createCloudMessage(messageData, chatId) {
    if (!cachedToken) {
        throw new Error("Token is not available. Please sign in.");
    }
    const response = await axios.post(`/messages/${encodeURIComponent(chatId)}`, messageData, {
        headers: { Authorization: `Bearer ${cachedToken}` }
    });
    return response.data.data;
}

export async function updateCloudMessage(messageData, chatId, messageId) {
    if (!cachedToken) {
        throw new Error("Token is not available. Please sign in.");
    }
    const response = await axios.put(`/messages/${encodeURIComponent(chatId)}/${encodeURIComponent(messageId)}`, messageData, {
        headers: { Authorization: `Bearer ${cachedToken}` }
    });
    return response.data.data;
}

export async function deleteCloudMessage(chatId, messageId) {
    if (!cachedToken) {
        throw new Error("Token is not available. Please sign in.");
    }
    await axios.delete(`/messages/${encodeURIComponent(chatId)}/${encodeURIComponent(messageId)}`, {
        headers: { Authorization: `Bearer ${cachedToken}` }
    });
}

