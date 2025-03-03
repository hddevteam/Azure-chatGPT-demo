// Chat History Resize Handle Functionality
function addChatHistoryResizeHandleListeners() {
    const resizeHandle = document.getElementById("chat-history-resize-handle");
    const chatHistoryContainer = document.getElementById("chat-history-container");
    
    let startX, startWidth;
    
    resizeHandle.addEventListener("mousedown", function(e) {
        startX = e.clientX;
        startWidth = chatHistoryContainer.getBoundingClientRect().width;
        
        document.addEventListener("mousemove", doChatHistoryDrag);
        document.addEventListener("mouseup", stopChatHistoryDrag);
        e.preventDefault();
    });
    
    function doChatHistoryDrag(e) {
        const newWidth = startWidth + (e.clientX - startX);
        // 限制最小和最大宽度
        const limitedWidth = Math.min(Math.max(newWidth, 100), window.innerWidth * 0.6);
        chatHistoryContainer.style.width = `${limitedWidth}px`;
        e.preventDefault();
    }
    
    function stopChatHistoryDrag(e) {
        document.removeEventListener("mousemove", doChatHistoryDrag);
        document.removeEventListener("mouseup", stopChatHistoryDrag);
    }
}

export { addChatHistoryResizeHandleListeners };