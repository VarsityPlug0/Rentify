# Website Architecture Documentation

## Overview
Clean, scalable rental property platform with clear separation of concerns and backend-driven content.

## Source of Truth Principles

### 1. Property Data Source
- **Backend Service**: `src/services/PropertyService.js`
- **API Endpoint**: `/api/properties`
- **Frontend Integration**: All property data fetched via API calls

### 2. Image Management Source
- **Backend Control**: Images stored in property objects
- **API Delivery**: Images served via property API endpoints
- **Frontend Rendering**: Dynamic image loading from API responses

### 3. Admin Actions Source
- **Backend Authentication**: Session-based admin authentication
- **Protected Endpoints**: `/api/properties` (admin only for write operations)
- **Admin Interface**: `admin-panel.html` with backend integration

### 4. Navigation Structure Source
- **Public Pages**: Defined in USAGE_GUIDE.md
- **Admin Pages**: Defined in USAGE_GUIDE.md
- **All Links**: Point to active, supported pages only

## Canonical Page Structure

### Public Pages (Accessible to all users)
- `index.html` - Main homepage with featured properties
- `our-properties.html` - Complete property listings
- `property-details.html` - Individual property details
- `contact.html` - Contact form
- `application.html` - Rental application form

### Admin Pages (Protected access)
- `admin-login.html` - Admin authentication
- `admin-panel.html` - Property management dashboard

### Redirect Page
- `admin.html` - Redirects to new admin panel

## Backend Architecture

### API Endpoints
- `/api/properties` - Get all properties
- `/api/properties/:id` - Get specific property
- `/api/properties/search` - Search properties
- `/api/properties/featured` - Get featured properties
- `/api/properties/statistics` - Get property statistics
- `/api/auth/login` - Admin login
- `/api/auth/logout` - Admin logout
- `/api/auth/status` - Authentication status
- `/api/properties` (POST) - Create property (admin only)
- `/api/properties/:id` (PUT) - Update property (admin only)
- `/api/properties/:id` (DELETE) - Delete property (admin only)
- `/api/application` (POST) - Submit rental application
- `/api/application` - Get all applications
- `/api/application/:id` - Get specific application
- `/api/application/:id/status` (PATCH) - Update application status

### Data Flow
1. Frontend pages fetch data from backend API
2. Backend services manage business logic
3. Models handle data validation and structure
4. Controllers process HTTP requests/responses
5. Middleware handles authentication/authorization

## Frontend Architecture

### Thin Renderer Pattern
- Frontend pages consume API data only
- No hardcoded property data in HTML
- Dynamic rendering based on API responses
- Consistent UI across all pages

### JavaScript Responsibilities
- `js/app.js` - Property listing and detail rendering
- `js/imageHandler.js` - Image processing utilities
- API communication and error handling
- User interface interactions

## Scalability Features

### Future-Proof Design
- Easy addition of new property fields
- Modular component architecture
- Consistent API patterns
- Separation of concerns

### Extension Points
- New property types: Extend Property model
- Additional admin features: Use existing API patterns
- Enhanced validation: Add to validators
- New UI components: Follow existing patterns

## Reliability Guarantees

### Error Handling
- Graceful degradation when API unavailable
- Proper fallback mechanisms
- Consistent error messaging
- Session management

### Performance
- Optimized API responses
- Efficient property rendering
- Lazy loading for images
- Caching strategies

## Maintenance Guidelines

### Adding New Features
1. Add backend API endpoint first
2. Update service layer with business logic
3. Extend frontend to consume new API
4. Test end-to-end functionality

### Updating Existing Features
1. Maintain backward compatibility where possible
2. Update both backend and frontend together
3. Ensure all existing functionality remains intact
4. Document breaking changes if any

## Security Considerations

### Authentication
- Session-based admin authentication
- Protected routes for admin actions
- Secure credential handling
- Proper authorization checks

### Data Validation
- Server-side validation for all inputs
- Sanitized data output
- Protection against injection attacks
- Secure file handling