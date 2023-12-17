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
        const newHeight = Math.max(startHeight - heightDelta, 50); // Enforce a minimum height
        messageInputContainer.style.height = `${newHeight}px`;

        // Maybe you want to do something with the paddingBottom as well?
        const inputContainter = document.getElementById("input-container");
        inputContainter.style.paddingBottom = "50px";
    }

    // Function to stop the resize operation
    function stopResize(e) {
        document.removeEventListener("mousemove", resize);
        document.removeEventListener("mouseup", stopResize);
    }
}

// Export the functionality to allow its importation in index.js or other scripts
export { addVerticalResizeHandleListeners };
