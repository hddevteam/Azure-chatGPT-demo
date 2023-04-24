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

//get gpt response
export async function getGpt(promptText) {
    const response = await fetch("/api/gpt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText }),
    });
    if (!response.ok) {
        throw new Error("Error generating response.");
    }
    return await response.json();
}

// get tts response
export async function getTts(message) {
    const url = `/api/tts?message=${encodeURIComponent(message)}`;
    const response = await fetch(url);
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
    return  response;
}