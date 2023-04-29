/* eslint-disable no-control-regex */
function detectLanguage(text) {
    const englishRegex = /[a-zA-Z]/;
    const chineseRegex = /[\u4E00-\u9FFF]/;

    if (englishRegex.test(text)) {
        return "en-US";
    } else if (chineseRegex.test(text)) {
        return "zh-CN";
    } else {
        return "unknown";
    }
}

exports.detectFirstLanguage = async function (message) {
    const texts = message.split(/([^\u0000-\u007F]+)/).filter(text => text.trim());
    const firstLanguage = detectLanguage(texts[0]);
    return firstLanguage;
};