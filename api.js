const express = require("express");
const multer = require("multer");
const passport = require("passport");
const upload = multer();

const azureTTSController = require("./controllers/azureTTSController");
const gptController = require("./controllers/gptController");
const profileController = require("./controllers/profileController");
const applicationController = require("./controllers/applicationController");
const dalleController = require("./controllers/dalleController");
const chatHistoryController = require("./controllers/chatHistoryController");
const messageController = require("./controllers/messageController");
const audioFileController = require("./controllers/audioFileController");
const realtimeController = require("./controllers/realtimeController");
const bingController = require("./controllers/bingController");

const router = express.Router();

// Use passport.authenticate middleware instead of checkAuth
// Set {session: false} since APIs are typically stateless
const requireAuth = passport.authenticate("oauth-bearer", { session: false });

// Application routes
router.get("/app_name", applicationController.getAppName);
router.get("/prompt_repo", requireAuth, profileController.getPromptRepo);

// Image and speech routes
router.post("/text-to-image", requireAuth, dalleController.textToImageHandler);
router.post("/tts", requireAuth, azureTTSController.getMultiLangTextToSpeech);
router.post("/auto-speech-to-text", requireAuth, azureTTSController.uploadMiddleware, azureTTSController.autoSpeechToText);
router.post("/speech-to-text", requireAuth, azureTTSController.uploadMiddleware, azureTTSController.speechToText);

// GPT routes
router.post("/gpt", requireAuth, gptController.generateResponse);
router.post("/create-chat-profile", requireAuth, gptController.createChatProfile);
router.post("/generate-summary", requireAuth, gptController.summarizeConversation);
router.post("/generate-title", requireAuth, gptController.generateTitle);
router.post("/generate-followup-questions", requireAuth, gptController.generateFollowUpQuestions);
router.post("/generate-chat-options", requireAuth, gptController.generateChatOptions);
router.post("/generate-system-prompt", requireAuth, gptController.generateSystemPrompt);

// Profile management routes
router.get("/profiles", requireAuth, profileController.getProfiles);
router.post("/profiles", requireAuth, profileController.createProfile);
router.put("/profiles/:name", requireAuth, profileController.updateProfile);
router.delete("/profiles/:name", requireAuth, profileController.deleteProfile);
router.get("/gpt-default-params", requireAuth, gptController.getDefaultParams);

// Chat History routes
router.get("/chatHistories/:username", requireAuth, chatHistoryController.getCloudChatHistories);
router.post("/chatHistories", requireAuth, chatHistoryController.createOrUpdateCloudChatHistory);
router.delete("/chatHistories/:chatId", requireAuth, chatHistoryController.deleteCloudChatHistory);

// Message routes
router.get("/messages/:chatId", requireAuth, messageController.getCloudMessages);
router.post("/messages/:chatId", requireAuth, messageController.createCloudMessage);
router.put("/messages/:chatId/:messageId", requireAuth, messageController.updateCloudMessage);
router.delete("/messages/:chatId/:messageId", requireAuth, messageController.deleteCloudMessage);

// Message Attachment routes
router.post("/attachments/upload", requireAuth, upload.single("fileContent"), messageController.uploadAttachment);

// Audio file routes
router.post("/audiofiles/upload", requireAuth, upload.single("fileContent"), audioFileController.uploadAudiofile);
router.get("/audiofiles/list", requireAuth, audioFileController.listAudioFiles);

// Transcription job routes
router.post("/audiofiles/transcribe", requireAuth, audioFileController.submitTranscriptionJob);
router.get("/audiofiles/transcript/status", requireAuth, audioFileController.getTranscriptionStatus);
router.get("/audiofiles/transcript/text", requireAuth, audioFileController.getTranscriptTextFromBlob);
router.delete("/audiofiles/delete", requireAuth, audioFileController.deleteAudioFile);

// Realtime conversation routes
router.get("/realtime-config", requireAuth, realtimeController.getConfig);
router.post("/realtime-summary", requireAuth, gptController.generateRealtimeSummary);

// Bing search route
router.post("/bing-search", requireAuth, bingController.search);

module.exports = router;
