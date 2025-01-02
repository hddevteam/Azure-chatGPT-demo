export default class LinkHandler {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.currentPopup = null;
    }

    attachLinkHandlers() {
        // Get all links in message content
        const links = document.querySelectorAll(".message-content a");
        
        links.forEach(link => {
            // Remove existing event listeners
            link.removeEventListener("mouseover", this.handleLinkHover);
            link.removeEventListener("click", this.handleLinkClick);
            
            // Add new event listeners
            link.addEventListener("mouseover", (e) => this.handleLinkHover(e));
            link.addEventListener("click", (e) => this.handleLinkClick(e));
        });
    }

    handleLinkHover(event) {
        const link = event.target;
        const url = link.href;
        
        // Create popup menu
        this.showPopupMenu(event, url);
        
        // Listen for mouse leave event
        link.addEventListener("mouseleave", () => {
            this.hidePopupMenuWithDelay();
        });
    }

    handleLinkClick(event) {
        // On mobile devices, show popup menu on click
        if ("ontouchstart" in window) {
            event.preventDefault();
            const link = event.target;
            const url = link.href;
            this.showPopupMenu(event, url);
        }
    }

    showPopupMenu(event, url) {
        // Remove any existing popup menu
        this.removeCurrentPopup();

        const popup = document.createElement("div");
        popup.className = "link-popup";
        popup.innerHTML = `
            <div class="link-popup-item" data-action="open">Open in New Page</div>
            <div class="link-popup-item" data-action="summary">Quick Summary</div>
        `;

        // Set popup menu position
        const rect = event.target.getBoundingClientRect();
        popup.style.position = "fixed";
        popup.style.left = `${rect.left}px`;
        popup.style.top = `${rect.bottom + 5}px`;

        // Add event listeners
        popup.querySelector("[data-action=\"open\"]").onclick = () => {
            window.open(url, "_blank");
            this.removeCurrentPopup();
        };

        popup.querySelector("[data-action=\"summary\"]").onclick = async () => {
            this.removeCurrentPopup();
            // Use messageInput and submit button to simulate user action
            const messageInput = document.querySelector("#message-input");
            messageInput.value = url;
            const submitButton = document.querySelector("#submitButton");
            submitButton.click();
        };

        // Listen for mouse enter event on popup menu
        popup.addEventListener("mouseenter", () => {
            this.clearHideTimeout();
        });

        // Listen for mouse leave event on popup menu
        popup.addEventListener("mouseleave", () => {
            this.hidePopupMenuWithDelay();
        });

        document.body.appendChild(popup);
        this.currentPopup = popup;
    }

    removeCurrentPopup() {
        if (this.currentPopup) {
            this.currentPopup.remove();
            this.currentPopup = null;
        }
    }

    clearHideTimeout() {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
    }

    hidePopupMenuWithDelay() {
        this.clearHideTimeout();
        this.hideTimeout = setTimeout(() => {
            this.removeCurrentPopup();
        }, 300); // 300ms delay to give user time to move to popup menu
    }
}
