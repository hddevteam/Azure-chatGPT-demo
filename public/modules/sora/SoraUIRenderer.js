/**
 * Sora UI Renderer - Handles all UI rendering and interface generation
 */

export class SoraUIRenderer {
    constructor(manager) {
        this.manager = manager;
    }

    init(container) {
        this.container = container;
    }

    renderMainInterface() {
        return `
            <div class="sora-video-studio">
                <div class="sora-video-studio__header">
                    <div class="sora-video-studio__title">
                        <i class="fas fa-video"></i>
                        <h1>Sora Video Studio</h1>
                    </div>
                    <p class="sora-video-studio__subtitle">
                        Generate, manage, and share AI-powered videos
                    </p>
                </div>

                <!-- Unified Generation & Control Bar -->
                <div id="sora-generation-bar" class="sora-generation-bar">
                    <!-- Control Actions Row -->
                    <div class="sora-generation-bar__controls">
                        <div class="sora-generation-bar__actions">
                            <button id="sora-refresh-btn" class="sora-control__btn">
                                <i class="fas fa-sync-alt"></i>
                                <span>Refresh</span>
                            </button>
                            <button id="sora-clear-completed-btn" class="sora-control__btn">
                                <i class="fas fa-broom"></i>
                                <span>Clear Completed</span>
                            </button>
                        </div>
                        <div class="sora-generation-bar__view-options">
                            <button id="sora-grid-view" class="sora-view__btn sora-view__btn--active">
                                <i class="fas fa-th"></i>
                            </button>
                            <button id="sora-list-view" class="sora-view__btn">
                                <i class="fas fa-list"></i>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Generation Form -->
                    <form id="sora-generation-form" class="sora-generation-form">
                        <div class="sora-generation-form__row">
                            <!-- Prompt Input -->
                            <div class="sora-generation-form__field sora-generation-form__field--prompt">
                                <textarea 
                                    id="sora-prompt" 
                                    name="prompt" 
                                    placeholder="Describe the video to generate..."
                                    class="sora-generation-form__textarea"
                                    rows="3"
                                    required
                                ></textarea>
                            </div>
                            
                            <!-- Parameters Row -->
                            <div class="sora-generation-form__params">
                                <!-- Aspect Ratio -->
                                <div class="sora-generation-form__param">
                                    <select id="sora-aspect-ratio" name="aspectRatio" class="sora-generation-form__select">
                                        <option value="16:9">16:9</option>
                                        <option value="9:16">9:16</option>
                                        <option value="1:1">1:1</option>
                                        <option value="4:3">4:3</option>
                                        <option value="3:4">3:4</option>
                                    </select>
                                </div>
                                
                                <!-- Resolution -->
                                <div class="sora-generation-form__param">
                                    <select id="sora-resolution" name="resolution" class="sora-generation-form__select">
                                        <option value="480p">480p</option>
                                        <option value="720p">720p</option>
                                        <option value="1080p">1080p</option>
                                    </select>
                                </div>
                                
                                <!-- Duration -->
                                <div class="sora-generation-form__param">
                                    <select id="sora-duration" name="duration" class="sora-generation-form__select">
                                        <option value="3">3s</option>
                                        <option value="5" selected>5s</option>
                                        <option value="10">10s</option>
                                        <option value="15">15s</option>
                                        <option value="20">20s</option>
                                    </select>
                                </div>
                                
                                <!-- Loop -->
                                <div class="sora-generation-form__param">
                                    <select id="sora-loop" name="loop" class="sora-generation-form__select">
                                        <option value="false" selected>1v</option>
                                        <option value="true">Loop</option>
                                    </select>
                                </div>
                                
                                <!-- AI Rewrite Toggle -->
                                <div class="sora-generation-form__param">
                                    <button type="button" id="sora-ai-rewrite-btn" class="sora-generation-form__ai-btn">
                                        <i class="fas fa-magic"></i>
                                        <span>AI Rewrite</span>
                                    </button>
                                </div>
                                
                                <!-- Generate Button -->
                                <div class="sora-generation-form__param">
                                    <button type="submit" id="sora-generate-btn" class="sora-generation-form__generate-btn">
                                        <i class="fas fa-play"></i>
                                        <span>Generate</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                <!-- Active Tasks Bar -->
                <div id="sora-active-tasks" class="sora-active-tasks" style="display: none;">
                    <div class="sora-active-tasks__header">
                        <h3><i class="fas fa-tasks"></i> Active Generation Tasks</h3>
                        <button id="sora-toggle-tasks" class="sora-active-tasks__toggle">
                            <i class="fas fa-chevron-up"></i>
                        </button>
                    </div>
                    <div id="sora-active-tasks-list" class="sora-active-tasks__list"></div>
                </div>

                <!-- Main Content Area -->
                <div class="sora-video-studio__content">
                    <!-- Empty State -->
                    <div id="sora-empty-state" class="sora-empty-state">
                        <div class="sora-empty-state__icon">
                            <i class="fas fa-video"></i>
                        </div>
                        <h2 class="sora-empty-state__title">No Videos Yet</h2>
                        <p class="sora-empty-state__description">
                            Generate your first AI video using the parameters form below.
                        </p>
                    </div>

                    <!-- Video Gallery -->
                    <div id="sora-video-gallery" class="sora-video-gallery" style="display: none;"></div>
                </div>
            </div>
        `;
    }

    renderGenerationModal() {
        const aspectRatios = [
            { value: "16:9", label: "16:9 (Landscape)" },
            { value: "9:16", label: "9:16 (Portrait)" },
            { value: "1:1", label: "1:1 (Square)" },
            { value: "4:3", label: "4:3 (Standard)" },
            { value: "3:4", label: "3:4 (Portrait)" }
        ];

        const resolutions = [
            { value: "1080p", label: "1080p (1920x1080)" },
            { value: "720p", label: "720p (1280x720)" },
            { value: "480p", label: "480p (854x480)" }
        ];

        return `
            <div class="sora-modal">
                <div class="sora-modal__backdrop"></div>
                <div class="sora-modal__content">
                    <div class="sora-modal__header">
                        <h3 class="sora-modal__title">
                            <i class="fas fa-video"></i>
                            Generate New Video
                        </h3>
                        <button class="sora-modal__close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="sora-modal__body">
                        <form id="sora-generation-form" class="sora-generation-form">
                            <div class="sora-form-group">
                                <label for="sora-prompt" class="sora-form-label">
                                    <i class="fas fa-edit"></i>
                                    Video Description *
                                </label>
                                <textarea 
                                    id="sora-prompt" 
                                    name="prompt" 
                                    class="sora-form-textarea" 
                                    placeholder="Describe the video you want to generate..."
                                    rows="4"
                                    required
                                ></textarea>
                                <div class="sora-form-hint">
                                    Be specific and descriptive. Example: "A serene lake at sunset with mountains in the background"
                                </div>
                            </div>

                            <div class="sora-form-row">
                                <div class="sora-form-group">
                                    <label for="sora-aspect-ratio" class="sora-form-label">
                                        <i class="fas fa-expand-arrows-alt"></i>
                                        Aspect Ratio
                                    </label>
                                    <select id="sora-aspect-ratio" name="aspectRatio" class="sora-form-select">
                                        ${aspectRatios.map(ratio => 
        `<option value="${ratio.value}">${ratio.label}</option>`
    ).join("")}
                                    </select>
                                </div>

                                <div class="sora-form-group">
                                    <label for="sora-resolution" class="sora-form-label">
                                        <i class="fas fa-tv"></i>
                                        Resolution
                                    </label>
                                    <select id="sora-resolution" name="resolution" class="sora-form-select">
                                        ${resolutions.map(res => 
        `<option value="${res.value}">${res.label}</option>`
    ).join("")}
                                    </select>
                                </div>
                            </div>

                            <div class="sora-form-row">
                                <div class="sora-form-group">
                                    <label for="sora-duration" class="sora-form-label">
                                        <i class="fas fa-clock"></i>
                                        Duration (seconds)
                                    </label>
                                    <input 
                                        type="number" 
                                        id="sora-duration" 
                                        name="duration" 
                                        class="sora-form-input" 
                                        value="10" 
                                        min="5" 
                                        max="60"
                                    >
                                </div>

                                <div class="sora-form-group">
                                    <label for="sora-variants" class="sora-form-label">
                                        <i class="fas fa-copy"></i>
                                        Variants
                                    </label>
                                    <input 
                                        type="number" 
                                        id="sora-variants" 
                                        name="variants" 
                                        class="sora-form-input" 
                                        value="1" 
                                        min="1" 
                                        max="4"
                                    >
                                </div>
                            </div>

                            <div class="sora-modal__actions">
                                <button type="button" class="sora-btn sora-btn--secondary" data-action="cancel">
                                    <i class="fas fa-times"></i>
                                    Cancel
                                </button>
                                <button type="submit" class="sora-btn sora-btn--primary">
                                    <i class="fas fa-magic"></i>
                                    Generate Video
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
    }

    renderVideoUploadModal() {
        return `
            <div class="sora-modal">
                <div class="sora-modal__backdrop"></div>
                <div class="sora-modal__content">
                    <div class="sora-modal__header">
                        <h3 class="sora-modal__title">
                            <i class="fas fa-upload"></i>
                            Upload Video
                        </h3>
                        <button class="sora-modal__close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="sora-modal__body">
                        <div class="sora-upload-zone" id="sora-upload-zone">
                            <div class="sora-upload-zone__content">
                                <div class="sora-upload-zone__icon">
                                    <i class="fas fa-cloud-upload-alt"></i>
                                </div>
                                <h4 class="sora-upload-zone__title">Drop video files here</h4>
                                <p class="sora-upload-zone__subtitle">or click to browse</p>
                                <input 
                                    type="file" 
                                    id="sora-file-input" 
                                    accept="video/*" 
                                    multiple 
                                    style="display: none;"
                                >
                                <div class="sora-upload-zone__info">
                                    Supported formats: MP4, MOV, AVI, WebM (Max: 500MB per file)
                                </div>
                            </div>
                        </div>
                        <div id="sora-upload-progress" class="sora-upload-progress" style="display: none;">
                            <div class="sora-upload-progress__bar">
                                <div class="sora-upload-progress__fill"></div>
                            </div>
                            <div class="sora-upload-progress__text">Uploading...</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderVideoCard(video) {
        // Since getAllVideos() now only returns Azure uploaded videos
        const cardClass = this.manager?.currentView === "grid" ? "sora-video-card" : "sora-video-card sora-video-card--list";

        // Prepare truncated title first
        const truncatedTitle = this.truncateText(video.title || video.prompt || video.fileName || video.name, 50);

        // Use uploaded video data fields
        const dateSection = `<span class="sora-video-card__date"><i class="fas fa-upload"></i> ${this.formatDate(video.uploadedAt || video.lastModified)}</span>`;

        const sizeSection = video.fileSize || video.size
            ? `<span class="sora-video-card__size">${this.formatFileSize(video.fileSize || video.size)}</span>`
            : "";

        // Video specifications
        const resolutionSection = video.resolution 
            ? `<span class="sora-video-card__resolution">${video.resolution}</span>`
            : "";

        const durationSection = video.duration 
            ? `<span class="sora-video-card__duration">${video.duration}s</span>`
            : "";

        const aspectRatioSection = video.aspectRatio 
            ? `<span class="sora-video-card__aspect">${video.aspectRatio}</span>`
            : "";

        // Use the best available ID field for data attributes
        const videoId = video.fileName || video.name || video.id;
        const videoUrl = video.url || video.azureVideoUrl || video.downloadUrl;

        return `
            <div class="${cardClass}" 
                 data-video-id="${videoId}" 
                 data-video-type="uploaded">
                <div class="sora-video-card__thumbnail">
                    <div class="sora-video-card__placeholder">
                        ${videoUrl ? `<video preload="none" muted><source src="${videoUrl}" type="video/mp4"></video>` : "<i class=\"fas fa-video\"></i>"}
                    </div>
                    <div class="sora-video-card__overlay">
                        <button class="sora-video-card__play-btn" title="Preview Video">
                            <i class="fas fa-play"></i>
                        </button>
                    </div>
                    <div class="sora-video-card__type-badge">
                        <i class="fas fa-upload"></i>
                        Uploaded
                    </div>
                    <div class="sora-video-card__specs">
                        ${resolutionSection}
                        ${durationSection}
                        ${aspectRatioSection}
                    </div>
                </div>
                <div class="sora-video-card__content">
                    <h4 class="sora-video-card__title" title="${video.title || video.prompt || video.fileName || video.name}">${truncatedTitle}</h4>
                    <div class="sora-video-card__metadata">
                        ${dateSection}
                        ${sizeSection}
                    </div>
                    <div class="sora-video-card__actions">
                        <button class="sora-video-card__action" data-action="edit" title="Edit Parameters">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="sora-video-card__action" data-action="download" title="Download">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="sora-video-card__action" data-action="details" title="Details">
                            <i class="fas fa-info-circle"></i>
                        </button>
                        <button class="sora-video-card__action sora-video-card__action--danger" data-action="delete" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderActiveTask(job) {
        const statusIcons = {
            running: "fas fa-spinner fa-spin",
            succeeded: "fas fa-check-circle",
            failed: "fas fa-exclamation-circle"
        };

        const statusColors = {
            running: "blue",
            succeeded: "green",
            failed: "red"
        };

        return `
            <div class="sora-active-task" data-job-id="${job.id}">
                <div class="sora-active-task__content">
                    <div class="sora-active-task__status">
                        <i class="${statusIcons[job.status]}" style="color: var(--color-${statusColors[job.status]})"></i>
                    </div>
                    <div class="sora-active-task__details">
                        <div class="sora-active-task__prompt">${job.params.prompt.substring(0, 60)}${job.params.prompt.length > 60 ? "..." : ""}</div>
                        <div class="sora-active-task__meta">
                            <span class="sora-active-task__time">${this.manager.formatDate(job.createdAt)}</span>
                            <span class="sora-active-task__status-text">${job.status}</span>
                        </div>
                    </div>
                    <div class="sora-active-task__actions">
                        ${job.status === "succeeded" ? `
                            <button class="sora-active-task__action" data-action="download" title="Download">
                                <i class="fas fa-download"></i>
                            </button>
                            <button class="sora-active-task__action" data-action="upload" title="Upload to Storage">
                                <i class="fas fa-cloud-upload-alt"></i>
                            </button>
                        ` : ""}
                        <button class="sora-active-task__action sora-active-task__action--danger" data-action="cancel" title="Cancel/Remove">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render video grid
     * @param {Array} videos - Array of video objects
     */
    renderVideoGrid(videos) {
        const galleryContainer = document.querySelector("#sora-video-gallery");
        const emptyState = document.querySelector("#sora-empty-state");
        
        if (!galleryContainer || !emptyState) {
            console.warn("Gallery container or empty state element not found");
            return;
        }

        if (!videos || videos.length === 0) {
            // Show empty state, hide gallery
            emptyState.style.display = "block";
            galleryContainer.style.display = "none";
            return;
        }

        // Hide empty state, show gallery with videos
        emptyState.style.display = "none";
        galleryContainer.style.display = "block";
        
        // Create grid container if not exists
        let gridContainer = galleryContainer.querySelector(".sora-video-grid");
        if (!gridContainer) {
            gridContainer = document.createElement("div");
            gridContainer.className = "sora-video-grid";
            galleryContainer.appendChild(gridContainer);
        }

        gridContainer.innerHTML = videos.map(video => this.renderVideoCard(video)).join("");
        console.log(`✅ Rendered ${videos.length} videos in gallery`);
    }

    /**
     * Setup lazy loading for video thumbnails
     */
    setupLazyVideoLoading() {
        const videoCards = this.container.querySelectorAll(".sora-video-card__thumbnail video");
        
        const observerOptions = {
            root: null,
            rootMargin: "50px",
            threshold: 0.1
        };

        const videoObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const video = entry.target;
                    if (video.dataset.lazyLoaded !== "true") {
                        // Load video metadata when it comes into view
                        video.preload = "metadata";
                        video.dataset.lazyLoaded = "true";
                        videoObserver.unobserve(video);
                    }
                }
            });
        }, observerOptions);

        videoCards.forEach(video => {
            videoObserver.observe(video);
            
            // Add hover event to load and preview video
            const card = video.closest(".sora-video-card");
            card.addEventListener("mouseenter", () => {
                if (video.dataset.lazyLoaded === "true" && video.paused) {
                    video.play().catch(() => {
                        // Ignore autoplay failures
                    });
                }
            });
            
            card.addEventListener("mouseleave", () => {
                if (!video.paused) {
                    video.pause();
                    video.currentTime = 0;
                }
            });
        });
    }

    /**
     * Enhanced refresh gallery with lazy loading
     */
    refreshGallery() {
        const videos = this.manager.getAllVideos();
        this.renderVideoGrid(videos);
        
        // Setup lazy loading after rendering
        setTimeout(() => {
            this.setupLazyVideoLoading();
        }, 100);
    }

    /**
     * Render active tasks list
     * @param {Array} activeTasks - Array of active task objects
     */
    renderActiveTasksList(activeTasks) {
        const tasksList = document.querySelector(".sora-active-tasks__list");
        const tasksContainer = document.querySelector(".sora-active-tasks");
        
        if (!tasksList || !tasksContainer) return;

        if (!activeTasks || activeTasks.length === 0) {
            tasksContainer.style.display = "none";
            return;
        }

        tasksContainer.style.display = "block";
        tasksList.innerHTML = activeTasks.map(task => `
            <div class="sora-active-task" data-job-id="${task.id}">
                <div class="sora-active-task__info">
                    <div class="sora-active-task__prompt">${task.params.prompt}</div>
                    <div class="sora-active-task__status" data-stage="${task.stage || task.status}">${task.stage || task.status}</div>
                    ${task.stageDescription ? `<div class="sora-active-task__description">${task.stageDescription}</div>` : ""}
                </div>
                <div class="sora-active-task__progress">
                    <div class="sora-progress-bar">
                        <div class="sora-progress-bar__fill" style="width: ${task.progress}%"></div>
                    </div>
                    <span class="sora-progress-text">${task.progress}%</span>
                </div>
                <button class="sora-active-task__cancel" data-job-id="${task.id}" title="Cancel">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join("");
    }

    /**
     * Show notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, info, warning)
     */
    showNotification(message, type = "info") {
        // Create notification container if it doesn't exist
        let notificationContainer = document.querySelector(".sora-notifications");
        if (!notificationContainer) {
            notificationContainer = document.createElement("div");
            notificationContainer.className = "sora-notifications";
            document.body.appendChild(notificationContainer);
        }

        // Create notification element
        const notification = document.createElement("div");
        notification.className = `sora-notification sora-notification--${type}`;
        notification.innerHTML = `
            <div class="sora-notification__content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span class="sora-notification__message">${message}</span>
            </div>
            <button class="sora-notification__close">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add to container
        notificationContainer.appendChild(notification);

        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);

        // Handle close button
        const closeBtn = notification.querySelector(".sora-notification__close");
        closeBtn.addEventListener("click", () => {
            notification.remove();
        });
    }

    /**
     * Get notification icon based on type
     * @param {string} type - Notification type
     */
    getNotificationIcon(type) {
        const icons = {
            success: "check-circle",
            error: "exclamation-circle",
            warning: "exclamation-triangle",
            info: "info-circle"
        };
        return icons[type] || "info-circle";
    }

    /**
     * Show a confirmation dialog
     * @param {string} title - Dialog title
     * @param {string} message - Dialog message
     * @returns {Promise<boolean>} - Promise resolving to user's choice
     */
    showConfirmDialog(title, message) {
        return new Promise((resolve) => {
            // Create modal backdrop
            const backdrop = document.createElement("div");
            backdrop.className = "sora-modal-backdrop";
            document.body.appendChild(backdrop);
            
            // Create modal container
            const modal = document.createElement("div");
            modal.className = "sora-confirm-modal";
            modal.innerHTML = `
                <div class="sora-confirm-modal__content">
                    <h3 class="sora-confirm-modal__title">${title}</h3>
                    <p class="sora-confirm-modal__message">${message}</p>
                    <div class="sora-confirm-modal__actions">
                        <button class="sora-confirm-modal__btn sora-confirm-modal__btn--cancel">Cancel</button>
                        <button class="sora-confirm-modal__btn sora-confirm-modal__btn--confirm">Confirm</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // Setup event listeners
            const confirmBtn = modal.querySelector(".sora-confirm-modal__btn--confirm");
            const cancelBtn = modal.querySelector(".sora-confirm-modal__btn--cancel");
            
            const cleanup = () => {
                document.body.removeChild(backdrop);
                document.body.removeChild(modal);
            };
            
            confirmBtn.addEventListener("click", () => {
                cleanup();
                resolve(true);
            });
            
            cancelBtn.addEventListener("click", () => {
                cleanup();
                resolve(false);
            });
            
            // Allow closing by clicking backdrop
            backdrop.addEventListener("click", () => {
                cleanup();
                resolve(false);
            });
            
            // Focus confirm button
            confirmBtn.focus();
        });
    }



    /**
     * Format date string
     * @param {string} dateString - Date string to format
     * @returns {string} Formatted date
     */
    formatDate(dateString) {
        if (!dateString) return "Unknown";
        try {
            return new Date(dateString).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });
        } catch (error) {
            return "Invalid Date";
        }
    }

    /**
     * Format file size in bytes to human readable format
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted file size
     */
    formatFileSize(bytes) {
        if (!bytes || bytes === 0) return "Unknown";
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
    }

    /**
     * Utility method to truncate text
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} Truncated text
     */
    truncateText(text, maxLength = 50) {
        if (!text) return "";
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + "...";
    }

    /**
     * Show video preview modal
     */
    showVideoPreviewModal(videoUrl, title, prompt) {
        console.log("Opening video preview modal:", title, videoUrl, prompt);
        
        // Remove existing modal if present
        const existingModal = document.getElementById("sora-video-preview-modal");
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal HTML
        const modalHtml = `
            <div id="sora-video-preview-modal" class="sora-modal sora-modal--video">
                <div class="sora-modal__backdrop" onclick="this.closest('.sora-modal').remove()"></div>
                <div class="sora-modal__container sora-modal__container--video">
                    <div class="sora-modal__header">
                        <button class="sora-modal__close" onclick="this.closest('.sora-modal').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="sora-modal__body">
                        <div class="sora-video-player">
                            <video 
                                controls 
                                autoplay 
                                class="sora-video-player__video"
                                preload="metadata"
                            >
                                <source src="${videoUrl}" type="video/mp4">
                                Your browser does not support the video tag.
                            </video>
                        </div>
                        ${prompt ? `
                            <div class="sora-video-prompt">
                                <h4 class="sora-video-prompt__title">
                                    <i class="fas fa-file-text"></i>
                                    Prompt
                                </h4>
                                <div class="sora-video-prompt__content">
                                    ${this.escapeHtml(prompt)}
                                </div>
                            </div>
                        ` : ""}
                    </div>
                    <div class="sora-modal__footer">
                        <button class="sora-btn sora-btn--secondary" onclick="this.closest('.sora-modal').remove()">
                            <i class="fas fa-times"></i>
                            Close
                        </button>
                        <a href="${videoUrl}" download class="sora-btn sora-btn--primary">
                            <i class="fas fa-download"></i>
                            Download Video
                        </a>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        document.body.insertAdjacentHTML("beforeend", modalHtml);
        
        // Focus on modal for accessibility
        const modal = document.getElementById("sora-video-preview-modal");
        modal.focus();

        // Handle escape key
        const handleEscape = (e) => {
            if (e.key === "Escape") {
                modal.remove();
                document.removeEventListener("keydown", handleEscape);
            }
        };
        document.addEventListener("keydown", handleEscape);
    }

    /**
     * Show video details modal
     */
    showVideoDetailsModal(details) {
        console.log("Opening video details modal:", details);
        console.log("Details metadata:", details);
        
        // Remove existing modal if present
        const existingModal = document.getElementById("sora-video-details-modal");
        if (existingModal) {
            existingModal.remove();
        }

        // Format details for display
        const formatValue = (value, isDateField = false) => {
            if (value === null || value === undefined || value === "") return "N/A";
            
            // Only try to format dates for specific date fields
            if (isDateField && typeof value === "string") {
                try {
                    const date = new Date(value);
                    if (!isNaN(date.getTime())) {
                        return date.toLocaleString();
                    }
                } catch (e) {
                    // If date parsing fails, return the original value
                }
            }
            
            return value;
        };

        const detailsRows = [
            { label: "File Name", value: details.name },
            { label: "Original Name", value: details.originalFileName },
            { label: "Job ID", value: details.jobId },
            { label: "Prompt", value: details.prompt },
            { label: "Generated At", value: details.generatedAt, isDate: true },
            { label: "File Size", value: details.size ? this.formatFileSize(details.size) : "N/A" },
            { label: "Duration", value: details.duration ? `${details.duration}s` : "N/A" },
            { label: "Resolution", value: details.resolution || (details.width && details.height ? `${details.width}x${details.height}` : "N/A") },
            { label: "Aspect Ratio", value: details.aspectRatio },
            { label: "Model", value: details.model },
            { label: "Quality", value: details.quality },
            { label: "Variants", value: details.variants },
            { label: "Last Modified", value: details.lastModified, isDate: true }
        ].filter(row => row.value !== undefined && row.value !== null && row.value !== "");

        const detailsHtml = detailsRows.map(row => `
            <div class="sora-details__row">
                <div class="sora-details__label">${row.label}:</div>
                <div class="sora-details__value">${this.escapeHtml(formatValue(row.value, row.isDate))}</div>
            </div>
        `).join("");

        // Create modal HTML
        const modalHtml = `
            <div id="sora-video-details-modal" class="sora-modal sora-modal--details">
                <div class="sora-modal__backdrop" onclick="this.closest('.sora-modal').remove()"></div>
                <div class="sora-modal__container">
                    <div class="sora-modal__header">
                        <h3 class="sora-modal__title">
                            <i class="fas fa-info-circle"></i>
                            Video Details
                        </h3>
                        <button class="sora-modal__close" onclick="this.closest('.sora-modal').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="sora-modal__body">
                        <div class="sora-details">
                            ${detailsHtml}
                        </div>
                    </div>
                    <div class="sora-modal__footer">
                        <button class="sora-btn sora-btn--secondary" onclick="this.closest('.sora-modal').remove()">
                            <i class="fas fa-times"></i>
                            Close
                        </button>
                        ${details.url ? `
                            <a href="${details.url}" download class="sora-btn sora-btn--primary">
                                <i class="fas fa-download"></i>
                                Download Video
                            </a>
                        ` : ""}
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        document.body.insertAdjacentHTML("beforeend", modalHtml);
        
        // Focus on modal for accessibility
        const modal = document.getElementById("sora-video-details-modal");
        modal.focus();

        // Handle escape key
        const handleEscape = (e) => {
            if (e.key === "Escape") {
                modal.remove();
                document.removeEventListener("keydown", handleEscape);
            }
        };
        document.addEventListener("keydown", handleEscape);
    }

    renderAIRewriteModal() {
        const availableModels = [
            { value: "gpt-4o", label: "GPT-4O" },
            { value: "gpt-4o-mini", label: "GPT-4O Mini" },
            { value: "o1", label: "O1" },
            { value: "o1-mini", label: "O1 Mini" },
            { value: "o3", label: "O3" },
            { value: "o3-mini", label: "O3 Mini" },
            { value: "o4-mini", label: "O4 Mini" },
            { value: "deepseek-r1", label: "DeepSeek R1" },
            { value: "gpt-4.1", label: "GPT-4.1" },
            { value: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
            { value: "gpt-4.1-nano", label: "GPT-4.1 Nano" }
        ];

        return `
            <div class="sora-modal sora-ai-rewrite-modal">
                <div class="sora-modal__backdrop"></div>
                <div class="sora-modal__content">
                    <div class="sora-modal__header">
                        <h3 class="sora-modal__title">
                            <i class="fas fa-magic"></i>
                            AI Smart Rewrite Video Prompt
                        </h3>
                        <button class="sora-modal__close" type="button">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="sora-modal__body">
                        <form id="ai-rewrite-form" class="sora-ai-rewrite-form">
                            <div class="sora-form-group">
                                <label for="ai-rewrite-input" class="sora-form-label">
                                    <i class="fas fa-edit"></i>
                                    Enter rewrite requirements
                                </label>
                                <textarea
                                    id="ai-rewrite-input"
                                    name="rewritePrompt"
                                    class="sora-form-textarea"
                                    placeholder="e.g., make the video more cinematic, add dynamic camera effects..."
                                    rows="3"
                                    required
                                ></textarea>
                                <small class="sora-form-hint">
                                    Describe how you want to improve the current video prompt
                                </small>
                            </div>

                            <div class="sora-form-group">
                                <label class="sora-form-label">
                                    <i class="fas fa-robot"></i>
                                    Select AI Model
                                </label>
                                <div class="sora-model-checkboxes" id="ai-model-checkboxes">
                                    ${availableModels.map(model => `
                                        <label class="sora-checkbox-wrapper">
                                            <input 
                                                type="checkbox" 
                                                name="model" 
                                                value="${model.value}" 
                                                class="sora-checkbox"
                                                ${model.value === "gpt-4o" ? "checked" : ""}
                                            >
                                            <span class="sora-checkbox-label">${model.label}</span>
                                        </label>
                                    `).join("")}
                                </div>
                                <small class="sora-form-hint">
                                    You can select multiple models for comparison
                                </small>
                            </div>

                            <div class="sora-form-group">
                                <label class="sora-form-label">
                                    <i class="fas fa-file-text"></i>
                                    Current Prompt Preview
                                </label>
                                <div id="current-prompt-preview" class="sora-prompt-preview">
                                    <!-- Current prompt content will be displayed here -->
                                </div>
                            </div>
                        </form>
                    </div>
                    
                    <div class="sora-modal__footer">
                        <button type="button" class="sora-btn sora-btn--secondary" id="ai-rewrite-cancel">
                            <i class="fas fa-times"></i>
                            Cancel
                        </button>
                        <button type="submit" form="ai-rewrite-form" class="sora-btn sora-btn--primary" id="ai-rewrite-submit">
                            <i class="fas fa-magic"></i>
                            Start Rewrite
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderRewriteResultsModal(results) {
        const successResults = results.filter(r => r.success);
        const failedResults = results.filter(r => !r.success);

        return `
            <div class="sora-modal sora-rewrite-results-modal">
                <div class="sora-modal__backdrop"></div>
                <div class="sora-modal__content">
                    <div class="sora-modal__header">
                        <h3 class="sora-modal__title">
                            <i class="fas fa-magic"></i>
                            AI Rewrite Results
                        </h3>
                        <button class="sora-modal__close" type="button">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="sora-modal__body">
                        ${successResults.length > 0 ? `
                            <div class="sora-rewrite-results">
                                <h4 class="sora-results-title">
                                    <i class="fas fa-check-circle"></i>
                                    Successfully Generated Results (${successResults.length})
                                </h4>
                                ${successResults.map((result) => `
                                    <div class="sora-result-item">
                                        <div class="sora-result-header">
                                            <span class="sora-result-model">${result.model}</span>
                                            <button class="sora-result-apply" data-content="${this.escapeHtml(result.content)}">
                                                <i class="fas fa-check"></i>
                                                Apply This Result
                                            </button>
                                        </div>
                                        <div class="sora-result-content">
                                            ${this.escapeHtml(result.content)}
                                        </div>
                                    </div>
                                `).join("")}
                            </div>
                        ` : ""}
                        
                        ${failedResults.length > 0 ? `
                            <div class="sora-rewrite-failures">
                                <h4 class="sora-results-title sora-results-title--error">
                                    <i class="fas fa-exclamation-triangle"></i>
                                    Failed Requests (${failedResults.length})
                                </h4>
                                ${failedResults.map(result => `
                                    <div class="sora-result-item sora-result-item--error">
                                        <div class="sora-result-header">
                                            <span class="sora-result-model">${result.model}</span>
                                            <span class="sora-result-error">Failed</span>
                                        </div>
                                        <div class="sora-result-content">
                                            Error: ${this.escapeHtml(result.error)}
                                        </div>
                                    </div>
                                `).join("")}
                            </div>
                        ` : ""}
                        
                        ${successResults.length === 0 && failedResults.length > 0 ? `
                            <div class="sora-no-results">
                                <i class="fas fa-exclamation-circle"></i>
                                All AI models failed to generate results. Please check your network connection or try again later.
                            </div>
                        ` : ""}
                    </div>
                    
                    <div class="sora-modal__footer">
                        <button type="button" class="sora-btn sora-btn--secondary" id="results-cancel">
                            <i class="fas fa-times"></i>
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Escape HTML special characters to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        if (!text) return "";
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }
}
