// services/documentProcessor.js
const mammoth = require("mammoth");
const pdf = require("pdf-parse");
const xlsx = require("xlsx");
const path = require("path");
const PPTXProcessor = require("./pptxProcessor");

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
    
    try {
        let text = "";
        
        // Process supported file types
        if (SUPPORTED_EXTENSIONS[extension]) {
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
            case ".xls":
                const workbook = xlsx.read(buffer, { type: "buffer", codepage: 65001 });
                if (workbook.SheetNames.length === 0) {
                    throw new DocumentProcessingError(
                        "Excel file appears to be empty",
                        "EMPTY_CONTENT"
                    );
                }

                text = workbook.SheetNames.map(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];
                    const rows = [];

                    const range = xlsx.utils.decode_range(worksheet["!ref"]);
                    for (let row = range.s.r; row <= range.e.r; row++) {
                        const rowData = [];
                        for (let col = range.s.c; col <= range.e.c; col++) {
                            const cellAddress = xlsx.utils.encode_cell({ r: row, c: col });
                            const cell = worksheet[cellAddress];
                            rowData.push(cell ? cell.v : "");
                        }
                        if (!rowData.every(cell => cell === "")) {
                            rows.push(rowData.join("\t"));
                        }
                    }
                    return `Sheet: ${sheetName}\n${rows.join("\n")}`;
                }).join("\n\n");
                break;

            case ".pptx":
            case ".ppt":
                // Use specialized PPTX processor to handle PowerPoint files
                const pptxProcessor = new PPTXProcessor();
                text = await pptxProcessor.extractText(buffer);
                if (!text) {
                    throw new DocumentProcessingError(
                        "PowerPoint file appears to be empty",
                        "EMPTY_CONTENT",
                        { extension }
                    );
                }
                break;
            }
        } else {
            // For unsupported file types, try to process as text file
            try {
                text = buffer.toString("utf-8");
                console.warn(`Processing unknown file type ${extension} as text file`);
            } catch (error) {
                // If unable to process as text, generate a binary file description
                const fileSize = buffer.length;
                text = `[Binary file: ${fileName}]\nFile size: ${fileSize} bytes\nFile type: ${extension || "unknown"}\n`;
            }
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