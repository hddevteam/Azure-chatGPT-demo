// services/pptxProcessor.js
const unzipper = require("unzipper");
const xml2js = require("xml2js");

class PPTXProcessor {
    constructor() {
        this.parser = new xml2js.Parser();
    }

    async extractText(buffer) {
        try {
            const directory = await unzipper.Open.buffer(buffer);
            let slideTexts = [];

            // Find all slide files
            const slideFiles = directory.files.filter(file => 
                file.path.match(/ppt\/slides\/slide[0-9]+\.xml/)
            ).sort((a, b) => {
                // Sort by slide number
                const numA = parseInt(a.path.match(/slide([0-9]+)\.xml/)[1]);
                const numB = parseInt(b.path.match(/slide([0-9]+)\.xml/)[1]);
                return numA - numB;
            });

            // Process each slide
            for (const slideFile of slideFiles) {
                const content = await slideFile.buffer();
                const slideContent = await this.parser.parseStringPromise(content);
                const slideText = this.extractSlideText(slideContent);
                if (slideText.trim()) {
                    const slideNum = slideFile.path.match(/slide([0-9]+)\.xml/)[1];
                    slideTexts.push(`[Slide ${slideNum}]\n${slideText}\n`);
                }
            }

            return slideTexts.join("\n");
        } catch (error) {
            console.error("Error processing PPTX:", error);
            throw new Error(`Failed to process PPTX file: ${error.message}`);
        }
    }

    extractSlideText(slideContent) {
        const texts = [];
        
        // Traverse slide content to extract text
        if (slideContent && slideContent["p:sld"] && slideContent["p:sld"]["p:cSld"]) {
            const shapes = slideContent["p:sld"]["p:cSld"][0]["p:spTree"][0]["p:sp"] || [];
            
            for (const shape of shapes) {
                if (shape["p:txBody"]) {
                    const paragraphs = shape["p:txBody"][0]["a:p"] || [];
                    
                    for (const paragraph of paragraphs) {
                        const runs = paragraph["a:r"] || [];
                        const paragraphText = runs
                            .map(run => (run["a:t"] || []).join(" "))
                            .filter(text => text.trim())
                            .join(" ");
                            
                        if (paragraphText.trim()) {
                            texts.push(paragraphText);
                        }
                    }
                }
            }
        }
        
        return texts.join("\n");
    }
}

module.exports = PPTXProcessor;