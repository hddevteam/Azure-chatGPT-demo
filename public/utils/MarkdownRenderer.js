// MarkdownRenderer.js - Encapsulates marked.js configuration and handles line breaks and mathematical formulas
import { marked } from "marked";
import katex from "katex";

/**
 * Formula Processor - Handles LaTeX mathematical formulas
 */
class FormulaProcessor {
    /**
     * Helper method to pre-process formula content only
     * @private
     * @param {string} formula - The formula content to process
     * @returns {string} - Processed formula
     */
    _preProcessFormulaContent(formula) {
        let processed = formula.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "\\frac{$1}{$2}");
        processed = processed.replace(/_([a-zA-Z0-9])/g, "_{$1}");
        processed = processed.replace(/\^([a-zA-Z0-9])/g, "^{$1}");
        processed = processed.replace(/\\pm(?![a-zA-Z])/g, "\\pm ");
        return processed;
    }

    processInlineFormulas(text) {
        if (!text) return "";
        
        let processed = text.replace(/\\\\(\(|\))/g, (match, p1) => `__ESCAPED_${p1 === "(" ? "LPAREN" : "RPAREN"}__`);
        
        processed = processed.replace(/\\\(([^]*?)\\\)/g, (match, formula) => {
            try {
                const safeFormula = this._preProcessFormulaContent(formula.trim());
                return katex.renderToString(safeFormula, {
                    throwOnError: false,
                    displayMode: false
                });
            } catch (e) {
                console.error("Error rendering inline formula:", e);
                return `<span class="katex-error">${formula}</span>`;
            }
        });
        
        processed = processed.replace(/(\s|^)\$([^$\n]+?)\$(?=\s|$|[.,;:!?])/g, (match, pre, formula) => {
            try {
                const safeFormula = this._preProcessFormulaContent(formula.trim());
                return pre + katex.renderToString(safeFormula, {
                    throwOnError: false,
                    displayMode: false
                });
            } catch (e) {
                console.error("Error rendering inline dollar formula:", e);
                return `${pre}<span class="katex-error">${formula}</span>`;
            }
        });
        
        return processed
            .replace(/__ESCAPED_LPAREN__/g, "\\(")
            .replace(/__ESCAPED_RPAREN__/g, "\\)");
    }
    
    processBlockFormulas(text) {
        if (!text) return "";
        
        let processed = text.replace(/\\\\(\[|\])/g, (match, p1) => `__ESCAPED_${p1 === "[" ? "LBRACKET" : "RBRACKET"}__`);
        
        processed = processed.replace(/\\\[([^]*?)\\\]/gs, (match, formula) => {
            try {
                const safeFormula = this._preProcessFormulaContent(formula.trim());
                return `<div class="katex-block">${katex.renderToString(safeFormula, {
                    throwOnError: false,
                    displayMode: true
                })}</div>`;
            } catch (e) {
                console.error("Error rendering block formula:", e);
                return `<div class="katex-error katex-block">${formula}</div>`;
            }
        });
        
        processed = processed.replace(/\$\$([^]*?)\$\$/gs, (match, formula) => {
            try {
                const safeFormula = this._preProcessFormulaContent(formula.trim());
                return `<div class="katex-block">${katex.renderToString(safeFormula, {
                    throwOnError: false,
                    displayMode: true
                })}</div>`;
            } catch (e) {
                console.error("Error rendering double dollar formula:", e);
                return `<div class="katex-error katex-block">${formula}</div>`;
            }
        });
        
        return processed
            .replace(/__ESCAPED_LBRACKET__/g, "\\[")
            .replace(/__ESCAPED_RBRACKET__/g, "\\]");
    }
    
    preProcessFormulas(text) {
        if (!text) return "";
        
        // Only process fractions and pm symbol globally
        let processed = text.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "\\frac{$1}{$2}");
        processed = processed.replace(/\\pm(?![a-zA-Z])/g, "\\pm ");
        
        return processed;
    }
    
    /**
     * Processes all mathematical formulas
     * @param {string} text - Input text
     * @returns {string} - Processed text
     */
    processAllFormulas(text) {
        if (!text) return "";
        
        // Pre-processes formulas
        let processed = this.preProcessFormulas(text);
        
        // Processes block-level formulas first, then inline formulas
        processed = this.processBlockFormulas(processed);
        processed = this.processInlineFormulas(processed);
        
        return processed;
    }
    
    /**
     * Wrapper processing - Used to handle formulas in complex situations
     * For example, when formulas are in list items or tables, special handling may be needed
     * @param {string} text - Input text
     * @returns {string} - Processed text
     */
    wrapAndProcessFormulas(text) {
        // In actual applications, additional wrapper processing logic can be added as needed
        return this.processAllFormulas(text);
    }
}

/**
 * Thinking Chain Processor - Processes thinking chain markup
 */
class ThinkingChainProcessor {
    /**
     * Converts thinking chain markup into an HTML structure with a copy button
     * @param {string} text - Input text
     * @returns {string} - Processed text
     */
    process(text) {
        if (!text) return text;
        
        // Use regular expression to match <think></think> tags
        const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
        let thinkBlockCount = 0;
        
        return text.replace(thinkRegex, (match, thinkContent) => {
            // Check if think content is empty or contains only whitespace
            if (!thinkContent || thinkContent.trim() === "") {
                return ""; // If content is empty, replace with empty string
            }
            
            // Increment counter
            thinkBlockCount++;
            
            // Process the thinking content with Markdown
            // We'll render it directly with marked to preserve paragraph formatting
            let processedContent = thinkContent.trim();
            
            // Create a unique ID for this think block
            const thinkBlockId = `think-block-${Date.now()}-${thinkBlockCount}`;
            
            // Detect if this is a reasoning summary (from Azure OpenAI reasoning models)
            const isReasoningSummary = this.isReasoningSummary(processedContent);
            const wrapperClass = isReasoningSummary ? "think-block-wrapper reasoning-summary" : "think-block-wrapper";
            const titleText = isReasoningSummary ? "Reasoning Summary" : "Thinking Process";
            
            // Create an HTML structure with copy button
            // Store the original think content for copying as URL-encoded data attribute
            const header = `<div class="${wrapperClass}">
  <div class="think-block-header">
    <span class="think-title">${titleText}</span>
    <button class="think-block-copy" data-think-id="${thinkBlockId}">
      <i class="fas fa-copy"></i> Copy
    </button>
  </div>
  <div class="think-block-content" id="${thinkBlockId}" data-think-content="${encodeURIComponent(thinkContent)}">`;
            
            const footer = `</div>
</div>`;
            
            // First render the content with marked to get HTML
            // We'll add a special class to identify it as think content
            return `\n\n${header}\n<div class="think-block-markdown">${marked.parse(processedContent)}</div>\n${footer}\n\n`;
        });
    }
    
    /**
     * Detect if content is a reasoning summary from Azure OpenAI
     * @param {string} content - Think block content
     * @returns {boolean} - True if it's a reasoning summary
     */
    isReasoningSummary(content) {
        // Look for patterns that indicate this is a reasoning summary
        const reasoningSummaryPatterns = [
            /\*\*[Ss]ummariz/,                    // **Summariz...
            /\*\*[Ee]xplain/,                     // **Explain...
            /\*\*[Aa]nalyz/,                      // **Analyz...
            /reasoning process/i,                 // reasoning process
            /chain.of.thought/i,                  // chain of thought
            /step.by.step/i,                      // step by step
            /thought process/i,                   // thought process
            /I need to think about/i,             // Azure reasoning pattern
            /Let me analyze/i,                    // Azure reasoning pattern
            /First, I should consider/i,          // Azure reasoning pattern
            /The user.*(asking|wants|needs)/i     // User intent analysis
        ];
        
        return reasoningSummaryPatterns.some(pattern => pattern.test(content));
    }
}

/**
 * Text Format Processor - Handles text formats such as line breaks
 */
class TextFormatProcessor {
    /**
     * Pre-processes text to ensure line breaks are handled correctly
     * @param {string} text - The text content to process
     * @returns {string} - Processed text
     */
    process(text) {
        if (!text) return "";
        
        // Handles content that needs to preserve line breaks, such as poetry
        const lines = text.split("\n");
        const processedLines = [];
        
        // Iterates through all lines
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            processedLines.push(line);
            
            // If it is not an empty line and the next line exists and is not an empty line, ensure a line break tag is added
            if (line.trim() && i < lines.length - 1 && lines[i+1].trim()) {
                const nextLine = lines[i+1];
                
                // If the current line and the next line are both short (possibly poetry format)
                // Or the next line starts with a specific punctuation mark (possibly multi-line content)
                if ((line.length < 40 && nextLine.length < 40) || 
                     /^[，。？！,.!?]/.test(nextLine.trim())) {
                    processedLines[processedLines.length - 1] += "  "; // Add two spaces to ensure line break
                }
            }
        }
        
        return processedLines.join("\n");
    }
    
    /**
     * Cleans up extra empty lines, but preserves paragraph structure
     * @param {string} text - Text content
     * @returns {string} - Processed text
     */
    cleanupEmptyLines(text) {
        if (!text) return "";
        return text.replace(/\n{3,}/g, "\n\n");
    }
}

/**
 * Marked Extension Manager - Creates and manages Marked extensions
 */
class MarkedExtensionManager {
    /**
     * Creates a KaTeX extension
     * @returns {Object} - KaTeX extension object
     */
    createKatexExtension() {
        return {
            name: "katex",
            level: "inline",
            start(src) {
                return src.indexOf("$");
            },
            tokenizer(src) {
                // Matches inline formulas $...$
                const inlineMatch = /^\$(?![\n$])((?:\\.|[^$\\])+?)\$(?!\$)/.exec(src);
                if (inlineMatch) {
                    return {
                        type: "katex",
                        raw: inlineMatch[0],
                        text: inlineMatch[1].trim(),
                        displayMode: false
                    };
                }
                
                // Matches block-level formulas $$...$$
                const blockMatch = /^\$\$((?:\\.|[^$\\])+?)\$\$/.exec(src);
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
                    return token.raw; // Returns the original text when an error occurs
                }
            }
        };
    }
    
    /**
     * Applies all extensions to Marked
     */
    applyExtensions() {
        // Applies the KaTeX extension
        const katexExtension = this.createKatexExtension();
        marked.use({ extensions: [katexExtension] });
        
        // Configures basic Marked options
        marked.setOptions({
            breaks: true,          // Enables line breaks to be converted to <br>
            gfm: true,             // Enables GitHub-flavored Markdown
            pedantic: false,       // Does not enable pedantic mode
            sanitize: false,       // Does not perform sanitization, allows HTML tags
            smartLists: true,      // Enables smart lists
            smartypants: false     // Does not enable smartypants punctuation processing
        });
    }
}

/**
 * Error Handler - Handles errors during the rendering process
 */
class ErrorHandler {
    /**
     * Handles rendering errors
     * @param {Error} error - Error object
     * @param {string} text - Original text
     * @returns {string} - Backup rendering result
     */
    handleRenderError(error, text) {
        console.error("Markdown rendering error:", error);
        try {
            // Attempts to render using basic Marked (without extensions)
            return marked.parse(text);
        } catch (fallbackError) {
            console.error("Basic rendering also failed:", fallbackError);
            // The final fallback - returns pre-formatted text
            return `<pre>${text}</pre>`;
        }
    }
}

/**
 * Main Markdown Renderer class
 * Integrates various processors to provide a unified rendering interface
 */
class MarkdownRenderer {
    constructor() {
        // Initializes various processors
        this.formulaProcessor = new FormulaProcessor();
        this.thinkingChainProcessor = new ThinkingChainProcessor();
        this.textFormatProcessor = new TextFormatProcessor();
        this.extensionManager = new MarkedExtensionManager();
        this.errorHandler = new ErrorHandler();
        
        // Applies extensions
        this.extensionManager.applyExtensions();
    }

    /**
     * Renders Markdown text, including processing thinking chains and mathematical formulas
     * @param {string} text - The Markdown text to render
     * @returns {string} - Rendered HTML
     */
    render(text) {
        if (!text) return "";
        
        try {
            // 1. Processes thinking chains
            const withProcessedThinking = this.thinkingChainProcessor.process(text);
            
            // 2. Processes mathematical formulas (pre-processes before marked parsing)
            const withProcessedFormulas = this.formulaProcessor.wrapAndProcessFormulas(withProcessedThinking);
            
            // 3. Processes text formatting
            const processedText = this.textFormatProcessor.process(withProcessedFormulas);
            
            // 4. Cleans up extra empty lines
            const cleanedText = this.textFormatProcessor.cleanupEmptyLines(processedText);
            
            // 5. Renders to HTML
            const htmlContent = marked.parse(cleanedText);
            
            // 6. Processes LaTeX markup that still exists in the HTML content
            return this.processRemainingLaTeX(htmlContent);
        } catch (error) {
            // Error handling
            return this.errorHandler.handleRenderError(error, text);
        }
    }
    
    /**
     * Processes LaTeX markup that still exists in the HTML content
     * This is an additional safety measure to ensure all formulas can be rendered
     * @param {string} htmlContent - The content already rendered as HTML
     * @returns {string} - Processed HTML content
     */
    processRemainingLaTeX(htmlContent) {
        if (!htmlContent) return "";
        
        try {
            // Uses regular expressions to find unprocessed LaTeX markup
            // Processes \( ... \) inline formulas
            let processed = htmlContent.replace(/\\\(([^]*?)\\\)/g, (match, formula) => {
                try {
                    return katex.renderToString(formula.trim(), {
                        throwOnError: false,
                        displayMode: false
                    });
                } catch (e) {
                    console.error("Error rendering remaining inline formula:", e);
                    return match; // Keeps it as is
                }
            });
            
            // Processes \[ ... \] block-level formulas
            processed = processed.replace(/\\\[([^]*?)\\\]/g, (match, formula) => {
                try {
                    return `<div class="katex-block">${katex.renderToString(formula.trim(), {
                        throwOnError: false,
                        displayMode: true
                    })}</div>`;
                } catch (e) {
                    console.error("Error rendering remaining block formula:", e);
                    return match; // Keeps it as is
                }
            });
            
            return processed;
        } catch (error) {
            console.error("Error processing remaining LaTeX:", error);
            return htmlContent; // Returns the original HTML content if an error occurs
        }
    }
    
    /**
     * Renders mathematical formulas directly
     * @param {string} formula - Mathematical formula text
     * @param {boolean} displayMode - Whether it is block-level display mode
     * @returns {string} - Rendered HTML
     */
    renderMathFormula(formula, displayMode = false) {
        try {
            return katex.renderToString(formula, {
                throwOnError: false,
                displayMode: displayMode
            });
        } catch (e) {
            console.error("Math formula rendering error:", e);
            return formula; // Returns the original formula when an error occurs
        }
    }
}

// Exports a singleton instance
export default new MarkdownRenderer();