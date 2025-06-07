// MessageProcessorFactory.js - Message Processor Factory
import TextMessageProcessor from "./TextMessageProcessor.js";
import ImageMessageProcessor from "./ImageMessageProcessor.js";
import ImageEditMessageProcessor from "./ImageEditMessageProcessor.js";
import ProfileMessageProcessor from "./ProfileMessageProcessor.js";
import DocumentMessageProcessor from "./DocumentMessageProcessor.js";

class MessageProcessorFactory {
    constructor(messageManager) {
        this.messageManager = messageManager;
        this.textProcessor = new TextMessageProcessor(messageManager);
        this.imageProcessor = new ImageMessageProcessor(messageManager);
        this.imageEditProcessor = new ImageEditMessageProcessor(messageManager);
        this.profileProcessor = new ProfileMessageProcessor(messageManager);
        this.documentProcessor = new DocumentMessageProcessor(messageManager);
    }

    // Create appropriate processor based on message type
    getProcessor(message, attachments = []) {
        // Check if it's a document processing request
        if (DocumentMessageProcessor.isDocumentRequest(attachments)) {
            return this.documentProcessor;
        }
        
        // Check if it's an image edit request
        if (ImageEditMessageProcessor.isImageEditRequest(message)) {
            return this.imageEditProcessor;
        }
        
        // Check if it's an image generation request
        if (ImageMessageProcessor.isImageRequest(message)) {
            return this.imageProcessor;
        }
        
        // Check if it's a profile request
        if (ProfileMessageProcessor.isProfileRequest(message)) {
            return this.profileProcessor;
        }
        
        // Default to text message processor
        return this.textProcessor;
    }
}

export default MessageProcessorFactory;