/**
 * Application Routes
 * RESTful API endpoints for rental application management
 */

const express = require('express');
const router = express.Router();
const ApplicationService = require('../services/ApplicationService');
const AuthMiddleware = require('../middleware/AuthMiddleware');

const applicationService = new ApplicationService();

// Submit a new application
router.post('/', async (req, res) => {
  try {
    const { propertyId, applicantName, applicantEmail, applicantPhone,
      applicantIncome, applicantAddress, applicantCity, applicantState,
      applicantZip, applicantOccupants, applicantEmployment, applicantMessage, timestamp } = req.body;

    // Validate required fields
    if (!propertyId || !applicantName || !applicantEmail || !applicantPhone ||
      !applicantIncome || !applicantAddress || !applicantCity ||
      !applicantState || !applicantZip || !applicantOccupants || !applicantEmployment) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        code: 'VALIDATION_ERROR'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(applicantEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
        code: 'VALIDATION_ERROR'
      });
    }

    const newApplication = await applicationService.create({
      propertyId: parseInt(propertyId),
      applicantName,
      applicantEmail,
      applicantPhone,
      applicantIncome: parseFloat(applicantIncome),
      applicantAddress,
      applicantCity,
      applicantState,
      applicantZip,
      applicantOccupants: parseInt(applicantOccupants),
      applicantEmployment,
      applicantMessage: applicantMessage || '',
      documents: req.body.documents || []
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: newApplication
    });

  } catch (error) {
    console.error('Error submitting application:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

// Get all applications (admin only)
router.get('/', AuthMiddleware.requireAdmin, async (req, res) => {
  try {
    const applications = await applicationService.getAll();
    res.json({
      success: true,
      message: `Retrieved ${applications.length} applications`,
      data: applications
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

// Get application by ID
router.get('/:id', AuthMiddleware.requireAdmin, async (req, res) => {
  try {
    const applicationId = parseInt(req.params.id);
    const application = await applicationService.getById(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      success: true,
      message: 'Application retrieved successfully',
      data: application
    });
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

// Update application status (admin only)
router.patch('/:id/status', AuthMiddleware.requireAdmin, async (req, res) => {
  try {
    const applicationId = parseInt(req.params.id);
    const { status, adminNotes } = req.body;

    const validStatuses = ['pending', 'approved', 'rejected', 'withdrawn'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
        code: 'VALIDATION_ERROR'
      });
    }

    try {
      const updatedApp = await applicationService.updateStatus(applicationId, status, adminNotes);
      res.json({
        success: true,
        message: 'Application status updated successfully',
        data: updatedApp
      });
    } catch (e) {
      if (e.message === 'Application not found') {
        return res.status(404).json({
          success: false,
          message: 'Application not found',
          code: 'NOT_FOUND'
        });
      }
      throw e;
    }
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

module.exports = router;