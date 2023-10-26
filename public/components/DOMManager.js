// DOMManager.js
import { marked } from "marked";
import { formatTime } from "../utils/timeUtils.js";


class DOMManager {
    constructor(deleteChatHistoryHandler, editChatHistoryHandler) {
        this.deleteChatHistoryHandler = deleteChatHistoryHandler;
        this.editChatHistoryHandler = editChatHistoryHandler;
    }

    // Create a new method for creating the delete element
    createDeleteElement() {
        const deleteElement = document.createElement("i");
        deleteElement.classList.add("message-delete");
        deleteElement.classList.add("fas");
        deleteElement.classList.add("fa-times");
        return deleteElement;
    }

    // Create a new method for creating the icon group
    createIconGroup() {
        const iconGroup = document.createElement("div");
        iconGroup.classList.add("icon-group");
        return iconGroup;
    }

    // Create a new method for creating the copy element
    createCopyElement() {
        const copyElement = document.createElement("i");
        copyElement.classList.add("message-copy");
        copyElement.classList.add("fas");
        copyElement.classList.add("fa-copy");
        return copyElement;
    }

    // Create a new method for creating the speaker element
    createSpeakerElement() {
        const speakerElement = document.createElement("i");
        speakerElement.classList.add("message-speaker");
        speakerElement.classList.add("fas");
        speakerElement.classList.add("fa-volume-off");
        return speakerElement;
    }

    // Create a new method for creating the message element
    createMessageElement(sender, messageId, isActive, isError) {
        const messageElement = document.createElement("div");
        messageElement.classList.add("message");
        messageElement.classList.add(`${sender}-message`);
        messageElement.dataset.sender = sender;
        messageElement.dataset.messageId = messageId;
        if (isActive) {
            messageElement.classList.add("active");
        }
        if (isError) {
            messageElement.classList.add("error-message");
        }
        return messageElement;
    }

    // Create a new method for creating the message content element
    createMessageContentElement(sender, message, isActive) {
        if (sender === "user") {
            const pre = document.createElement("pre");
            pre.innerText = isActive ? message : this.getMessagePreview(message); // Set full text if active, else set preview text
            return { element: pre, codeBlocksWithCopyElements: [] };
        } else {
            const messageHtmlElement = document.createElement("div");
            const messageHtml = marked.parse(message);
            messageHtmlElement.innerHTML = isActive ? messageHtml : marked.parse(this.getMessagePreview(message));
            const codeBlocks = messageHtmlElement.querySelectorAll("pre > code, pre code");
            const codeBlocksWithCopyElements = []; // Create an array to store codeBlock and copyElement pairs
            for (let i = 0; i < codeBlocks.length; i++) {
                const codeBlock = codeBlocks[i];
                const copyElement = this.createCopyElement();
                const wrapper = document.createElement("div");
                wrapper.classList.add("code-block-wrapper");
                wrapper.style.position = "relative";
                codeBlock.parentNode.insertBefore(wrapper, codeBlock);
                wrapper.appendChild(codeBlock);
                wrapper.appendChild(copyElement);
                copyElement.classList.add("code-block-copy");
                codeBlocksWithCopyElements.push({ codeBlock, copyElement }); // Add the codeBlock and copyElement pair to the array
            }
            return { element: messageHtmlElement, codeBlocksWithCopyElements };
        }
    }

    // Create a new method for creating the conversation element
    createConversationElement() {
        const conversationElement = document.createElement("i");
        conversationElement.title = "Hide/Show the message in current conversation";
        conversationElement.classList.add("fas");
        conversationElement.classList.add("fa-quote-left");
        return conversationElement;
    }

    getActiveMessages() {
        return document.querySelectorAll(".message.active");
    }

    // Add this method to create a retry element
    createRetryElement() {
        const retryElement = document.createElement("i");
        retryElement.className = "fas fa-sync-alt message-retry";
        return retryElement;
    }

    toggleSpeakerIcon(speaker) {
        speaker.classList.toggle("fa-volume-off");
        speaker.classList.toggle("fa-volume-up");
    }
    
    removeChatHistoryItem(chatId) {
        const listItemElement = document.querySelector(`.chat-history-item[data-id="${chatId}"]`);
        if (listItemElement) {
            listItemElement.remove();
        }
    }

    updateChatHistoryItem(chatHistoryItem, profile) {
        // First remove the old list item
        this.removeChatHistoryItem(chatHistoryItem.id);

        // Then add the new list item
        this.appendChatHistoryItem(chatHistoryItem, profile);
    }

    createChatHistoryItem(history, profile) {
        const listItemElement = document.createElement("li");
        listItemElement.classList.add("chat-history-item");
        listItemElement.dataset.id = history.id; 

        const profileIconElement = document.createElement("i");
        profile.icon.split(" ").forEach(cls => profileIconElement.classList.add(cls));
        listItemElement.appendChild(profileIconElement);

        const titleElement = document.createElement("span");
        titleElement.textContent = history.title;
        listItemElement.appendChild(titleElement);

        const createdAtElement = document.createElement("small");
        createdAtElement.textContent = formatTime(history.createdAt);
        
        listItemElement.appendChild(createdAtElement);

        const deleteButton = this.createChatHistoryActionButton("fa fa-trash", () => {
            this.deleteChatHistoryHandler(history.id);
        });

        const editButton = this.createChatHistoryActionButton("fa fa-edit", () => {
            this.editChatHistoryHandler(history.id);
        });

        listItemElement.appendChild(deleteButton);
        listItemElement.appendChild(editButton);

        listItemElement.addEventListener("mouseenter", () => {
            deleteButton.classList.remove("invisible");
            editButton.classList.remove("invisible");
        });

        listItemElement.addEventListener("mouseleave", () => {
            deleteButton.classList.add("invisible");
            editButton.classList.add("invisible");
        });

        return listItemElement;
    }

    renderChatHistoryList(chatHistory, profiles) {
        const chatHistoryListElement = document.querySelector("#chat-history-list");
        chatHistoryListElement.innerHTML = "";
        chatHistory.forEach(history => {
            const profile = profiles.find(profile => profile.name === history.profileName);
            const listItemElement = this.createChatHistoryItem(history, profile);
            chatHistoryListElement.appendChild(listItemElement);
        });
    }

    appendChatHistoryItem(chatHistoryItem, profile) {
        const chatHistoryListElement = document.querySelector("#chat-history-list");
        const listItemElement = this.createChatHistoryItem(chatHistoryItem, profile);
        chatHistoryListElement.prepend(listItemElement);  
    }

    createChatHistoryActionButton(iconClass, clickHandler) {
        const buttonElement = document.createElement("button");
        buttonElement.classList.add("action-button", "invisible");

        const iconElement = document.createElement("i");
        iconElement.classList.add(...iconClass.split(" "));
        buttonElement.appendChild(iconElement);

        buttonElement.addEventListener("click", event => {
            event.stopPropagation();
            clickHandler();
        });

        return buttonElement;
    }

}

export default DOMManager;
