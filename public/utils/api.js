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

// /public/api.js
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

// public/api.js

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
