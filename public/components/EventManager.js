// EventManager.js
import ClipboardJS from "clipboard";
class EventManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
    }

    attachImagePreviewEvent() {
        document.querySelectorAll(".message-attachment-thumbnail").forEach(imgElement => {
            imgElement.addEventListener("click", () => {
                const imageUrl = imgElement.src;
                document.getElementById("image-modal").style.display = "block";
                document.getElementById("img-modal-content").src = imageUrl;

                // Bind a new click event to the download button to handle the download
                const downloadBtn = document.getElementById("download-btn");
                downloadBtn.onclick = function() {
                    // Create a temporary <a> element for downloading
                    const tempLink = document.createElement("a");
                    tempLink.href = imageUrl;
                    // Get or set the default file name based on the image URL (using timestamp)
                    const urlParts = imageUrl.split("/");
                    tempLink.download = urlParts[urlParts.length - 1] || `img-${new Date().getTime()}.jpg`;
                    // Simulate click
                    tempLink.click();
                };
            });
        });

        document.querySelector("#image-modal .close").addEventListener("click", function() {
            document.getElementById("image-modal").style.display = "none";
        });
    }


    // attach speaker event to message speaker
    attachMessageSpeakerEvent(speaker) {
        if (!speaker) {
            return;
        }
        speaker.addEventListener("click", async () => {
            await this.uiManager.playMessage(speaker);
        });
    }

    toggleActiveMessage(event) {
        const messageElement = event.currentTarget.parentElement;
        const messageId = messageElement.dataset.messageId;

        if (messageElement.classList.contains("active")) {
            messageElement.classList.remove("active");
            this.uiManager.app.prompts.removePrompt(messageId);
            // Call the method with forceCollapse = true
            this.uiManager.messageManager.toggleCollapseMessage(messageElement, true);
        } else {
            messageElement.classList.add("active");
            this.uiManager.app.prompts.clear();
            const activeMessages = this.uiManager.domManager.getActiveMessages();
            activeMessages.forEach(activeMessage => {
                this.uiManager.app.prompts.addPrompt({ role: activeMessage.dataset.sender, content: activeMessage.dataset.message, messageId: activeMessage.dataset.messageId, attachmentUrls: activeMessage.dataset.attachmentUrls});
            });
            // Call the method with forceCollapse = false
            this.uiManager.messageManager.toggleCollapseMessage(messageElement, false);
        }

        const isActive = messageElement.classList.contains("active");
        this.uiManager.storageManager.saveMessageActiveStatus(this.uiManager.currentChatId, messageId, isActive);
        const updatedMessage = this.uiManager.storageManager.getMessage(this.uiManager.currentChatId, messageId);
        this.uiManager.syncManager.syncMessageUpdate(this.uiManager.currentChatId, updatedMessage);
    }

    // Create a new method for attaching a toggle active message event listener
    attachToggleActiveMessageEventListener(element) {
        element.addEventListener("click", this.toggleActiveMessage.bind(this));
    }

    // Create a new method for attaching a delete message event listener
    attachDeleteMessageEventListener(element) {
        element.addEventListener("click", () => {
            const messageId = element.parentElement.dataset.messageId;
            const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);

            // Check if the message is an error message
            const isError = messageElement.classList.contains("error-message");

            // If it's an error message, delete it without confirmation
            if (isError) {
                this.uiManager.messageManager.deleteMessageInStorage(messageId);
            } else {
                this.uiManager.messageManager.deleteMessage(messageId);
            }
        });
    }

    // Add this method to attach a retry message event listener
    attachRetryMessageEventListener(retryElement, messageId) {
        retryElement.addEventListener("click", async () => {
            await this.uiManager.messageManager.retryMessage(messageId);
        });
    }

    // implement attachMessageCopyEvent function
    attachMessageCopyEvent(messageCopy) {
        // Instantiate clipboard.js
        var clipboard = new ClipboardJS(messageCopy, {
            text: function (trigger) {
                // Get the data-message attribute content of the grandparent node
                var message = trigger.parentNode.parentNode.getAttribute("data-message");
                var sender = trigger.parentNode.parentNode.getAttribute("data-sender");

                // Convert HTML escape characters to normal characters
                const textElement = document.createElement("textarea");
                textElement.innerHTML = message;
                message = textElement.value;

                // If it is an assistant message, remove <think> tag content
                if (sender === "assistant") {
                    message = message.replace(/<think>[\s\S]*?<\/think>/g, "");
                }

                return message;
            }
        });

        const self = this;
        clipboard.on("success", function () {
            self.uiManager.showToast("copied successful");
        });
        clipboard.on("error", function () {
            self.uiManager.showToast("copied failed");
        });
    }

    attachMaximizeMessageEventListener(maximizeElement) {
        maximizeElement.addEventListener("click", () => {
            const messageElement = maximizeElement.parentElement;
            const messageContentElement = messageElement.querySelector(".message-content");
            const isCurrentlyMaximized = messageContentElement.classList.contains("maximized");
            if (isCurrentlyMaximized) {
                messageContentElement.classList.remove("maximized");
                //<i class="maximize-button fas fa-angles-down" title="Maximize the message content area" aria-hidden="true" style="display: none;"></i>
                // replace the fas fa-angles-down with fas fa-angles-up
                maximizeElement.classList.remove("fa-angles-up");
                maximizeElement.classList.add("fa-angles-down");
            } else {
                messageContentElement.classList.add("maximized");
                maximizeElement.classList.remove("fa-angles-down");
                maximizeElement.classList.add("fa-angles-up");
            }
        });
    }

    updateMaximizeButtonVisibility(messageElement) {
        const messageContentElement = messageElement.querySelector(".message-content");
        const maximizeButtonElement = messageElement.querySelector(".maximize-button");
        const isOverflowing = messageContentElement.scrollHeight > messageContentElement.clientHeight;
        maximizeButtonElement.style.display = isOverflowing ? "block" : "none";
    }

    attachCodeBlockCopyEvent(codeBlock, copyElement) {
        // Instantiate clipboard.js
        var clipboard = new ClipboardJS(copyElement, {
            text: function () {
                // Get the text content of the code element
                const codeText = codeBlock.textContent;
                console.log(codeText);
                return codeText;
            }
        });

        const self = this;
        clipboard.on("success", function () {
            self.uiManager.showToast("copied successful");
        });
        clipboard.on("error", function () {
            self.uiManager.showToast("copied failed");
        });
    }

    attachMenuButtonEventListener(menuButton) {
        menuButton.addEventListener("click", (event) => {
            const popupMenu = menuButton.nextSibling;
            popupMenu.style.display = popupMenu.style.display === "none" ? "block" : "none";
            event.stopPropagation();
        });

        document.addEventListener("click", () => {
            menuButton.nextSibling.style.display = "none";
        });
    }

    attachPopupMenuItemEventListener(popupMenu) {

        const editItem = popupMenu.querySelector(".edit-item");
        editItem.addEventListener("click", () => {
            const messageElement = popupMenu.parentElement;
            const message = messageElement.dataset.message;
            const messageId = messageElement.dataset.messageId;
            const attachmentUrls = messageElement.dataset.attachmentUrls || "";

            // Set the currently selected message ID
            this.uiManager.selectedMessageId = messageId;

            // Check if it is an image editing message
            if (message.startsWith("/gpt-image-1-edit") && attachmentUrls) {
                // Add image preview
                this.showImagePreviewForEdit(message, attachmentUrls);
            }

            this.uiManager.messageManager.editMessage(message, messageId);
        });

        const moveToNewTopicItem = popupMenu.querySelector(".movetonewtopic-item");
        moveToNewTopicItem.addEventListener("click", () => {
            const messageId = popupMenu.parentElement.dataset.messageId;
            this.uiManager.moveToNewTopic(messageId);
        });

        const deleteItem = popupMenu.querySelector(".delete-item");
        deleteItem.addEventListener("click", () => {
            const messageId = popupMenu.parentElement.dataset.messageId;
            this.uiManager.messageManager.deleteMessage(messageId);
        });

        const copyItem = popupMenu.querySelector(".copy-item");
        copyItem.addEventListener("click", () => {
            const message = popupMenu.parentElement.dataset.message;
            const sender = popupMenu.parentElement.dataset.sender;

            // If it is an assistant message, remove <think> tag content
            let contentToCopy = message;
            if (sender === "assistant") {
                contentToCopy = message.replace(/<think>[\s\S]*?<\/think>/g, "");
            }

            navigator.clipboard.writeText(contentToCopy);
            this.uiManager.showToast("copied successful");
        });

        const toggleItem = popupMenu.querySelector(".toggle-item");
        toggleItem.addEventListener("click", () => {
            const messageElement = popupMenu.parentElement;
            const isCurrentlyCollapsed = messageElement.classList.contains("collapsed");

            // If the message is collapsed, we expand it, and vice versa.
            this.uiManager.messageManager.toggleCollapseMessage(messageElement, !isCurrentlyCollapsed);
        });
    }

    attachQuestionButtonEvent(questionElement, question) {
        questionElement.addEventListener("click", async () => {
            // Use `question` as the message to send to AI
            this.uiManager.messageInput.value += question;
        });
    }



    // Mount floating edit button event using event delegation
    attachFloatingEditButtonEvent() {
        document.addEventListener("click", (e) => {
            const editButton = e.target.closest(".message-image-edit-btn");
            if (!editButton) return;

            e.stopPropagation(); // Prevent event bubbling to avoid triggering image preview
            
            // Get message element and current message ID
            const messageElement = editButton.closest(".message");
            if (!messageElement) {
                console.error("Message element not found");
                return;
            }

            const currentMessageId = messageElement.dataset.messageId;
            if (!currentMessageId) {
                console.error("Message ID not found");
                return;
            }

            const imgElement = editButton.closest(".message-image-wrapper").querySelector(".message-attachment-thumbnail");
            if (!imgElement) {
                console.error("Image element not found");
                return;
            }

            const imageUrl = imgElement.src;
            
            // Set currently selected message ID, this is the image source used during editing
            this.uiManager.selectedMessageId = currentMessageId;
            this.uiManager.selectedImageUrl = imageUrl;
            
            // Prepare for editing
            const messageInput = document.getElementById("message-input");
            if (messageInput) {
                messageInput.value = "/gpt-image-1-edit ";
                messageInput.focus();
            }

            // Prepare preview area
            const previewList = document.getElementById("attachment-preview-list");
            const attachmentContainer = document.getElementById("attachment-preview-container");

            if (!previewList || !attachmentContainer) {
                console.error("Preview container not found");
                return;
            }

            // Clear existing preview
            previewList.innerHTML = "";

            // Create preview item
            const previewItem = document.createElement("div");
            previewItem.classList.add("attachment-preview-item");
            previewItem.dataset.url = imageUrl;
            previewItem.dataset.isExisting = "true";
            previewItem.dataset.sourceMessageId = currentMessageId;

            const fileName = imageUrl.split("/").pop() || "image.png";
            let fileType = "image/png";
            if (fileName.toLowerCase().endsWith(".jpg") || fileName.toLowerCase().endsWith(".jpeg")) {
                fileType = "image/jpeg";
            } else if (fileName.toLowerCase().endsWith(".webp")) {
                fileType = "image/webp";
            } else if (fileName.toLowerCase().endsWith(".gif")) {
                fileType = "image/gif";
            }

            previewItem.dataset.fileType = fileType;
            previewItem.dataset.fileName = fileName;

            previewItem.innerHTML = `
                <div class="attachment-thumbnail" style="background-image: url('${imageUrl}')">
                    <div class="attachment-delete-btn"><i class="fas fa-times"></i></div>
                </div>
                <div class="attachment-file-name">${fileName}</div>`;

            // Add delete button event
            const deleteBtn = previewItem.querySelector(".attachment-delete-btn");
            deleteBtn.addEventListener("click", (evt) => {
                evt.stopPropagation();
                previewItem.remove();
                if (previewList.children.length === 0) {
                    attachmentContainer.classList.add("hidden");
                }
                // Clear selected state
                this.uiManager.selectedMessageId = null;
                this.uiManager.selectedImageUrl = null;
            });

            // Add to preview area
            previewList.appendChild(previewItem);
            attachmentContainer.classList.remove("hidden");

            console.log("Set up image edit:", {
                messageId: currentMessageId,
                imageUrl: imageUrl,
                fileType: fileType,
                fileName: fileName
            });
        });
    }

    // Unified method for handling image preview and editing settings
    showImagePreviewForEdit(messageId, imageUrl) {
        console.log("Handling image edit:", {
            messageId: messageId,
            imageUrl: imageUrl
        });

        // Set current message ID
        if (this.uiManager) {
            this.uiManager.selectedMessageId = messageId;
            console.log("Set selectedMessageId in UIManager:", messageId);
        }

        // Set edit command
        const messageInput = document.getElementById("message-input");
        if (messageInput) {
            messageInput.value = "/gpt-image-1-edit ";
            messageInput.focus();
        }

        // Prepare preview area
        const previewList = document.getElementById("attachment-preview-list");
        const attachmentContainer = document.getElementById("attachment-preview-container");

        if (!previewList || !attachmentContainer) {
            console.error("Preview container not found");
            return;
        }

        // Clear existing preview
        previewList.innerHTML = "";

        // Create preview item
        const previewItem = document.createElement("div");
        previewItem.classList.add("attachment-preview-item");
        previewItem.dataset.url = imageUrl;
        previewItem.dataset.isExisting = "true";

        const fileName = imageUrl.split("/").pop() || "image.jpg";
        let fileType = "image/jpeg";
        if (fileName.toLowerCase().endsWith(".png")) {
            fileType = "image/png";
        } else if (fileName.toLowerCase().endsWith(".webp")) {
            fileType = "image/webp";
        } else if (fileName.toLowerCase().endsWith(".gif")) {
            fileType = "image/gif";
        }

        previewItem.dataset.fileType = fileType;
        previewItem.dataset.fileName = fileName;

        previewItem.innerHTML = `
            <div class="attachment-thumbnail" style="background-image: url('${imageUrl}')">
                <div class="attachment-delete-btn"><i class="fas fa-times"></i></div>
            </div>
            <div class="attachment-file-name">${fileName} (original)</div>`;

        const deleteBtn = previewItem.querySelector(".attachment-delete-btn");
        deleteBtn.addEventListener("click", (evt) => {
            evt.stopPropagation();
            previewItem.remove();
            if (previewList.children.length === 0) {
                attachmentContainer.classList.add("hidden");
            }
        });

        // Save edit context
        window.imageEditContext = {
            messageId: messageId,
            imageUrl: imageUrl,
            fileType: fileType,
            fileName: fileName
        };
        console.log("Stored image edit context:", window.imageEditContext);

        previewList.appendChild(previewItem);
        attachmentContainer.classList.remove("hidden");
    }

}

export default EventManager;
