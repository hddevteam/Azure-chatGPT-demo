// MarkdownRenderer.js - 封装 marked.js 配置和处理换行符的功能
import { marked } from "marked";

/**
 * 配置 marked.js 并提供统一的渲染接口
 */
class MarkdownRenderer {
    constructor() {
        // 初始化并配置 marked
        this.configureMarked();
    }

    /**
     * 配置 marked.js 选项
     */
    configureMarked() {
        // 启用 breaks 选项，将单行换行转换为 <br>
        marked.setOptions({
            breaks: true,          // 启用换行符转换为 <br>
            gfm: true,             // 启用 GitHub 风格的 Markdown
            pedantic: false,       // 不启用 pedantic 模式
            sanitize: false,       // 不进行净化处理，允许 HTML 标签
            smartLists: true,      // 启用智能列表
            smartypants: false     // 不启用 smartypants 标点处理
        });
    }

    /**
     * 预处理文本，确保换行符能被正确处理
     * @param {string} text - 要处理的文本内容
     * @returns {string} - 处理后的文本
     */
    preprocessText(text) {
        if (!text) return "";
        
        // 处理诗歌等需要保留换行的内容
        // 查找连续的短行（可能是诗歌）
        const lines = text.split("\n");
        const processedLines = [];
        
        // 遍历所有行
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            processedLines.push(line);
            
            // 如果不是空行且下一行存在且不是空行，确保添加换行标记
            // 这样可以确保单行换行在 marked 处理中被保留
            if (line.trim() && i < lines.length - 1 && lines[i+1].trim()) {
                const nextLine = lines[i+1];
                
                // 如果当前行和下一行都比较短（可能是诗歌格式）
                // 或者下一行以特定标点开头（可能是多行内容）
                if ((line.length < 40 && nextLine.length < 40) || 
                     /^[，。？！,\.!?]/.test(nextLine.trim())) {
                    processedLines[processedLines.length - 1] += "  "; // 添加两个空格确保换行
                }
            }
        }
        
        return processedLines.join("\n");
    }

    /**
     * 处理思维链标记，将其转换为 Markdown 引用格式
     * @param {string} text - 包含思维链标记的文本
     * @returns {string} - 处理后的文本
     */
    processThinkingChain(text) {
        if (!text) return text;
        
        // 使用正则表达式匹配 <think></think> 标签
        const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
        
        return text.replace(thinkRegex, (match, thinkContent) => {
            // 检查 think 内容是否为空或只包含空白字符
            if (!thinkContent || thinkContent.trim() === "") {
                return ""; // 如果内容为空，则替换为空字符串
            }
            
            // 1. 分割成行并处理每一行
            const processedLines = thinkContent
                .split("\n")
                .filter(line => line.trim() !== undefined) // 保留所有行，包括空行
                .map(line => {
                    // 如果是空行，返回只有引用符号的行，否则正常加上引用符号和内容
                    return line.trim() === "" ? ">" : `> ${line}`;
                });
            
            // 2. 将处理后的行合并成一个引用块
            // 确保引用块前后有空行，以确保 Markdown 正确渲染
            const processedContent = processedLines.join("\n");
            
            // 3. 返回处理后的引用块，确保周围有空行
            return `\n\n${processedContent}\n\n`;
        });
    }

    /**
     * 渲染 Markdown 文本，包括处理思维链
     * @param {string} text - 要渲染的 Markdown 文本
     * @returns {string} - 渲染后的 HTML
     */
    render(text) {
        if (!text) return "";
        // 先处理思维链
        const withProcessedThinking = this.processThinkingChain(text);
        // 再处理其他文本格式
        const processedText = this.preprocessText(withProcessedThinking);
        return marked.parse(processedText);
    }
}

// 导出单例实例
export default new MarkdownRenderer();