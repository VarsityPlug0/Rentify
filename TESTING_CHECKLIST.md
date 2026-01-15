# RENTAL WEBSITE TESTING CHECKLIST

## Public Site Testing

### 1. NAVIGATION & HEADER
- [x] Logo/Home link navigates to index.html
- [x] Properties link navigates to our-properties.html
- [x] Contact link navigates to contact.html
- [x] Admin link navigates to admin.html
- [ ] Mobile menu toggle works on small screens

### 2. INDEX PAGE ELEMENTS
- [ ] Hero section displays correctly
- [ ] Search input accepts text and filters properties
- [ ] Price filter dropdowns work correctly
- [ ] Bedroom filter buttons toggle selection
- [ ] Sort dropdown changes property order
- [ ] Property cards display with correct data
- [ ] "View Details" buttons navigate to property-details.html
- [ ] Featured badge displays on featured properties

### 3. PROPERTY DETAILS PAGE
- [ ] Property loads with correct ID parameter
- [ ] Main image displays properly
- [ ] Thumbnail gallery shows additional images
- [ ] Clicking thumbnails updates main image
- [ ] Property details (title, location, features) display correctly
- [ ] Application form submits successfully
- [ ] Form validation works for required fields
- [ ] Back navigation works

### 4. CONTACT FORM
- [ ] Form fields accept input
- [ ] Required field validation works
- [ ] Email validation rejects invalid emails
- [ ] Form submits successfully
- [ ] Success message displays
- [ ] Form resets after submission

### 5. APPLICATION FORM
- [ ] All form fields work correctly
- [ ] Date picker works for move-in date
- [ ] Pet selection dropdown functions
- [ ] Form validation prevents empty submissions
- [ ] Application submits successfully
- [ ] Success confirmation shows

## Admin Panel Testing

### 6. ADMIN LOGIN
- [ ] Login page loads correctly
- [ ] Valid credentials (admin/password123) allow login
- [ ] Invalid credentials show error message
- [ ] Empty fields show validation errors
- [ ] Successful login redirects to admin panel

### 7. ADMIN DASHBOARD
- [ ] Dashboard loads after successful login
- [ ] Stats display correctly (properties count)
- [ ] Logout button works and redirects to login
- [ ] Quick action buttons function
- [ ] Properties table displays all properties

### 8. PROPERTY MANAGEMENT
- [ ] "Add New Property" modal opens
- [ ] Add property form accepts all inputs
- [ ] Form validation works for required fields
- [ ] New property saves successfully
- [ ] Property appears in properties table
- [ ] Edit button loads property data into form
- [ ] Edited property updates correctly
- [ ] Delete button removes property
- [ ] Cancel button closes modal without saving

## Edge Cases & Error Handling

### 9. ERROR SCENARIOS
- [ ] Invalid property ID shows error message
- [ ] Network errors handled gracefully
- [ ] Session timeout redirects to login
- [ ] Multiple rapid clicks don't cause issues
- [ ] Form resubmission prevention works
- [ ] Browser back/forward buttons work correctly

### 10. PERFORMANCE & USABILITY
- [ ] Pages load within reasonable time
- [ ] Search/filter updates are responsive
- [ ] No console errors during normal operation
- [ ] Mobile responsiveness works on all pages
- [ ] Form auto-focus works appropriately
- [ ] Loading states show during API calls

## Cross-Page Consistency

### 11. DATA CONSISTENCY
- [ ] Property data matches across all views
- [ ] Changes in admin panel reflect immediately
- [ ] Search results match property details
- [ ] Form submissions update backend data
- [ ] Session persistence works across pages