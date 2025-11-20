/**
 * Image Handler Module
 * Provides functionality for handling image uploads, validation, and processing
 */

class ImageHandler {
    constructor() {
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    }

    /**
     * Validate an image file
     * @param {File} file - The file to validate
     * @returns {Object} Validation result
     */
    validateImage(file) {
        const result = {
            valid: true,
            errors: []
        };

        // Check file type
        if (!this.allowedTypes.includes(file.type)) {
            result.valid = false;
            result.errors.push(`Invalid file type: ${file.type}. Allowed types: ${this.allowedTypes.join(', ')}`);
        }

        // Check file size
        if (file.size > this.maxFileSize) {
            result.valid = false;
            result.errors.push(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum size: ${(this.maxFileSize / 1024 / 1024).toFixed(2)}MB`);
        }

        return result;
    }

    /**
     * Process multiple image files
     * @param {FileList} files - The files to process
     * @returns {Promise<Array>} Processed images with previews
     */
    async processImages(files) {
        const processedImages = [];
        
        // Process images with better error handling and support for unlimited uploads
        // Process in batches to prevent UI freezing with large numbers of images
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const validation = this.validateImage(file);
            
            if (validation.valid) {
                try {
                    const previewUrl = await this.createPreview(file);
                    processedImages.push({
                        file: file,
                        previewUrl: previewUrl,
                        name: file.name,
                        size: file.size,
                        type: file.type
                    });
                } catch (error) {
                    console.error(`Error processing file ${file.name}:`, error);
                    // Continue processing other files even if one fails
                }
            } else {
                console.warn(`Invalid file ${file.name}:`, validation.errors);
                // Continue processing other files even if one is invalid
            }
            
            // Yield control back to the browser periodically to prevent UI freezing
            // More frequent yields for better responsiveness with many images
            // For very large numbers of images, yield more frequently
            const yieldFrequency = files.length > 50 ? 3 : 5;
            if (i % yieldFrequency === yieldFrequency - 1) {  // Every 5 images for better responsiveness
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        
        return processedImages;
    }

    /**
     * Create a preview URL for an image file
     * @param {File} file - The file to create preview for
     * @returns {Promise<string>} Preview URL
     */
    createPreview(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to create preview'));
            reader.readAsDataURL(file);
        });
    }

    /**
     * Convert image to data URL (simulating upload)
     * @param {File} file - The file to convert
     * @returns {Promise<string>} Data URL
     */
    async convertToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to convert file'));
            reader.readAsDataURL(file);
        });
    }

    /**
     * Simulate image upload to server
     * In a real application, this would send the file to a server
     * @param {File} file - The file to upload
     * @returns {Promise<Object>} Upload result
     */
    async uploadImage(file) {
        // In a real implementation, this would upload to a server
        // For demo purposes, we'll just return a simulated result
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const dataUrl = await this.convertToDataUrl(file);
        
        return {
            success: true,
            url: dataUrl, // In real app, this would be a server URL
            filename: file.name,
            size: file.size
        };
    }

    /**
     * Upload multiple images
     * @param {Array} files - Array of files to upload
     * @returns {Promise<Array>} Upload results
     */
    async uploadImages(files) {
        const results = [];
        
        for (const file of files) {
            try {
                const result = await this.uploadImage(file);
                results.push(result);
            } catch (error) {
                results.push({
                    success: false,
                    error: error.message,
                    filename: file.name
                });
            }
        }
        
        return results;
    }
}

// Create a global instance
const imageHandler = new ImageHandler();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ImageHandler, imageHandler };
}

// Export for browser environments
if (typeof window !== 'undefined') {
    window.ImageHandler = ImageHandler;
    window.imageHandler = imageHandler;
}