// AIProfileManager.js - 管理 AI Profile 状态的组件
class AIProfileManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.currentProfile = null;
        this.profiles = [];
        this.setupEventListeners();
    }

    setupEventListeners() {
        // 监听 AI Actor 列表的点击事件，使用事件委托
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

    // 初始化 AI Profile 状态
    initialize(currentProfile, profiles) {
        this.profiles = profiles || [];
        this.currentProfile = currentProfile;
        this.updateUIState();
        
        // Make sure TTS visibility is updated during initialization
        if (this.uiManager.storageManager) {
            this.uiManager.storageManager.updateTtsVisibility();
        }
    }

    // 更新 UI 状态 - 移除表单绑定逻辑
    updateUIState() {
        if (!this.currentProfile) return;
        
        // 更新 AI Profile 按钮显示
        const aiProfile = document.querySelector("#ai-profile");
        if (aiProfile) {
            aiProfile.innerHTML = `<i class="${this.currentProfile.icon}"></i> ${this.currentProfile.displayName}`;
        }

        // 更新 AI Actor 列表的激活状态
        const aiActorList = document.querySelector("#ai-actor-list");
        if (aiActorList) {
            const items = aiActorList.querySelectorAll("li");
            items.forEach(item => {
                const isActive = item.dataset.profile === this.currentProfile.name;
                item.classList.toggle("active", isActive);
            });
        }
    }

    // 根据点击切换到新的 Profile
    async switchToProfile(profile, isNewTopic = false) {
        if (!profile) {
            // 如果没有提供 profile 或 profile 不存在，切换到第一个可用的 profile
            if (this.profiles && this.profiles.length > 0) {
                profile = this.profiles[0];
                console.log("No valid profile provided, switching to the first available profile:", profile.name);
            } else {
                console.error("No profiles available to switch to");
                return;
            }
        }

        // 检查是否切换到相同的 profile
        if (this.currentProfile && this.currentProfile.name === profile.name && !isNewTopic) {
            console.log("Switching to the same profile, skip update");
            return;
        }

        // 更新存储的当前 Profile
        this.currentProfile = profile;
        
        // 更新存储
        this.uiManager.storageManager.setCurrentProfile(profile);
        
        // 更新 UI 状态
        this.updateUIState();

        // 生成或获取聊天 ID
        const chatId = isNewTopic ? 
            this.uiManager.chatHistoryManager.generateChatId(
                this.uiManager.storageManager.getCurrentUsername(), 
                profile.name
            ) :
            this.getExistingChatId(profile);

        // 切换到新的聊天主题
        await this.uiManager.changeChatTopic(chatId, isNewTopic);

        // 如果是新话题并且已经打开了 AI Actor 列表，则隐藏它
        if (isNewTopic) {
            this.uiManager.hideAIActorList();
        }
    }

    // 根据聊天历史获取现有的聊天 ID
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

    // 根据 Profile 名称获取 Profile 对象
    getProfileByName(profileName) {
        return this.profiles.find(p => p.name === profileName);
    }

    // 获取当前 Profile
    getCurrentProfile() {
        return this.currentProfile;
    }

    // 更新 Profiles 列表
    updateProfiles(profiles) {
        if (!profiles || profiles.length === 0) return;
        
        this.profiles = profiles;
        
        // 如果当前 profile 不在新列表中，切换到第一个
        if (!this.profiles.find(p => p.name === this.currentProfile?.name)) {
            this.switchToProfile(this.profiles[0]);
        }
        
        // 确保 UI 状态更新
        this.updateUIState();
    }
}

export default AIProfileManager;