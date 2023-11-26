/**
 * @jest-environment jsdom
 */

import axios from "axios";
import SyncManager from "../public/components/SyncManager.js";
import StorageManager from "../public/components/StorageManager.js";


// Mocking axios for API calls
jest.mock("axios");

// Mocking localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem(key) {
            return store[key]|| null;
        },
        setItem(key, value) {
            store[key] = value.toString();
        },
        clear() {
            store = {};
        },
        removeItem(key) {
            delete store[key];
        }
    };
})();

const { v4: uuidv4 } = require("uuid");
const username = "mockuser";

Object.defineProperty(window, "localStorage", {
    value: localStorageMock
});

// Mocking Worker
class Worker {
    constructor(stringUrl) {
        this.url = stringUrl;
        this.onmessage = () => {};
    }

    postMessage(msg) {
        this.onmessage(msg);
    }
}

global.Worker = Worker;

// Utilities for creating mock data
const createMockChatHistory = (id, timestamp) => ({
    id: `mockuser_${id}`,
    title: "Mock Chat History Title",
    profileName: "MockProfile",
    createdAt: "2023-11-01T00:00:00.000Z",
    updatedAt: "2023-11-01T00:00:00.000Z",
    // Conditional property spread
    ...(timestamp && { timestamp })
});

const createMockMessage = (messageId, content) => ({
    messageId,
    role: "user",
    content,
    isActive: true
});

beforeEach(() => {
    // Set up necessary localStorage state before tests
    localStorageMock.setItem("currentUserData", JSON.stringify({ username: username, currentProfile: null }));
    // Initialize other states if necessary
});
  

test("local history is updated if localHistory not synced before but there is a cloudHistory", async () => {
    const syncManager = new SyncManager(new StorageManager(/* dependencies */));
    const mockCloudHistory = createMockChatHistory("123", new Date(new Date().getTime() + 10000).toISOString()); // Cloud timestamp is newer
    const mockLocalHistory = createMockChatHistory("123"); // Local timestamp is older
  
    localStorage.setItem(`chatHistory_${username}`, JSON.stringify([mockLocalHistory]));
    console.log(localStorage.getItem(`chatHistory_${username}`));
    axios.get.mockResolvedValue({ data: { data: [mockCloudHistory] }});
  
    await syncManager.syncChatHistories();
  
    // Verify cloud history has been downloaded and stored locally
    const updatedLocalHistory = JSON.parse(localStorage.getItem(`chatHistory_${username}`))[0];
    console.log(localStorage.getItem(`chatHistory_${username}`));
    expect(updatedLocalHistory.timestamp).toBe(mockCloudHistory.timestamp);
    
});

test("local history is updated if cloudHistory is newer", async () => {
    const syncManager = new SyncManager(new StorageManager(/* dependencies */));
    const mockCloudHistory = createMockChatHistory("123", new Date(new Date().getTime() + 10000).toISOString()); // Cloud timestamp is newer
    const mockLocalHistory = createMockChatHistory("123", new Date(new Date().getTime()).toISOString()); // Local timestamp is older
  
    localStorage.setItem(`chatHistory_${username}`, JSON.stringify([mockLocalHistory]));
    console.log(localStorage.getItem(`chatHistory_${username}`));
    axios.get.mockResolvedValue({ data: { data: [mockCloudHistory] }});
  
    await syncManager.syncChatHistories();
  
    // Verify cloud history has been downloaded and stored locally
    const updatedLocalHistory = JSON.parse(localStorage.getItem(`chatHistory_${username}`))[0];
    console.log(localStorage.getItem(`chatHistory_${username}`));
    expect(updatedLocalHistory.timestamp).toBe(mockCloudHistory.timestamp);
    
});

test("local history is removed if cloud history is deleted", async () => {
    const syncManager = new SyncManager(new StorageManager(/* dependencies */));
    const mockCloudHistory = createMockChatHistory("123", new Date().toISOString());
    mockCloudHistory.isDeleted = true; // Cloud history is marked as deleted
    const mockLocalHistory = createMockChatHistory("123", new Date(new Date().getTime()).toISOString()); // Local timestamp is older
  
    localStorage.setItem(`chatHistory_${username}`, JSON.stringify([mockLocalHistory]));
  
    console.log(localStorage.getItem(`chatHistory_${username}`));
    axios.get.mockResolvedValue({ data: { data: [mockCloudHistory] }});
  
    await syncManager.syncChatHistories();
    console.log(localStorage.getItem(`chatHistory_${username}`));

    // Verify local history has been removed
    expect(localStorage.getItem(`chatHistory_${username}`)).toBe("[]");
});

// test("cloud history is downloaded and stored locally", async () => {
//     const syncManager = new SyncManager(new StorageManager(/* dependencies */));
//     const mockCloudHistory = createMockChatHistory(uuidv4(), new Date().toISOString()); // Only exists in the cloud
  
//     axios.get.mockResolvedValue({ data: { data: [mockCloudHistory] }});
  
//     await syncManager.syncChatHistories();
  
//     // Verify new cloud history has been stored locally
//     const newLocalHistory = JSON.parse(localStorage.getItem(`chatHistory_${username}`))[0];
//     expect(newLocalHistory.id).toBe(mockCloudHistory.id);
// });
  

// test("new local history is uploaded to the cloud", async () => {
//     const syncManager = new SyncManager(new StorageManager(/* dependencies */));
//     const mockLocalHistory = createMockChatHistory(uuidv4()); // New local history without timestamp
  
//     localStorage.setItem(`chatHistory_${username}`, JSON.stringify([mockLocalHistory]));
//     axios.get.mockResolvedValue({ data: { data: [] }}); // No histories in the cloud
  
//     await syncManager.syncChatHistories();
  
//     // Verify axios post has been called to create new cloud history
//     expect(axios.post).toHaveBeenCalledWith(expect.stringContaining("/chatHistories"), expect.any(Object), expect.any(Object));
// });


  
  



  