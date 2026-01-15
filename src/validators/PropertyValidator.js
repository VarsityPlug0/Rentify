/**
 * Property Validator
 * Validates property-related data inputs
 */

const Property = require('../models/Property');

class PropertyValidator {
  static validateCreate(data) {
    const property = new Property(data);
    return property.validate();
  }

  static validateUpdate(data) {
    // For updates, only validate provided fields
    const property = new Property(data);
    const validation = property.validate();

    // Remove required field errors for update (since they might not be provided)
    const filteredErrors = validation.errors.filter(error => {
      // Allow missing fields for updates, but still validate provided values
      return ![
        'Title is required',
        'Valid price is required',
        'Location is required',
        'Valid number of bedrooms is required',
        'Valid number of bathrooms is required',
        'Valid square footage is required'
      ].includes(error);
    });

    return {
      isValid: filteredErrors.length === 0,
      errors: filteredErrors
    };
  }

  static validateSearch(query) {
    const errors = [];
    const validatedQuery = {};

    // Validate price range
    if (query.minPrice) {
      const minPrice = parseInt(query.minPrice);
      if (isNaN(minPrice) || minPrice < 0) {
        errors.push('Invalid minimum price');
      } else {
        validatedQuery.minPrice = minPrice;
      }
    }

    if (query.maxPrice) {
      const maxPrice = parseInt(query.maxPrice);
      if (isNaN(maxPrice) || maxPrice < 0) {
        errors.push('Invalid maximum price');
      } else {
        validatedQuery.maxPrice = maxPrice;
      }
    }

    // Validate bedroom count
    if (query.bedrooms) {
      const bedrooms = parseInt(query.bedrooms);
      if (isNaN(bedrooms) || bedrooms < 0) {
        errors.push('Invalid bedroom count');
      } else {
        validatedQuery.bedrooms = bedrooms;
      }
    }

    // Validate sort options
    const validSortOptions = ['price-low', 'price-high', 'newest', 'oldest', 'bedrooms'];
    if (query.sortBy && !validSortOptions.includes(query.sortBy)) {
      errors.push('Invalid sort option');
    } else if (query.sortBy) {
      validatedQuery.sortBy = query.sortBy;
    }

    return {
      isValid: errors.length === 0,
      errors,
      validatedQuery
    };
  }

  static sanitizeInput(data) {
    const sanitized = { ...data };

    // Trim string fields
    const stringFields = ['title', 'description', 'location'];
    stringFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = sanitized[field].trim();
      }
    });

    // Ensure numeric fields are numbers
    const numericFields = ['price', 'bedrooms', 'bathrooms', 'squareFeet'];
    numericFields.forEach(field => {
      if (sanitized[field] !== undefined) {
        sanitized[field] = Number(sanitized[field]);
      }
    });

    // Ensure boolean fields are boolean
    const booleanFields = ['available', 'featured'];
    booleanFields.forEach(field => {
      if (sanitized[field] !== undefined) {
        sanitized[field] = Boolean(sanitized[field]);
      }
    });

    return sanitized;
  }
}

module.exports = PropertyValidator;