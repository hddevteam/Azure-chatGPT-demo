/**
 * Sora Video Manager - Core class for video generation and management
 */
import { 
    getSoraConfig, 
    generateSoraVideo, 
    getSoraJobStatus, 
    getSoraHistory,
    downloadSoraVideo,
    fetchUploadedVideoFiles
} from "../../utils/apiClient.js";
import { getUserName } from "../../utils/authRedirect.js";

export class SoraVideoManager {
    constructor() {
        this.activeJobs = new Map();
        this.config = null;
        this.pollInterval = 5000; // 5 seconds
        this.container = null;
        this.isInitialized = false;
        this.dataLoaded = false; // Track if initial data has been loaded
        this.history = []; // Initialize history array
        this.uploadedVideos = [];
        this.currentView = "grid"; // "grid" or "list"
    }

    async init(container) {
        if (this.isInitialized) {
            return;
        }

        try {
            this.container = container || document.querySelector("#sora-studio");
            if (!this.container) {
                throw new Error("Container element not found");
            }

            await this.loadConfig();
            this.isInitialized = true;
            console.log("Sora Video Manager initialized");
        } catch (error) {
            console.error("Failed to initialize Sora Video Manager:", error);
            throw error;
        }
    }

    async loadConfig() {
        try {
            const response = await getSoraConfig();
            this.config = response.data;
            console.log("Sora config loaded:", this.config);
        } catch (error) {
            console.error("Error loading config:", error);
            throw error;
        }
    }

    async loadHistory() {
        try {
            const response = await getSoraHistory();
            if (response.success && response.data) {
                this.history = response.data; // Store history data
                response.data.forEach(job => {
                    if (!this.activeJobs.has(job.id)) {
                        this.activeJobs.set(job.id, {
                            id: job.id,
                            status: job.status,
                            params: job.params,
                            createdAt: job.createdAt,
                            completedAt: job.completedAt
                        });
                    }
                });
            } else {
                this.history = []; // Initialize as empty array if no data
            }
        } catch (error) {
            console.error("Error loading history:", error);
            this.history = []; // Initialize as empty array on error
        }
    }

    async loadUploadedVideos() {
        try {
            const response = await fetchUploadedVideoFiles();
            if (response.success && response.data) {
                this.uploadedVideos = response.data;
                console.log("📊 Loaded uploaded videos:", this.uploadedVideos);
                // Debug: check resolution field for each video
                this.uploadedVideos.forEach((video, index) => {
                    console.log(`📹 Video ${index + 1}:`, {
                        id: video.id,
                        name: video.name,
                        resolution: video.resolution,
                        aspectRatio: video.aspectRatio,
                        duration: video.duration,
                        prompt: video.prompt,
                        hasResolution: !!video.resolution,
                        allKeys: Object.keys(video)
                    });
                });
            }
        } catch (error) {
            console.error("Error loading uploaded videos:", error);
        }
    }

    /**
     * Generate a new video
     * @param {Object} params - Video generation parameters
     */
    async generateVideo(params) {
        try {
            const response = await generateSoraVideo(params);
            if (response.success && response.jobId) {
                this.trackJob(response.jobId, params);
                return response;
            }
            throw new Error(response.error || "Failed to start video generation");
        } catch (error) {
            console.error("Error generating video:", error);
            throw error;
        }
    }

    /**
     * Track a generation job
     * @param {string} jobId - Job ID to track
     * @param {Object} params - Original generation parameters
     */
    trackJob(jobId, params) {
        // Calculate initial stage progress
        const progressInfo = this.calculateStageProgress("pending");
        
        const jobInfo = {
            id: jobId,
            status: "pending",
            startTime: new Date().toISOString(),
            params: params,
            progress: progressInfo.progress,
            stage: progressInfo.stage,
            stageDescription: progressInfo.description,
            pollErrors: 0
        };

        this.activeJobs.set(jobId, jobInfo);
        console.log(`Tracking job ${jobId}, starting polling...`);
        this.startPolling(jobId);
    }

    /**
     * Start polling for job status
     * @param {string} jobId - Job ID to poll
     */
    startPolling(jobId) {
        console.log(`Starting polling for job ${jobId} every ${this.pollInterval}ms`);
        
        const pollTimer = setInterval(async () => {
            try {
                console.log(`Polling job ${jobId}...`);
                await this.pollJobStatus(jobId);
            } catch (error) {
                console.error(`Error polling job ${jobId}:`, error);
                this.handleJobFailure(jobId, `Polling error: ${error.message}`);
            }
        }, this.pollInterval);

        const job = this.activeJobs.get(jobId);
        if (job) {
            job.pollTimer = pollTimer;
            console.log(`Poll timer set for job ${jobId}`);
        }
    }

    /**
     * Poll job status
     * @param {string} jobId - Job ID to check
     */
    async pollJobStatus(jobId) {
        try {
            const response = await getSoraJobStatus(jobId);
            const job = this.activeJobs.get(jobId);
            
            if (!job) {
                console.log(`Job ${jobId} not found in active jobs, stopping polling`);
                return;
            }

            console.log(`Polling job ${jobId}: status=${response.status}, progress=${response.progress}`);

            // Calculate stage-based progress
            const progressInfo = this.calculateStageProgress(response.status, response.progress);

            // Update job info
            job.status = response.status;
            job.progress = progressInfo.progress;
            job.stage = progressInfo.stage;
            job.stageDescription = progressInfo.description;
            job.lastUpdate = new Date().toISOString();

            // Handle different status states
            if (response.status === "completed" || response.status === "succeeded") {
                console.log(`🎉 Job ${jobId} completed successfully! Calling handleJobSuccess...`);
                await this.handleJobSuccess(jobId, response);
            } else if (response.status === "failed" || response.status === "error") {
                console.log(`❌ Job ${jobId} failed with error: ${response.error}`);
                this.handleJobFailure(jobId, response.error);
            } else if (response.status === "processing" || response.status === "running" || response.status === "pending") {
                // Job still in progress, continue polling
                console.log(`⏳ Job ${jobId} still in progress: ${response.status} (${response.progress || 0}%)`);
                
                // Update progress if available
                if (response.progress !== undefined) {
                    job.progress = response.progress;
                }
            } else {
                console.warn(`⚠️ Unknown job status for ${jobId}: ${response.status}`);
            }

            // Update UI if available
            if (this.uiRenderer) {
                this.uiRenderer.renderActiveTasksList(Array.from(this.activeJobs.values()));
            }
        } catch (error) {
            console.error(`Error polling job ${jobId}:`, error);
            // Don't fail the job immediately on polling errors, retry a few times
            const job = this.activeJobs.get(jobId);
            if (job) {
                job.pollErrors = (job.pollErrors || 0) + 1;
                if (job.pollErrors >= 3) {
                    console.log(`Too many polling errors for job ${jobId}, marking as failed`);
                    this.handleJobFailure(jobId, "Polling failed");
                }
            }
        }
    }

    /**
     * Calculate stage-based progress for video generation
     * @param {string} status - Current job status
     * @param {number} apiProgress - Progress from API (if available)
     * @returns {Object} Progress information with percentage and stage description
     */
    calculateStageProgress(status, apiProgress = 0) {
        const stages = {
            "pending": { progress: 10, stage: "Creating Task", description: "Initializing generation task..." },
            "processing": { progress: 25, stage: "Processing", description: "Generating video content..." },
            "running": { progress: 45, stage: "Rendering", description: "Rendering video frames..." },
            "completed": { progress: 70, stage: "Downloading", description: "Downloading from server..." },
            "succeeded": { progress: 85, stage: "Uploading", description: "Uploading to Azure Storage..." },
            "finished": { progress: 100, stage: "Completed", description: "Video generation completed!" },
            "failed": { progress: 0, stage: "Failed", description: "Generation failed" },
            "error": { progress: 0, stage: "Error", description: "An error occurred" }
        };

        // If we have API progress and it's in processing/running state, use a hybrid approach
        if ((status === "processing" || status === "running") && apiProgress > 0) {
            const baseProgress = stages[status]?.progress || 25;
            // Scale API progress to fit within the stage range
            const stageRange = status === "processing" ? 20 : 25; // 25-45 for processing, 45-70 for running
            const scaledProgress = baseProgress + (apiProgress / 100) * stageRange;
            
            return {
                progress: Math.min(Math.round(scaledProgress), 69), // Cap at 69% before completion
                stage: stages[status]?.stage || "Processing",
                description: `${stages[status]?.description || "Processing..."} (${apiProgress}%)`
            };
        }

        // Default stage-based progress
        const stageInfo = stages[status] || stages["pending"];
        return {
            progress: stageInfo.progress,
            stage: stageInfo.stage,
            description: stageInfo.description
        };
    }

    /**
     * Handle successful job completion
     * @param {string} jobId - Completed job ID
     * @param {Object} jobInfo - Job completion info
     */
    async handleJobSuccess(jobId, jobInfo) {
        const job = this.activeJobs.get(jobId);
        if (!job) {
            console.log(`❌ Job ${jobId} not found in activeJobs when handling success`);
            return;
        }

        console.log(`🎯 Handling job success for ${jobId}, starting download and upload...`);
        console.log("Job info received:", jobInfo);

        // Clear polling timer
        if (job.pollTimer) {
            clearInterval(job.pollTimer);
            console.log(`Cleared polling timer for job ${jobId}`);
        }

        // Update job status before removing
        job.status = "completed";
        job.completedAt = new Date().toISOString();

        // Trigger download to local storage and auto-upload FIRST
        console.log(`🚀 Starting download and upload process for job ${jobId}...`);
        try {
            const downloadResult = await this.downloadAndUploadVideo(jobId);
            console.log(`✅ Download and upload completed for job ${jobId}:`, downloadResult);
            
            // Now create history item with downloaded video info
            const historyItem = {
                id: jobId,
                type: "generated",
                prompt: job.params.prompt,
                status: "completed",
                createdAt: job.startTime,
                completedAt: job.completedAt,
                videoUrl: downloadResult.videoUrl,
                azureVideoUrl: downloadResult.azureVideoUrl,
                filename: downloadResult.filename,
                generationId: jobInfo.data?.generations?.[0]?.id || jobId,
                duration: jobInfo.data?.generations?.[0]?.n_seconds,
                width: jobInfo.data?.generations?.[0]?.width,
                height: jobInfo.data?.generations?.[0]?.height
            };

            // Save to localStorage
            const history = JSON.parse(localStorage.getItem("soraHistory") || "[]");
            history.unshift(historyItem);
            localStorage.setItem("soraHistory", JSON.stringify(history.slice(0, 50))); // Keep only last 50

            console.log(`✅ Added job ${jobId} to history with video info`);

            // Update UI with new video
            if (this.uiRenderer) {
                this.uiRenderer.renderVideoGrid(this.getAllVideos());
            }

        } catch (error) {
            console.error(`❌ Failed to download and upload video for job ${jobId}:`, error);
            if (this.uiRenderer) {
                this.uiRenderer.showNotification(`Failed to download video: ${error.message}`, "error");
            }
        }

        // Re-enable generate button when no more active jobs
        this.updateGenerateButtonState();

        // Remove from active jobs after processing
        this.activeJobs.delete(jobId);
        console.log(`🗑️ Job ${jobId} removed from active jobs`);
    }

    /**
     * Handle job failure
     * @param {string} jobId - Failed job ID
     * @param {string} error - Error message
     */
    handleJobFailure(jobId, error = "Unknown error") {
        const job = this.activeJobs.get(jobId);
        if (!job) return;

        // Clear polling timer
        if (job.pollTimer) {
            clearInterval(job.pollTimer);
        }

        // Update job status before removing
        job.status = "failed";
        job.completedAt = new Date().toISOString();
        job.error = error;

        // Update UI
        if (this.uiRenderer) {
            this.uiRenderer.showNotification(`Video generation failed: ${error}`, "error");
            this.uiRenderer.renderActiveTasksList(Array.from(this.activeJobs.values()));
        }

        // Re-enable generate button when no more active jobs
        this.updateGenerateButtonState();

        // Remove from active jobs after a delay to allow user to see the error
        setTimeout(() => {
            this.activeJobs.delete(jobId);
            if (this.uiRenderer) {
                this.uiRenderer.renderActiveTasksList(Array.from(this.activeJobs.values()));
            }
        }, 5000); // Show error for 5 seconds
    }

    /**
     * Download and upload video after generation completes
     * @param {string} jobId - Job ID to download
     */
    async downloadAndUploadVideo(jobId) {
        try {
            console.log(`📥 Downloading video for job ${jobId}...`);
            
            const job = this.activeJobs.get(jobId);
            if (job) {
                // Update progress to "downloading" stage
                const progressInfo = this.calculateStageProgress("completed");
                job.progress = progressInfo.progress;
                job.stage = progressInfo.stage;
                job.stageDescription = progressInfo.description;
                
                // Update UI
                if (this.uiRenderer) {
                    this.uiRenderer.showNotification("Downloading video from server...", "info");
                    this.uiRenderer.renderActiveTasksList(Array.from(this.activeJobs.values()));
                }
            }

            // Get current username for Azure Storage
            const username = getUserName() || "anonymous";
            console.log(`👤 Current user: ${username}`);

            // Call the download endpoint which also uploads to Azure Storage
            console.log(`🌐 Making API call to downloadSoraVideo(${jobId}, ${username})`);
            
            // Update progress to "uploading" stage
            if (job) {
                const progressInfo = this.calculateStageProgress("succeeded");
                job.progress = progressInfo.progress;
                job.stage = progressInfo.stage;
                job.stageDescription = progressInfo.description;
                
                // Update UI
                if (this.uiRenderer) {
                    this.uiRenderer.showNotification("Uploading to Azure Storage...", "info");
                    this.uiRenderer.renderActiveTasksList(Array.from(this.activeJobs.values()));
                }
            }
            
            const response = await downloadSoraVideo(jobId, username);
            console.log("🔍 API response:", response);
            
            if (response.success) {
                console.log(`✅ Video downloaded and uploaded successfully for job ${jobId}`);
                
                // Update progress to "finished" stage
                if (job) {
                    const progressInfo = this.calculateStageProgress("finished");
                    job.progress = progressInfo.progress;
                    job.stage = progressInfo.stage;
                    job.stageDescription = progressInfo.description;
                    
                    // Update UI
                    if (this.uiRenderer) {
                        this.uiRenderer.renderActiveTasksList(Array.from(this.activeJobs.values()));
                    }
                }
                
                if (this.uiRenderer) {
                    this.uiRenderer.showNotification("Video generation completed successfully!", "success");
                }
                
                // Refresh uploaded videos list
                console.log("🔄 Refreshing uploaded videos list...");
                await this.loadUploadedVideos();
                
                // Return the download result for history creation
                return {
                    videoUrl: response.videoUrl,
                    azureVideoUrl: response.azureVideoUrl,
                    filename: response.filename
                };
            } else {
                throw new Error(response.error || "Download failed");
            }
        } catch (error) {
            console.error(`❌ Failed to download and upload video for job ${jobId}:`, error);
            if (this.uiRenderer) {
                this.uiRenderer.showNotification(`Failed to download and upload video: ${error.message}`, "error");
            }
            throw error;
        }
    }

    /**
     * Download video manually (for user-initiated downloads)
     * @param {string} jobId - Job ID to download
     */
    async downloadVideo(jobId) {
        try {
            console.log(`Manual download requested for job ${jobId}`);
            const response = await downloadSoraVideo(jobId);
            return response;
        } catch (error) {
            console.error(`Failed to download video for job ${jobId}:`, error);
            throw error;
        }
    }

    /**
     * Delete a job
     * @param {string} jobId - Job ID to delete
     */
    async deleteJob(jobId) {
        try {
            // Remove from active jobs
            const job = this.activeJobs.get(jobId);
            if (job && job.pollTimer) {
                clearInterval(job.pollTimer);
            }
            this.activeJobs.delete(jobId);
            
            // Remove from localStorage history
            const history = JSON.parse(localStorage.getItem("soraHistory") || "[]");
            const updatedHistory = history.filter(item => item.id !== jobId);
            localStorage.setItem("soraHistory", JSON.stringify(updatedHistory));
            
            console.log(`Job ${jobId} deleted successfully`);
        } catch (error) {
            console.error(`Failed to delete job ${jobId}:`, error);
            throw error;
        }
    }

    /**
     * Update generate button state based on active jobs
     */
    updateGenerateButtonState() {
        const generateBtn = document.querySelector("#sora-generate-btn");
        if (!generateBtn) return;

        const activeJobsCount = this.getActiveJobsCount();
        
        if (activeJobsCount === 0) {
            // No active jobs, re-enable button
            generateBtn.disabled = false;
            generateBtn.innerHTML = "<i class=\"fas fa-play\"></i> <span>Generate</span>";
            console.log("Generate button re-enabled - no active jobs");
        } else {
            // Still have active jobs, keep disabled
            generateBtn.disabled = true;
            generateBtn.innerHTML = "<i class=\"fas fa-spinner fa-spin\"></i> <span>Generating...</span>";
            console.log(`Generate button remains disabled - ${activeJobsCount} active jobs`);
        }
    }

    /**
     * Get all videos (only Azure uploaded videos)
     */
    getAllVideos() {
        // Only return uploaded videos from Azure Storage
        return this.uploadedVideos.sort((a, b) => 
            new Date(b.uploadedAt || b.lastModified) - new Date(a.uploadedAt || a.lastModified)
        );
    }

    getActiveJobsCount() {
        return Array.from(this.activeJobs.values()).filter(job => 
            job.status === "processing" || job.status === "pending" || job.status === "running"
        ).length;
    }

    clearCompletedJobs() {
        const completedJobs = [];
        for (const [jobId, job] of this.activeJobs.entries()) {
            if (job.status === "succeeded" || job.status === "failed") {
                if (job.pollTimer) {
                    clearInterval(job.pollTimer);
                }
                this.activeJobs.delete(jobId);
                completedJobs.push(jobId);
            }
        }
        return completedJobs;
    }

    cleanup() {
        // Clear all polling timers
        for (const job of this.activeJobs.values()) {
            if (job.pollTimer) {
                clearInterval(job.pollTimer);
            }
        }
        this.activeJobs.clear();
        this.uploadedVideos = [];
        this.isInitialized = false;
    }

    formatDate(dateString) {
        if (!dateString) return "Unknown";
        const date = new Date(dateString);
        return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    }

    formatFileSize(bytes) {
        if (!bytes) return "Unknown";
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + " " + sizes[i];
    }

    // Create API client interface
    get apiClient() {
        return {
            getVideoDetails: async (fileName) => {
                const { getVideoFileDetails } = await import("../../utils/apiClient.js");
                const { getUserName } = await import("../../utils/authRedirect.js");
                const username = getUserName();
                return await getVideoFileDetails(fileName, username);
            }
        };
    }
}
