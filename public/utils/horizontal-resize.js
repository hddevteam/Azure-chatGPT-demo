// Horizontal Resize Handle Functionality
function addHorizontalResizeHandleListeners() {
    const horizontalResizeHandle = document.getElementById("horizontal-resize-handle");
    const appContainer = document.getElementById("app-container");
    
    let startX, startWidth;
    
    // Event listener for when the mouse is pressed down over the handle
    horizontalResizeHandle.addEventListener("mousedown", function(e) {
        startX = e.clientX;
        startWidth = appContainer.getBoundingClientRect().width;
        
        // Set initial style
        appContainer.style.flex = "none";
        appContainer.style.width = `${startWidth}px`;
        
        // Add resizing class for styling
        horizontalResizeHandle.classList.add("resizing");
        
        document.addEventListener("mousemove", resize);
        document.addEventListener("mouseup", stopResize);
        e.preventDefault();
    });

    // Function to handle the resize operation
    function resize(e) {
        const currentX = e.clientX;
        const widthDelta = currentX - startX;
        const newWidth = Math.max(startWidth + widthDelta, 100); // Minimum width
        const maxWidth = window.innerWidth * 0.9; // Maximum width (90% of window)
        appContainer.style.width = `${Math.min(newWidth, maxWidth)}px`;
        e.preventDefault();
    }

    // Function to stop the resize operation
    function stopResize() {
        // Remove resizing class
        horizontalResizeHandle.classList.remove("resizing");
        
        document.removeEventListener("mousemove", resize);
        document.removeEventListener("mouseup", stopResize);
    }
}

// Export the functionality
export { addHorizontalResizeHandleListeners };
