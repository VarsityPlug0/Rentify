# Rental Platform API Documentation

## Overview
RESTful API for property rental platform with clean, scalable architecture.

## Base URL
```
http://localhost:3000/api
```

## Authentication
Session-based authentication for admin operations.

### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password123"
}
```

### Logout
```
POST /api/auth/logout
```

### Check Auth Status
```
GET /api/auth/status
```

## Applications API

### Submit New Application
```
POST /api/application
Content-Type: application/json

{
  "propertyId": 1,
  "applicantName": "John Doe",
  "applicantEmail": "john@example.com",
  "applicantPhone": "555-1234",
  "applicantIncome": 60000,
  "applicantAddress": "123 Main St",
  "applicantCity": "Philadelphia",
  "applicantState": "PA",
  "applicantZip": "19101",
  "applicantOccupants": 2,
  "applicantEmployment": "employed",
  "applicantMessage": "Interested in this property"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Application submitted successfully",
  "data": {
    "id": 1,
    "propertyId": 1,
    "applicantName": "John Doe",
    "applicantEmail": "john@example.com",
    "applicantPhone": "555-1234",
    "applicantIncome": 60000,
    "applicantAddress": "123 Main St",
    "applicantCity": "Philadelphia",
    "applicantState": "PA",
    "applicantZip": "19101",
    "applicantOccupants": 2,
    "applicantEmployment": "employed",
    "applicantMessage": "Interested in this property",
    "status": "pending",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Get All Applications
```
GET /api/application
```

### Get Application by ID
```
GET /api/application/:id
```

### Update Application Status
```
PATCH /api/application/:id/status
Content-Type: application/json

{
  "status": "approved",
  "adminNotes": "Applicant meets income requirements"
}
```

## Properties API

### Get All Properties
```
GET /api/properties
```

**Query Parameters:**
- `search` - Search term for title, location, or description
- `minPrice` - Minimum price filter
- `maxPrice` - Maximum price filter
- `bedrooms` - Minimum bedroom count
- `available` - Filter by availability (true/false)
- `sortBy` - Sort options: `price-low`, `price-high`, `newest`, `oldest`

**Response:**
```json
{
  "success": true,
  "message": "Retrieved 3 properties",
  "data": [
    {
      "id": 1,
      "title": "Luxury Executive Suite",
      "price": 1200,
      "location": "Sandton, South Africa",
      "bedrooms": 2,
      "bathrooms": 2,
      "squareFeet": 1200,
      "images": ["IMAGES/image1.webp"],
      "available": true,
      "featured": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "timestamp": "2024-01-13T12:00:00.000Z"
}
```

### Get Featured Properties
```
GET /api/properties/featured?limit=6
```

### Search Properties
```
GET /api/properties/search?search=sandton&minPrice=1000&maxPrice=2000
```

### Get Property Statistics
```
GET /api/properties/statistics
```

**Response:**
```json
{
  "success": true,
  "message": "Property statistics retrieved successfully",
  "data": {
    "total": 3,
    "available": 3,
    "featured": 1,
    "unavailable": 0,
    "averagePrice": 1217
  }
}
```

### Get Property by ID
```
GET /api/properties/1
```

### Create Property (Admin Only)
```
POST /api/properties
Authorization: Required

{
  "title": "New Luxury Apartment",
  "description": "Beautiful modern apartment",
  "price": 1500,
  "location": "Johannesburg, South Africa",
  "bedrooms": 2,
  "bathrooms": 2,
  "squareFeet": 1100,
  "images": ["IMAGES/new-apartment.webp"],
  "amenities": ["WiFi", "Gym", "Pool"]
}
```

### Update Property (Admin Only)
```
PUT /api/properties/1
Authorization: Required

{
  "price": 1300,
  "available": false
}
```

### Delete Property (Admin Only)
```
DELETE /api/properties/1
Authorization: Required
```

### Toggle Property Availability (Admin Only)
```
PATCH /api/properties/1/toggle-availability
Authorization: Required
```

### Set Property as Featured (Admin Only)
```
PATCH /api/properties/1/set-featured
Authorization: Required

{
  "featured": true
}
```

## Error Responses

### Validation Error
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": ["Title is required", "Valid price is required"],
  "code": "VALIDATION_ERROR"
}
```

### Not Found
```json
{
  "success": false,
  "message": "Property not found",
  "code": "NOT_FOUND"
}
```

### Unauthorized
```json
{
  "success": false,
  "message": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

### Forbidden
```json
{
  "success": false,
  "message": "Admin access required",
  "code": "FORBIDDEN"
}
```

## Health Check
```
GET /health
```

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-13T12:00:00.000Z",
  "uptime": 123.456
}
```

## Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Session Configuration
SESSION_SECRET=your-secret-key-here-change-in-production

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=password123

# Database Configuration (for future use)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rental_platform
DB_USERNAME=postgres
DB_PASSWORD=
DB_DIALECT=postgres

# Security
JWT_SECRET=jwt-secret-key-change-in-production
SALT_ROUNDS=12
```

## Architecture Layers

### 1. Routes Layer
- Defines API endpoints and HTTP methods
- Handles request/response formatting
- Applies middleware for authentication/authorization

### 2. Controllers Layer
- Processes HTTP requests
- Calls appropriate service methods
- Handles error responses
- Formats data for API responses

### 3. Services Layer
- Contains business logic
- Data validation and processing
- Interacts with data models
- Orchestrates complex operations

### 4. Models Layer
- Data structure definitions
- Business logic methods
- Data validation
- Relationship management

### 5. Middleware Layer
- Authentication and authorization
- Error handling
- Request validation
- Logging

### 6. Config Layer
- Environment configuration
- Database settings
- Security settings
- API configuration

## Future Database Integration

The architecture is prepared for database integration:

1. **Data Access Layer**: Will be added between Services and Models
2. **Repository Pattern**: Services will communicate through repositories
3. **Database Adapters**: Easy switching between PostgreSQL, MySQL, MongoDB
4. **Migration Scripts**: For schema changes and data seeding

## Testing

Run the server in development mode:
```bash
npm run dev
```

Test API endpoints:
```bash
# Get all properties
curl http://localhost:3000/api/properties

# Get health status
curl http://localhost:3000/health

# Admin login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'
```

## Deployment Considerations

1. **Environment Variables**: Set production values
2. **HTTPS**: Enable SSL/TLS certificates
3. **Database**: Configure production database
4. **Logging**: Implement structured logging
5. **Monitoring**: Add health checks and metrics
6. **Rate Limiting**: Protect against abuse
7. **CORS**: Configure allowed origins
8. **Security Headers**: Review Helmet.js configuration

This API provides a solid foundation for a rental property platform with room for growth and scalability.