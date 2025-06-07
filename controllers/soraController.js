const SoraApiService = require("../services/soraApiService");
const path = require("path");
const fs = require("fs").promises;
const crypto = require("crypto");
const { uploadFileToBlob } = require("../services/azureBlobStorage");

class SoraController {
    constructor() {
        this.soraService = new SoraApiService();
        this.activeJobs = new Map(); // Store active jobs in memory
        this.outputDir = path.join(__dirname, "../public/generated-videos");
        this.ensureOutputDirectory();
    }

    async ensureOutputDirectory() {
        try {
            await fs.access(this.outputDir);
        } catch (error) {
            await fs.mkdir(this.outputDir, { recursive: true });
        }
    }

    /**
     * Generate video - POST /api/sora/generate
     */
    async generateVideo(req, res) {
        try {
            const { prompt, aspectRatio, resolution, duration, variants } = req.body;
            const userId = req.user?.oid || "anonymous";

            // Validate parameters
            const params = {
                prompt: prompt?.trim(),
                aspectRatio,
                resolution,
                duration: parseInt(duration),
                variants: parseInt(variants)
            };

            const validation = this.soraService.validateParameters(params);
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    error: "Validation failed",
                    details: validation.errors
                });
            }

            // Generate video
            const result = await this.soraService.generateVideo(params);

            // Store job info
            const jobInfo = {
                id: result.jobId,
                userId,
                prompt: params.prompt,
                parameters: params,
                status: result.status,
                createdAt: new Date(),
                completedAt: null,
                videoUrls: []
            };

            this.activeJobs.set(result.jobId, jobInfo);

            res.json({
                success: true,
                jobId: result.jobId,
                status: result.status,
                message: "Video generation started"
            });

        } catch (error) {
            console.error("Error in generateVideo:", error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get job status - GET /api/sora/status/:jobId
     */
    async getJobStatus(req, res) {
        try {
            const { jobId } = req.params;
            const userId = req.user?.oid || "anonymous";

            // Check if job exists and belongs to user
            const jobInfo = this.activeJobs.get(jobId);
            if (!jobInfo) {
                return res.status(404).json({
                    success: false,
                    error: "Job not found"
                });
            }

            if (jobInfo.userId !== userId) {
                return res.status(403).json({
                    success: false,
                    error: "Access denied"
                });
            }

            // Get latest status from API
            const result = await this.soraService.getJobStatus(jobId);

            // Update job info
            jobInfo.status = result.status;
            if (result.status === "succeeded" || result.status === "failed") {
                jobInfo.completedAt = new Date();
            }

            // If succeeded, process the generations
            if (result.status === "succeeded" && result.data.generations) {
                console.log(`🎉 Job ${jobId} succeeded with generations:`, result.data.generations);
                jobInfo.generations = result.data.generations;
            } else if (result.status === "succeeded") {
                console.log(`🎉 Job ${jobId} succeeded but no generations in response`);
            }

            this.activeJobs.set(jobId, jobInfo);

            res.json({
                success: true,
                jobId,
                status: result.status,
                progress: result.progress,
                jobInfo,
                data: result.data
            });

        } catch (error) {
            console.error("Error in getJobStatus:", error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Download video - GET /api/sora/download/:jobId
     */
    async downloadVideo(req, res) {
        try {
            const { jobId } = req.params;
            const userId = req.user?.oid || "anonymous";

            console.log(`📥 Download request for job ${jobId} from user ${userId}`);

            // Check if job exists and belongs to user
            const jobInfo = this.activeJobs.get(jobId);
            if (!jobInfo) {
                console.log(`❌ Job ${jobId} not found in activeJobs`);
                return res.status(404).json({
                    success: false,
                    error: "Job not found"
                });
            }

            if (jobInfo.userId !== userId) {
                console.log(`❌ Access denied for job ${jobId}: user ${userId} != ${jobInfo.userId}`);
                return res.status(403).json({
                    success: false,
                    error: "Access denied"
                });
            }

            if (jobInfo.status !== "succeeded") {
                console.log(`❌ Job ${jobId} not ready for download: status = ${jobInfo.status}`);
                return res.status(400).json({
                    success: false,
                    error: "Video generation not completed"
                });
            }

            console.log(`🌐 Downloading video from API for job ${jobId}...`);
            // Download video from API
            const videoBuffer = await this.soraService.downloadVideo(jobId);
            console.log(`✅ Video downloaded from API, size: ${videoBuffer.length} bytes`);

            // Get generation ID for filename
            const statusResult = await this.soraService.getJobStatus(jobId);
            const fileGenerationId = statusResult.data.generations?.[0]?.id || jobId;

            // Generate filename
            const filename = this.generateVideoFilename(jobInfo, fileGenerationId);
            const filePath = path.join(this.outputDir, filename);

            console.log(`💾 Saving video to local file: ${filename}`);
            // Save video to disk (for local access)
            await fs.writeFile(filePath, videoBuffer);

            // Also upload to Azure Blob Storage
            try {
                const username = req.body.username || req.query.username || "anonymous";
                console.log(`☁️ Uploading video to Azure Storage for user: ${username}`);
                
                // Get video generation details for metadata
                const statusResult = await this.soraService.getJobStatus(jobId);
                const generation = statusResult.data.generations?.[0];
                
                // Extract video specifications from generation data and job params
                const videoSpecs = {
                    width: generation?.width || 1920,
                    height: generation?.height || 1080,
                    duration: generation?.n_seconds || jobInfo.params?.duration || 5,
                    aspectRatio: jobInfo.params?.aspectRatio || "16:9",
                    resolution: jobInfo.params?.resolution || "1080p",
                    model: "sora-turbo",
                    variants: jobInfo.params?.variants || 1
                };
                
                console.log("📋 Job info for metadata:", {
                    jobId: jobId,
                    prompt: jobInfo.prompt,
                    originalFilename: filename,
                    generationId: fileGenerationId,
                    generation: generation,
                    videoSpecs: videoSpecs
                });
                
                const uploadResult = await uploadFileToBlob(
                    "videofiles", 
                    filename, 
                    videoBuffer, 
                    username,
                    {
                        jobId: jobId,
                        prompt: jobInfo.prompt || "No prompt available",
                        originalFileName: filename,
                        generationId: fileGenerationId,
                        generatedAt: new Date().toISOString(),
                        // Video specifications
                        width: videoSpecs.width.toString(),
                        height: videoSpecs.height.toString(),
                        duration: videoSpecs.duration.toString(),
                        aspectRatio: videoSpecs.aspectRatio,
                        resolution: videoSpecs.resolution,
                        model: videoSpecs.model,
                        variants: videoSpecs.variants.toString(),
                        // Additional metadata
                        fileSize: videoBuffer.length.toString(),
                        videoFormat: "mp4",
                        quality: "high"
                    }
                );
                console.log("✅ Video uploaded to Azure Storage:", uploadResult.url);
                
                // Store Azure URL in job info
                jobInfo.azureVideoUrl = uploadResult.url;
                
                // Delete local file after successful upload to Azure
                try {
                    await fs.unlink(filePath);
                    console.log(`🗑️ Local file deleted after Azure upload: ${filename}`);
                } catch (deleteError) {
                    console.warn(`⚠️ Failed to delete local file ${filename}:`, deleteError.message);
                    // Continue even if local file deletion fails
                }
            } catch (uploadError) {
                console.error("❌ Failed to upload video to Azure Storage:", uploadError);
                // Keep local file if cloud upload fails
            }

            // Add to job info
            if (!jobInfo.videoUrls) {
                jobInfo.videoUrls = [];
            }
            const videoUrl = `/generated-videos/${filename}`;
            if (!jobInfo.videoUrls.includes(videoUrl)) {
                jobInfo.videoUrls.push(videoUrl);
            }

            this.activeJobs.set(jobId, jobInfo);

            res.json({
                success: true,
                videoUrl,
                azureVideoUrl: jobInfo.azureVideoUrl,
                filename,
                message: "Video downloaded and uploaded successfully"
            });

        } catch (error) {
            console.error("Error in downloadVideo:", error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get user's job history - GET /api/sora/history
     */
    async getJobHistory(req, res) {
        try {
            const userId = req.user?.oid || "anonymous";
            const { page = 1, limit = 10 } = req.query;

            // Filter jobs by user
            const userJobs = Array.from(this.activeJobs.values())
                .filter(job => job.userId === userId)
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            // Paginate results
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + parseInt(limit);
            const paginatedJobs = userJobs.slice(startIndex, endIndex);

            res.json({
                success: true,
                jobs: paginatedJobs,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: userJobs.length,
                    totalPages: Math.ceil(userJobs.length / limit)
                }
            });

        } catch (error) {
            console.error("Error in getJobHistory:", error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Delete job and associated videos - DELETE /api/sora/job/:jobId
     */
    async deleteJob(req, res) {
        try {
            const { jobId } = req.params;
            const userId = req.user?.oid || "anonymous";

            // Check if job exists and belongs to user
            const jobInfo = this.activeJobs.get(jobId);
            if (!jobInfo) {
                return res.status(404).json({
                    success: false,
                    error: "Job not found"
                });
            }

            if (jobInfo.userId !== userId) {
                return res.status(403).json({
                    success: false,
                    error: "Access denied"
                });
            }

            // Delete associated video files
            if (jobInfo.videoUrls && jobInfo.videoUrls.length > 0) {
                for (const videoUrl of jobInfo.videoUrls) {
                    const filename = path.basename(videoUrl);
                    const filePath = path.join(this.outputDir, filename);
                    try {
                        await fs.unlink(filePath);
                    } catch (error) {
                        console.warn(`Failed to delete video file: ${filePath}`, error);
                    }
                }
            }

            // Remove job from memory
            this.activeJobs.delete(jobId);

            res.json({
                success: true,
                message: "Job and associated videos deleted successfully"
            });

        } catch (error) {
            console.error("Error in deleteJob:", error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Generate a unique filename for video
     */
    generateVideoFilename(jobInfo, generationId) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const hash = crypto.createHash("md5").update(jobInfo.prompt).digest("hex").substring(0, 8);
        const resolution = jobInfo.parameters.resolution;
        const duration = jobInfo.parameters.duration;
        
        return `sora_${timestamp}_${hash}_${resolution}_${duration}s_${generationId.substring(0, 8)}.mp4`;
    }

    /**
     * Get configuration options - GET /api/sora/config
     */
    async getConfig(req, res) {
        try {
            res.json({
                success: true,
                config: {
                    aspectRatios: ["1:1", "16:9", "9:16"],
                    resolutions: ["480p", "720p", "1080p"],
                    durations: [5, 10, 15, 20],
                    maxVariants: 4,
                    maxPromptLength: 1000
                }
            });
        } catch (error) {
            console.error("Error in getConfig:", error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = new SoraController();
