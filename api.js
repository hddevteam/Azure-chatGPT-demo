// /api.js

const express = require("express");
const router = express.Router();
const multer  = require("multer");
const upload = multer();

const azureTTSController = require("./controllers/azureTTSController");
const gptController = require("./controllers/gptController");
const profileController = require("./controllers/profileController");
const applicationController = require("./controllers/applicationController");
const dalleController = require("./controllers/dalleController");
router.post("/text-to-image", dalleController.textToImageHandler); // text-to-image
router.get("/app_name", applicationController.getAppName);

// router.get("/tts", azureTTSController.getTextToSpeech);
router.post("/tts", azureTTSController.getMultiLangTextToSpeech);
router.post("/auto-speech-to-text", azureTTSController.uploadMiddleware, azureTTSController.autoSpeechToText);
router.post("/speech-to-text", azureTTSController.uploadMiddleware, azureTTSController.speechToText);

router.post("/gpt", gptController.generateResponse);
router.post("/create-chat-profile", gptController.createChatProfile);
router.post("/generate-summary", gptController.summarizeConversation);
router.post("/generate-title", gptController.generateTitle);
router.post("/generate-followup-questions", gptController.generateFollowUpQuestions);


router.get("/prompt_repo", profileController.getPromptRepo);
router.get("/profiles", profileController.getProfiles);
router.post("/profiles", profileController.createProfile);
router.put("/profiles/:name", profileController.updateProfile);
router.delete("/profiles/:name", profileController.deleteProfile);
router.get("/gpt-default-params", gptController.getDefaultParams);

const chatHistoryController = require("./controllers/chatHistoryController");
const messageController = require("./controllers/messageController");

// Chat History routes
router.get("/chatHistories/:username", chatHistoryController.getCloudChatHistories);
router.post("/chatHistories", chatHistoryController.createOrUpdateCloudChatHistory);
router.delete("/chatHistories/:chatId", chatHistoryController.deleteCloudChatHistory);


// Message routes
router.get("/messages/:chatId", messageController.getCloudMessages);
router.post("/messages/:chatId", messageController.createCloudMessage);
router.put("/messages/:chatId/:messageId", messageController.updateCloudMessage); 
router.delete("/messages/:chatId/:messageId", messageController.deleteCloudMessage); 

// Message Attachment routes
router.post("/attachments/upload", upload.single("fileContent"), messageController.uploadAttachment);

module.exports = router;