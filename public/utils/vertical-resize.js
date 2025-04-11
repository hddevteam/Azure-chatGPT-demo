// Vertical Resize Handle Functionality
function addVerticalResizeHandleListeners() {
    const resizeHandle = document.getElementById("resize-handle");
    const messageInputContainer = document.getElementById("message-input-container"); // Assuming it's the correct container
    
    let startY, startHeight;
    
    // Event listener for when the mouse is pressed down over the handle
    resizeHandle.addEventListener("mousedown", function(e) {
        startY = e.clientY;
        startHeight = messageInputContainer.offsetHeight;
        document.addEventListener("mousemove", resize);
        document.addEventListener("mouseup", stopResize);
        e.preventDefault();
    });

    // Function to handle the resize operation
    function resize(e) {
        const currentY = e.clientY;
        const heightDelta = currentY - startY;
        const newHeight = Math.max(startHeight - heightDelta, 100); // 增加最小高度以确保按钮行可见
        messageInputContainer.style.height = `${newHeight}px`;

        // 重置input-container的内边距，让按钮行有足够的空间
        const inputContainer = document.getElementById("input-container");
        inputContainer.style.paddingBottom = "";  // 移除固定的padding-bottom
    }

    // Function to stop the resize operation
    function stopResize(e) {
        document.removeEventListener("mousemove", resize);
        document.removeEventListener("mouseup", stopResize);
    }
}

// Export the functionality to allow its importation in index.js or other scripts
export { addVerticalResizeHandleListeners };
