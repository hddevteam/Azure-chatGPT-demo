// UIStateManager.js
import AIActorSettingsModal from "./AIActorSettingsModal.js";

class UIStateManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.searchQuery = "";
        this.actorSettingsModal = new AIActorSettingsModal(uiManager);
        this.setupSearch();
    }

    toggleVisibility(element) {
        if (element.classList.contains("visible")) {
            element.classList.remove("visible", "active");
            element.classList.add("hidden");
        } else {
            element.classList.remove("hidden");
            element.classList.add("visible", "active");
        }
        this.updateButtonActiveState(element.id, element.classList.contains("visible"));
    }

    hiddenElement(element) {
        element.classList.remove("visible", "active");
        element.classList.add("hidden");
        this.updateButtonActiveState(element.id, false);
    }

    visibleElement(element) {
        element.classList.remove("hidden");
        element.classList.add("visible", "active");
        this.updateButtonActiveState(element.id, true);
    }

    setElementVisibility(element, isVisible) {
        if (isVisible) {
            this.visibleElement(element);
        } else {
            this.hiddenElement(element);
        }
    }

    updateButtonActiveState(elementId, isVisible) {
        // Only manage chat-history-container button state
        // Removed all ai-actor-settings-wrapper button state management
        if (elementId === "chat-history-container") {
            const button = document.getElementById("toggle-chat-topic");
            if (button) {
                if (isVisible) {
                    button.classList.add("active");
                } else {
                    button.classList.remove("active");
                }
            }
        }
    }

    toggleAIActorList() {
        const aiActorList = document.getElementById("ai-actor-container");
        if (aiActorList.getAttribute("data-visible") === "true") {
            this.hideAIActorList();
        } else {
            this.showAIActorList();
        }
    }

    showAIActorList() {
        const aiActorWrapper = document.getElementById("ai-actor-wrapper");
        const overlay = document.querySelector(".modal-overlay");
        
        this.visibleElement(aiActorWrapper);
        aiActorWrapper.setAttribute("data-visible", "true");
        this.visibleElement(overlay);
        
        // Clear search input box
        const searchInput = document.getElementById("ai-actor-search");
        if (searchInput) {
            searchInput.value = "";
            this.searchQuery = "";
        }
        
        // Update list display
        this.updateActorList();
        
        setTimeout(() => {
            document.addEventListener("click", this.uiManager.eventHandler.boundHideAIActorOnOutsideClick);
        }, 0);
    }

    hideAIActorList() {
        const aiActorWrapper = document.getElementById("ai-actor-wrapper");
        const overlay = document.querySelector(".modal-overlay");
        const searchInput = document.getElementById("ai-actor-search");
    
        if (aiActorWrapper.getAttribute("data-visible") === "true") {
            this.hiddenElement(aiActorWrapper);
            aiActorWrapper.setAttribute("data-visible", "false");
            this.hiddenElement(overlay);
    
            // Clear search state
            if (searchInput) {
                searchInput.value = "";
                this.searchQuery = "";
            }
    
            const event = new Event("aiActorListHidden");
            document.dispatchEvent(event);
    
            document.removeEventListener("click", this.uiManager.eventHandler.boundHideAIActorOnOutsideClick);
        }
    }

    showNewAIActorModal() {
        this.hideAIActorList();
        this.uiManager.profileFormManager.resetForm();
        this.uiManager.profileFormManager.oldName = "";
        // Display modal in create mode, without profile data
        this.actorSettingsModal.show(null);
    }

    showEditAIActorModal(profileData) {
        this.hideAIActorList();
        this.uiManager.profileFormManager.bindProfileData(profileData);
        this.uiManager.profileFormManager.oldName = profileData.name;
        // Display modal in edit mode, passing profile data
        this.actorSettingsModal.show(profileData);
    }

    hideNewAIActorModal() {
        this.actorSettingsModal.hide();
    }

    showWelcomeMessage() {
        document.querySelector("#messages").innerHTML = `
            <div id="welcome-message">
            <h2>Welcome to Azure ChatGPT!</h2>
            <p>Your advanced AI assistant powered by:</p>
            <div class="model-list">
                <div class="model-item">🚀 GPT-5 Series</div>
                <div class="model-item">🧠 O-Series Reasoning</div>
                <div class="model-item">🎬 Sora Video Generation</div>
                <div class="model-item">🎙️ GPT Realtime</div>
                <div class="model-item">🎨 GPT-Image</div>
            </div>
            <p class="welcome-sub">Start chatting now to experience the power of these cutting-edge AI models!</p>
            <p class="tip">💡 Tip: When searching with keywords, it will use Bing to find the latest information online.</p>
            </div>
        `;
    }

    setupSearch() {
        const searchInput = document.getElementById("ai-actor-search");
        if (searchInput) {
            searchInput.addEventListener("input", (e) => {
                this.searchQuery = e.target.value.toLowerCase();
                this.updateActorList();
            });
        }
    }

    updateActorList() {
        const aiActorList = document.getElementById("ai-actor-list");
        const profiles = this.uiManager.profiles;
        const currentProfile = this.uiManager.storageManager.getCurrentProfile();
        
        if (!aiActorList || !profiles) return;
        
        aiActorList.innerHTML = "";
        
        const filteredProfiles = this.searchQuery
            ? profiles.filter(profile => 
                profile.displayName.toLowerCase().includes(this.searchQuery) ||
                profile.name.toLowerCase().includes(this.searchQuery))
            : profiles;

        if (filteredProfiles.length === 0) {
            const noResults = document.createElement("li");
            noResults.className = "no-results";
            noResults.textContent = "No matching AI Actors found";
            aiActorList.appendChild(noResults);
            return;
        }

        filteredProfiles.forEach(profile => {
            let li = document.createElement("li");
            li.dataset.profile = profile.name;
            if (currentProfile && profile.name === currentProfile.name) {
                li.classList.add("active");
            }
            
            let icon = document.createElement("i");
            icon.className = profile.icon;
            
            let span = document.createElement("span");
            span.textContent = profile.displayName;
            
            li.appendChild(icon);
            li.appendChild(span);
            aiActorList.appendChild(li);
        });

        this.updateFilterButtonState();
    }

    // Method to temporarily activate a button (for visual feedback)
    temporaryButtonActivation(buttonId, duration = 300) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.classList.add("temp-active");
            setTimeout(() => {
                button.classList.remove("temp-active");
            }, duration);
        }
    }

    updateFilterButtonState() {
        const filterButton = document.getElementById("topic-filter");
        if (!this.uiManager.showAllChatHistories) {
            filterButton.classList.add("filtered");
        } else {
            filterButton.classList.remove("filtered");
        }
    }
}

export default UIStateManager;