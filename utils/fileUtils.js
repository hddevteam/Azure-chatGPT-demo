// utils/fileUtils.js
/**
 * Utility functions for file handling
 */

/**
 * Get the correct file extension based on MIME type
 * @param {string} mimeType - The MIME type of the file
 * @returns {string} The file extension including the dot (e.g. ".jpg")
 */
function getExtensionFromMimeType(mimeType) {
    const mimeToExt = {
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif"
    };
  
    return mimeToExt[mimeType] || ".png"; // Default to PNG if unknown
}

/**
 * Ensures file name has the correct extension based on MIME type
 * @param {string} fileName - Original file name
 * @param {string} mimeType - The MIME type of the file
 * @returns {string} Corrected file name with proper extension
 */
function ensureCorrectFileExtension(fileName, mimeType) {
    if (!fileName) {
        const baseName = "image";
        return baseName + getExtensionFromMimeType(mimeType);
    }

    const extension = getExtensionFromMimeType(mimeType);
  
    // If the filename already ends with the correct extension, return it as-is
    if (fileName.toLowerCase().endsWith(extension)) {
        return fileName;
    }
  
    // Otherwise, remove any existing extension and add the correct one
    return fileName.replace(/\.[^/.]+$/, "") + extension;
}

module.exports = {
    getExtensionFromMimeType,
    ensureCorrectFileExtension
};
