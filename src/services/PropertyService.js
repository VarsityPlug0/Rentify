/**
 * Property Service
 * Business logic layer for property operations
 */

const Property = require('../models/Property');
const PropertyValidator = require('../validators/PropertyValidator');
const JsonStore = require('../utils/JsonStore');

// Default mock data for initialization
const DEFAULT_PROPERTIES = [
  {
    id: 1,
    title: "Luxury Executive Suite",
    price: 1200,
    location: "Sandton, South Africa",
    bedrooms: 2,
    bathrooms: 2,
    squareFeet: 1200,
    description: "Modern 2-bedroom apartment with premium amenities in prime location",
    images: [
      "IMAGES/Westpoint_Sandton_Executive_Suites.webp",
      "IMAGES/Marley_on_Katherine_Apartments.webp"
    ],
    available: true,
    featured: true,
    amenities: ["WiFi", "Gym", "Pool", "Parking"],
    createdAt: new Date('2024-01-01')
  },
  {
    id: 2,
    title: "Modern Loft Apartment",
    price: 950,
    location: "Bedfordview, South Africa",
    bedrooms: 1,
    bathrooms: 1,
    squareFeet: 850,
    description: "Stylish loft with spa access and contemporary design features",
    images: [
      "IMAGES/Lilian_Lofts_Hotel_Spa.webp"
    ],
    available: true,
    featured: false,
    amenities: ["WiFi", "Spa", "Kitchen", "Laundry"],
    createdAt: new Date('2024-01-02')
  },
  {
    id: 3,
    title: "Convention Center Apartment",
    price: 1500,
    location: "O.R. Tambo, South Africa",
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 1500,
    description: "Luxury accommodation near airport with business facilities",
    images: [
      "IMAGES/Radisson_Hotel_and_Convention_Centre_OR_Tambo_Airp.webp"
    ],
    available: true,
    featured: false,
    amenities: ["WiFi", "Business Center", "Airport Shuttle", "Restaurant"],
    createdAt: new Date('2024-01-03')
  }
];

class PropertyService {
  constructor() {
    this.store = new JsonStore('properties.json', DEFAULT_PROPERTIES.map(p => new Property(p)));
  }

  async _getAllProperties() {
    const data = await this.store.read();
    return data.map(p => new Property(p));
  }

  async _saveProperties(properties) {
    await this.store.write(properties.map(p => p.toJSON()));
  }

  // Get all properties with filtering and sorting
  async getAll(filters = {}) {
    const allProperties = await this._getAllProperties();
    let filteredProperties = [...allProperties];

    // Apply filters
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredProperties = filteredProperties.filter(property =>
        property.title.toLowerCase().includes(searchTerm) ||
        property.location.toLowerCase().includes(searchTerm) ||
        property.description.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.minPrice) {
      filteredProperties = filteredProperties.filter(property => property.price >= filters.minPrice);
    }

    if (filters.maxPrice) {
      filteredProperties = filteredProperties.filter(property => property.price <= filters.maxPrice);
    }

    if (filters.bedrooms) {
      filteredProperties = filteredProperties.filter(property => property.bedrooms >= filters.bedrooms);
    }

    if (filters.available !== undefined) {
      // Handle string 'true'/'false' from query params
      const isAvailable = String(filters.available) === 'true';
      filteredProperties = filteredProperties.filter(property => property.available === isAvailable);
    }

    // Apply sorting
    if (filters.sortBy === 'price-low') {
      filteredProperties.sort((a, b) => a.price - b.price);
    } else if (filters.sortBy === 'price-high') {
      filteredProperties.sort((a, b) => b.price - a.price);
    } else if (filters.sortBy === 'newest') {
      filteredProperties.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (filters.sortBy === 'oldest') {
      filteredProperties.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (filters.sortBy === 'bedrooms') {
      filteredProperties.sort((a, b) => Number(b.bedrooms) - Number(a.bedrooms));
    }

    return filteredProperties.map(prop => prop.toJSON());
  }

  // Get property by ID
  async getById(id) {
    const properties = await this._getAllProperties();
    const property = properties.find(p => p.id === id);
    return property ? property.toJSON() : null;
  }

  // Create new property
  async create(propertyData) {
    // Validate input
    const sanitizedData = PropertyValidator.sanitizeInput(propertyData);
    const validation = PropertyValidator.validateCreate(sanitizedData);

    if (!validation.isValid) {
      throw new Error(JSON.stringify(validation.errors));
    }

    const properties = await this._getAllProperties();

    // Create new property
    const newId = properties.length > 0 ? Math.max(...properties.map(p => p.id)) + 1 : 1;
    const newProperty = new Property({
      ...sanitizedData,
      id: newId,
      available: sanitizedData.available !== undefined ? sanitizedData.available : true, // Default to true
      featured: sanitizedData.featured !== undefined ? sanitizedData.featured : false, // Default to false
      createdAt: new Date(),
      updatedAt: new Date()
    });

    properties.push(newProperty);
    await this._saveProperties(properties);
    return newProperty.toJSON();
  }

  // Update property
  async update(id, updateData) {
    const properties = await this._getAllProperties();
    const propertyIndex = properties.findIndex(p => p.id === id);

    if (propertyIndex === -1) {
      throw new Error('Property not found');
    }

    // Validate update data
    const sanitizedData = PropertyValidator.sanitizeInput(updateData);
    const validation = PropertyValidator.validateUpdate(sanitizedData);

    if (!validation.isValid) {
      throw new Error(JSON.stringify(validation.errors));
    }

    // Update property
    const existingProperty = properties[propertyIndex];
    const updatedProperty = new Property({
      ...existingProperty,
      ...sanitizedData,
      id: existingProperty.id, // Preserve ID
      updatedAt: new Date()
    });

    properties[propertyIndex] = updatedProperty;
    await this._saveProperties(properties);
    return updatedProperty.toJSON();
  }

  // Delete property
  async delete(id) {
    const properties = await this._getAllProperties();
    const propertyIndex = properties.findIndex(p => p.id === id);

    if (propertyIndex === -1) {
      throw new Error('Property not found');
    }

    const deletedProperty = properties.splice(propertyIndex, 1)[0];
    await this._saveProperties(properties);
    return deletedProperty.toJSON();
  }

  // Toggle property availability
  async toggleAvailability(id) {
    const properties = await this._getAllProperties();
    const property = properties.find(p => p.id === id);

    if (!property) {
      throw new Error('Property not found');
    }

    property.toggleAvailability();
    await this._saveProperties(properties);
    return property.toJSON();
  }

  // Set property as featured
  async setFeatured(id, featured = true) {
    const properties = await this._getAllProperties();
    const property = properties.find(p => p.id === id);

    if (!property) {
      throw new Error('Property not found');
    }

    property.setFeatured(featured);
    await this._saveProperties(properties);
    return property.toJSON();
  }

  // Get featured properties
  async getFeatured(limit = 6) {
    const properties = await this._getAllProperties();
    const featuredProperties = properties
      .filter(p => p.featured && p.available)
      .slice(0, limit);

    return featuredProperties.map(prop => prop.toJSON());
  }

  // Get property statistics
  async getStatistics() {
    const properties = await this._getAllProperties();
    const total = properties.length;
    const available = properties.filter(p => p.available).length;
    const featured = properties.filter(p => p.featured).length;
    const avgPrice = total > 0 ? properties.reduce((sum, p) => sum + p.price, 0) / total : 0;

    return {
      total,
      available,
      featured,
      unavailable: total - available,
      averagePrice: Math.round(avgPrice)
    };
  }

  // Search properties
  async search(searchParams) {
    const validation = PropertyValidator.validateSearch(searchParams);

    if (!validation.isValid) {
      throw new Error(JSON.stringify(validation.errors));
    }

    return this.getAll(validation.validatedQuery);
  }
}

module.exports = PropertyService;