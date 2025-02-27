// MessageProcessorFactory.js - 消息处理器工厂
import TextMessageProcessor from "./TextMessageProcessor.js";
import ImageMessageProcessor from "./ImageMessageProcessor.js";
import ProfileMessageProcessor from "./ProfileMessageProcessor.js";
import DocumentMessageProcessor from "./DocumentMessageProcessor.js";

class MessageProcessorFactory {
    constructor(messageManager) {
        this.messageManager = messageManager;
        this.textProcessor = new TextMessageProcessor(messageManager);
        this.imageProcessor = new ImageMessageProcessor(messageManager);
        this.profileProcessor = new ProfileMessageProcessor(messageManager);
        this.documentProcessor = new DocumentMessageProcessor(messageManager);
    }

    // 根据消息类型创建合适的处理器
    getProcessor(message, attachments = []) {
        // 检查是否是文档处理请求
        if (DocumentMessageProcessor.isDocumentRequest(attachments)) {
            return this.documentProcessor;
        }
        
        // 检查是否是图片生成请求
        if (ImageMessageProcessor.isImageRequest(message)) {
            return this.imageProcessor;
        }
        
        // 检查是否是配置文件请求
        if (ProfileMessageProcessor.isProfileRequest(message)) {
            return this.profileProcessor;
        }
        
        // 默认为文本消息处理器
        return this.textProcessor;
    }
}

export default MessageProcessorFactory;