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

        // Return the relative path that can be used in the frontend
        // Assuming 'IMAGES' is served statically
        const relativePath = `IMAGES/uploads/${req.file.filename}`;

        res.json({
            success: true,
            message: 'File uploaded successfully',
            url: relativePath
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
