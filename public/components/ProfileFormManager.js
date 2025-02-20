import { getPromptRepo } from "../utils/apiClient.js";
import { deleteProfile, createChatProfile, saveOrUpdateProfile } from "../utils/apiClient.js";
import swal from "sweetalert";

// ProfileFormManager.js
export default class ProfileFormManager {
    constructor(uiManager,saveProfileCallback, deleteProfileCallback, hideElementCallback) {
        this.uiManager = uiManager; // Instance of UIManager
        this.storageManager = uiManager.storageManager; // Instance of StorageManager
        this.saveProfileCallback = saveProfileCallback; // Callback function to save profile data
        this.deleteProfileCallback = deleteProfileCallback;
        this.hideElementCallback = hideElementCallback;
        this.initForm();
        this.bindEvents();
        this.oldName = ""; // Initialize without an old name
    }

    showMessage(message, messageType, closeSetting = false) {
        swal(message, { icon: messageType, button: false, timer: 1500 })
            .then(() => {
                if (closeSetting) {
                    if (window.innerWidth < 768)
                        this.hideElementCallback();
                }
            });
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
            // 将prompt字段的内容作为参数传递给generateProfile方法
            this.generateProfile(promptContent);
        });
        this.formElements.icon.addEventListener("change", () => {
            // 获取icon输入框的值
            const iconClass = this.formElements.icon.value;
            // 将icon-preview的class设置为icon输入框的值
            document.getElementById("icon-preview").className = iconClass;
        });

        document.getElementById("export-profile").addEventListener("click", () => this.exportProfile());
        document.getElementById("import-profile").addEventListener("click", () => this.importProfile());

        document.getElementById("delete-profile").addEventListener("click", () => this.deleteCurrentProfile());
    }

    exportProfile() {
        const profileData = {
            name: this.formElements.name.value,
            icon: this.formElements.icon.value,
            displayName: this.formElements.displayName.value,
            prompt: this.formElements.prompt.value,
            tts: this.formElements.tts.value,
            sortedIndex: this.formElements.sortedIndex.value,
            temperature: this.formElements.temperature.value,
            top_p: this.formElements.top_p.value,
            frequency_penalty: this.formElements.frequency_penalty.value,
            presence_penalty: this.formElements.presence_penalty.value,
            max_tokens: this.formElements.max_tokens.value,
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(profileData));
        const downloadAnchorNode = document.createElement("a");
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `${profileData.name}_ai.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    checkAndAdjustName(profile) {
        const existingNames = this.uiManager.profiles.map(p => p.name.replace(/_/g, "-"));
        const existingDisplayNames = this.uiManager.profiles.map(p => p.displayName);
    
        // 检查并调整 name，使用减号代替下划线
        let newName = profile.name.replace(/_/g, "-");
        let counter = 1;
        while (existingNames.includes(newName) || existingDisplayNames.includes(newName)) {
            newName = `${profile.name.replace(/_/g, "-")}${counter}`;
            counter++;
        }
        profile.name = newName;
    
        // 检查并调整 displayName
        let newDisplayName = profile.displayName || newName;
        counter = 1;
        while (existingDisplayNames.includes(newDisplayName) || existingNames.includes(newDisplayName)) {
            newDisplayName = `${profile.displayName || profile.name}${counter}`;
            counter++;
        }
        profile.displayName = newDisplayName;
    }

    importProfile() {
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "application/json";
        fileInput.onchange = e => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = event => {
                const obj = JSON.parse(event.target.result);
                this.bindProfileData(obj);
                this.oldName = ""; // 确保视为新的Profile
                this.saveProfile(); 
            };
            reader.readAsText(file);
        };
        fileInput.click();
    }
    
    // ProfileFormManager.js 中新增方法
    deleteCurrentProfile() {
        const currentProfileName = this.storageManager.getCurrentProfile().name;
        const username = this.storageManager.getCurrentUsername();
        deleteProfile(currentProfileName, username)
            .then(() => {
                console.log("Profile deleted successfully.");
                getPromptRepo(username).then(data => {
                    this.deleteProfileCallback(data);
                });
            })
            .catch(error => {
                console.error("Error during profile deletion:", error);
                this.showMessage("Failed to delete profile.", "error");
            });
    }


    /**
     * 生成AI角色的配置文件
     * @param {*} profession 
     * @returns 
     */
    generateProfile(profession) {
        swal({
            text: "Generating profile...",
            button: false,
            closeOnClickOutside: false,
            closeOnEsc: false,
        });
        return createChatProfile({ profession })
            .then(data => {
                swal.close();
                // 将获取到的数据动态填充到表单中
                this.formElements.prompt.value = data.prompt;
                if (this.formElements.name.value === "") {
                    this.formElements.name.value = data.name;
                }
                this.formElements.icon.value = data.icon;
                this.formElements.displayName.value = data.displayName;
                // 更新icon-preview的类
                document.getElementById("icon-preview").className = data.icon;
                this.showMessage("Profile generated successfully.", "success");
            })
            .catch(error => {
                swal.close();
                console.error("Error generating profile:", error);
                this.showMessage("Error generating profile. Please try again.", "error");
            });
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
        const randomName = `AI${Math.floor(Math.random() * 1000)}`;
        const profile = {
            name: document.getElementById("name").value || randomName,
            icon: document.getElementById("icon").value||"fas fa-user",
            displayName: document.getElementById("displayName").value || randomName, // If displayName is empty, use name
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

        if (isNewProfile) {
            this.checkAndAdjustName(profile);
        }

        saveOrUpdateProfile(profile, username, isNewProfile, this.oldName)
            .then(() => {
                this.storageManager.setCurrentProfile(profile); // 设置新保存的Profile为当前Profile
                console.log("Profile saved successfully.");                
                this.saveProfileCallback(profile, isNewProfile); 
                this.showMessage(isNewProfile ? "Profile created successfully!" : "Profile updated successfully!", "success", true); 
            })
            .catch(error => {
                console.error("Error saving profile:", error);
                this.showMessage("Failed to save profile. Please try again.", "error");
            });
    }
    
    resetForm() {
        // Reset the form after saving
        document.querySelectorAll("#ai-actor-settings-inner-form-wrapper input[type=\"text\"], #ai-actor-settings-inner-form-wrapper input[type=\"number\"], #ai-actor-settings-inner-form-wrapper select, #ai-actor-settings-inner-form-wrapper textarea").forEach(input => {
            input.value = "";
        });
        // Reset specific fields with default values if necessary
    }
    
}
