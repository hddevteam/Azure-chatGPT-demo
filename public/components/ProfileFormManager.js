import { getPromptRepo } from "../utils/api.js";

// ProfileFormManager.js
export default class ProfileFormManager {
    constructor(storageManager,saveProfileCallback, showMessageCallback, deleteProfileCallback) {
        this.storageManager = storageManager; // Instance of StorageManager
        this.saveProfileCallback = saveProfileCallback; // Callback function to save profile data
        this.showMessageCallback = showMessageCallback;
        this.deleteProfileCallback = deleteProfileCallback;
        this.initForm();
        this.bindEvents();
        this.oldName = ""; // Initialize without an old name
    }

    initForm() {
        // Initialize form elements
        this.formElements = {
            prompt: document.getElementById("prompt"),
            temperature: document.getElementById("temperature"),
            top_p: document.getElementById("top_p"),
            frequency_penalty: document.getElementById("frequency_penalty"),
            presence_penalty: document.getElementById("presence_penalty"),
            max_tokens: document.getElementById("max_tokens"),
            name: document.getElementById("name"),
            icon: document.getElementById("icon"),
            displayName: document.getElementById("displayName"),
            tts: document.getElementById("tts"),
            sortedIndex: document.getElementById("sortedIndex"),
        };
    }

    bindEvents() {
        // Bind the save action
        document.getElementById("save-profile").addEventListener("click", () => this.saveProfile());
        // 修改此处：为"generate-prompt"按钮添加点击事件监听器
        document.getElementById("generate-prompt").addEventListener("click", () => {
        // 从prompt字段获取当前内容
            const promptContent = this.formElements.prompt.value;
            this.showMessageCallback("Generating profile...", "info");
            // 将prompt字段的内容作为参数传递给generateProfile方法
            this.generateProfile(promptContent);
        });
        this.formElements.icon.addEventListener("change", () => {
            // 获取icon输入框的值
            const iconClass = this.formElements.icon.value;
            // 将icon-preview的class设置为icon输入框的值
            document.getElementById("icon-preview").className = iconClass;
        });

        document.getElementById("delete-profile").addEventListener("click", () => this.deleteCurrentProfile());
    }

    // ProfileFormManager.js 中新增方法
    deleteCurrentProfile() {
        const currentProfileName = this.storageManager.getCurrentProfile().name;
        const username = this.storageManager.getCurrentUsername();
        fetch(`/api/profiles/${currentProfileName}?username=${username}`, {
            method: "DELETE"
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error("Network response was not ok");
                }
                return response.json();
            })
            .then(() => {
                console.log("Profile deleted successfully.");
                getPromptRepo(username).then(data => {
                    this.deleteProfileCallback(data);
                });
            })
            .catch(error => {
                console.error("Error during profile deletion:", error);
                this.showMessageCallback("Failed to delete profile.", "error");
            });
    }


    /**
     * 生成AI角色的配置文件
     * @param {*} profession 
     * @returns 
     */
    generateProfile(profession) {
        return fetch("/api/create-chat-profile", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ profession })
        })
            .then(response => response.json())
            .then(data => {
                // 将获取到的数据动态填充到表单中
                this.formElements.prompt.value = data.prompt;
                if (this.formElements.name.value === "") {
                    this.formElements.name.value = data.name;
                }
                this.formElements.icon.value = data.icon;
                this.formElements.displayName.value = data.displayName;
                // 更新icon-preview的类
                document.getElementById("icon-preview").className = data.icon;
                this.showMessageCallback("Profile generated successfully.", "success");
            })
            .catch(error => {
                console.error("Error generating profile:", error);
                this.showMessageCallback("Error generating profile. Please try again.", "error");});
    }


    bindProfileData(profileData) {
        // Directly bind provided profile data to form inputs
        Object.keys(this.formElements).forEach(key => {
            if (this.formElements[key].type === "checkbox") {
                this.formElements[key].checked = profileData[key] || false;
            } else {
                this.formElements[key].value = profileData[key] || "";
                if (key === "icon") {
                    document.getElementById("icon-preview").className = profileData[key] || "";
                }
            }
        });
    }

    saveProfile() {
        const profile = {
            name: document.getElementById("name").value || `AI${Math.floor(Math.random() * 1000)}`,
            icon: document.getElementById("icon").value||"fas fa-user",
            displayName: document.getElementById("displayName").value || document.getElementById("name").value, // If displayName is empty, use name
            prompt: document.getElementById("prompt").value,
            tts: document.getElementById("tts").value,
            sortedIndex: document.getElementById("sortedIndex").value,
            temperature: document.getElementById("temperature").value,
            top_p: document.getElementById("top_p").value,
            frequency_penalty: document.getElementById("frequency_penalty").value,
            presence_penalty: document.getElementById("presence_penalty").value,
            max_tokens: document.getElementById("max_tokens").value,
        };
        console.log("Saving profile:", profile);
        const username = this.storageManager.getCurrentUsername();
        const isNewProfile = !this.oldName;
        const method = isNewProfile ? "POST" : "PUT";
        const endpoint = `/api/profiles${isNewProfile ? "" : "/" + this.oldName}?username=${username}`;

        fetch(endpoint, {
            method: method,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(profile)
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error("Network response was not ok");
                }
                return response.json();
            })
            .then(() => {
                this.storageManager.setCurrentProfile(profile); // 设置新保存的Profile为当前Profile
                console.log("Profile saved successfully.");                
                this.saveProfileCallback(profile, isNewProfile); 
                this.showMessageCallback(isNewProfile ? "Profile created successfully!" : "Profile updated successfully!", "success"); 
            })
            .catch(error => console.error("Error saving profile:", error));
    }
    
    resetForm() {
        // Reset the form after saving
        document.querySelectorAll("#ai-actor-settings-inner-form-wrapper input[type=\"text\"], #ai-actor-settings-inner-form-wrapper input[type=\"number\"], #ai-actor-settings-inner-form-wrapper select, #ai-actor-settings-inner-form-wrapper textarea").forEach(input => {
            input.value = "";
        });
        // Reset specific fields with default values if necessary
    }
    
}
