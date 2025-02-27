// services/documentProcessor.js
const mammoth = require("mammoth");
const pdf = require("pdf-parse");
const xlsx = require("xlsx");
const path = require("path");

const SUPPORTED_EXTENSIONS = {
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".pdf": "application/pdf",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xls": "application/vnd.ms-excel",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".ppt": "application/vnd.ms-powerpoint"
};

class DocumentProcessingError extends Error {
    constructor(message, type, details) {
        super(message);
        this.name = "DocumentProcessingError";
        this.type = type;
        this.details = details;
    }
}

async function processDocument(buffer, fileName) {
    const extension = path.extname(fileName).toLowerCase();
    
    if (!SUPPORTED_EXTENSIONS[extension]) {
        throw new DocumentProcessingError(
            `Unsupported file type: ${extension}`, 
            "UNSUPPORTED_TYPE",
            { extension }
        );
    }

    try {
        let text = "";
        switch (extension) {
        case ".txt":
        case ".md":
            text = buffer.toString("utf-8");
            break;

        case ".docx":
            const result = await mammoth.extractRawText({ buffer });
            if (result.messages.length > 0) {
                console.warn("Warnings during DOCX processing:", result.messages);
            }
            text = result.value;
            break;

        case ".pdf":
            const pdfData = await pdf(buffer);
            if (!pdfData.text) {
                throw new DocumentProcessingError(
                    "PDF appears to be empty or unreadable",
                    "EMPTY_CONTENT",
                    { pageCount: pdfData.numPages }
                );
            }
            text = pdfData.text;
            break;

        case ".xlsx":
        // 设置解析选项，指定编码为 UTF-8
            const workbook = xlsx.read(buffer, { type: "buffer", codepage: 65001 });
            if (workbook.SheetNames.length === 0) {
                throw new DocumentProcessingError(
                    "Excel file appears to be empty",
                    "EMPTY_CONTENT"
                );
            }

            // 遍历工作表并提取文本，删除空行
            text = workbook.SheetNames.map(sheetName => {
                const worksheet = workbook.Sheets[sheetName];
                const rows = [];

                // 获取工作表的范围
                const range = xlsx.utils.decode_range(worksheet["!ref"]);
                for (let row = range.s.r; row <= range.e.r; row++) {
                    const rowData = [];
                    for (let col = range.s.c; col <= range.e.c; col++) {
                        const cellAddress = xlsx.utils.encode_cell({ r: row, c: col });
                        const cell = worksheet[cellAddress];
                        rowData.push(cell ? cell.v : ""); // 提取单元格的值
                    }

                    // 检查行是否为空（所有列均为空）
                    const isEmptyRow = rowData.every(cell => cell === "");
                    if (!isEmptyRow) {
                        rows.push(rowData.join("\t")); // 将非空行加入结果，列用制表符分隔
                    }
                }

                return `Sheet: ${sheetName}\n${rows.join("\n")}`; // 换行分隔行
            }).join("\n\n");
            break;
        case ".ppt":
            // PowerPoint files need additional handling
            throw new DocumentProcessingError(
                "PowerPoint file processing is not yet implemented",
                "NOT_IMPLEMENTED",
                { extension }
            );
        }

        // Validate extracted content
        if (!text.trim()) {
            throw new DocumentProcessingError(
                "No text content could be extracted from the document",
                "EMPTY_CONTENT",
                { fileName }
            );
        }

        return text;
    } catch (error) {
        if (error instanceof DocumentProcessingError) {
            throw error;
        }
        
        throw new DocumentProcessingError(
            `Error processing ${path.basename(fileName)}: ${error.message}`,
            "PROCESSING_ERROR",
            { originalError: error }
        );
    }
}

module.exports = {
    processDocument,
    SUPPORTED_EXTENSIONS,
    DocumentProcessingError
};