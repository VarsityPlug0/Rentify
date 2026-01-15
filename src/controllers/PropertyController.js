/**
 * Property Controller
 * Handles HTTP requests for property operations
 */

const PropertyService = require('../services/PropertyService');
const ErrorHandler = require('../middleware/ErrorHandler');

const propertyService = new PropertyService();

class PropertyController {
  constructor() {
    // Service is imported globally
  }

  // GET /api/properties - Get all properties with filtering
  async getAll(req, res) {
    try {
      const properties = await propertyService.getAll(req.query);

      res.json(ErrorHandler.formatResponse(
        properties,
        `Retrieved ${properties.length} properties`,
        200
      ));
    } catch (error) {
      console.error('Error fetching properties:', error);
      res.status(500).json(ErrorHandler.handleServerError(error));
    }
  }

  // GET /api/properties/featured - Get featured properties
  async getFeatured(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 6;
      const featuredProperties = await propertyService.getFeatured(limit);

      res.json(ErrorHandler.formatResponse(
        featuredProperties,
        `Retrieved ${featuredProperties.length} featured properties`,
        200
      ));
    } catch (error) {
      console.error('Error fetching featured properties:', error);
      res.status(500).json(ErrorHandler.handleServerError(error));
    }
  }

  // GET /api/properties/search - Search properties
  async search(req, res) {
    try {
      const properties = await propertyService.search(req.query);

      res.json(ErrorHandler.formatResponse(
        properties,
        `Found ${properties.length} matching properties`,
        200
      ));
    } catch (error) {
      if (error.message.includes('Validation failed')) {
        const errors = JSON.parse(error.message);
        res.status(400).json(ErrorHandler.handleValidationError(errors));
      } else {
        console.error('Error searching properties:', error);
        res.status(500).json(ErrorHandler.handleServerError(error));
      }
    }
  }

  // GET /api/properties/statistics - Get property statistics
  async getStatistics(req, res) {
    try {
      const stats = await propertyService.getStatistics();

      res.json(ErrorHandler.formatResponse(
        stats,
        'Property statistics retrieved successfully',
        200
      ));
    } catch (error) {
      console.error('Error fetching statistics:', error);
      res.status(500).json(ErrorHandler.handleServerError(error));
    }
  }

  // GET /api/properties/:id - Get property by ID
  async getById(req, res) {
    try {
      const id = parseInt(req.params.id);
      const property = await propertyService.getById(id);

      if (!property) {
        return res.status(404).json(ErrorHandler.handleNotFound('Property'));
      }

      res.json(ErrorHandler.formatResponse(
        property,
        'Property retrieved successfully',
        200
      ));
    } catch (error) {
      console.error('Error fetching property:', error);
      res.status(500).json(ErrorHandler.handleServerError(error));
    }
  }

  // POST /api/properties - Create new property (admin only)
  async create(req, res) {
    try {
      const newProperty = await propertyService.create(req.body);

      res.status(201).json(ErrorHandler.formatResponse(
        newProperty,
        'Property created successfully',
        201
      ));
    } catch (error) {
      if (error.message.includes('Validation failed')) {
        const errors = JSON.parse(error.message);
        res.status(400).json(ErrorHandler.handleValidationError(errors));
      } else {
        console.error('Error creating property:', error);
        res.status(500).json(ErrorHandler.handleServerError(error));
      }
    }
  }

  // PUT /api/properties/:id - Update property (admin only)
  async update(req, res) {
    try {
      const id = parseInt(req.params.id);
      const updatedProperty = await propertyService.update(id, req.body);

      res.json(ErrorHandler.formatResponse(
        updatedProperty,
        'Property updated successfully',
        200
      ));
    } catch (error) {
      if (error.message === 'Property not found') {
        res.status(404).json(ErrorHandler.handleNotFound('Property'));
      } else if (error.message.includes('Validation failed')) {
        const errors = JSON.parse(error.message);
        res.status(400).json(ErrorHandler.handleValidationError(errors));
      } else {
        console.error('Error updating property:', error);
        res.status(500).json(ErrorHandler.handleServerError(error));
      }
    }
  }

  // DELETE /api/properties/:id - Delete property (admin only)
  async delete(req, res) {
    try {
      const id = parseInt(req.params.id);
      const deletedProperty = await propertyService.delete(id);

      res.json(ErrorHandler.formatResponse(
        deletedProperty,
        'Property deleted successfully',
        200
      ));
    } catch (error) {
      if (error.message === 'Property not found') {
        res.status(404).json(ErrorHandler.handleNotFound('Property'));
      } else {
        console.error('Error deleting property:', error);
        res.status(500).json(ErrorHandler.handleServerError(error));
      }
    }
  }

  // PATCH /api/properties/:id/toggle-availability - Toggle availability (admin only)
  async toggleAvailability(req, res) {
    try {
      const id = parseInt(req.params.id);
      const updatedProperty = await propertyService.toggleAvailability(id);

      const status = updatedProperty.available ? 'available' : 'unavailable';
      res.json(ErrorHandler.formatResponse(
        updatedProperty,
        `Property marked as ${status}`,
        200
      ));
    } catch (error) {
      if (error.message === 'Property not found') {
        res.status(404).json(ErrorHandler.handleNotFound('Property'));
      } else {
        console.error('Error toggling property availability:', error);
        res.status(500).json(ErrorHandler.handleServerError(error));
      }
    }
  }

  // PATCH /api/properties/:id/set-featured - Set featured status (admin only)
  async setFeatured(req, res) {
    try {
      const id = parseInt(req.params.id);
      const featured = req.body.featured !== undefined ? req.body.featured : true;
      const updatedProperty = await propertyService.setFeatured(id, featured);

      const status = featured ? 'featured' : 'regular';
      res.json(ErrorHandler.formatResponse(
        updatedProperty,
        `Property marked as ${status}`,
        200
      ));
    } catch (error) {
      if (error.message === 'Property not found') {
        res.status(404).json(ErrorHandler.handleNotFound('Property'));
      } else {
        console.error('Error setting property featured status:', error);
        res.status(500).json(ErrorHandler.handleServerError(error));
      }
    }
  }
}

module.exports = new PropertyController();