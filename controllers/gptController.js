// controllers/gptController.js
/**
 * GPT控制器主入口 - 导入和重新导出所有分模块功能
 * 这种结构允许 apiRoutes.js 继续使用相同的导入路径，同时让代码更加模块化
 */

// 导入子控制器
const basicController = require("./gpt/basicController");
const profileController = require("./gpt/profileController");
const summaryController = require("./gpt/summaryController");
const documentController = require("./gpt/documentController");

// 重新导出基本控制器的功能
exports.getDefaultParams = basicController.getDefaultParams;
exports.generateResponse = basicController.generateResponse;

// 重新导出配置文件控制器的功能
exports.createChatProfile = profileController.createChatProfile;
exports.generateSystemPrompt = profileController.generateSystemPrompt;
exports.generateChatOptions = profileController.generateChatOptions;

// 重新导出摘要控制器的功能
exports.summarizeConversation = summaryController.summarizeConversation;
exports.generateTitle = summaryController.generateTitle;
exports.generateFollowUpQuestions = summaryController.generateFollowUpQuestions;
exports.generateRealtimeSummary = summaryController.generateRealtimeSummary;

// 重新导出文档控制器的功能
exports.summarizeWebContent = documentController.summarizeWebContent;
exports.processDocumentQuery = documentController.processDocumentQuery;

