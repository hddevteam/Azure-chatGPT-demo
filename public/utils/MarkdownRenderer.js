// MarkdownRenderer.js - 封装 marked.js 配置和处理换行符、数学公式的功能
import { marked } from "marked";
import katex from "katex";

/**
 * 公式处理器 - 负责处理 LaTeX 数学公式
 */
class FormulaProcessor {
    /**
     * 处理内联数学公式 \( ... \) 和 $ ... $ 
     * @param {string} text - 输入文本
     * @returns {string} - 处理后的文本
     */
    processInlineFormulas(text) {
        if (!text) return "";
        
        // 预处理 - 处理中间有转义反斜杠的模式，例如: \\( formula \\)
        let processed = text.replace(/\\\\(\(|\))/g, (match, p1) => `__ESCAPED_${p1 === "(" ? "LPAREN" : "RPAREN"}__`);
        
        // 替换 \( ... \) 为内联 KaTeX 标记
        processed = processed.replace(/\\\(([^]*?)\\\)/g, (match, formula) => {
            try {
                return katex.renderToString(formula.trim(), {
                    throwOnError: false,
                    displayMode: false
                });
            } catch (e) {
                console.error("Error rendering inline formula:", e);
                return `<span class="katex-error">${formula}</span>`;
            }
        });
        
        // 替换 $ ... $ 为内联 KaTeX 标记（避免误匹配普通的 $ 符号）
        processed = processed.replace(/(\s|^)\$([^\$\n]+?)\$(?=\s|$|[.,;:!?])/g, (match, pre, formula) => {
            try {
                return pre + katex.renderToString(formula.trim(), {
                    throwOnError: false,
                    displayMode: false
                });
            } catch (e) {
                console.error("Error rendering inline dollar formula:", e);
                return `${pre}<span class="katex-error">${formula}</span>`;
            }
        });
        
        // 恢复转义的括号
        return processed
            .replace(/__ESCAPED_LPAREN__/g, "\\(")
            .replace(/__ESCAPED_RPAREN__/g, "\\)");
    }
    
    /**
     * 处理块级数学公式 \[ ... \] 和 $$ ... $$
     * @param {string} text - 输入文本
     * @returns {string} - 处理后的文本
     */
    processBlockFormulas(text) {
        if (!text) return "";
        
        // 预处理 - 处理中间有转义反斜杠的模式
        let processed = text.replace(/\\\\(\[|\])/g, (match, p1) => `__ESCAPED_${p1 === "[" ? "LBRACKET" : "RBRACKET"}__`);
        
        // 替换 \[ ... \] 为块级 KaTeX 标记
        processed = processed.replace(/\\\[([^]*?)\\\]/gs, (match, formula) => {
            try {
                return `<div class="katex-block">${katex.renderToString(formula.trim(), {
                    throwOnError: false,
                    displayMode: true
                })}</div>`;
            } catch (e) {
                console.error("Error rendering block formula:", e);
                return `<div class="katex-error katex-block">${formula}</div>`;
            }
        });
        
        // 替换 $$ ... $$ 为块级 KaTeX 标记
        processed = processed.replace(/\$\$([^]*?)\$\$/gs, (match, formula) => {
            try {
                return `<div class="katex-block">${katex.renderToString(formula.trim(), {
                    throwOnError: false,
                    displayMode: true
                })}</div>`;
            } catch (e) {
                console.error("Error rendering double dollar formula:", e);
                return `<div class="katex-error katex-block">${formula}</div>`;
            }
        });
        
        // 恢复转义的括号
        return processed
            .replace(/__ESCAPED_LBRACKET__/g, "\\[")
            .replace(/__ESCAPED_RBRACKET__/g, "\\]");
    }
    
    /**
     * 预处理公式 - 修复常见的格式问题
     * @param {string} text - 输入文本
     * @returns {string} - 处理后的文本
     */
    preProcessFormulas(text) {
        if (!text) return "";
        
        // 修复不完整的分数格式
        let processed = text.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "\\frac{$1}{$2}");
        
        // 修复下标和上标
        processed = processed.replace(/\_([a-zA-Z0-9])/g, "_{$1}");
        processed = processed.replace(/\^([a-zA-Z0-9])/g, "^{$1}");
        
        // 修复 \pm 符号
        processed = processed.replace(/\\pm(?![a-zA-Z])/g, "\\pm ");
        
        return processed;
    }
    
    /**
     * 处理所有数学公式
     * @param {string} text - 输入文本
     * @returns {string} - 处理后的文本
     */
    processAllFormulas(text) {
        if (!text) return "";
        
        // 预处理公式
        let processed = this.preProcessFormulas(text);
        
        // 先处理块级公式，再处理内联公式
        processed = this.processBlockFormulas(processed);
        processed = this.processInlineFormulas(processed);
        
        return processed;
    }
    
    /**
     * 包装处理 - 用于处理复杂情况下的公式
     * 例如，当公式在列表项或表格中时，可能需要特殊处理
     * @param {string} text - 输入文本
     * @returns {string} - 处理后的文本
     */
    wrapAndProcessFormulas(text) {
        // 实际应用中，可根据需要增加额外的包装处理逻辑
        return this.processAllFormulas(text);
    }
}

/**
 * 思维链处理器 - 处理思维链标记
 */
class ThinkingChainProcessor {
    /**
     * 将思维链标记转换为 Markdown 引用格式
     * @param {string} text - 输入文本
     * @returns {string} - 处理后的文本
     */
    process(text) {
        if (!text) return text;
        
        // 使用正则表达式匹配 <think></think> 标签
        const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
        
        return text.replace(thinkRegex, (match, thinkContent) => {
            // 检查 think 内容是否为空或只包含空白字符
            if (!thinkContent || thinkContent.trim() === "") {
                return ""; // 如果内容为空，则替换为空字符串
            }
            
            // 分割成行并处理每一行
            const processedLines = thinkContent
                .split("\n")
                .filter(line => line.trim() !== undefined) // 保留所有行，包括空行
                .map(line => {
                    // 如果是空行，返回只有引用符号的行，否则正常加上引用符号和内容
                    return line.trim() === "" ? ">" : `> ${line}`;
                });
            
            // 将处理后的行合并成一个引用块
            const processedContent = processedLines.join("\n");
            
            // 返回处理后的引用块，确保周围有空行
            return `\n\n${processedContent}\n\n`;
        });
    }
}

/**
 * 文本格式处理器 - 处理换行符等文本格式
 */
class TextFormatProcessor {
    /**
     * 预处理文本，确保换行符能被正确处理
     * @param {string} text - 要处理的文本内容
     * @returns {string} - 处理后的文本
     */
    process(text) {
        if (!text) return "";
        
        // 处理诗歌等需要保留换行的内容
        const lines = text.split("\n");
        const processedLines = [];
        
        // 遍历所有行
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            processedLines.push(line);
            
            // 如果不是空行且下一行存在且不是空行，确保添加换行标记
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
     * 清理多余的空行，但保留段落结构
     * @param {string} text - 文本内容
     * @returns {string} - 处理后的文本
     */
    cleanupEmptyLines(text) {
        if (!text) return "";
        return text.replace(/\n{3,}/g, "\n\n");
    }
}

/**
 * Marked 扩展管理器 - 创建和管理 Marked 扩展
 */
class MarkedExtensionManager {
    /**
     * 创建 KaTeX 扩展
     * @returns {Object} - KaTeX 扩展对象
     */
    createKatexExtension() {
        return {
            name: "katex",
            level: "inline",
            start(src) {
                return src.indexOf("$");
            },
            tokenizer(src) {
                // 匹配内联公式 $...$ 
                const inlineMatch = /^\$((?:\\.|[^\$\\])+?)\$/.exec(src);
                if (inlineMatch) {
                    return {
                        type: "katex",
                        raw: inlineMatch[0],
                        text: inlineMatch[1].trim(),
                        displayMode: false
                    };
                }
                
                // 匹配块级公式 $$...$$
                const blockMatch = /^\$\$((?:\\.|[^\$\\])+?)\$\$/.exec(src);
                if (blockMatch) {
                    return {
                        type: "katex",
                        raw: blockMatch[0],
                        text: blockMatch[1].trim(),
                        displayMode: true
                    };
                }
                
                return false;
            },
            renderer(token) {
                try {
                    return katex.renderToString(token.text, {
                        throwOnError: false,
                        displayMode: token.displayMode
                    });
                } catch (e) {
                    console.error("KaTeX rendering error:", e);
                    return token.raw; // 出错时返回原始文本
                }
            }
        };
    }
    
    /**
     * 应用所有扩展到 Marked
     */
    applyExtensions() {
        // 应用 KaTeX 扩展
        const katexExtension = this.createKatexExtension();
        marked.use({ extensions: [katexExtension] });
        
        // 配置 Marked 基本选项
        marked.setOptions({
            breaks: true,          // 启用换行符转换为 <br>
            gfm: true,             // 启用 GitHub 风格的 Markdown
            pedantic: false,       // 不启用 pedantic 模式
            sanitize: false,       // 不进行净化处理，允许 HTML 标签
            smartLists: true,      // 启用智能列表
            smartypants: false     // 不启用 smartypants 标点处理
        });
    }
}

/**
 * 错误处理器 - 处理渲染过程中的错误
 */
class ErrorHandler {
    /**
     * 处理渲染错误
     * @param {Error} error - 错误对象
     * @param {string} text - 原始文本
     * @returns {string} - 备用渲染结果
     */
    handleRenderError(error, text) {
        console.error("Markdown rendering error:", error);
        try {
            // 尝试使用基本 Marked 渲染（不含扩展）
            return marked.parse(text);
        } catch (fallbackError) {
            console.error("Basic rendering also failed:", fallbackError);
            // 最后的备用方案 - 返回预格式化文本
            return `<pre>${text}</pre>`;
        }
    }
}

/**
 * 主 Markdown 渲染器类
 * 整合各个处理器，提供统一的渲染接口
 */
class MarkdownRenderer {
    constructor() {
        // 初始化各个处理器
        this.formulaProcessor = new FormulaProcessor();
        this.thinkingChainProcessor = new ThinkingChainProcessor();
        this.textFormatProcessor = new TextFormatProcessor();
        this.extensionManager = new MarkedExtensionManager();
        this.errorHandler = new ErrorHandler();
        
        // 应用扩展
        this.extensionManager.applyExtensions();
    }

    /**
     * 渲染 Markdown 文本，包括处理思维链和数学公式
     * @param {string} text - 要渲染的 Markdown 文本
     * @returns {string} - 渲染后的 HTML
     */
    render(text) {
        if (!text) return "";
        
        try {
            // 1. 处理思维链
            const withProcessedThinking = this.thinkingChainProcessor.process(text);
            
            // 2. 处理数学公式（在marked解析之前预处理）
            const withProcessedFormulas = this.formulaProcessor.wrapAndProcessFormulas(withProcessedThinking);
            
            // 3. 处理文本格式
            const processedText = this.textFormatProcessor.process(withProcessedFormulas);
            
            // 4. 清理多余的空行
            const cleanedText = this.textFormatProcessor.cleanupEmptyLines(processedText);
            
            // 5. 渲染为 HTML
            const htmlContent = marked.parse(cleanedText);
            
            // 6. 处理HTML内容中仍然存在的LaTeX标记
            return this.processRemainingLaTeX(htmlContent);
        } catch (error) {
            // 错误处理
            return this.errorHandler.handleRenderError(error, text);
        }
    }
    
    /**
     * 处理HTML内容中仍然存在的LaTeX标记
     * 这是一个额外的安全措施，确保所有公式都能被渲染
     * @param {string} htmlContent - 已经渲染为HTML的内容
     * @returns {string} - 处理后的HTML内容
     */
    processRemainingLaTeX(htmlContent) {
        if (!htmlContent) return "";
        
        try {
            // 使用正则表达式寻找未被处理的LaTeX标记
            // 处理 \( ... \) 内联公式
            let processed = htmlContent.replace(/\\\(([^]*?)\\\)/g, (match, formula) => {
                try {
                    return katex.renderToString(formula.trim(), {
                        throwOnError: false,
                        displayMode: false
                    });
                } catch (e) {
                    console.error("Error rendering remaining inline formula:", e);
                    return match; // 保持原样
                }
            });
            
            // 处理 \[ ... \] 块级公式
            processed = processed.replace(/\\\[([^]*?)\\\]/g, (match, formula) => {
                try {
                    return `<div class="katex-block">${katex.renderToString(formula.trim(), {
                        throwOnError: false,
                        displayMode: true
                    })}</div>`;
                } catch (e) {
                    console.error("Error rendering remaining block formula:", e);
                    return match; // 保持原样
                }
            });
            
            return processed;
        } catch (error) {
            console.error("Error processing remaining LaTeX:", error);
            return htmlContent; // 如果出错，返回原始HTML内容
        }
    }
    
    /**
     * 直接渲染数学公式
     * @param {string} formula - 数学公式文本
     * @param {boolean} displayMode - 是否为块级展示模式
     * @returns {string} - 渲染后的 HTML
     */
    renderMathFormula(formula, displayMode = false) {
        try {
            return katex.renderToString(formula, {
                throwOnError: false,
                displayMode: displayMode
            });
        } catch (e) {
            console.error("Math formula rendering error:", e);
            return formula; // 出错时返回原始公式
        }
    }
}

// 导出单例实例
export default new MarkdownRenderer();