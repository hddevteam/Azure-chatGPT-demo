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
const urlController = require("./controllers/urlController");
const gptImageController = require("./controllers/gptImageController");
const soraController = require("./controllers/soraController");
const videoFileController = require("./controllers/videoFileController");

const router = express.Router();

// Use passport.authenticate middleware instead of checkAuth
// Set {session: false} since APIs are typically stateless
const requireAuth = passport.authenticate("oauth-bearer", { session: false });

// Application routes
router.get("/app_name", applicationController.getAppName);
router.get("/prompt_repo", requireAuth, profileController.getPromptRepo);

// Image and speech routes
router.post("/text-to-image", requireAuth, dalleController.textToImageHandler);
router.post("/gpt-image/generate", requireAuth, gptImageController.generateImage.bind(gptImageController));
router.post("/gpt-image/edit", requireAuth, upload.fields([
    { name: "image", maxCount: 1 },
    { name: "mask", maxCount: 1 }
]), gptImageController.editImage.bind(gptImageController));
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

// Document routes
router.post("/documents/upload", requireAuth, upload.single("fileContent"), messageController.uploadDocument);
router.get("/documents/status/:id", requireAuth, messageController.getDocumentStatus);
router.get("/documents/:fileName", requireAuth, messageController.getDocumentContent);
router.post("/gpt/document-query", requireAuth, gptController.processDocumentQuery);

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

// URL summary route
router.post("/url-summary", requireAuth, urlController.getUrlSummary);

// Sora video generation routes
router.post("/sora/generate", requireAuth, soraController.generateVideo.bind(soraController));
router.get("/sora/status/:jobId", requireAuth, soraController.getJobStatus.bind(soraController));
router.get("/sora/download/:jobId", requireAuth, soraController.downloadVideo.bind(soraController));
router.get("/sora/history", requireAuth, soraController.getJobHistory.bind(soraController));
router.delete("/sora/job/:jobId", requireAuth, soraController.deleteJob.bind(soraController));
router.get("/sora/config", requireAuth, soraController.getConfig.bind(soraController));

// Video file management routes
router.post("/videofiles/upload", requireAuth, upload.single("fileContent"), videoFileController.uploadVideofile);
router.get("/videofiles/list", requireAuth, videoFileController.listVideoFiles);
router.delete("/videofiles/delete", requireAuth, videoFileController.deleteVideoFile);
router.get("/videofiles/details/:id", requireAuth, videoFileController.getVideoFileDetails);

module.exports = router;
