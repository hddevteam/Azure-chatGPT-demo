import { generateChatOptions } from "../utils/apiClient.js";
import swal from "sweetalert";

export default class ChatOptionsModal {
    constructor(clientLanguage) {
        this.clientLanguage = clientLanguage;
        this.optionsData = null; // Store options data
        this.createModal();
    }

    createModal() {
        const modalHtml = `
            <div id="chat-options-modal" class="modal">
                <div class="chat-options-modal-content">
                    <div class="modal-body">
                        <div id="loading-options" style="text-align: center; padding: 20px; display: block;">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p style="padding-top: 20px;">Loading configuration options...</p>
                        </div>
                        <form id="chat-options-form">
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" id="apply-options">Apply</button>
                        <button type="button" id="cancel-options">Cancel</button>
                    </div>
                </div>
            </div>`;

        document.body.insertAdjacentHTML("beforeend", modalHtml);
        this.bindEvents();
    }

    bindEvents() {
        const modal = document.getElementById("chat-options-modal");
        const applyBtn = document.getElementById("apply-options");
        const cancelBtn = document.getElementById("cancel-options");

        cancelBtn.onclick = () => this.hideModal();
        applyBtn.onclick = () => this.applyOptions();

        window.onclick = (event) => {
            if (event.target === modal) {
                this.hideModal();
            }
        };
    }

    async showModal(message) {
        const modal = document.getElementById("chat-options-modal");
        const loadingElement = document.getElementById("loading-options");
        const form = document.getElementById("chat-options-form");

        // Show modal and loading state
        modal.style.display = "block";
        loadingElement.style.display = "block";
        form.style.display = "none";

        try {
            const options = await generateChatOptions(message, this.clientLanguage);
            this.optionsData = options; // Save options data
            this.renderOptions(options);
            loadingElement.style.display = "none";
            form.style.display = "block";
        } catch (error) {
            console.error("Error showing chat options:", error);
            swal("Error", "Failed to load chat options", "error");
            this.hideModal();
        }
    }

    hideModal() {
        document.getElementById("chat-options-modal").style.display = "none";
    }

    renderOptions(options) {
        const form = document.getElementById("chat-options-form");
        form.innerHTML = "";

        if (options.basicSettings) {
            this.renderRadioGroup(options.basicSettings);
        }
        if (options.contentCustomization) {
            this.renderCheckboxGroup(options.contentCustomization);
        }
        if (options.expertiseLevel) {
            this.renderSlider(options.expertiseLevel);
        }
    }

    renderRadioGroup(section) {
        const container = document.createElement("div");
        container.className = "options-section";
        container.innerHTML = `<h3>${section.title}</h3>`;

        section.options.forEach(option => {
            container.innerHTML += `
                <div class="radio-option">
                    <input type="radio" id="${option.id}" name="basic-setting" value="${option.id}">
                    <label for="${option.id}">
                        ${option.label}
                        <span class="description">${option.description}</span>
                    </label>
                </div>`;
        });

        document.getElementById("chat-options-form").appendChild(container);
    }

    renderCheckboxGroup(section) {
        const container = document.createElement("div");
        container.className = "options-section";
        container.innerHTML = `<h3>${section.title}</h3>`;

        section.options.forEach(option => {
            container.innerHTML += `
                <div class="checkbox-option">
                    <input type="checkbox" id="${option.id}" name="${option.id}">
                    <label for="${option.id}">
                        ${option.label}
                    </label>
                </div>`;
        });

        document.getElementById("chat-options-form").appendChild(container);
    }

    renderSlider(section) {
        const container = document.createElement("div");
        container.className = "options-section";
        container.innerHTML = `
            <h3>${section.title}</h3>
            <div class="slider-container">
                <div class="slider-input-container">
                    <input type="range" 
                        id="expertise-slider" 
                        min="${section.min}" 
                        max="${section.max}" 
                        value="${section.default}">
                    <div class="slider-labels">
                        ${section.labels.map((label, index) => 
        `<span>${label}</span>`
    ).join("")}
                    </div>
                </div>
            </div>`;

        document.getElementById("chat-options-form").appendChild(container);
    }

    getFormattedOptions() {
        const form = document.getElementById("chat-options-form");
        const basicSetting = this.getBasicSetting(form);
        const contentOptions = this.getContentOptions(form);
        const expertiseLevel = this.getExpertiseLevel(form);

        return {
            basicSetting,
            contentOptions,
            expertiseLevel
        };
    }

    getBasicSetting(form) {
        const basicSettingInput = form.querySelector("input[name=\"basic-setting\"]:checked");
        const selectedOption = this.optionsData.basicSettings.options.find(
            opt => opt.id === basicSettingInput?.value
        );
        return {
            value: basicSettingInput?.value,
            label: selectedOption?.label || "",
            description: selectedOption?.description || ""
        };
    }

    getContentOptions(form) {
        return Array.from(form.querySelectorAll("input[type=\"checkbox\"]:checked"))
            .map(cb => ({
                value: cb.id,
                label: this.optionsData.contentCustomization.options.find(
                    opt => opt.id === cb.id
                )?.label || ""
            }));
    }

    getExpertiseLevel(form) {
        const expertiseLevelValue = form.querySelector("#expertise-slider").value;
        return {
            value: expertiseLevelValue,
            label: this.optionsData.expertiseLevel.labels[expertiseLevelValue - 1] || ""
        };
    }

    getFormattedMessage(originalMessage) {
        const options = this.getFormattedOptions();
        return `${originalMessage}
------------------------------
${this.optionsData.basicSettings.title}: ${options.basicSetting.label} - ${options.basicSetting.description}
${this.optionsData.contentCustomization.title}: ${options.contentOptions.map(opt => opt.label).join(", ")}
${this.optionsData.expertiseLevel.title}: ${options.expertiseLevel.label}
`;
    }

    applyOptions() {
        const messageInput = document.getElementById("message-input");
        const originalMessage = messageInput.value;
        const formattedMessage = this.getFormattedMessage(originalMessage);
        
        messageInput.value = formattedMessage;
        this.hideModal();
    }
}