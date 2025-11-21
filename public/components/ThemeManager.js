export default class ThemeManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.themeKey = "theme-preference";
        this.darkThemeClass = "theme-dark";
        this.toggleButtonId = "theme-toggle";
        
        this.init();
    }

    init() {
        // Check for saved preference or system preference
        const savedTheme = localStorage.getItem(this.themeKey);
        const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        
        if (savedTheme === "dark" || (!savedTheme && systemPrefersDark)) {
            this.enableDarkTheme();
        } else {
            this.disableDarkTheme();
        }

        // Setup button listener
        const toggleButton = document.getElementById(this.toggleButtonId);
        if (toggleButton) {
            toggleButton.addEventListener("click", () => this.toggleTheme());
        }
    }

    toggleTheme() {
        if (document.body.classList.contains(this.darkThemeClass)) {
            this.disableDarkTheme();
        } else {
            this.enableDarkTheme();
        }
    }

    enableDarkTheme() {
        document.body.classList.add(this.darkThemeClass);
        localStorage.setItem(this.themeKey, "dark");
        this.updateButtonIcon(true);
    }

    disableDarkTheme() {
        document.body.classList.remove(this.darkThemeClass);
        localStorage.setItem(this.themeKey, "light");
        this.updateButtonIcon(false);
    }

    updateButtonIcon(isDark) {
        const toggleButton = document.getElementById(this.toggleButtonId);
        if (toggleButton) {
            const icon = toggleButton.querySelector("i");
            if (icon) {
                if (isDark) {
                    icon.className = "fas fa-sun";
                    toggleButton.title = "Switch to Light Mode";
                } else {
                    icon.className = "fas fa-moon";
                    toggleButton.title = "Switch to Dark Mode";
                }
            }
        }
    }
}
