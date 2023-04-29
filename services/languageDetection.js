/* eslint-disable no-control-regex */
function detectLanguage(text) {
    const englishRegex = /\b[a-zA-Z]+\b/g;
    const chineseRegex = /[\u4E00-\u9FFF]/g;

    const englishCount = (text.match(englishRegex) || []).length;
    const chineseCount = (text.match(chineseRegex) || []).length;

    if (englishCount > chineseCount) {
        return "en-US";
    } else if (chineseCount > englishCount) {
        return "zh-CN";
    } else {
        return "unknown";
    }
}

exports.detectFirstLanguage = async function (message) {
    const sentences = message.split(/([.。!?！？])/).filter(sentence => sentence.trim());
    const firstLanguage = detectLanguage(sentences[0]);
    return firstLanguage;
};