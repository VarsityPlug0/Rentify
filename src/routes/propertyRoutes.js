/**
 * Property Routes
 * RESTful API endpoints for property management
 */

const express = require('express');
const router = express.Router();
const PropertyController = require('../controllers/PropertyController');
const AuthMiddleware = require('../middleware/AuthMiddleware');
const ErrorHandler = require('../middleware/ErrorHandler');

// Public routes
router.get('/', ErrorHandler.asyncHandler(PropertyController.getAll));
router.get('/featured', ErrorHandler.asyncHandler(PropertyController.getFeatured));
router.get('/search', ErrorHandler.asyncHandler(PropertyController.search));
router.get('/statistics', ErrorHandler.asyncHandler(PropertyController.getStatistics));
router.get('/:id', ErrorHandler.asyncHandler(PropertyController.getById));

// Protected admin routes
router.post('/', 
  AuthMiddleware.requireAdmin,
  ErrorHandler.asyncHandler(PropertyController.create)
);

router.put('/:id', 
  AuthMiddleware.requireAdmin,
  ErrorHandler.asyncHandler(PropertyController.update)
);

router.delete('/:id', 
  AuthMiddleware.requireAdmin,
  ErrorHandler.asyncHandler(PropertyController.delete)
);

router.patch('/:id/toggle-availability',
  AuthMiddleware.requireAdmin,
  ErrorHandler.asyncHandler(PropertyController.toggleAvailability)
);

router.patch('/:id/set-featured',
  AuthMiddleware.requireAdmin,
  ErrorHandler.asyncHandler(PropertyController.setFeatured)
);

module.exports = router;