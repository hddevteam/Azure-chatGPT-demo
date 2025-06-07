// AIActorFilterModal.js
export class AIActorFilterModal {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.modal = null;
        this.selectedActors = new Set();
        this.searchQuery = "";
        this.init();
    }

    init() {
        this.createModal();
        this.bindEvents();
    }

    createModal() {
        const modalTemplate = `
            <div class="modal-wrapper ai-actor-filter-modal">
                <div class="modal-inner">
                    <div class="modal-header">
                        <div class="modal-title-container">
                            <span class="modal-title">Filter by AI Actors</span>
                            <div class="search-container">
                                <input type="text" id="actor-filter-search" placeholder="Search AI Actors...">
                                <i class="fas fa-search"></i>
                            </div>
                            <button type="button" class="close-button" title="Close">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <div class="modal-content">
                        <div class="actor-list-container">
                            <ul id="actor-filter-list"></ul>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <div class="filter-actions">
                            <button type="button" id="select-all-actors">Select All</button>
                            <button type="button" id="clear-actor-selection">Clear All</button>
                        </div>
                        <div class="modal-buttons">
                            <button type="button" id="apply-filter" class="primary">Apply Filter</button>
                            <button type="button" id="cancel-filter">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>`;

        document.body.insertAdjacentHTML("beforeend", modalTemplate);
        this.modal = document.querySelector(".ai-actor-filter-modal");
    }

    bindEvents() {
        // Close button event
        const closeBtn = this.modal.querySelector(".close-button");
        closeBtn.addEventListener("click", () => this.hide());

        // Click outside to close
        this.modal.addEventListener("click", (event) => {
            if (event.target === this.modal) {
                this.hide();
            }
        });

        // ESC key to close
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && this.isVisible()) {
                this.hide();
            }
        });

        // Search functionality
        const searchInput = this.modal.querySelector("#actor-filter-search");
        searchInput.addEventListener("input", (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.updateActorList();
        });

        // Select All button
        const selectAllBtn = this.modal.querySelector("#select-all-actors");
        selectAllBtn.addEventListener("click", () => {
            this.selectAllActors();
        });

        // Clear All button
        const clearBtn = this.modal.querySelector("#clear-actor-selection");
        clearBtn.addEventListener("click", () => {
            this.clearSelection();
        });

        // Apply button
        const applyBtn = this.modal.querySelector("#apply-filter");
        applyBtn.addEventListener("click", () => {
            this.applyFilter();
        });

        // Cancel button
        const cancelBtn = this.modal.querySelector("#cancel-filter");
        cancelBtn.addEventListener("click", () => {
            this.hide();
        });
    }

    updateActorList() {
        const listElement = this.modal.querySelector("#actor-filter-list");
        const profiles = this.uiManager.profiles;

        // Clear list
        listElement.innerHTML = "";

        // Filter profiles by search keywords
        const filteredProfiles = profiles.filter(profile => 
            profile.displayName.toLowerCase().includes(this.searchQuery) ||
            profile.name.toLowerCase().includes(this.searchQuery)
        );

        if (filteredProfiles.length === 0) {
            const noResults = document.createElement("li");
            noResults.className = "no-results";
            noResults.textContent = "No matching AI Actors found";
            listElement.appendChild(noResults);
            return;
        }

        // Create filtered profile list
        filteredProfiles.forEach(profile => {
            const li = document.createElement("li");
            li.className = "actor-filter-item";
            if (this.selectedActors.has(profile.name)) {
                li.classList.add("selected");
            }

            const icon = document.createElement("i");
            icon.className = profile.icon;
            
            const span = document.createElement("span");
            span.textContent = profile.displayName;

            li.appendChild(icon);
            li.appendChild(span);
            li.dataset.profileName = profile.name;

            li.addEventListener("click", () => this.toggleActorSelection(li));
            
            listElement.appendChild(li);
        });
    }

    toggleActorSelection(element) {
        const profileName = element.dataset.profileName;
        if (this.selectedActors.has(profileName)) {
            this.selectedActors.delete(profileName);
            element.classList.remove("selected");
        } else {
            this.selectedActors.add(profileName);
            element.classList.add("selected");
        }
    }

    selectAllActors() {
        const profiles = this.uiManager.profiles;
        profiles.forEach(profile => {
            this.selectedActors.add(profile.name);
        });
        this.updateActorList();
    }

    clearSelection() {
        this.selectedActors.clear();
        this.updateActorList();
    }

    async applyFilter() {
        // If no Actor is selected, show all chat history
        if (this.selectedActors.size === 0) {
            this.uiManager.showAllChatHistories = true;
        } else {
            this.uiManager.showAllChatHistories = false;
            this.uiManager.filteredActors = Array.from(this.selectedActors);
        }
        
        // Update chat history display
        await this.uiManager.showChatHistory();
        this.hide();
    }

    show() {
        // Before showing, set selected items based on current filter state
        if (!this.uiManager.showAllChatHistories && this.uiManager.filteredActors) {
            this.selectedActors = new Set(this.uiManager.filteredActors);
        } else {
            this.selectedActors.clear();
        }

        this.modal.classList.add("visible");
        this.updateActorList();
        
        requestAnimationFrame(() => {
            this.modal.style.opacity = "1";
        });
    }

    hide() {
        this.modal.style.opacity = "0";
        setTimeout(() => {
            this.modal.classList.remove("visible");
            // Clear search
            const searchInput = this.modal.querySelector("#actor-filter-search");
            if (searchInput) {
                searchInput.value = "";
                this.searchQuery = "";
            }
        }, 300);
    }

    isVisible() {
        return this.modal.classList.contains("visible");
    }
}