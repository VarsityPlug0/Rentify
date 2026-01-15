/**
 * Message Routes
 * RESTful API endpoints for contact message management
 */

const express = require('express');
const router = express.Router();
const MessageService = require('../services/MessageService');
const AuthMiddleware = require('../middleware/AuthMiddleware');

const messageService = new MessageService();

// Submit a new message
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, subject, message, propertyId } = req.body;

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        code: 'VALIDATION_ERROR'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
        code: 'VALIDATION_ERROR'
      });
    }

    const newMessage = await messageService.create({
      name,
      email,
      phone: phone || '',
      subject: subject || 'General Inquiry',
      message,
      propertyId: propertyId ? parseInt(propertyId) : null
    });

    res.status(201).json({
      success: true,
      message: 'Message submitted successfully',
      data: newMessage
    });

  } catch (error) {
    console.error('Error submitting message:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

// Get all messages (admin only)
router.get('/', AuthMiddleware.requireAdmin, async (req, res) => {
  try {
    // Get query parameters for filtering
    const { status, propertyId } = req.query;

    const messages = await messageService.getAll({ status, propertyId });

    res.json({
      success: true,
      message: `Retrieved ${messages.length} messages`,
      data: messages,
      totalCount: messages.length
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

// Get message by ID
router.get('/:id', AuthMiddleware.requireAdmin, async (req, res) => {
  try {
    const messageId = parseInt(req.params.id);
    const message = await messageService.getById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      success: true,
      message: 'Message retrieved successfully',
      data: message
    });
  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

// Update message status (admin only)
router.patch('/:id/status', AuthMiddleware.requireAdmin, async (req, res) => {
  try {
    const messageId = parseInt(req.params.id);
    const { status } = req.body;

    const validStatuses = ['unread', 'read', 'replied', 'archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
        code: 'VALIDATION_ERROR'
      });
    }

    try {
      const updatedMessage = await messageService.updateStatus(messageId, status);
      res.json({
        success: true,
        message: 'Message status updated successfully',
        data: updatedMessage
      });
    } catch (e) {
      if (e.message === 'Message not found') {
        return res.status(404).json({
          success: false,
          message: 'Message not found',
          code: 'NOT_FOUND'
        });
      }
      throw e;
    }
  } catch (error) {
    console.error('Error updating message status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

// Reply to message (admin only)
router.post('/:id/reply', AuthMiddleware.requireAdmin, async (req, res) => {
  try {
    const messageId = parseInt(req.params.id);
    const { replyMessage, adminName } = req.body;

    if (!replyMessage) {
      return res.status(400).json({
        success: false,
        message: 'Reply message is required',
        code: 'VALIDATION_ERROR'
      });
    }

    try {
      const updatedMessage = await messageService.reply(messageId, replyMessage);
      res.json({
        success: true,
        message: 'Message replied to successfully',
        data: updatedMessage
      });
    } catch (e) {
      if (e.message === 'Message not found') {
        return res.status(404).json({
          success: false,
          message: 'Message not found',
          code: 'NOT_FOUND'
        });
      }
      throw e;
    }
  } catch (error) {
    console.error('Error replying to message:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

module.exports = router;