const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();

class SoraApiService {
    constructor() {
        // Get API key
        this.apiKey = process.env.SORA_API_KEY || process.env.AZURE_OPENAI_API_KEY;
        
        // Get base endpoint - should be like "https://openai-east-us2-231118.openai.azure.com/"
        this.baseEndpoint = process.env.ENDPOINT_URL;
        this.deployment = process.env.SORA_DEPLOYMENT_NAME || process.env.DEPLOYMENT_NAME || "sora";
        
        // If no ENDPOINT_URL, try to extract from SORA_API_URL
        if (!this.baseEndpoint && process.env.SORA_API_URL) {
            const url = new URL(process.env.SORA_API_URL);
            this.baseEndpoint = `${url.protocol}//${url.host}/`;
        }
        
        if (!this.apiKey) {
            throw new Error("Sora API Key must be configured in environment variables");
        }
        
        if (!this.baseEndpoint) {
            throw new Error("Base endpoint must be configured in environment variables");
        }
        
        // Ensure baseEndpoint ends with "/"
        if (!this.baseEndpoint.endsWith("/")) {
            this.baseEndpoint += "/";
        }
        
        // Construct generation URL using standard v1 endpoint format
        const apiVersion = "preview";
        const path = "openai/v1/video/generations/jobs";
        const params = `?api-version=${apiVersion}`;
        this.soraApiUrl = `${this.baseEndpoint}${path}${params}`;
        
        console.log("Sora API configured:");
        console.log("- Generation URL:", this.soraApiUrl);
        console.log("- Base endpoint:", this.baseEndpoint);
        console.log("- Deployment:", this.deployment);
    }
    
    getHeaders() {
        return {
            "Api-Key": this.apiKey,
            "Content-Type": "application/json"
        };
    }
    
    /**
     * Start video generation job
     * @param {Object} params - Generation parameters
     * @param {string} params.prompt - Text prompt for video generation
     * @param {string} params.aspectRatio - Aspect ratio: "1:1", "16:9", "9:16"
     * @param {string} params.resolution - Resolution: "480p", "720p", "1080p"
     * @param {number} params.duration - Duration in seconds: 5, 10, 15, 20
     * @param {number} params.variants - Number of variants: 1-4
     * @returns {Promise<Object>} API response with job ID
     */
    async generateVideo(params) {
        try {
            const { width, height } = this.getResolutionDimensions(params.aspectRatio, params.resolution);
            
            const body = {
                "prompt": params.prompt,
                "n_variants": params.variants.toString(),
                "n_seconds": params.duration.toString(),
                "height": height.toString(),
                "width": width.toString(),
                "model": "sora"
            };
            
            console.log("Sending video generation request:", body);
            
            const response = await axios.post(this.soraApiUrl, body, { 
                headers: this.getHeaders(),
                timeout: 30000 // 30 second timeout
            });
            
            return {
                success: true,
                jobId: response.data.id,
                status: response.data.status,
                data: response.data
            };
            
        } catch (error) {
            console.error("Error generating video:", error.response?.data || error.message);
            throw this.handleApiError(error);
        }
    }
    
    /**
     * Check job status
     * @param {string} jobId - Job ID to check
     * @returns {Promise<Object>} Job status and data
     */
    async getJobStatus(jobId) {
        try {
            // Use standard v1 endpoint format as shown in official documentation
            const statusUrl = `${this.baseEndpoint}openai/v1/video/generations/jobs/${jobId}?api-version=preview`;
            
            console.log("Checking job status at:", statusUrl);
            
            const response = await axios.get(statusUrl, { 
                headers: this.getHeaders(),
                timeout: 15000 // 15 second timeout
            });
            
            return {
                success: true,
                jobId: jobId,
                status: response.data.status,
                data: response.data
            };
            
        } catch (error) {
            console.error("Error checking job status:", error.response?.data || error.message);
            throw this.handleApiError(error);
        }
    }
    
    /**
     * Download generated video
     * @param {string} jobId - Job ID to get the video from
     * @returns {Promise<Buffer>} Video data as buffer
     */
    async downloadVideo(jobId) {
        try {
            // First get job status to find the generation ID
            const statusResult = await this.getJobStatus(jobId);
            
            if (!statusResult.success || statusResult.status !== "succeeded") {
                throw new Error(`Video generation not completed. Status: ${statusResult.status}`);
            }
            
            const generations = statusResult.data.generations;
            if (!generations || generations.length === 0) {
                throw new Error("No generations found in completed job");
            }
            
            console.log("Full generations data:", JSON.stringify(generations, null, 2));
            
            const generationId = generations[0].id;
            console.log("Downloading video for generation ID:", generationId);
            
            // Check if generation has any additional properties that might indicate readiness
            const generation = generations[0];
            if (generation.status && generation.status !== "succeeded") {
                console.log("Generation status:", generation.status);
                throw new Error(`Generation not ready. Status: ${generation.status}`);
            }
            
            // Use v1 endpoint format consistent with generation and status endpoints
            const apiVersion = "preview";
            const params = `?api-version=${apiVersion}`;
            // Use v1 endpoint format for download - must include /video path
            const videoUrl = `${this.baseEndpoint}openai/v1/video/generations/${generationId}/content/video${params}`;
            console.log("Video download URL:", videoUrl);
            
            let response;
            let retryCount = 0;
            const maxRetries = 3;
            
            while (retryCount <= maxRetries) {
                try {
                    response = await axios.get(videoUrl, { 
                        headers: this.getHeaders(),
                        responseType: "arraybuffer",
                        timeout: 60000 // 60 second timeout for video download
                    });
                    break; // Success, exit retry loop
                } catch (error) {
                    retryCount++;
                    console.error(`Download attempt ${retryCount} failed:`, error.response?.data ? JSON.parse(error.response.data.toString()) : error.message);
                    
                    if (retryCount > maxRetries) {
                        console.error("Failed to download video from URL:", videoUrl);
                        throw error;
                    }
                    
                    // Wait before retrying (exponential backoff)
                    const waitTime = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
                    console.log(`Waiting ${waitTime}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }
            
            return Buffer.from(response.data);
            
        } catch (error) {
            console.error("Error downloading video:", error.response?.data || error.message);
            if (error.response?.data) {
                // Try to parse the error response if it's a buffer
                let errorData = error.response.data;
                if (Buffer.isBuffer(errorData)) {
                    try {
                        errorData = JSON.parse(errorData.toString());
                        console.error("Parsed error data:", errorData);
                    } catch (e) {
                        console.error("Could not parse error buffer:", errorData.toString());
                    }
                }
            }
            throw this.handleApiError(error);
        }
    }
    
    /**
     * Get resolution dimensions based on aspect ratio and quality
     * @param {string} aspectRatio - "1:1", "16:9", "9:16"
     * @param {string} resolution - "480p", "720p", "1080p"
     * @returns {Object} {width, height}
     */
    getResolutionDimensions(aspectRatio, resolution) {
        const resolutionMap = {
            "1:1": {
                "480p": { width: 480, height: 480 },
                "720p": { width: 720, height: 720 },
                "1080p": { width: 1080, height: 1080 }
            },
            "16:9": {
                "480p": { width: 854, height: 480 },
                "720p": { width: 1280, height: 720 },
                "1080p": { width: 1920, height: 1080 }
            },
            "9:16": {
                "480p": { width: 480, height: 854 },
                "720p": { width: 720, height: 1280 },
                "1080p": { width: 1080, height: 1920 }
            }
        };
        
        if (!resolutionMap[aspectRatio] || !resolutionMap[aspectRatio][resolution]) {
            throw new Error(`Invalid aspect ratio (${aspectRatio}) or resolution (${resolution})`);
        }
        
        return resolutionMap[aspectRatio][resolution];
    }
    
    /**
     * Validate generation parameters
     * @param {Object} params - Parameters to validate
     * @returns {Object} Validation result
     */
    validateParameters(params) {
        const errors = [];
        
        if (!params.prompt || typeof params.prompt !== "string" || params.prompt.trim().length === 0) {
            errors.push("Prompt is required and must be a non-empty string");
        }
        
        if (params.prompt && params.prompt.length > 1000) {
            errors.push("Prompt must be less than 1000 characters");
        }
        
        if (!["1:1", "16:9", "9:16"].includes(params.aspectRatio)) {
            errors.push("Aspect ratio must be one of: 1:1, 16:9, 9:16");
        }
        
        if (!["480p", "720p", "1080p"].includes(params.resolution)) {
            errors.push("Resolution must be one of: 480p, 720p, 1080p");
        }
        
        if (![5, 10, 15, 20].includes(params.duration)) {
            errors.push("Duration must be one of: 5, 10, 15, 20 seconds");
        }
        
        if (!Number.isInteger(params.variants) || params.variants < 1 || params.variants > 4) {
            errors.push("Variants must be an integer between 1 and 4");
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    /**
     * Handle API errors
     * @param {Error} error - Axios error object
     * @returns {Error} Formatted error
     */
    handleApiError(error) {
        if (error.response) {
            // API returned an error response
            const status = error.response.status;
            const data = error.response.data;
            
            switch (status) {
            case 400:
                return new Error(`Bad Request: ${data.message || "Invalid parameters"}`);
            case 401:
                return new Error("Unauthorized: Invalid API key");
            case 403:
                return new Error("Forbidden: Access denied");
            case 404:
                return new Error("Not Found: Resource not found");
            case 429:
                return new Error("Rate Limited: Too many requests");
            case 500:
                return new Error("Server Error: Internal server error");
            default:
                return new Error(`API Error (${status}): ${data.message || "Unknown error"}`);
            }
        } else if (error.request) {
            // Network error
            return new Error("Network Error: Unable to connect to Sora API");
        } else {
            // Other error
            return new Error(`Error: ${error.message}`);
        }
    }
}

module.exports = SoraApiService;
