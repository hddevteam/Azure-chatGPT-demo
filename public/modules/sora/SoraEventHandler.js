/**
 * Sora Event Handler - Manages all user interactions and events
 */
import { 
    deleteVideoFile,
    uploadVideoFile,
    getGpt
} from "../../utils/apiClient.js";

export class SoraEventHandler {
    constructor() {
        this.manager = null;
        this.renderer = null;
    }

    /**
     * Initialize the event handler
     * @param {SoraVideoManager} manager - Video manager instance
     * @param {SoraUIRenderer} renderer - UI renderer instance
     */
    init(manager, renderer) {
        this.manager = manager;
        this.renderer = renderer;
    }

    setupEventListeners(container) {
        if (!container) return;

        // Toolbar buttons
        this.setupToolbarEvents(container);
        this.setupViewEvents(container);
        this.setupGalleryEvents(container);
    }

    setupToolbarEvents(container) {
        const refreshBtn = container.querySelector("#sora-refresh-btn");
        if (refreshBtn) {
            refreshBtn.addEventListener("click", async () => {
                await this.manager.loadHistory();
                await this.manager.loadUploadedVideos();
                this.renderVideoGallery();
                this.renderer.showNotification("Content refreshed", "success");
            });
        }

        const clearCompletedBtn = container.querySelector("#sora-clear-completed-btn");
        if (clearCompletedBtn) {
            clearCompletedBtn.addEventListener("click", () => this.clearCompletedTasks());
        }

        // Setup active tasks toggle
        const toggleTasksBtn = container.querySelector("#sora-toggle-tasks");
        if (toggleTasksBtn) {
            toggleTasksBtn.addEventListener("click", () => this.toggleActiveTasks());
        }

        // Setup generation form events
        this.setupGenerationFormEvents(container);
    }

    setupGenerationFormEvents(container) {
        const generationForm = container.querySelector("#sora-generation-form");
        console.log("Setting up generation form events, form found:", !!generationForm);
        
        if (generationForm) {
            generationForm.addEventListener("submit", (e) => {
                console.log("Form submit event triggered");
                this.handleGenerationFormSubmit(e);
            });
        }

        const generateBtn = container.querySelector("#sora-generate-btn");
        console.log("Generate button found:", !!generateBtn);
        
        if (generateBtn) {
            generateBtn.addEventListener("click", (e) => {
                console.log("Generate button clicked");
                // If this is not a submit button, manually trigger form submission
                if (generateBtn.type !== "submit") {
                    e.preventDefault();
                    const form = generateBtn.closest("form");
                    if (form) {
                        const submitEvent = new Event("submit", { bubbles: true, cancelable: true });
                        form.dispatchEvent(submitEvent);
                    }
                }
            });
        }

        const aiRewriteBtn = container.querySelector("#sora-ai-rewrite-btn");
        if (aiRewriteBtn) {
            aiRewriteBtn.addEventListener("click", () => this.handleAIRewrite());
        }

        // Update label text when select values change
        const aspectRatioSelect = container.querySelector("#sora-aspect-ratio");
        if (aspectRatioSelect) {
            aspectRatioSelect.addEventListener("change", (e) => {
                const label = container.querySelector(".sora-generation-form__param:nth-child(1) .sora-generation-form__label span");
                if (label) label.textContent = e.target.value;
            });
        }

        const resolutionSelect = container.querySelector("#sora-resolution");
        if (resolutionSelect) {
            resolutionSelect.addEventListener("change", (e) => {
                const label = container.querySelector(".sora-generation-form__param:nth-child(2) .sora-generation-form__label span");
                if (label) label.textContent = e.target.value;
            });
        }

        const durationSelect = container.querySelector("#sora-duration");
        if (durationSelect) {
            durationSelect.addEventListener("change", (e) => {
                const label = container.querySelector(".sora-generation-form__param:nth-child(3) .sora-generation-form__label span");
                if (label) label.textContent = e.target.value;
            });
        }

        const loopSelect = container.querySelector("#sora-loop");
        if (loopSelect) {
            loopSelect.addEventListener("change", (e) => {
                const label = container.querySelector(".sora-generation-form__param:nth-child(4) .sora-generation-form__label span");
                if (label) label.textContent = e.target.value === "true" ? "Loop" : "1v";
            });
        }
    }

    setupViewEvents() {
        const gridBtn = this.manager.container.querySelector("#sora-grid-view");
        const listBtn = this.manager.container.querySelector("#sora-list-view");

        if (gridBtn) {
            gridBtn.addEventListener("click", () => this.switchView("grid"));
        }

        if (listBtn) {
            listBtn.addEventListener("click", () => this.switchView("list"));
        }
    }

    setupGalleryEvents() {
        const gallery = this.manager.container.querySelector("#sora-video-gallery");
        if (!gallery) return;

        // Click events for video actions
        gallery.addEventListener("click", async (e) => {
            const actionBtn = e.target.closest("[data-action]");
            const playBtn = e.target.closest(".sora-video-card__play-btn");
            
            if (playBtn) {
                const videoCard = playBtn.closest("[data-video-id]");
                const videoId = videoCard.dataset.videoId;
                const videoType = videoCard.dataset.videoType;
                await this.handleVideoPreview(videoId, videoType);
                return;
            }

            if (!actionBtn) return;

            const videoCard = actionBtn.closest("[data-video-id]");
            const videoId = videoCard.dataset.videoId;
            const videoType = videoCard.dataset.videoType;
            const action = actionBtn.dataset.action;

            try {
                switch (action) {
                case "edit":
                    await this.handleVideoEdit(videoId, videoType);
                    break;
                case "download":
                    await this.handleVideoDownload(videoId, videoType);
                    break;
                case "delete":
                    await this.handleVideoDelete(videoId, videoType);
                    break;
                case "upload":
                    await this.handleVideoUpload(videoId);
                    break;
                case "regenerate":
                    this.handleVideoRegenerate(videoId);
                    break;
                case "details":
                    await this.handleVideoDetails(videoId, videoType);
                    break;
                }
            } catch (error) {
                console.error(`Error handling ${action} action:`, error);
                this.renderer.showNotification(`Failed to ${action} video: ${error.message}`, "error");
            }
        });
    }

    /**
     * Get video data by ID and type
     */
    getVideoData(videoId, videoType) {
        console.log("🔍 Searching for video data:", { videoId, videoType });
        
        if (videoType === "uploaded") {
            console.log("📁 Available uploaded videos:", this.manager.uploadedVideos.map(v => ({
                id: v.id,
                name: v.name,
                fileName: v.fileName,
                resolution: v.resolution,
                hasResolution: !!v.resolution
            })));
            
            const video = this.manager.uploadedVideos.find(video => 
                video.id === videoId || 
                video.name === videoId || 
                video.fileName === videoId
            );
            
            console.log("🎯 Found video:", video);
            return video;
        } else {
            // For generated videos, look in active jobs
            const job = this.manager.activeJobs.get(videoId);
            if (job && job.status === "succeeded") {
                return {
                    id: job.id,
                    type: "generated",
                    title: job.params?.prompt || "Generated Video",
                    prompt: job.params?.prompt,
                    duration: job.params?.duration,
                    resolution: job.params?.resolution,
                    aspectRatio: job.params?.aspectRatio,
                    model: "sora-turbo",
                    variants: job.params?.variants,
                    completedAt: job.completedAt,
                    url: job.videoUrls?.[0],
                    azureVideoUrl: job.azureVideoUrl,
                    ...job.params
                };
            }
        }
        return null;
    }

    async handleVideoDownload(videoId, videoType) {
        try {
            if (videoType === "uploaded") {
                // Download from Azure Storage
                const video = this.manager.uploadedVideos.find(v => 
                    v.fileName === videoId || 
                    v.id === videoId || 
                    v.name === videoId
                );
                
                if (video && video.url) {
                    const link = document.createElement("a");
                    link.href = video.url;
                    link.download = video.originalFileName || video.fileName || video.name || "video.mp4";
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    this.renderer.showNotification("Download started", "success");
                } else {
                    this.renderer.showNotification("Video not found or URL unavailable", "error");
                }
            } else {
                // Download generated video
                const result = await this.manager.downloadVideo(videoId);
                if (result && result.success) {
                    this.renderer.showNotification("Video downloaded", "success");
                } else {
                    this.renderer.showNotification("Failed to download video", "error");
                }
            }
        } catch (error) {
            console.error("Error downloading video:", error);
            this.renderer.showNotification(`Download failed: ${error.message}`, "error");
        }
    }

    async handleVideoDelete(videoId, videoType) {
        console.log(`Attempting to delete video: ${videoId}, type: ${videoType}`);
        
        const confirmed = await this.showConfirmDialog(
            "Delete Video", 
            "Are you sure you want to delete this video? This action cannot be undone."
        );
        
        if (!confirmed) {
            console.log("Delete operation cancelled by user");
            return;
        }

        try {
            this.renderer.showNotification("Deleting video...", "info");

            if (videoType === "uploaded") {
                console.log(`Deleting uploaded video from Azure Storage: ${videoId}`);
                
                // Delete from Azure Storage
                await deleteVideoFile(videoId);
                
                // Remove from local state
                const initialCount = this.manager.uploadedVideos.length;
                this.manager.uploadedVideos = this.manager.uploadedVideos.filter(v => v.fileName !== videoId);
                const afterCount = this.manager.uploadedVideos.length;
                
                console.log(`Uploaded videos count: ${initialCount} -> ${afterCount}`);
                console.log(`Uploaded video ${videoId} deleted successfully`);
            } else {
                console.log(`Deleting generation job: ${videoId}`);
                
                // Delete generation job
                await this.manager.deleteJob(videoId);
                console.log(`Generation job ${videoId} deleted successfully`);
            }

            // Update the interface
            console.log("Updating video gallery after deletion");
            this.renderVideoGallery();
            this.renderer.showNotification("Video deleted successfully", "success");
            
        } catch (error) {
            console.error("Failed to delete video:", error);
            this.renderer.showNotification(
                `Failed to delete video: ${error.message || "Unknown error"}`, 
                "error"
            );
        }
    }

    async handleVideoUpload(jobId) {
        try {
            this.showNotification("Starting video upload to Azure Storage...", "info");
            
            const result = await this.manager.uploadVideoToStorage(jobId);
            
            if (result.success) {
                this.renderer.showNotification("Video uploaded to Azure Storage successfully", "success");
                this.renderVideoGallery(); // Update gallery to reflect changes
            }
        } catch (error) {
            console.error("Error uploading video:", error);
            this.renderer.showNotification(`Failed to upload video: ${error.message}`, "error");
        }
    }

    handleVideoRegenerate(jobId) {
        const job = this.manager.activeJobs.get(jobId);
        if (job && job.params) {
            this.openGenerationModal();
            this.populateFormWithParams(job.params);
        }
    }

    async handleVideoDetails(videoId, videoType = "uploaded") {
        try {
            // For uploaded videos, use the filename to get details
            if (videoType === "uploaded") {
                const details = await this.manager.apiClient.getVideoDetails(videoId);
                this.renderer.showVideoDetailsModal(details);
            } else {
                // For generated videos, get from activeJobs
                const job = this.manager.activeJobs.get(videoId);
                if (job) {
                    const details = {
                        name: videoId,
                        prompt: job.params.prompt,
                        status: job.status,
                        model: job.params.model,
                        aspectRatio: job.params.aspectRatio,
                        duration: job.params.duration,
                        variants: job.params.variants,
                        generatedAt: job.createdAt
                    };
                    this.renderer.showVideoDetailsModal(details);
                } else {
                    throw new Error("Video details not found");
                }
            }
        } catch (error) {
            console.error("Error fetching video details:", error);
            this.renderer.showNotification("Failed to load video details", "error");
        }
    }

    async handleVideoPreview(videoId, videoType) {
        try {
            let videoUrl;
            let videoTitle;
            let videoPrompt;

            if (videoType === "uploaded") {
                // Search uploaded videos using multiple possible keys
                const video = this.manager.uploadedVideos.find(v => 
                    v.id === videoId || 
                    v.fileName === videoId || 
                    v.name === videoId ||
                    v.title === videoId
                );
                
                if (!video) {
                    console.error("Video not found in uploaded videos:", {
                        searchId: videoId,
                        availableVideos: this.manager.uploadedVideos.map(v => ({
                            id: v.id,
                            fileName: v.fileName,
                            name: v.name,
                            title: v.title
                        }))
                    });
                    throw new Error("Video not found");
                }
                
                videoUrl = video.url || video.azureVideoUrl || video.downloadUrl;
                videoTitle = video.title || video.fileName || video.name;
                videoPrompt = video.prompt || null;
                
                console.log("Found Azure video for preview:", {
                    id: videoId,
                    videoUrl,
                    videoTitle,
                    videoPrompt
                });
            } else {
                // For generated videos, we need to download them first
                const downloadResponse = await this.manager.downloadVideo(videoId);
                if (downloadResponse && downloadResponse.success) {
                    const job = this.manager.activeJobs.get(videoId);
                    videoTitle = job ? job.params.prompt.substring(0, 50) + "..." : "Generated Video";
                    videoPrompt = job ? job.params.prompt : null;
                    // Note: We'll need to implement blob URL creation for preview
                    this.renderer.showNotification("Video preview will be implemented in next update", "info");
                    return;
                } else {
                    throw new Error("Failed to load video data");
                }
            }

            this.renderer.showVideoPreviewModal(videoUrl, videoTitle, videoPrompt);
        } catch (error) {
            console.error("Error previewing video:", error);
            this.renderer.showNotification(`Failed to preview video: ${error.message}`, "error");
        }
    }

    openGenerationModal() {
        const modal = document.createElement("div");
        modal.innerHTML = this.renderer.renderGenerationModal();
        document.body.appendChild(modal.firstElementChild);

        this.setupGenerationModalEvents();
    }

    openVideoUploadModal() {
        const modal = document.createElement("div");
        modal.innerHTML = this.renderer.renderVideoUploadModal();
        document.body.appendChild(modal.firstElementChild);

        this.setupUploadModalEvents();
    }

    setupGenerationModalEvents() {
        const modal = document.querySelector(".sora-modal");
        const form = modal.querySelector("#sora-generation-form");
        const closeBtn = modal.querySelector(".sora-modal__close");
        const cancelBtn = modal.querySelector("[data-action=\"cancel\"]");

        const closeModal = () => {
            document.body.removeChild(modal);
        };

        closeBtn.addEventListener("click", closeModal);
        cancelBtn.addEventListener("click", closeModal);
        modal.querySelector(".sora-modal__backdrop").addEventListener("click", closeModal);

        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const formData = new FormData(form);
            const params = {
                prompt: formData.get("prompt"),
                aspect_ratio: formData.get("aspectRatio"),
                resolution: formData.get("resolution"),
                duration: parseInt(formData.get("duration")),
                loop: formData.get("loop") === "true"
            };

            // Validate prompt
            if (!params.prompt || params.prompt.trim().length === 0) {
                this.showNotification("Please enter a video description", "error");
                return;
            }

            // Disable generate button during generation
            const generateBtn = document.querySelector("#sora-generate-btn");
            if (generateBtn) {
                generateBtn.disabled = true;
                generateBtn.innerHTML = "<i class=\"fas fa-spinner fa-spin\"></i> <span>Generating...</span>";
            }

            try {
                const result = await this.manager.generateVideo(params);
                
                if (result && result.jobId) {
                    this.showNotification("Video generation started successfully!", "success");
                    
                    // Clear the form
                    form.reset();
                    
                    // Update the labels back to defaults
                    this.updateFormLabelsToDefaults();
                    // Refresh the active tasks display
                    this.renderer.renderActiveTasksList(Array.from(this.manager.activeJobs.values()));
                } else {
                    this.showNotification("Failed to start video generation", "error");
                }
            } catch (error) {
                console.error("Generation error:", error);
                this.showNotification("Error starting video generation: " + error.message, "error");
            } finally {
                // Re-enable generate button
                if (generateBtn) {
                    generateBtn.disabled = false;
                    generateBtn.innerHTML = "<i class=\"fas fa-play\"></i> <span>Generate</span>";
                }
            }
        });
    }

    setupUploadModalEvents() {
        const modal = document.querySelector(".sora-modal");
        const uploadZone = modal.querySelector("#sora-upload-zone");
        const fileInput = modal.querySelector("#sora-file-input");
        const closeBtn = modal.querySelector(".sora-modal__close");

        const closeModal = () => {
            document.body.removeChild(modal);
        };

        closeBtn.addEventListener("click", closeModal);
        modal.querySelector(".sora-modal__backdrop").addEventListener("click", closeModal);

        // File upload handling
        uploadZone.addEventListener("click", () => fileInput.click());
        
        uploadZone.addEventListener("dragover", (e) => {
            e.preventDefault();
            uploadZone.classList.add("dragover");
        });

        uploadZone.addEventListener("dragleave", () => {
            uploadZone.classList.remove("dragover");
        });

        uploadZone.addEventListener("drop", (e) => {
            e.preventDefault();
            uploadZone.classList.remove("dragover");
            this.handleFileUpload(e.dataTransfer.files);
        });

        fileInput.addEventListener("change", (e) => {
            this.handleFileUpload(e.target.files);
        });
    }

    async handleFileUpload(files) {
        const progressDiv = document.querySelector("#sora-upload-progress");
        const progressBar = progressDiv.querySelector(".sora-upload-progress__fill");
        const progressText = progressDiv.querySelector(".sora-upload-progress__text");

        progressDiv.style.display = "block";

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            try {
                progressText.textContent = `Uploading ${file.name}...`;
                progressBar.style.width = `${((i + 1) / files.length) * 100}%`;

                const response = await uploadVideoFile(file, file.name);
                
                if (response.success) {
                    this.renderer.showNotification(`${file.name} uploaded successfully`, "success");
                } else {
                    throw new Error(response.message || "Upload failed");
                }
            } catch (error) {
                this.renderer.showNotification(`Failed to upload ${file.name}: ${error.message}`, "error");
            }
        }

        // Refresh uploaded videos list
        await this.manager.loadUploadedVideos();
        this.renderVideoGallery();

        // Close modal
        document.querySelector(".sora-modal").remove();
    }

    populateFormWithParams(params) {
        console.log("🎭 Populating modal form with params:", params);
        
        const modal = document.querySelector(".sora-modal");
        if (!modal) {
            console.error("❌ Modal not found for form population");
            return;
        }

        const prompt = modal.querySelector("#sora-prompt");
        if (prompt) {
            prompt.value = params.prompt || "";
            console.log("📝 Set prompt:", prompt.value);
        }

        const aspectRatio = modal.querySelector("#sora-aspect-ratio");
        if (aspectRatio) {
            aspectRatio.value = params.aspectRatio || "16:9";
            console.log("📐 Set aspect ratio:", aspectRatio.value);
        }

        const resolution = modal.querySelector("#sora-resolution");
        if (resolution) {
            console.log("🎬 Resolution field in modal:", {
                found: !!resolution,
                currentValue: resolution.value,
                targetValue: params.resolution,
                availableOptions: Array.from(resolution.options).map(opt => opt.value)
            });
            resolution.value = params.resolution || "1080p";
            console.log("✅ Set modal resolution:", resolution.value);
        } else {
            console.error("❌ Resolution field not found in modal");
        }

        const duration = modal.querySelector("#sora-duration");
        if (duration) {
            duration.value = params.duration || "10";
            console.log("⏱️ Set duration:", duration.value);
        }

        const variants = modal.querySelector("#sora-variants");
        if (variants) {
            variants.value = params.variants || "1";
            console.log("🔢 Set variants:", variants.value);
        }
    }

    /**
     * Handle editing video parameters - populate form with video metadata
     */
    async handleVideoEdit(videoId, videoType = "uploaded") {
        try {
            console.log(`Starting video edit for: ${videoId}, type: ${videoType}`);
            
            // Find the video data
            const video = this.getVideoData(videoId, videoType);
            if (!video) {
                console.error(`Video not found: ${videoId}, type: ${videoType}`);
                this.renderer.showNotification("Video not found", "error");
                return;
            }

            console.log("Found video data:", video);
            console.log("Video resolution field specifically:", video.resolution);
            console.log("Video metadata keys:", Object.keys(video));

            // Extract parameters from video metadata
            const prompt = video.prompt || video.title || "";
            const aspectRatio = video.aspectRatio || "16:9";
            const resolution = video.resolution || "480p";
            const duration = video.duration ? parseInt(video.duration) || 5 : 5;
            const loop = video.loop === true || video.loop === "true" || false;
            
            console.log("Extracted parameters:", {
                prompt,
                aspectRatio,
                resolution,
                duration,
                loop,
                rawVideoData: {
                    aspectRatio: video.aspectRatio,
                    resolution: video.resolution,
                    duration: video.duration,
                    loop: video.loop
                }
            });

            // Fill the generation form with these parameters
            this.fillGenerationForm({
                prompt,
                aspectRatio,
                resolution,
                duration,
                loop
            });

            // Scroll to the generation bar
            const generationBar = document.getElementById("sora-generation-bar");
            if (generationBar) {
                generationBar.scrollIntoView({ 
                    behavior: "smooth", 
                    block: "start" 
                });
                
                // Highlight the form briefly
                generationBar.style.boxShadow = "0 0 20px rgba(102, 126, 234, 0.3)";
                setTimeout(() => {
                    generationBar.style.boxShadow = "";
                }, 2000);
            }

            this.renderer.showNotification("Parameters loaded successfully", "success");
        } catch (error) {
            console.error("Error editing video:", error);
            this.renderer.showNotification("Failed to load video parameters", "error");
        }
    }

    fillGenerationForm(params) {
        console.log("Filling generation form with params:", params);
        
        // Fill prompt
        const promptField = document.getElementById("sora-prompt");
        if (promptField) {
            promptField.value = params.prompt || "";
            console.log("Set prompt:", promptField.value);
        }

        // Fill aspect ratio
        const aspectRatioField = document.getElementById("sora-aspect-ratio");
        if (aspectRatioField && params.aspectRatio) {
            // Check if the aspect ratio exists in the options
            const option = Array.from(aspectRatioField.options).find(opt => opt.value === params.aspectRatio);
            if (option) {
                aspectRatioField.value = params.aspectRatio;
                console.log("Set aspect ratio:", aspectRatioField.value);
            } else {
                console.warn("Aspect ratio not found in options:", params.aspectRatio);
            }
        }

        // Fill resolution
        const resolutionField = document.getElementById("sora-resolution");
        if (resolutionField && params.resolution) {
            console.log("🎬 Resolution field found:", {
                fieldExists: !!resolutionField,
                currentValue: resolutionField.value,
                targetResolution: params.resolution,
                availableOptions: Array.from(resolutionField.options).map(opt => opt.value)
            });
            
            // Check if the resolution exists in the options
            const option = Array.from(resolutionField.options).find(opt => opt.value === params.resolution);
            if (option) {
                resolutionField.value = params.resolution;
                console.log("✅ Successfully set resolution:", resolutionField.value);
            } else {
                console.warn("⚠️ Resolution not found in options:", params.resolution);
                console.warn("Available options:", Array.from(resolutionField.options).map(opt => opt.value));
                // Try to set a default value if the exact match is not found
                resolutionField.value = "480p"; // fallback
                console.log("🔄 Set fallback resolution:", resolutionField.value);
            }
        } else {
            console.log("❌ Resolution field or resolution parameter not available", {
                hasField: !!resolutionField,
                resolution: params.resolution,
                fieldId: resolutionField?.id,
                fieldValue: resolutionField?.value
            });
        }

        // Fill duration
        const durationField = document.getElementById("sora-duration");
        if (durationField && params.duration) {
            const duration = parseInt(params.duration);
            if (!isNaN(duration) && duration >= 1 && duration <= 20) {
                durationField.value = duration.toString();
                console.log("Set duration:", durationField.value);
            } else {
                console.warn("Invalid duration:", params.duration);
            }
        }

        // Fill loop
        const loopField = document.getElementById("sora-loop");
        if (loopField) {
            loopField.value = (params.loop === true || params.loop === "true") ? "true" : "false";
            console.log("Set loop:", loopField.value);
        }
    }

    switchView(view) {
        this.manager.currentView = view;
        
        // Update toolbar buttons
        const gridBtn = this.manager.container.querySelector("#sora-grid-view");
        const listBtn = this.manager.container.querySelector("#sora-list-view");
        
        if (gridBtn && listBtn) {
            gridBtn.classList.toggle("sora-toolbar__view-btn--active", view === "grid");
            listBtn.classList.toggle("sora-toolbar__view-btn--active", view === "list");
        }

        // Re-render gallery with new view
        this.renderVideoGallery();
    }

    clearCompletedTasks() {
        const completedJobs = Array.from(this.manager.activeJobs.entries()).filter(([, job]) => 
            job.status === "succeeded" || job.status === "failed"
        );

        if (completedJobs.length === 0) {
            this.showNotification("No completed tasks to clear", "info");
            return;
        }

        // Remove completed jobs from memory
        completedJobs.forEach(([jobId]) => {
            const job = this.manager.activeJobs.get(jobId);
            if (job && job.pollTimer) {
                clearInterval(job.pollTimer);
            }
            this.manager.activeJobs.delete(jobId);
        });

        this.renderActiveTasksBar();
        this.renderer.showNotification(`Cleared ${completedJobs.length} completed tasks`, "success");
    }

    toggleActiveTasks() {
        const tasksList = this.manager.container.querySelector("#sora-active-tasks-list");
        const toggleBtn = this.manager.container.querySelector("#sora-toggle-tasks");
        const icon = toggleBtn?.querySelector("i");
        
        if (!tasksList || !toggleBtn) return;
        
        const isCollapsed = tasksList.classList.contains("collapsed");
        
        if (isCollapsed) {
            // Show tasks list
            tasksList.classList.remove("collapsed");
            if (icon) {
                icon.className = "fas fa-chevron-up";
            }
        } else {
            // Hide tasks list
            tasksList.classList.add("collapsed");
            if (icon) {
                icon.className = "fas fa-chevron-down";
            }
        }
    }

    async handleGenerationFormSubmit(e) {
        console.log("handleGenerationFormSubmit called with event:", e);
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const params = {
            prompt: formData.get("prompt"),
            aspectRatio: formData.get("aspectRatio"),  // Modified to camelCase naming
            resolution: formData.get("resolution"),
            duration: parseInt(formData.get("duration")),
            variants: 1  // Add default value of 1 for variants parameter
        };

        console.log("Form parameters collected:", params);

        // Validate prompt
        if (!params.prompt || params.prompt.trim().length === 0) {
            console.log("Prompt validation failed");
            this.renderer.showNotification("Please enter a video description", "error");
            return;
        }

        // Disable generate button during generation
        const generateBtn = document.querySelector("#sora-generate-btn");
        if (generateBtn) {
            generateBtn.disabled = true;
            generateBtn.innerHTML = "<i class=\"fas fa-spinner fa-spin\"></i> <span>Generating...</span>";
        }

        try {
            console.log("Calling manager.generateVideo with params:", params);
            const result = await this.manager.generateVideo(params);
            console.log("Generation result:", result);
            
            if (result && result.jobId) {
                this.renderer.showNotification("Video generation started successfully!", "success");
                
                // Clear the form
                e.target.reset();
                
                // Update the labels back to defaults
                this.updateFormLabelsToDefaults();
                
                // Refresh the active tasks display
                this.renderer.renderActiveTasksList(Array.from(this.manager.activeJobs.values()));
                
                // Note: Button will be re-enabled by manager when job completes
                console.log("Generation started, button will be re-enabled when job completes");
                
            } else {
                this.renderer.showNotification("Failed to start video generation", "error");
                // Re-enable generate button on failure
                if (generateBtn) {
                    generateBtn.disabled = false;
                    generateBtn.innerHTML = "<i class=\"fas fa-play\"></i> <span>Generate</span>";
                }
            }
        } catch (error) {
            console.error("Generation error:", error);
            this.renderer.showNotification("Error starting video generation: " + error.message, "error");
            // Re-enable generate button on error
            if (generateBtn) {
                generateBtn.disabled = false;
                generateBtn.innerHTML = "<i class=\"fas fa-play\"></i> <span>Generate</span>";
            }
        }
    }

    async handleAIRewrite() {
        const promptTextarea = document.querySelector("#sora-prompt");
        if (!promptTextarea) {
            this.renderer.showNotification("Prompt field not found", "error");
            return;
        }

        // Show AI rewrite modal
        this.showAIRewriteModal(promptTextarea.value.trim());
    }

    showAIRewriteModal(currentPrompt = "") {
        const modalHTML = this.renderer.renderAIRewriteModal();
        document.body.insertAdjacentHTML("beforeend", modalHTML);
        
        const modal = document.querySelector(".sora-ai-rewrite-modal");
        const form = modal.querySelector("#ai-rewrite-form");
        const closeBtn = modal.querySelector(".sora-modal__close");
        const cancelBtn = modal.querySelector("#ai-rewrite-cancel");
        const promptPreview = modal.querySelector("#current-prompt-preview");
        
        // Show current prompt in preview
        promptPreview.textContent = currentPrompt || "Current prompt is empty";
        
        // Close modal handlers
        const closeModal = () => {
            modal.remove();
        };
        
        closeBtn.addEventListener("click", closeModal);
        cancelBtn.addEventListener("click", closeModal);
        modal.querySelector(".sora-modal__backdrop").addEventListener("click", closeModal);
        
        // Form submission handler
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            await this.processAIRewrite(form, modal, currentPrompt);
        });
        
        // Show modal with animation
        requestAnimationFrame(() => {
            modal.classList.add("sora-modal--active");
        });
    }

    async processAIRewrite(form, modal, currentPrompt) {
        const formData = new FormData(form);
        const rewritePrompt = formData.get("rewritePrompt");
        const selectedModels = Array.from(form.querySelectorAll("input[name='model']:checked"))
            .map(checkbox => checkbox.value);
        
        if (!rewritePrompt.trim()) {
            this.renderer.showNotification("Please enter rewrite requirements", "error");
            return;
        }
        
        if (selectedModels.length === 0) {
            this.renderer.showNotification("Please select at least one AI model", "error");
            return;
        }
        
        const submitBtn = modal.querySelector("#ai-rewrite-submit");
        const originalText = submitBtn.innerHTML;
        
        try {
            // Set loading state
            submitBtn.disabled = true;
            submitBtn.classList.add("sora-btn--loading");
            submitBtn.innerHTML = "Rewriting...";
            
            // Process each selected model
            const rewriteResults = [];
            for (const model of selectedModels) {
                try {
                    const result = await this.callAIRewriteAPI(currentPrompt, rewritePrompt, model);
                    rewriteResults.push({
                        model,
                        success: true,
                        content: result
                    });
                } catch (error) {
                    console.error(`AI rewrite failed for model ${model}:`, error);
                    rewriteResults.push({
                        model,
                        success: false,
                        error: error.message
                    });
                }
            }
            
            // Show results and let user choose
            this.showRewriteResults(rewriteResults, modal);
            
        } catch (error) {
            console.error("AI rewrite error:", error);
            this.renderer.showNotification("AI rewrite failed: " + error.message, "error");
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            submitBtn.classList.remove("sora-btn--loading");
            submitBtn.innerHTML = originalText;
        }
    }

    async callAIRewriteAPI(currentPrompt, rewritePrompt, model) {
        const systemPrompt = `You are a professional video creation assistant specialized in helping users optimize Sora video generation prompts.

Task: Based on the user's rewrite requirements, improve the existing video prompt to make it more vivid, specific, and suitable for video generation.

Requirements:
1. Maintain original creative intent
2. Add visual details and dynamic elements
3. Use descriptive language suitable for video generation
4. Keep prompts concise and clear (recommended 100-200 words)
5. Add cinematic elements like camera movement, lighting effects, color descriptions

Please return the optimized prompt directly without explaining the process.`;

        const userPrompt = `Current prompt: ${currentPrompt || "None"}

Rewrite requirements: ${rewritePrompt}

Please optimize this video prompt according to the rewrite requirements:`;

        const promptMessages = JSON.stringify([
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ]);

        try {
            // Dynamically adjust token count based on model type
            const isOSeriesModel = ["o1", "o1-mini", "o3", "o3-mini", "o4-mini"].includes(model);
            const maxTokens = isOSeriesModel ? 2000 : 500;  // O-series models need more tokens
            
            console.log(`Model ${model} using ${maxTokens} max_tokens${isOSeriesModel ? " (O-series model)" : ""}`);
            
            const data = await getGpt(promptMessages, model, {
                temperature: 0.8,
                max_tokens: maxTokens
            });

            console.log("AI rewrite API response data:", data);
            
            // Parse based on backend returned data structure
            const result = data.message || data.response || data.content || "Generation failed";
            console.log("Parsed rewrite result:", result);
            
            return result;
        } catch (error) {
            console.error("AI Rewrite API Error:", error);
            throw new Error(`AI rewrite failed: ${error.message}`);
        }
    }

    showRewriteResults(results, originalModal) {
        // Close original modal
        originalModal.remove();
        
        // Create results modal
        const resultsHTML = this.renderer.renderRewriteResultsModal(results);
        document.body.insertAdjacentHTML("beforeend", resultsHTML);
        
        const modal = document.querySelector(".sora-rewrite-results-modal");
        const closeBtn = modal.querySelector(".sora-modal__close");
        const cancelBtn = modal.querySelector("#results-cancel");
        
        // Close modal handlers
        const closeModal = () => {
            modal.remove();
        };
        
        closeBtn.addEventListener("click", closeModal);
        cancelBtn.addEventListener("click", closeModal);
        modal.querySelector(".sora-modal__backdrop").addEventListener("click", closeModal);
        
        // Apply result handlers
        modal.addEventListener("click", (e) => {
            if (e.target.classList.contains("sora-result-apply")) {
                const resultContent = e.target.dataset.content;
                this.applyRewriteResult(resultContent);
                closeModal();
            }
        });
        
        // Show modal with animation
        requestAnimationFrame(() => {
            modal.classList.add("sora-modal--active");
        });
    }

    applyRewriteResult(content) {
        const promptTextarea = document.querySelector("#sora-prompt");
        if (promptTextarea) {
            promptTextarea.value = content;
            this.renderer.showNotification("Prompt updated", "success");
            
            // Add highlight effect
            promptTextarea.style.boxShadow = "0 0 20px rgba(102, 126, 234, 0.3)";
            setTimeout(() => {
                promptTextarea.style.boxShadow = "";
            }, 2000);
        }
    }

    enhancePrompt(prompt) {
        // This method is kept for backward compatibility but not used anymore
        const enhancements = [
            "cinematic",
            "high quality",
            "detailed",
            "professional lighting",
            "smooth camera movement"
        ];
        
        return `${prompt}, ${enhancements.join(", ")}`;
    }

    updateFormLabelsToDefaults() {
        const container = this.manager.container;
        
        // Reset aspect ratio label
        const aspectLabel = container.querySelector(".sora-generation-form__param:nth-child(1) .sora-generation-form__label span");
        if (aspectLabel) aspectLabel.textContent = "16:9";
        
        // Reset resolution label
        const resolutionLabel = container.querySelector(".sora-generation-form__param:nth-child(2) .sora-generation-form__label span");
        if (resolutionLabel) resolutionLabel.textContent = "480p";
        
        // Reset duration label
        const durationLabel = container.querySelector(".sora-generation-form__param:nth-child(3) .sora-generation-form__label span");
        if (durationLabel) durationLabel.textContent = "5";
        
        // Reset loop label
        const loopLabel = container.querySelector(".sora-generation-form__param:nth-child(4) .sora-generation-form__label span");
        if (loopLabel) loopLabel.textContent = "1v";
    }

    // Placeholder methods to be implemented
    renderVideoGallery() {
        if (this.renderer && this.renderer.renderVideoGrid) {
            this.renderer.renderVideoGrid(this.manager.getAllVideos());
        } else {
            console.log("renderVideoGallery called but renderer not available");
        }
    }

    renderActiveTasksBar() {
        if (this.renderer && this.renderer.renderActiveTasksList) {
            this.renderer.renderActiveTasksList(Array.from(this.manager.activeJobs.values()));
        } else {
            console.log("renderActiveTasksBar called but renderer not available");
        }
    }

    // Helper methods moved to renderer

    showNotification(message, type) {
        if (this.renderer && this.renderer.showNotification) {
            this.renderer.showNotification(message, type);
        } else {
            console.log(`${type}:`, message);
        }
    }

    showConfirmDialog(title, message) {
        return this.renderer.showConfirmDialog(title, message);
    }

    showVideoDetailsModal(details) {
        console.log("Video details:", details);
    }

    showVideoPreviewModal(videoUrl, title) {
        console.log("Preview video:", title, videoUrl);
    }

    cleanup() {
        // Remove event listeners if needed
        this.manager = null;
        this.renderer = null;
    }
}
