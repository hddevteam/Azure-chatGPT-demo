// /utils/storage.js
// Purpose: Storage functions for the current user's data.

let currentUserData = JSON.parse(localStorage.getItem("currentUserData")) || { username: "guest", currentProfile: null };

export function setCurrentUsername(username) {
    currentUserData.username = username;
    saveCurrentUserData();
}

export function setCurrentProfile(profile) {
    currentUserData.currentProfile = profile;
    saveCurrentUserData();
}

export function getCurrentUsername() {
    return currentUserData.username;
}

export function getCurrentProfile() {
    return currentUserData.currentProfile;
}

function saveCurrentUserData() {
    localStorage.setItem("currentUserData", JSON.stringify(currentUserData));
}

export function saveMessages(chatId, messages) {
    localStorage.setItem(chatId, JSON.stringify(messages));
}

export function getMessages(chatId) {
    return JSON.parse(localStorage.getItem(chatId) || "[]");
}

const chatHistoryKeyPrefix = "chatHistory_";

export function getChatHistory(username) {
    return JSON.parse(localStorage.getItem(chatHistoryKeyPrefix + username) || "[]");
}

export function saveChatHistory(username, chatHistory) {
    localStorage.setItem(chatHistoryKeyPrefix + username, JSON.stringify(chatHistory));
}

export function removeMessagesByChatId(chatId) {
    localStorage.removeItem(chatId);
}
