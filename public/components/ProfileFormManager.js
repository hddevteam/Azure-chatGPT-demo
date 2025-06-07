import { getPromptRepo } from "../utils/apiClient.js";
import { deleteProfile, createChatProfile, saveOrUpdateProfile } from "../utils/apiClient.js";
import swal from "sweetalert";

// ProfileFormManager.js
export default class ProfileFormManager {
    constructor(uiManager, onSaveCallback, onDeleteCallback, onFormCloseCallback) {
        this.uiManager = uiManager;
        this.onSaveCallback = onSaveCallback;
        this.onDeleteCallback = onDeleteCallback;
        this.onFormCloseCallback = onFormCloseCallback;
        this.oldName = "";
        this.storageManager = this.uiManager.storageManager; // Initialize storageManager property
        this.initForm(); // Ensure form elements are initialized in constructor
        this.bindEvents();
    }

    showMessage(message, messageType, closeSetting = false) {
        swal(message, { icon: messageType, button: false, timer: 1500 })
            .then(() => {
                if (closeSetting) {
                    if (window.innerWidth < 768)
                        this.onFormCloseCallback();
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
        const saveProfileBtn = document.getElementById("save-profile");
        const deleteProfileBtn = document.getElementById("delete-profile");
        const exportProfileBtn = document.getElementById("export-profile");
        const importProfileBtn = document.getElementById("import-profile");
        const generatePromptBtn = document.getElementById("generate-prompt");

        if (saveProfileBtn) {
            saveProfileBtn.addEventListener("click", async (event) => {
                event.preventDefault();
                await this.handleSave();
            });
        }

        // Modified to listen for deleteConfirmed event instead of direct click event
        if (deleteProfileBtn) {
            deleteProfileBtn.addEventListener("deleteConfirmed", async () => {
                await this.handleDelete();
            });
        }

        if (exportProfileBtn) {
            exportProfileBtn.addEventListener("click", () => {
                this.handleExport();
            });
        }

        if (importProfileBtn) {
            importProfileBtn.addEventListener("click", () => {
                this.handleImport();
            });
        }

        if (generatePromptBtn) {
            generatePromptBtn.addEventListener("click", async () => {
                await this.handleGeneratePrompt();
            });
        }

        // Listen for icon preview
        const iconInput = document.getElementById("icon");
        if (iconInput) {
            iconInput.addEventListener("input", () => {
                this.updateIconPreview();
            });
        }
    }

    updateIconPreview() {
        const iconPreview = document.getElementById("icon-preview");
        if (iconPreview) {
            iconPreview.className = this.formElements.icon.value;
        }
    }

    handleExport() {
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
    
        // Check and adjust name, using hyphens instead of underscores
        let newName = profile.name.replace(/_/g, "-");
        let counter = 1;
        while (existingNames.includes(newName) || existingDisplayNames.includes(newName)) {
            newName = `${profile.name.replace(/_/g, "-")}${counter}`;
            counter++;
        }
        profile.name = newName;
    
        // Check and adjust displayName
        let newDisplayName = profile.displayName || newName;
        counter = 1;
        while (existingDisplayNames.includes(newDisplayName) || existingNames.includes(newDisplayName)) {
            newDisplayName = `${profile.displayName || profile.name}${counter}`;
            counter++;
        }
        profile.displayName = newDisplayName;
    }

    handleImport() {
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "application/json";
        fileInput.onchange = e => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = event => {
                const obj = JSON.parse(event.target.result);
                this.bindProfileData(obj);
                this.oldName = ""; // Ensure it's treated as a new Profile
                this.handleSave(); 
            };
            reader.readAsText(file);
        };
        fileInput.click();
    }
    
    async handleDelete() {
        const currentProfileName = this.storageManager.getCurrentProfile().name;
        const username = this.storageManager.getCurrentUsername();
        try {
            await deleteProfile(currentProfileName, username);
            console.log("Profile deleted successfully.");
            const data = await getPromptRepo(username);
            this.onDeleteCallback(data);
        } catch (error) {
            console.error("Error during profile deletion:", error);
            this.showMessage("Failed to delete profile.", "error");
        }
    }

    async handleGeneratePrompt() {
        const profession = this.formElements.prompt.value;
        swal({
            text: "Generating profile...",
            button: false,
            closeOnClickOutside: false,
            closeOnEsc: false,
        });
        try {
            const data = await createChatProfile({ profession });
            swal.close();
            // Dynamically populate the form with retrieved data
            this.formElements.prompt.value = data.prompt;
            if (this.formElements.name.value === "") {
                this.formElements.name.value = data.name;
            }
            this.formElements.icon.value = data.icon;
            this.formElements.displayName.value = data.displayName;
            // Update icon-preview class
            document.getElementById("icon-preview").className = data.icon;
            this.showMessage("Profile generated successfully.", "success");
        } catch (error) {
            swal.close();
            console.error("Error generating profile:", error);
            this.showMessage("Error generating profile. Please try again.", "error");
        }
    }

    bindProfileData(profileData) {
        // Add defensive programming: check if profileData is empty
        if (!profileData) {
            console.log("No profile data to bind.");
            return;
        }
        
        // Check and initialize form elements (if not already initialized)
        if (!this.formElements) {
            this.initForm();
        }
        // Check if form elements exist
        if (!this.formElements.prompt) {
            console.error("Form elements not properly initialized.");
            return;
        }

        // Store the original name to identify this as an existing profile
        this.oldName = profileData.name || "";
        console.log("Set oldName to:", this.oldName);
        
        // Safely set form values
        try {
            // Iterate through formElements object properties instead of profileData
            Object.keys(this.formElements).forEach(key => {
                const element = this.formElements[key];
                if (!element) {
                    console.warn(`Form element for ${key} not found.`);
                    return; // Skip current iteration
                }
                
                if (element.type === "checkbox") {
                    element.checked = !!profileData[key]; // Convert to boolean
                } else if (element.tagName === "SELECT") {
                    // Special handling for dropdown select boxes to ensure correct display of selected options
                    if (profileData[key]) {
                        element.value = profileData[key];
                    }
                } else {
                    // Ensure default value when setting input box values
                    element.value = profileData[key] || "";
                    
                    // Special handling for icon preview
                    if (key === "icon") {
                        const iconPreview = document.getElementById("icon-preview");
                        if (iconPreview) {
                            iconPreview.className = profileData[key] || "";
                        }
                    }
                }
            });
        } catch (error) {
            console.error("Error binding profile data:", error);
        }
    }

    async handleSave() {
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
        console.log("Current oldName:", this.oldName);
        
        const username = this.storageManager.getCurrentUsername();
        const isNewProfile = !this.oldName || this.oldName === "";
        
        if (isNewProfile) {
            this.checkAndAdjustName(profile);
        } else {
            // If we're updating and the name has been changed, make sure the new name is unique
            if (profile.name !== this.oldName) {
                this.checkAndAdjustName(profile);
            }
        }
        
        try {
            await saveOrUpdateProfile(profile, username, isNewProfile, this.oldName);
            this.storageManager.setCurrentProfile(profile); // Set the newly saved Profile as the current Profile
            
            // Update AIProfileManager's current profile and UI state
            if (this.uiManager.aiProfileManager) {
                this.uiManager.aiProfileManager.currentProfile = profile;
                this.uiManager.aiProfileManager.updateUIState();
            }
            
            console.log("Profile saved successfully.");                
            this.onSaveCallback(profile, isNewProfile); 
            
            // Update oldName after saving to reflect the current name for future operations
            this.oldName = profile.name;
            
            this.showMessage(isNewProfile ? "Profile created successfully!" : "Profile updated successfully!", "success", true); 
        } catch (error) {
            console.error("Error saving profile:", error);
            this.showMessage("Failed to save profile. Please try again.", "error");
        }
    }
    
    resetForm() {
        // Reset the form after saving
        document.querySelectorAll("#ai-actor-settings-inner-form-wrapper input[type=\"text\"], #ai-actor-settings-inner-form-wrapper input[type=\"number\"], #ai-actor-settings-inner-form-wrapper select, #ai-actor-settings-inner-form-wrapper textarea").forEach(input => {
            input.value = "";
        });
        // Reset specific fields with default values if necessary
    }
    
}
