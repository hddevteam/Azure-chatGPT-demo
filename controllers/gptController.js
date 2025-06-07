// controllers/gptController.js
/**
 * GPT Controller Main Entry - Import and re-export all modular functionality
 * This structure allows apiRoutes.js to continue using the same import paths while making the code more modular
 */

// Import sub-controllers
const basicController = require("./gpt/basicController");
const profileController = require("./gpt/profileController");
const summaryController = require("./gpt/summaryController");
const documentController = require("./gpt/documentController");

// Re-export basic controller functionality
exports.getDefaultParams = basicController.getDefaultParams;
exports.generateResponse = basicController.generateResponse;

// Re-export profile controller functionality
exports.createChatProfile = profileController.createChatProfile;
exports.generateSystemPrompt = profileController.generateSystemPrompt;
exports.generateChatOptions = profileController.generateChatOptions;

// Re-export summary controller functionality
exports.summarizeConversation = summaryController.summarizeConversation;
exports.generateTitle = summaryController.generateTitle;
exports.generateFollowUpQuestions = summaryController.generateFollowUpQuestions;
exports.generateRealtimeSummary = summaryController.generateRealtimeSummary;

// Re-export document controller functionality
exports.summarizeWebContent = documentController.summarizeWebContent;
exports.processDocumentQuery = documentController.processDocumentQuery;

