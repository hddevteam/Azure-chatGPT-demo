/**
 * Sora Video Generator - Main Entry Point
 * Orchestrates video generation interface and workflow
 */
import { SoraVideoManager } from "./sora/SoraVideoManager.js";
import { SoraEventHandler } from "./sora/SoraEventHandler.js";
import { SoraUIRenderer } from "./sora/SoraUIRenderer.js";

/**
 * Main Sora Video Generator class that combines all modules
 */
class SoraVideoGenerator {
    constructor() {
        this.manager = new SoraVideoManager();
        this.eventHandler = new SoraEventHandler();
        this.uiRenderer = new SoraUIRenderer();
        this.container = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the Sora Video Generator
     * @param {HTMLElement|string} container - Container element or selector
     */
    async init(container) {
        if (this.isInitialized) {
            return;
        }

        try {
            this.container = typeof container === "string" 
                ? document.querySelector(container) 
                : container || document.querySelector("#sora-studio");
                
            if (!this.container) {
                throw new Error("Container element not found");
            }

            // Initialize all modules
            await this.manager.init(this.container);
            this.eventHandler.init(this.manager, this.uiRenderer);
            this.uiRenderer.init(this.container);

            // Setup cross-module references
            this.manager.eventHandler = this.eventHandler;
            this.manager.uiRenderer = this.uiRenderer;
            this.eventHandler.manager = this.manager;
            this.eventHandler.uiRenderer = this.uiRenderer;
            this.uiRenderer.manager = this.manager;
            this.uiRenderer.eventHandler = this.eventHandler;

            // Render the initial interface
            await this.renderInterface();
            this.setupEventListeners();
            
            // Don't load initial data until modal is opened
            // await this.loadInitialData();
            
            this.isInitialized = true;
            console.log("Sora Video Generator initialized successfully");
        } catch (error) {
            console.error("Failed to initialize Sora Video Generator:", error);
            throw error;
        }
    }

    /**
     * Render the main interface
     */
    async renderInterface() {
        try {
            const html = this.uiRenderer.renderMainInterface(this.manager.config);
            this.container.innerHTML = html;
        } catch (error) {
            console.error("Failed to render interface:", error);
            this.container.innerHTML = `
                <div class="error-message">
                    <h3>Error Loading Sora Studio</h3>
                    <p>${error.message}</p>
                    <button onclick="location.reload()" class="retry-button">Retry</button>
                </div>
            `;
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Wait for DOM to be fully rendered
        setTimeout(() => {
            this.eventHandler.setupEventListeners(this.container);
            console.log("Event listeners setup completed");
        }, 100);
    }

    /**
     * Load initial data (history and uploaded videos)
     */
    async loadInitialData() {
        try {
            console.log("🔄 Loading initial video data...");
            
            await Promise.all([
                this.loadHistory(),
                this.loadUploadedVideos()
            ]);
            
            // Refresh the gallery after loading all data
            this.uiRenderer.refreshGallery();
            console.log("✅ Initial data loaded and gallery refreshed");
        } catch (error) {
            console.error("Failed to load initial data:", error);
        }
    }

    /**
     * Load video generation history
     */
    async loadHistory() {
        try {
            console.log("📋 Loading video history...");
            await this.manager.loadHistory();
            console.log(`📋 Loaded ${this.manager.history.length} history items`);
        } catch (error) {
            console.error("Failed to load history:", error);
        }
    }

    /**
     * Load uploaded videos from Azure Storage
     */
    async loadUploadedVideos() {
        try {
            console.log("☁️ Loading uploaded videos...");
            await this.manager.loadUploadedVideos();
            console.log(`☁️ Loaded ${this.manager.uploadedVideos.length} uploaded videos`);
        } catch (error) {
            console.error("Failed to load uploaded videos:", error);
        }
    }

    /**
     * Generate a new video
     * @param {Object} params - Video generation parameters
     */
    async generateVideo(params) {
        return await this.manager.generateVideo(params);
    }

    /**
     * Get all videos (generated + uploaded)
     */
    getAllVideos() {
        return this.manager.getAllVideos();
    }

    /**
     * Get active jobs
     */
    getActiveJobs() {
        return this.manager.activeJobs;
    }

    /**
     * Refresh the video grid
     */
    refreshVideoGrid() {
        this.uiRenderer.renderVideoGrid(this.manager.getAllVideos());
    }

    /**
     * Show notification
     * @param {string} message - Message to show
     * @param {string} type - Notification type (success, error, info)
     */
    showNotification(message, type = "info") {
        this.uiRenderer.showNotification(message, type);
    }

    /**
     * Cleanup resources
     */
    destroy() {
        if (this.eventHandler) {
            this.eventHandler.cleanup();
        }
        if (this.manager) {
            this.manager.cleanup();
        }
        this.isInitialized = false;
    }

    /**
     * Handle modal open event - load data when modal is first opened
     */
    async onModalOpen() {
        if (!this.manager.dataLoaded) {
            console.log("🔄 Loading video data on modal open...");
            await this.loadInitialData();
            this.manager.dataLoaded = true;
        }
    }

    /**
     * Handle modal close event - optional cleanup
     */
    onModalClose() {
        // Optional: Could implement cleanup logic here if needed
        console.log("📕 Modal closed");
    }
}

// Export for use in other modules
export default SoraVideoGenerator;

// Global instance for backward compatibility
let globalInstance = null;

/**
 * Initialize global Sora Video Generator instance
 * @param {HTMLElement|string} container - Container element or selector
 */
export async function initSoraVideoGenerator(container) {
    if (!globalInstance) {
        globalInstance = new SoraVideoGenerator();
    }
    
    await globalInstance.init(container);
    return globalInstance;
}

/**
 * Get the global Sora Video Generator instance
 */
export function getSoraVideoGeneratorInstance() {
    return globalInstance;
}

// Make available globally for console debugging
if (typeof window !== "undefined") {
    window.SoraVideoGenerator = SoraVideoGenerator;
    window.initSoraVideoGenerator = initSoraVideoGenerator;
    window.getSoraVideoGeneratorInstance = getSoraVideoGeneratorInstance;
}
