// MessageUIHandler.js - Handles message UI related functions
import { marked } from "marked";
import { generateExcerpt } from "../../utils/textUtils.js";
import MarkdownRenderer from "../../utils/MarkdownRenderer.js";
import swal from "sweetalert";

class MessageUIHandler {
    constructor(messageManager) {
        this.messageManager = messageManager;
        this.uiManager = messageManager.uiManager;
        
        // Make sure we have access to the uiManager before trying to access its properties
        if (!this.uiManager) {
            console.error("UIManager is undefined in MessageUIHandler constructor");
            throw new Error("UIManager is undefined in MessageUIHandler constructor");
        }
        
        this.domManager = this.uiManager.domManager;
        this.eventManager = this.uiManager.eventManager;
        this.linkHandler = messageManager.linkHandler;
    }

    // Add message to DOM
    addMessage(sender, message, messageId, isActive = true, position = "bottom", isError = false, attachmentUrls = "") {
        // Clear welcome message
        const welcomeMessage = document.querySelector("#welcome-message");
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        // Create message element
        const messageElement = this.domManager.createMessageElement(sender, messageId, isActive, isError);
        messageElement.dataset.message = message;
        messageElement.dataset.sender = sender;
        messageElement.dataset.attachmentUrls = attachmentUrls;
        
        // Get full message data from storage, including search results
        const storedMessage = this.uiManager.storageManager.getMessage(
            this.uiManager.currentChatId,
            messageId
        );

        if (storedMessage && storedMessage.searchResults) {
            // Update message manager's search results state
            this.messageManager.searchResults = storedMessage.searchResults;
        }

        // Add conversation element
        const conversationElement = this.domManager.createConversationElement();
        messageElement.appendChild(conversationElement);
        this.eventManager.attachToggleActiveMessageEventListener(conversationElement);

        // Add maximize button
        const maximizeElement = this.domManager.createMaximizeButtonElement();
        messageElement.appendChild(maximizeElement);
        this.eventManager.attachMaximizeMessageEventListener(maximizeElement);

        // Add menu button
        const menuButtonElement = this.domManager.createMenuButtonElement();
        messageElement.appendChild(menuButtonElement);

        // Add popup menu
        const popupMenuElement = this.domManager.createPopupMenuElement(!isActive);
        messageElement.appendChild(popupMenuElement);
        this.eventManager.attachMenuButtonEventListener(menuButtonElement);
        this.eventManager.attachPopupMenuItemEventListener(popupMenuElement);

        // Add attachment container
        if (attachmentUrls !== "") {
            const attachmentContainer = this.domManager.createAttachmentThumbnails(attachmentUrls);
            messageElement.appendChild(attachmentContainer);
        }

        // Add message content
        const messageContentElement = sender === "user" ? document.createElement("pre") : document.createElement("div");
        messageContentElement.classList.add("message-content");
        messageElement.appendChild(messageContentElement);

        // Handle citations and search results
        if (sender === "assistant") {
            // Handle citations
            message = this.processCitationsInMessage(message);
            
            // Add search results (if any) - use stored search results
            const currentSearchResults = storedMessage?.searchResults || this.messageManager.searchResults;
            if (currentSearchResults && Array.isArray(currentSearchResults) && currentSearchResults.length > 0) {
                messageElement.appendChild(this.createSearchSourcesElement(currentSearchResults));
            }
        }

        // Set message content
        const codeBlocksWithCopyElements = this.setMessageContent(sender, messageElement, message, isActive);

        // Collapse inactive messages
        if (!isActive) {
            messageElement.classList.add("collapsed");
        }

        // Add icon group
        const iconGroup = this.domManager.createIconGroup();

        // Add copy button
        const copyElement = this.domManager.createCopyElement();
        iconGroup.appendChild(copyElement);

        // Add retry button (user messages)
        if (sender === "user") {
            const retryElement = this.domManager.createRetryElement();
            iconGroup.appendChild(retryElement);
            this.eventManager.attachRetryMessageEventListener(retryElement, messageId);
        }

        // Add text-to-speech button (if enabled)
        if (this.uiManager.storageManager.getCurrentProfile() && this.uiManager.storageManager.getCurrentProfile().tts === "enabled") {
            const speakerElement = this.domManager.createSpeakerElement();
            iconGroup.appendChild(speakerElement);
        }

        // Add icon group to message element
        messageElement.appendChild(iconGroup);

        // Add message element to message container
        const messagesContainer = document.querySelector("#messages");
        if (position === "top") {
            messagesContainer.insertBefore(messageElement, messagesContainer.firstChild);
        } else {
            messagesContainer.appendChild(messageElement);
        }

        // Attach event listeners
        this.attachEventListeners(messageElement, codeBlocksWithCopyElements);

        // Handle think block copy buttons
        this.attachThinkBlockCopyListeners(messageElement);

        // Auto scroll to bottom
        if (position === "bottom") {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        return messageElement;
    }

    // Attach event listeners
    attachEventListeners(messageElement, codeBlocksWithCopyElements) {
        const currentSpeaker = messageElement.querySelector(".message-speaker");
        this.eventManager.attachMessageSpeakerEvent(currentSpeaker);

        // Auto play (if enabled)
        const autoPlay = this.uiManager.app.ttsPracticeMode && messageElement.dataset.sender === "assistant";
        if (autoPlay) {
            this.uiManager.playMessage(currentSpeaker);
        }

        // Add copy functionality
        const currentCopy = messageElement.querySelector(".message-copy:not(.code-block-copy)");
        this.eventManager.attachMessageCopyEvent(currentCopy);
        
        // Add copy functionality for code blocks
        codeBlocksWithCopyElements.forEach(({ codeBlock, copyElement }) => {
            this.eventManager.attachCodeBlockCopyEvent(codeBlock, copyElement);
        });

        // Image preview functionality
        this.eventManager.attachImagePreviewEvent();
        
        // Update maximize button visibility
        setTimeout(() => this.eventManager.updateMaximizeButtonVisibility(messageElement), 0);

        // Attach event listeners for citations
        this.attachCitationListeners(messageElement.querySelectorAll(".citation"));
    }

    // Set message content
    setMessageContent(sender, messageElem, message, isActive) {

        let element;
        if (sender === "user") {
            element = messageElem.querySelector("pre");
            element.innerText = isActive ? message : this.getMessagePreview(message);
        } else {
            element = messageElem.querySelector("div.message-content");
            
            try {
                // Use new MarkdownRenderer to handle message content
                const messageToRender = isActive ? message : this.getMessagePreview(message || "");
                element.innerHTML = MarkdownRenderer.render(messageToRender);
            } catch (error) {
                console.error("Error rendering markdown:", error);
                // Fallback to original marked as a backup
                const messageHtml = isActive 
                    ? marked.parse(message || "")
                    : marked.parse(this.getMessagePreview(message || ""));
                element.innerHTML = messageHtml;
            }
        }
    
        // Handle code blocks
        const codeBlocks = element.querySelectorAll("pre > code, pre code");
        const codeBlocksWithCopyElements = [];
    
        for (let i = 0; i < codeBlocks.length; i++) {
            const codeBlock = codeBlocks[i];
            const copyElement = this.domManager.createCopyElement();
    
            // Create container for code block
            const wrapper = document.createElement("div");
            wrapper.classList.add("code-block-wrapper");
            wrapper.style.position = "relative";
            codeBlock.parentNode.insertBefore(wrapper, codeBlock);
            wrapper.appendChild(codeBlock);
            wrapper.appendChild(copyElement);
            copyElement.classList.add("code-block-copy");
    
            codeBlocksWithCopyElements.push({ codeBlock, copyElement });
        }

        // Handle links
        if (sender === "assistant") {
            setTimeout(() => {
                this.linkHandler.attachLinkHandlers();
            }, 0);
        }
    
        return codeBlocksWithCopyElements;
    }

    // Create search sources element
    createSearchSourcesElement(searchResults = null) {
        const sources = searchResults || this.messageManager.searchResults;
        if (!sources || !Array.isArray(sources) || sources.length === 0) {
            return null;
        }

        const sourcesElement = document.createElement("div");
        sourcesElement.className = "search-sources";
        sourcesElement.innerHTML = `<details>
            <summary>Search Sources (${sources.length})</summary>
            <div class="sources-list">
                ${sources.map((result, index) => `
                    <div class="source-item">
                        <span class="source-number">[${index + 1}]</span>
                        <a href="${result.url}" target="_blank" rel="noopener noreferrer">
                            ${result.title}${result.date ? ` (${new Date(result.date).toLocaleDateString()})` : ""}
                        </a>
                    </div>
                `).join("")}
            </div>
        </details>`;
        return sourcesElement;
    }

    // Handle citations in message
    processCitationsInMessage(message) {
        if (!this.messageManager.searchResults || !Array.isArray(this.messageManager.searchResults)) {
            return message;
        }

        // First handle Markdown links to avoid conflicts with citations
        const linkMap = new Map();
        let linkCounter = 0;
        message = message.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match) => {
            const placeholder = `__LINK_${linkCounter}__`;
            linkMap.set(placeholder, match);
            linkCounter++;
            return placeholder;
        });

        // Handle citations
        message = message.replace(/\[citation:(\d+)\]/g, (match, citationNum) => {
            const index = parseInt(citationNum) - 1;
            if (index < 0 || index >= this.messageManager.searchResults.length) {
                return match; // If citation number is out of range, keep the original text
            }
            const result = this.messageManager.searchResults[index];
            if (!result) return match;
            
            const date = result.date ? ` (${new Date(result.date).toLocaleDateString()})` : "";
            return `<span class="citation" data-url="${result.url}" data-title="${result.title}${date}">${match}</span>`;
        });

        // Restore Markdown links
        linkMap.forEach((value, key) => {
            message = message.replace(key, value);
        });

        return message;
    }

    // Attach event listeners for citations
    attachCitationListeners(citations) {
        citations.forEach(citation => {
            citation.addEventListener("mouseover", () => {
                const tooltip = document.createElement("div");
                tooltip.className = "citation-tooltip";
                tooltip.innerHTML = `
                    <div class="tooltip-title">${citation.dataset.title}</div>
                    <div class="tooltip-url">${citation.dataset.url}</div>
                `;
                document.body.appendChild(tooltip);

                const rect = citation.getBoundingClientRect();
                const isSplitView = document.body.classList.contains("split-view");
                
                // Adjust tooltip position in split view mode
                if (isSplitView) {
                    const messageContainer = document.querySelector("#messages");
                    const containerRect = messageContainer.getBoundingClientRect();
                    tooltip.style.left = `${Math.min(rect.left, containerRect.right - tooltip.offsetWidth - 20)}px`;
                } else {
                    tooltip.style.left = `${rect.left}px`;
                }
                
                tooltip.style.top = `${rect.bottom + 5}px`;

                // Remove tooltip on mouse out
                const handleMouseOut = () => {
                    tooltip.remove();
                    citation.removeEventListener("mouseout", handleMouseOut);
                };
                citation.addEventListener("mouseout", handleMouseOut);
            });

            citation.addEventListener("click", (event) => {
                event.preventDefault();
                window.open(citation.dataset.url, "_blank", "noopener,noreferrer");
            });
        });
    }

    // Get message preview content
    getMessagePreview(message, maxLength = 80) {
        let previewText = message.replace(/\n/g, " ");
        if (previewText.length > maxLength) {
            return previewText.substring(0, maxLength - 3) + "...";
        }
        return previewText;
    }

    // Toggle message collapse state
    toggleCollapseMessage(messageElement, forceCollapse) {
        const isCurrentlyCollapsed = messageElement.classList.contains("collapsed");
        if ((forceCollapse && !isCurrentlyCollapsed) || (!forceCollapse && isCurrentlyCollapsed)) {
            const isCollapsed = messageElement.classList.toggle("collapsed");
            const updatedMessage = isCollapsed ? this.getMessagePreview(messageElement.dataset.message) : messageElement.dataset.message;
            const sender = messageElement.dataset.sender;

            const newCodeBlocksWithCopyElements = this.setMessageContent(sender, messageElement, updatedMessage, !isCollapsed);

            newCodeBlocksWithCopyElements.forEach(({ codeBlock, copyElement }) => {
                this.eventManager.attachCodeBlockCopyEvent(codeBlock, copyElement);
            });

            this.eventManager.updateMaximizeButtonVisibility(messageElement);

            this.updateToggleItemUI(messageElement, isCollapsed);
        }
    }

    // Update toggle item UI
    updateToggleItemUI(messageElement, isCollapsed) {
        const toggleItem = messageElement.querySelector(".toggle-item");
        if (toggleItem) {
            toggleItem.dataset.collapsed = isCollapsed ? "true" : "false";
            const span = toggleItem.querySelector("span");
            span.textContent = isCollapsed ? "Expand" : "Collapse";

            // Get Font Awesome icon element
            const icon = toggleItem.querySelector("i");
            // Change class based on message collapse state
            if (isCollapsed) {
                icon.classList.replace("fa-chevron-up", "fa-chevron-down");
            } else {
                icon.classList.replace("fa-chevron-down", "fa-chevron-up");
            }
        }
    }

    // Add follow-up questions
    addFollowUpQuestions(questions) {
        const followUpQuestionsElement = document.createElement("div");
        followUpQuestionsElement.classList.add("follow-up-questions");

        questions.forEach((question) => {
            const questionElement = document.createElement("button");
            questionElement.textContent = question;
            this.eventManager.attachQuestionButtonEvent(questionElement, question);
            followUpQuestionsElement.appendChild(questionElement);
        });

        const messagesContainer = document.querySelector("#messages");
        messagesContainer.appendChild(followUpQuestionsElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Clear follow-up questions
    clearFollowUpQuestions() {
        const followUpQuestionsElement = document.querySelector("#messages .follow-up-questions");
        if (followUpQuestionsElement) {
            followUpQuestionsElement.remove();
        }
    }

    // Delete message
    deleteMessage(messageId, isMute = false) {
        // Silent mode directly deletes
        if (isMute) {
            this.messageManager.deleteMessageInStorage(messageId);
            return;
        }

        // Get message element
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (!messageElement) {
            console.error(`Message element with ID ${messageId} not found in DOM`);
            return;
        }

        // Get message preview text
        const message = messageElement.dataset.message;
        const previewText = this.getMessagePreview(message, 500);
        
        // Show confirmation dialog
        this._showDeleteConfirmDialog(messageId, previewText);
    }

    // Show delete confirmation dialog
    _showDeleteConfirmDialog(messageId, previewText) {
        swal({
            title: "Are you sure you want to delete this message?",
            text: previewText,
            icon: "warning",
            buttons: {
                cancel: "Cancel",
                delete: {
                    text: "Delete",
                    value: "delete",
                    className: "swal-button--danger"
                }
            },
            dangerMode: true
        }).then(value => {
            if (value === "delete") {
                this._startMessageDeletion(messageId);
            }
        });
    }

    // Start message deletion process
    _startMessageDeletion(messageId) {
        // Show loading state while deleting
        const loadingDialog = swal({
            text: "Deleting message...",
            icon: "info",
            buttons: false,
            closeOnClickOutside: false,
            closeOnEsc: false
        });

        // Perform delete operation
        this.messageManager.deleteMessageInStorage(messageId)
            .then(result => {
                // Ensure loading dialog is closed first
                swal.close();
                
                // Then show success message
                if (result) {
                    setTimeout(() => {
                        swal("Message deleted", { 
                            icon: "success", 
                            buttons: false, 
                            timer: 1000 
                        });
                    }, 100);
                }
            })
            .catch(error => {
                // Ensure loading dialog is closed first
                swal.close();
                
                // Then show error message
                console.error("Error during message deletion:", error);
                setTimeout(() => {
                    swal("Deletion failed", "Message has been deleted locally but may not have been synced to the cloud", "warning");
                }, 100);
            });
    }

    // Inactivate message
    inactiveMessage(messageId) {
        const message = document.querySelector(`[data-message-id="${messageId}"]`);
        this.uiManager.app.prompts.removePrompt(messageId);
        if (message) {
            message.classList.remove("active");
            this.toggleCollapseMessage(message, true);
        }
    }

    // Attach event listeners for think block copy buttons
    attachThinkBlockCopyListeners(messageElement) {
        const thinkBlockCopyButtons = messageElement.querySelectorAll(".think-block-copy");
        
        thinkBlockCopyButtons.forEach(button => {
            button.addEventListener("click", () => {
                const thinkBlockId = button.getAttribute("data-think-id");
                const thinkBlock = document.getElementById(thinkBlockId);
                
                if (thinkBlock) {
                    const thinkContent = decodeURIComponent(thinkBlock.getAttribute("data-think-content"));
                    
                    navigator.clipboard.writeText(thinkContent)
                        .then(() => {
                            // Show copied state
                            button.classList.add("copied");
                            button.innerHTML = "<i class=\"fas fa-check\"></i> Copied";
                            
                            // Restore original state after 3 seconds
                            setTimeout(() => { 
                                button.classList.remove("copied");
                                button.innerHTML = "<i class=\"fas fa-copy\"></i> Copy";
                            }, 3000);
                        })
                        .catch(err => {
                            console.error("Could not copy think block text: ", err);
                        });
                }
            });
        });
    }
}

export default MessageUIHandler;