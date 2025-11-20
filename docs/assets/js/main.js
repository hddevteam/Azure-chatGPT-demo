// Azure ChatGPT Demo - Main JavaScript
// Enhanced interactions and mobile navigation

document.addEventListener("DOMContentLoaded", function() {
    // Mobile menu toggle
    initMobileMenu();
    
    // Copy to clipboard functionality
    initClipboard();
    
    // Smooth scrolling for navigation links
    initSmoothScrolling();
    
    // Scroll effects
    initScrollEffects();
    
    // Animation on scroll
    initScrollAnimations();
    
    // Analytics (placeholder for future implementation)
    initAnalytics();
});

/**
 * Initialize mobile menu functionality
 */
function initMobileMenu() {
    const menuToggle = document.querySelector(".header__menu-toggle");
    const menu = document.querySelector(".header__menu");
    
    if (menuToggle && menu) {
        menuToggle.addEventListener("click", function() {
            menu.classList.toggle("header__menu--active");
            menuToggle.classList.toggle("header__menu-toggle--active");
            
            // Prevent body scroll when menu is open
            document.body.classList.toggle("menu-open");
        });
        
        // Close menu when clicking on a link
        const menuLinks = document.querySelectorAll(".header__menu-link");
        menuLinks.forEach(link => {
            link.addEventListener("click", function() {
                menu.classList.remove("header__menu--active");
                menuToggle.classList.remove("header__menu-toggle--active");
                document.body.classList.remove("menu-open");
            });
        });
    }
}

/**
 * Initialize clipboard functionality for code blocks
 */
function initClipboard() {
    const copyButtons = document.querySelectorAll(".code-block__copy");
    
    copyButtons.forEach(button => {
        button.addEventListener("click", async function() {
            const textToCopy = this.getAttribute("data-clipboard-text");
            
            try {
                await navigator.clipboard.writeText(textToCopy);
                showCopySuccess(this);
            } catch (err) {
                // Fallback for older browsers
                fallbackCopyTextToClipboard(textToCopy, this);
            }
        });
    });
}

/**
 * Show copy success feedback
 */
function showCopySuccess(button) {
    const originalTitle = button.getAttribute("title");
    button.setAttribute("title", "Copied!");
    button.style.background = "rgba(34, 197, 94, 0.2)";
    
    setTimeout(() => {
        button.setAttribute("title", originalTitle);
        button.style.background = "";
    }, 2000);
}

/**
 * Fallback copy to clipboard for older browsers
 */
function fallbackCopyTextToClipboard(text, button) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand("copy");
        if (successful) {
            showCopySuccess(button);
        }
    } catch (err) {
        console.error("Fallback: Unable to copy", err);
    }
    
    document.body.removeChild(textArea);
}

/**
 * Initialize smooth scrolling for navigation links
 */
function initSmoothScrolling() {
    const links = document.querySelectorAll("a[href^=\"#\"]");
    
    links.forEach(link => {
        link.addEventListener("click", function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute("href");
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                const headerHeight = document.querySelector(".header").offsetHeight;
                const targetPosition = targetElement.offsetTop - headerHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: "smooth"
                });
            }
        });
    });
}

/**
 * Initialize scroll effects (header background, etc.)
 */
function initScrollEffects() {
    const header = document.querySelector(".header");
    let lastScrollTop = 0;
    
    window.addEventListener("scroll", function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Add/remove header background on scroll
        if (scrollTop > 50) {
            header.classList.add("header--scrolled");
        } else {
            header.classList.remove("header--scrolled");
        }
        
        // Hide/show header on scroll direction
        if (scrollTop > lastScrollTop && scrollTop > 200) {
            header.classList.add("header--hidden");
        } else {
            header.classList.remove("header--hidden");
        }
        
        lastScrollTop = scrollTop;
    });
}

/**
 * Initialize scroll animations
 */
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("animate-in");
            }
        });
    }, observerOptions);
    
    // Observe elements that should animate in
    const animateElements = document.querySelectorAll(".feature-card, .demo__item, .tech-item, .step");
    animateElements.forEach(el => {
        observer.observe(el);
    });
}

/**
 * Initialize analytics (placeholder for future implementation)
 */
function initAnalytics() {
    // Track button clicks
    const buttons = document.querySelectorAll(".btn, .header__menu-link--github");
    buttons.forEach(button => {
        button.addEventListener("click", function() {
            const action = this.textContent.trim();
            const href = this.getAttribute("href");
            
            // Analytics tracking would go here
            console.log("Button clicked:", { action, href });
        });
    });
    
    // Track demo image views
    const demoImages = document.querySelectorAll(".demo__img");
    const imageObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const imageSrc = entry.target.getAttribute("src");
                // Analytics tracking would go here
                console.log("Demo image viewed:", imageSrc);
            }
        });
    }, { threshold: 0.5 });
    
    demoImages.forEach(img => {
        imageObserver.observe(img);
    });
}

/**
 * Utility function to check if element is in viewport
 */
function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

/**
 * Debounce function for performance optimization
 */
function debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction() {
        const context = this;
        const args = arguments;
        
        const later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        
        if (callNow) func.apply(context, args);
    };
}

// Styles are now handled in style.css
// const additionalStyles = ... removed


// Image Modal Functions
function openImageModal(img) {
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("modalImage");
    const caption = document.getElementById("modalCaption");
    
    modal.style.display = "block";
    modalImg.src = img.src;
    caption.textContent = img.alt;
    
    // Prevent body scrolling when modal is open
    document.body.style.overflow = "hidden";
    
    // Analytics tracking
    console.log("Image modal opened:", img.alt);
}

function closeImageModal() {
    const modal = document.getElementById("imageModal");
    modal.style.display = "none";
    
    // Restore body scrolling
    document.body.style.overflow = "auto";
}

// Close modal when clicking outside the image
document.addEventListener("DOMContentLoaded", function() {
    const modal = document.getElementById("imageModal");
    if (modal) {
        modal.addEventListener("click", function(e) {
            if (e.target === this) {
                closeImageModal();
            }
        });
    }
    
    // Close modal with Escape key
    document.addEventListener("keydown", function(e) {
        if (e.key === "Escape") {
            closeImageModal();
        }
    });
});
