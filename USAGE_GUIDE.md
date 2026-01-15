# Website Usage Guide

## Active Pages (Use These)

### Public Facing Pages
- `index.html` - Main homepage
- `our-properties.html` - Property listings page  
- `property-details.html` - Individual property detail pages
- `contact.html` - Contact form page
- `application.html` - Rental application page

### Admin Panel (Backend Integrated)
- `admin-login.html` - Admin login page
- `admin-panel.html` - Main admin dashboard (use this for property management)

### Redirect Page
- `admin.html` - Redirects to new admin panel (legacy support)

## How to Use the Admin Panel

1. Go to `http://localhost:3000/admin-login.html`
2. Login with credentials: `admin` / `password123`
3. You'll be redirected to `admin-panel.html`
4. Use "Add Property" button to add new properties
5. Properties added here will appear on public pages

## Data Flow

- All property data comes from backend API
- Adding/updating properties in admin panel updates all public pages automatically
- Images and property details are managed through the backend
- No manual editing of HTML files needed
- Application forms submit directly to backend

## Important Notes

- Properties added via `admin-panel.html` are stored in the backend and will appear on public pages
- All public pages pull data from the backend API automatically
- The system is designed to be maintained through the admin panel only
- All functionality is now API-driven with no localStorage dependencies