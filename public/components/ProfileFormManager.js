// ProfileFormManager.js
export default class ProfileFormManager {
    constructor(storageManager,saveProfileCallback) {
        this.storageManager = storageManager; // Instance of StorageManager
        this.saveProfileCallback = saveProfileCallback; // Callback function to save profile data
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
    }

    bindProfileData(profileData) {
        // Directly bind provided profile data to form inputs
        Object.keys(this.formElements).forEach(key => {
            if (this.formElements[key].type === "checkbox") {
                this.formElements[key].checked = profileData[key] || false;
            } else {
                this.formElements[key].value = profileData[key] || "";
            }
        });
    }

    saveProfile() {
        const profile = {
            name: document.getElementById("name").value,
            icon: document.getElementById("icon").value,
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

        // Decide between creating a new profile or updating an existing one
        if (this.oldName) {
            // Update operation
            fetch(`/api/profiles/${this.oldName}?username=${this.storageManager.getCurrentUsername()}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(profile)
            })
                .then(response => response.json())
                .then(() => {
                    console.log("Profile updated successfully.");
                    this.saveProfileCallback(profile); 
                // Optionally:
                // this.resetForm();
                // fetchProfiles(); // Assuming fetchProfiles is a method to refresh the profiles list
                })
                .catch(error => console.error("Error updating profile:", error));
        } else {
            // Create operation
            fetch(`/api/profiles?username=${this.storageManager.getCurrentUsername()}`, {
                method: "POST",
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
                    console.log("Profile saved successfully.");
                    this.saveProfileCallback(profile); 
                })
                .catch(error => console.error("Error saving profile:", error));
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
