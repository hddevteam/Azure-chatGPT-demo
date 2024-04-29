// api.js backend

const express = require("express");
const multer = require("multer");
const passport = require("passport"); // 引入passport
const upload = multer();

const azureTTSController = require("./controllers/azureTTSController");
const gptController = require("./controllers/gptController");
const profileController = require("./controllers/profileController");
const applicationController = require("./controllers/applicationController");
const dalleController = require("./controllers/dalleController");
const chatHistoryController = require("./controllers/chatHistoryController");
const messageController = require("./controllers/messageController");
const audioFileController = require("./controllers/audioFileController");

const router = express.Router();

// 使用 passport.authenticate 中间件替换 checkAuth
// 设置为 {session: false} 表示不创建session，因为API通常是无状态的
const requireAuth = passport.authenticate("oauth-bearer", { session: false });

router.get("/app_name", applicationController.getAppName);
router.get("/prompt_repo", requireAuth, profileController.getPromptRepo);

router.post("/text-to-image", requireAuth, dalleController.textToImageHandler);
router.post("/tts", requireAuth, azureTTSController.getMultiLangTextToSpeech);
router.post("/auto-speech-to-text", requireAuth, azureTTSController.uploadMiddleware, azureTTSController.autoSpeechToText);
router.post("/speech-to-text", requireAuth, azureTTSController.uploadMiddleware, azureTTSController.speechToText);

router.post("/gpt", requireAuth, gptController.generateResponse);
router.post("/gpt4v", requireAuth, gptController.generateGpt4VResponse);
router.post("/create-chat-profile", requireAuth, gptController.createChatProfile);
router.post("/generate-summary", requireAuth, gptController.summarizeConversation);
router.post("/generate-title", requireAuth, gptController.generateTitle);
router.post("/generate-followup-questions", requireAuth, gptController.generateFollowUpQuestions);

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

// Audiofile routes
router.post("/audiofiles/upload", requireAuth, upload.single("fileContent"), audioFileController.uploadAudiofile);
router.get("/audiofiles/list", requireAuth, audioFileController.listAudioFiles);
// 提交音频文件转录任务接口
router.post("/audiofiles/transcribe", requireAuth, audioFileController.submitTranscriptionJob);
router.get("/audiofiles/transcript/status", requireAuth, audioFileController.getTranscriptionStatus);
// 添加新的路由处理获取转录文本的请求
router.get("/audiofiles/transcript/text", requireAuth, audioFileController.getTranscriptTextFromBlob);


module.exports = router;
