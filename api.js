// /api.js server side code

const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const multer = require("multer");
const upload = multer();

const azureTTSController = require("./controllers/azureTTSController");
const gptController = require("./controllers/gptController");
const profileController = require("./controllers/profileController");
const applicationController = require("./controllers/applicationController");
const dalleController = require("./controllers/dalleController");

// 简单的中间件示例，用于检查令牌
const checkAuth = (req, res, next) => {
    // 通常令牌在请求头的 'Authorization' 中以 'Bearer [token]' 形式发送
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // 获取令牌部分

    if (token == null) return res.sendStatus(401); // 若没有令牌，则返回 401

    jwt.verify(token, process.env.TOKEN_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // 若令牌无效，则返回 403
        req.user = user; // 将用户信息附加到请求对象
        next(); // 调用 next 中间件函数
    });
};

router.get("/app_name", applicationController.getAppName);

router.post("/text-to-image", checkAuth, dalleController.textToImageHandler); // text-to-image
// router.get("/tts", azureTTSController.getTextToSpeech);
router.post("/tts", checkAuth, azureTTSController.getMultiLangTextToSpeech);
router.post("/auto-speech-to-text", checkAuth, azureTTSController.uploadMiddleware, azureTTSController.autoSpeechToText);
router.post("/speech-to-text", checkAuth, azureTTSController.uploadMiddleware, azureTTSController.speechToText);

router.post("/gpt", checkAuth, gptController.generateResponse);
router.post("/gpt4v", checkAuth, gptController.generateGpt4VResponse);
router.post("/create-chat-profile", checkAuth, gptController.createChatProfile);
router.post("/generate-summary", checkAuth, gptController.summarizeConversation);
router.post("/generate-title", checkAuth, gptController.generateTitle);
router.post("/generate-followup-questions", checkAuth, gptController.generateFollowUpQuestions);


router.get("/prompt_repo", checkAuth, profileController.getPromptRepo);
router.get("/profiles", checkAuth, profileController.getProfiles);
router.post("/profiles", checkAuth, profileController.createProfile);
router.put("/profiles/:name", checkAuth, profileController.updateProfile);
router.delete("/profiles/:name", checkAuth, profileController.deleteProfile);
router.get("/gpt-default-params", checkAuth, gptController.getDefaultParams);

const chatHistoryController = require("./controllers/chatHistoryController");
const messageController = require("./controllers/messageController");

// Chat History routes
router.get("/chatHistories/:username", checkAuth, chatHistoryController.getCloudChatHistories);
router.post("/chatHistories", checkAuth, chatHistoryController.createOrUpdateCloudChatHistory);
router.delete("/chatHistories/:chatId", checkAuth, chatHistoryController.deleteCloudChatHistory);


// Message routes
router.get("/messages/:chatId", checkAuth, messageController.getCloudMessages);
router.post("/messages/:chatId", checkAuth, messageController.createCloudMessage);
router.put("/messages/:chatId/:messageId", checkAuth, messageController.updateCloudMessage);
router.delete("/messages/:chatId/:messageId", checkAuth, messageController.deleteCloudMessage);

// Message Attachment routes
router.post("/attachments/upload", checkAuth, upload.single("fileContent"), messageController.uploadAttachment);

module.exports = router;