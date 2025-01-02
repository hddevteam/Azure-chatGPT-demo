export default class LinkHandler {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.currentPopup = null;
    }

    attachLinkHandlers() {
        // 获取所有消息内容中的链接
        const links = document.querySelectorAll(".message-content a");
        
        links.forEach(link => {
            // 移除已有的事件监听器
            link.removeEventListener("mouseover", this.handleLinkHover);
            link.removeEventListener("click", this.handleLinkClick);
            
            // 添加新的事件监听器
            link.addEventListener("mouseover", (e) => this.handleLinkHover(e));
            link.addEventListener("click", (e) => this.handleLinkClick(e));
        });
    }

    handleLinkHover(event) {
        const link = event.target;
        const url = link.href;
        
        // 创建弹出菜单
        this.showPopupMenu(event, url);
        
        // 监听鼠标离开事件
        link.addEventListener("mouseleave", () => {
            this.hidePopupMenuWithDelay();
        });
    }

    handleLinkClick(event) {
        // 在移动设备上，点击时显示弹出菜单
        if ("ontouchstart" in window) {
            event.preventDefault();
            const link = event.target;
            const url = link.href;
            this.showPopupMenu(event, url);
        }
    }

    showPopupMenu(event, url) {
        // 移除任何现有的弹出菜单
        this.removeCurrentPopup();

        const popup = document.createElement("div");
        popup.className = "link-popup";
        popup.innerHTML = `
            <div class="link-popup-item" data-action="open">Open in New Page</div>
            <div class="link-popup-item" data-action="summary">Summarize Content</div>
        `;

        // 设置弹出菜单位置
        const rect = event.target.getBoundingClientRect();
        popup.style.position = "fixed";
        popup.style.left = `${rect.left}px`;
        popup.style.top = `${rect.bottom + 5}px`;

        // 添加事件监听器
        popup.querySelector("[data-action=\"open\"]").onclick = () => {
            window.open(url, "_blank");
            this.removeCurrentPopup();
        };

        popup.querySelector("[data-action=\"summary\"]").onclick = async () => {
            this.removeCurrentPopup();
            // 使用 messageInput 和提交按钮来模拟用户操作
            const messageInput = document.querySelector("#message-input");
            messageInput.value = url;
            const submitButton = document.querySelector("#submitButton");
            submitButton.click();
        };

        // 监听鼠标进入弹出菜单
        popup.addEventListener("mouseenter", () => {
            this.clearHideTimeout();
        });

        // 监听鼠标离开弹出菜单
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
        }, 300); // 300ms延迟，给用户时间移动到弹出菜单
    }
}
