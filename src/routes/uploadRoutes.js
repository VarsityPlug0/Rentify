const express = require('express');
const router = express.Router();
const upload = require('../config/upload');
const AuthMiddleware = require('../middleware/AuthMiddleware');

router.post('/', AuthMiddleware.requireAdmin, upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        // Determine URL based on storage type
        let fileUrl;
        if (req.file.path && req.file.path.startsWith('http')) {
            // Cloudinary or other cloud storage
            fileUrl = req.file.path;
        } else {
            // Local storage
            fileUrl = `IMAGES/uploads/${req.file.filename}`;
        }

        res.json({
            success: true,
            message: 'File uploaded successfully',
            url: fileUrl
        });
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;
