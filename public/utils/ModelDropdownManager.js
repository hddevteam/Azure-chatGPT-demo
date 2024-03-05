// /utils/ModelDropdownManager.js

export default class ModelDropdownManager {
    constructor(app, switchElementId, dropdownElementId) {
        this.app = app;
        this.switchElement = document.querySelector(switchElementId);
        this.dropdown = document.querySelector(dropdownElementId);
        this.model = "gpt-3.5-turbo"; // Default model
        this.setupDropdown();
    }

    setupDropdown() {
        // Toggle dropdown visibility
        this.switchElement.addEventListener("click", event => {
            event.stopPropagation();
            this.dropdown.classList.toggle("visible");
        });

        // Update model when an option is clicked
        this.dropdown.addEventListener("click", event => {
            const item = event.target;
            if(item.classList.contains("dropdown-item")) {
                this.model = item.getAttribute("data-model");
                this.switchElement.textContent = item.textContent;
                this.app.model = this.model;

                // Update class for styling
                [...this.dropdown.children].forEach(child => {
                    this.switchElement.classList.remove(child.getAttribute("data-model"));
                });
                this.switchElement.classList.add(this.model);
            }
            this.dropdown.classList.remove("visible");
        });

        // Hide dropdown if click occurs outside of it
        document.addEventListener("click", event => {
            if(!this.dropdown.contains(event.target)) {
                this.dropdown.classList.remove("visible");
            }
        });
    }
}
