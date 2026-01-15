/**
 * Property Model
 * Represents rental properties in the system
 */

class Property {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description;
    this.price = data.price;
    this.location = data.location;
    this.bedrooms = data.bedrooms;
    this.bathrooms = data.bathrooms;
    this.squareFeet = data.squareFeet;
    this.images = data.images || [];
    this.available = data.available !== undefined ? data.available : true;
    this.featured = data.featured || false;
    this.amenities = data.amenities || [];
    this.address = data.address || {};
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Business logic methods
  isAvailable() {
    return this.available;
  }

  toggleAvailability() {
    this.available = !this.available;
    this.updatedAt = new Date();
  }

  setFeatured(status) {
    this.featured = status;
    this.updatedAt = new Date();
  }

  // Data validation
  validate() {
    const errors = [];

    if (!this.title || this.title.trim().length === 0) {
      errors.push('Title is required');
    }

    if (!this.price || this.price <= 0) {
      errors.push('Valid price is required');
    }

    if (!this.location || this.location.trim().length === 0) {
      errors.push('Location is required');
    }

    if (!this.bedrooms || this.bedrooms < 0) {
      errors.push('Valid number of bedrooms is required');
    }

    if (!this.bathrooms || this.bathrooms < 0) {
      errors.push('Valid number of bathrooms is required');
    }

    if (!this.squareFeet || this.squareFeet <= 0) {
      errors.push('Valid square footage is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Convert to plain object for API responses
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      price: this.price,
      location: this.location,
      bedrooms: this.bedrooms,
      bathrooms: this.bathrooms,
      squareFeet: this.squareFeet,
      images: this.images,
      available: this.available,
      featured: this.featured,
      amenities: this.amenities,
      address: this.address,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Create from database/data source
  static fromData(data) {
    return new Property({
      ...data,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date()
    });
  }
}

module.exports = Property;