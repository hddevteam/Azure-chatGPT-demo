// Horizontal Resize Handle Functionality
function addHorizontalResizeHandleListeners() {
    const horizontalResizeHandle = document.getElementById("horizontal-resize-handle");
    const appContainer = document.getElementById("app-container");
    
    let startHorizX, startHorizWidthAppContainer;
    
    horizontalResizeHandle.addEventListener("mousedown", function(e) {
        startHorizX = e.clientX;
        startHorizWidthAppContainer = appContainer.getBoundingClientRect().width;
    
        appContainer.style.flex = "none";
        appContainer.style.width = `${startHorizWidthAppContainer}px`;
        
        document.addEventListener("mousemove", doHorizontalDrag, false);
        document.addEventListener("mouseup", stopHorizontalDrag, false);
        e.preventDefault();
    }, false);
    
    function doHorizontalDrag(e) {
        let newWidthAppContainer = startHorizWidthAppContainer + e.clientX - startHorizX;
        newWidthAppContainer = Math.max(newWidthAppContainer, 100);
        newWidthAppContainer = Math.min(newWidthAppContainer, window.innerWidth * 0.9);
        appContainer.style.width = `${newWidthAppContainer}px`;
        e.preventDefault();
    }
    
    function stopHorizontalDrag(e) {
        document.removeEventListener("mousemove", doHorizontalDrag, false);
        document.removeEventListener("mouseup", stopHorizontalDrag, false);
    }
}

// Export the functionality to be imported in index.js or wherever it's required
export { addHorizontalResizeHandleListeners };
