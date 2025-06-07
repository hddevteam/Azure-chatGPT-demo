// AIProfileManager.js - Component for managing AI Profile state
class AIProfileManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.currentProfile = null;
        this.profiles = [];
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for AI Actor list click events, using event delegation
        document.addEventListener("click", (event) => {
            const listItem = event.target.closest("#ai-actor-list li");
            if (!listItem) return;
            
            const profileName = listItem.dataset.profile;
            if (!profileName) return;

            const profile = this.getProfileByName(profileName);
            if (profile) {
                this.switchToProfile(profile, true);
            }
        });
    }

    // Initialize AI Profile state
    initialize(currentProfile, profiles) {
        this.profiles = profiles || [];
        this.currentProfile = currentProfile;
        this.updateUIState();
        
        // Make sure TTS visibility is updated during initialization
        if (this.uiManager.storageManager) {
            this.uiManager.storageManager.updateTtsVisibility();
        }
    }

    // Update UI state - remove form binding logic
    updateUIState() {
        if (!this.currentProfile) return;
        
        // Update AI Profile button display
        const aiProfile = document.querySelector("#ai-profile");
        if (aiProfile) {
            aiProfile.innerHTML = `<i class="${this.currentProfile.icon}"></i> ${this.currentProfile.displayName}`;
        }

        // Update AI Actor list active state
        const aiActorList = document.querySelector("#ai-actor-list");
        if (aiActorList) {
            const items = aiActorList.querySelectorAll("li");
            items.forEach(item => {
                const isActive = item.dataset.profile === this.currentProfile.name;
                item.classList.toggle("active", isActive);
            });
        }
    }

    // Switch to new Profile based on click
    async switchToProfile(profile, isNewTopic = false) {
        if (!profile) {
            // If no profile provided or profile doesn't exist, switch to first available profile
            if (this.profiles && this.profiles.length > 0) {
                profile = this.profiles[0];
                console.log("No valid profile provided, switching to the first available profile:", profile.name);
            } else {
                console.error("No profiles available to switch to");
                return;
            }
        }

        // Check if switching to the same profile
        if (this.currentProfile && this.currentProfile.name === profile.name && !isNewTopic) {
            console.log("Switching to the same profile, skip update");
            return;
        }

        // Update stored current Profile
        this.currentProfile = profile;
        
        // Update storage
        this.uiManager.storageManager.setCurrentProfile(profile);
        
        // Update UI state
        this.updateUIState();

        // Generate or get chat ID
        const chatId = isNewTopic ? 
            this.uiManager.chatHistoryManager.generateChatId(
                this.uiManager.storageManager.getCurrentUsername(), 
                profile.name
            ) :
            this.getExistingChatId(profile);

        // Switch to new chat topic
        await this.uiManager.changeChatTopic(chatId, isNewTopic);

        // If it's a new topic and AI Actor list is already open, hide it
        if (isNewTopic) {
            this.uiManager.hideAIActorList();
        }
    }

    // Get existing chat ID based on chat history
    getExistingChatId(profile) {
        const chatHistory = this.uiManager.chatHistoryManager.getChatHistory();
        const latestChat = chatHistory.find(history => history.profileName === profile.name);
        return latestChat ? 
            latestChat.id : 
            this.uiManager.chatHistoryManager.generateChatId(
                this.uiManager.storageManager.getCurrentUsername(), 
                profile.name
            );
    }

    // Get Profile object by Profile name
    getProfileByName(profileName) {
        return this.profiles.find(p => p.name === profileName);
    }

    // Get current Profile
    getCurrentProfile() {
        return this.currentProfile;
    }

    // Update Profiles list
    updateProfiles(profiles) {
        if (!profiles || profiles.length === 0) return;
        
        this.profiles = profiles;
        
        // If current profile is not in new list, switch to first one
        if (!this.profiles.find(p => p.name === this.currentProfile?.name)) {
            this.switchToProfile(this.profiles[0]);
        }
        
        // Ensure UI state is updated
        this.updateUIState();
    }
}

export default AIProfileManager;