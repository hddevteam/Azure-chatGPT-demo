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

export function saveMessages(username, profileName, messages) {
    localStorage.setItem(username + "_" + profileName, JSON.stringify(messages));
}

export function getMessages(username, profileName) {
    return JSON.parse(localStorage.getItem(username + "_" + profileName) || "[]");
}

