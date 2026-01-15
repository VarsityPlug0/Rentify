// Property Rental Website - Dynamic Functionality
// Maintains exact design while adding full functionality

class RentalApp {
  constructor() {
    this.properties = [];
    this.filteredProperties = [];
    this.currentFilters = {};
    this.apiBaseUrl = window.location.port === '3000' ? '' : 'http://localhost:3000';
    this.init();
  }

  async init() {
    this.setupEventListeners();

    // Check if we are on property details page
    const urlParams = new URLSearchParams(window.location.search);
    const propertyId = urlParams.get('id');

    if (window.location.pathname.includes('property-details.html') && propertyId) {
      await this.loadPropertyDetail(propertyId);
    } else {
      // Default to loading properties for listing/home pages
      await this.loadProperties();
      this.renderProperties();
    }
  }

  async loadProperties() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/properties`);
      const data = await response.json();
      if (data.success) {
        this.properties = data.data;
        this.filteredProperties = [...this.properties];
      } else {
        console.error('Failed to load properties:', data.message);
        this.properties = [];
        this.filteredProperties = [];
      }
    } catch (error) {
      console.warn('Failed to load properties from API, using mock data:', error);
      this.properties = this.mockProperties;
      this.filteredProperties = [...this.properties];
    }
  }

  setupEventListeners() {
    // Search functionality
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
      searchInput.addEventListener('input', this.debounce(this.handleSearch.bind(this), 300));
    }

    // Filter buttons
    const filterButtons = document.querySelectorAll('[data-filter]');
    filterButtons.forEach(button => {
      button.addEventListener('click', this.handleFilter.bind(this));
    });

    // Sort dropdown
    const sortSelect = document.querySelector('.sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', this.handleSort.bind(this));
    }

    // Mobile menu toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mainNav = document.querySelector('.main-nav');
    if (mobileMenuBtn && mainNav) {
      mobileMenuBtn.addEventListener('click', () => {
        mainNav.classList.toggle('active');
      });
    }

    // Form submissions
    this.setupFormHandlers();
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  async handleSearch(event) {
    const searchTerm = event.target.value.trim();
    this.currentFilters.search = searchTerm;
    await this.applyFilters();
  }

  async handleFilter(event) {
    const filterType = event.target.dataset.filter;
    const filterValue = event.target.dataset.value;

    // Update active state
    const buttons = document.querySelectorAll(`[data-filter="${filterType}"]`);
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // Store filter value
    this.currentFilters[filterType] = filterValue === 'all' ? null : filterValue;
    await this.applyFilters();
  }

  async handleSort(event) {
    this.currentFilters.sortBy = event.target.value;
    await this.applyFilters();
  }

  async applyFilters() {
    try {
      // 1. Collect values from DOM
      const searchInput = document.getElementById('search-input');
      const minPriceInput = document.getElementById('min-price');
      const maxPriceInput = document.getElementById('max-price');
      const sortSelect = document.getElementById('sort-select');
      const featuredCheckbox = document.getElementById('filter-featured');
      const availableCheckbox = document.getElementById('filter-available');

      // Bedroom pills
      const bedroomInputs = document.querySelectorAll('input[data-filter="bedrooms"]:checked');
      const selectedBedrooms = Array.from(bedroomInputs).map(input => input.dataset.value);

      // 2. Build Query Params
      const params = new URLSearchParams();

      if (searchInput && searchInput.value) params.append('search', searchInput.value);
      if (minPriceInput && minPriceInput.value) params.append('minPrice', minPriceInput.value);
      if (maxPriceInput && maxPriceInput.value) params.append('maxPrice', maxPriceInput.value);
      if (sortSelect && sortSelect.value) params.append('sortBy', sortSelect.value);

      if (featuredCheckbox && featuredCheckbox.checked) params.append('featured', 'true');
      if (availableCheckbox && availableCheckbox.checked) params.append('available', 'true');
      if (selectedBedrooms.length > 0) params.append('bedrooms', selectedBedrooms.join(','));

      // 3. Update internal state (for sync filtering if needed)
      this.currentFilters = {
        search: searchInput ? searchInput.value : '',
        minPrice: minPriceInput ? minPriceInput.value : '',
        maxPrice: maxPriceInput ? maxPriceInput.value : '',
        sortBy: sortSelect ? sortSelect.value : '',
        featured: featuredCheckbox ? featuredCheckbox.checked : false,
        available: availableCheckbox ? availableCheckbox.checked : false,
        bedrooms: selectedBedrooms
      };

      // 4. Fetch Results
      try {
        const response = await fetch(`${this.apiBaseUrl}/api/properties?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
          this.filteredProperties = data.data;
        } else {
          // Fallback to local filtering if API fails
          console.warn('API filter failed, filtering locally');
          this.filterLocally();
        }
      } catch (err) {
        console.warn('Network error during filter, filtering locally');
        this.filterLocally();
      }

      this.renderProperties();

    } catch (error) {
      console.error('Filter error:', error);
    }
  }

  filterLocally() {
    // Simple local filtering logic as fallback
    let results = [...this.properties];
    const f = this.currentFilters;

    if (f.search) {
      const term = f.search.toLowerCase();
      results = results.filter(p => p.title.toLowerCase().includes(term) || p.location.toLowerCase().includes(term));
    }
    if (f.minPrice) results = results.filter(p => p.price >= parseFloat(f.minPrice));
    if (f.maxPrice) results = results.filter(p => p.price <= parseFloat(f.maxPrice));
    if (f.featured) results = results.filter(p => p.featured);
    if (f.available) results = results.filter(p => p.available);
    if (f.bedrooms && f.bedrooms.length > 0) {
      // If '2' is selected, show 2 or more? or exact? 
      // Usually pills imply "or", but let's assume minimum for now or match
      results = results.filter(p => f.bedrooms.includes(p.bedrooms.toString()) || p.bedrooms >= Math.min(...f.bedrooms));
    }

    // Sort
    if (f.sortBy === 'price-low') results.sort((a, b) => a.price - b.price);
    if (f.sortBy === 'price-high') results.sort((a, b) => b.price - a.price);
    if (f.sortBy === 'newest') results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    // ... other sorts

    this.filteredProperties = results;
  }

  renderProperties() {
    const container = document.querySelector('#properties-container') || document.querySelector('.properties-grid');
    if (!container) return;

    if (this.filteredProperties.length === 0) {
      container.innerHTML = `
        <div class="no-results">
          <h3>No properties found</h3>
          <p>Try adjusting your search criteria</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.filteredProperties.map(property => this.createPropertyCard(property, { showGallery: true })).join('');
  }

  createPropertyCard(property) {
    const featuredBadge = property.featured ?
      `<div class="position-absolute top-0 start-0 m-3 badge bg-primary fw-normal shadow-sm">FEATURED</div>` : '';

    return `
      <div class="col-lg-4 col-md-6 mb-4">
        <div class="property-card h-100 bg-white rounded-3 shadow-sm border-0 transition-hover" 
             style="cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;"
             data-property-id="${property.id}" 
             onclick="window.location.href='/property-details.html?id=${property.id}';">
             
          <!-- IMAGE SECTION -->
          <div class="position-relative overflow-hidden rounded-top-3">
            <div class="ratio ratio-4x3">
              <img src="${property.images[0] || 'IMAGES/default-property.jpg'}" 
                   alt="${property.title}" 
                   loading="lazy"
                   class="object-fit-cover w-100 h-100"
                   onerror="this.src='IMAGES/default-property.jpg'">
            </div>
            ${featuredBadge}
          </div>
          
          <!-- CONTENT SECTION -->
          <div class="p-4 d-flex flex-column h-100">
            <!-- 1. Price (Most Prominent) -->
            <div class="mb-2">
              <span class="fs-4 fw-bold text-primary">$${window.formatCurrency(property.price).replace('$', '')}</span>
              <span class="text-muted small">/month</span>
            </div>
            
            <!-- 2. Title (Secondary) -->
            <h3 class="h6 fw-bold text-dark mb-2 text-truncate" title="${property.title}">
              ${property.title}
            </h3>
            
            <!-- 3. Location (Tertiary) -->
            <div class="mb-3 text-muted small d-flex align-items-center">
              <i class="fas fa-map-marker-alt me-2 text-secondary"></i>
              <span class="text-truncate">${property.location}</span>
            </div>
            
            <!-- 4. Specs (Unified Block) -->
            <div class="mt-auto pt-3 border-top w-100">
              <div class="d-flex flex-row justify-content-between align-items-center w-100 text-secondary small">
                <div class="d-flex align-items-center">
                  <i class="fas fa-bed me-2"></i>
                  <span>${property.bedrooms} <span class="d-none d-sm-inline">bed</span></span>
                </div>
                <div class="d-flex align-items-center">
                  <i class="fas fa-bath me-2"></i>
                  <span>${property.bathrooms} <span class="d-none d-sm-inline">bath</span></span>
                </div>
                <div class="d-flex align-items-center">
                  <i class="fas fa-ruler-combined me-2"></i>
                  <span>${property.squareFeet} <span class="d-none d-sm-inline">sqft</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }


  setupFormHandlers() {
    // Contact form
    const contactForm = document.querySelector('#contact-form');
    if (contactForm) {
      contactForm.addEventListener('submit', this.handleSubmitContact.bind(this));
    }

    // Application form
    const applicationForm = document.querySelector('#application-form');
    if (applicationForm) {
      applicationForm.addEventListener('submit', this.handleSubmitApplication.bind(this));
    }

    // Admin login form
    const adminLoginForm = document.querySelector('#admin-login-form');
    if (adminLoginForm) {
      adminLoginForm.addEventListener('submit', this.handleAdminLogin.bind(this));
    }
  }

  async handleSubmitContact(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    try {
      const response = await fetch(`${this.apiBaseUrl}/api/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        this.showNotification('Message sent successfully!', 'success');
        form.reset();
      } else {
        this.showNotification(result.message || 'Error sending message', 'error');
      }
    } catch (error) {
      console.error('Contact form error:', error);
      this.showNotification('Failed to send message. Please try again.', 'error');
    }
  }

  async handleSubmitApplication(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    try {
      const response = await fetch(`${this.apiBaseUrl}/api/application`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        this.showNotification('Application submitted successfully!', 'success');
        form.reset();
      } else {
        this.showNotification(result.message || 'Error submitting application', 'error');
      }
    } catch (error) {
      console.error('Application form error:', error);
      this.showNotification('Failed to submit application. Please try again.', 'error');
    }
  }

  async handleAdminLogin(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    try {
      const response = await fetch(`${this.apiBaseUrl}/api/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        this.showNotification('Login successful!', 'success');
        setTimeout(() => {
          window.location.href = '/admin.html';
        }, 1000);
      } else {
        this.showNotification(result.message || 'Invalid credentials', 'error');
      }
    } catch (error) {
      console.error('Login error:', error);
      this.showNotification('Login failed. Please try again.', 'error');
    }
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type} `;
    notification.innerHTML = `
      < div class="notification-content" >
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
      </div >
      `;

    // Add to DOM
    document.body.appendChild(notification);

    // Auto remove after delay
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }

  // Mock Data for Fallback
  get mockProperties() {
    return [
      {
        "id": 1,
        "title": "bevan houses",
        "description": "Modern 2-bedroom apartment with premium amenities in prime location",
        "price": 1200,
        "location": "Sandton, South Africa",
        "bedrooms": 2,
        "bathrooms": 2,
        "squareFeet": 1200,
        "images": [
          "IMAGES/Westpoint_Sandton_Executive_Suites.webp",
          "IMAGES/Marley_on_Katherine_Apartments.webp",
          "IMAGES/uploads/image-1768416081688-820828818.jpg",
          "IMAGES/uploads/image-1768416081726-47826603.jpg",
          "IMAGES/uploads/image-1768416081768-771021021.jpg",
          "IMAGES/uploads/image-1768416081830-625862409.jpg",
          "IMAGES/uploads/image-1768416081871-624904988.jpg"
        ],
        "available": true,
        "featured": true,
        "amenities": ["WiFi", "Gym", "Pool", "Parking"]
      },
      {
        "id": 2,
        "title": "Modern Loft Apartment",
        "description": "Stylish loft with spa access and contemporary design features",
        "price": 950,
        "location": "Bedfordview, South Africa",
        "bedrooms": 1,
        "bathrooms": 1,
        "squareFeet": 850,
        "images": ["IMAGES/Lilian_Lofts_Hotel_Spa.webp"],
        "available": true,
        "featured": false,
        "amenities": ["WiFi", "Spa", "Kitchen", "Laundry"]
      },
      {
        "id": 3,
        "title": "Convention Center Apartment",
        "description": "Luxury accommodation near airport with business facilities",
        "price": 1500,
        "location": "O.R. Tambo, South Africa",
        "bedrooms": 3,
        "bathrooms": 2,
        "squareFeet": 1500,
        "images": ["IMAGES/Radisson_Hotel_and_Convention_Centre_OR_Tambo_Airp.webp"],
        "available": true,
        "featured": false,
        "amenities": ["WiFi", "Business Center", "Airport Shuttle", "Restaurant"]
      },
      {
        "id": 7,
        "title": "Nenjelele",
        "description": "wurbjnor",
        "price": 4000,
        "location": "joburg",
        "bedrooms": 2,
        "bathrooms": 2,
        "squareFeet": 32435,
        "images": [
          "IMAGES/uploads/image-1768421441176-360184716.jpg",
          "IMAGES/uploads/image-1768421441291-34896468.jpg",
          "IMAGES/uploads/image-1768421441325-144623809.jpg"
        ],
        "available": true,
        "featured": false,
        "amenities": []
      }
    ];
  }

  // Property detail page functionality
  async loadPropertyDetail(propertyId) {
    try {
      let property;

      // Try fetching from API first
      try {
        const response = await fetch(`${this.apiBaseUrl}/api/properties/${propertyId}`);
        const data = await response.json();
        if (data.success) {
          property = data.data;
        }
      } catch (err) {
        console.warn('API fetch failed, falling back to mock data');
      }

      // Fallback to mock data if API failed or returned no data
      if (!property) {
        property = this.mockProperties.find(p => p.id == propertyId);
      }

      if (property) {
        this.renderPropertyDetail(property);
      } else {
        this.showNotification('Property not found', 'error');
        // Redirect to properties page after delay?
      }
    } catch (error) {
      console.error('Failed to load property detail:', error);
      this.showNotification('Error loading property details', 'error');
    }
  }

  renderPropertyDetail(property) {
    // 1. Text Content
    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    setText('detail-title', property.title);
    setText('property-title', `${property.title} - ForRentbyOwner`); // Update page title
    setText('detail-location', property.location);
    setText('detail-bedrooms', property.bedrooms);
    setText('detail-bathrooms', property.bathrooms);
    setText('detail-square-feet', property.squareFeet);
    setText('detail-description', property.description);
    setText('booking-price', window.formatCurrency(property.price));

    // 2. Features/Amenities
    const featureList = document.getElementById('feature-list');
    if (featureList) {
      const amenities = property.amenities || property.features || [];

      // Icon mapping
      const iconMap = {
        'WiFi': 'fa-wifi',
        'Gym': 'fa-dumbbell',
        'Pool': 'fa-swimming-pool',
        'Parking': 'fa-parking',
        'Spa': 'fa-spa',
        'Kitchen': 'fa-utensils',
        'Laundry': 'fa-tshirt',
        'Business Center': 'fa-briefcase',
        'Airport Shuttle': 'fa-shuttle-van',
        'Restaurant': 'fa-utensils'
      };

      featureList.innerHTML = amenities.map(feature => {
        const icon = iconMap[feature] || 'fa-check-circle';
        return `
            <li class="amenity-item" style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--background-light); border-radius: var(--radius-md); border: 1px solid var(--neutral-200);">
                <div style="width: 32px; height: 32px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--primary-600); box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <i class="fas ${icon}"></i>
                </div>
                <span style="font-weight: 500; color: var(--text-dark);">${feature}</span>
            </li>
        `;
      }).join('');
    }

    // 3. Gallery
    const galleryContainer = document.getElementById('property-gallery');
    if (galleryContainer && property.images && property.images.length > 0) {
      const images = property.images;
      this.currentPropertyImages = images; // Store for lightbox

      galleryContainer.innerHTML = `
            <!-- Featured Image -->
            <div class="gallery-featured" onclick="rentalApp.openGalleryLightbox(0)" style="cursor: pointer;">
                <img src="${images[0]}" alt="${property.title}" onerror="this.src='IMAGES/default-property.jpg'">
            </div>
            
            <!-- Supporting Images -->
            ${images.length > 1 ? `
                <div class="gallery-supporting" onclick="rentalApp.openGalleryLightbox(1)" style="cursor: pointer;">
                    <img src="${images[1]}" alt="${property.title} - Image 2" onerror="this.src='IMAGES/default-property.jpg'">
                </div>
            ` : ''}
            
            ${images.length > 2 ? `
                <div class="gallery-supporting" onclick="rentalApp.openGalleryLightbox(2)" style="cursor: pointer;">
                    <img src="${images[2]}" alt="${property.title} - Image 3" onerror="this.src='IMAGES/default-property.jpg'">
                </div>
            ` : ''}
            
            <!-- View All Photos Button -->
            ${images.length > 3 ? `
                <button class="gallery-view-all" onclick="rentalApp.openGalleryLightbox(0)">
                    <i class="fas fa-th"></i> View all ${images.length} photos
                </button>
            ` : ''}
        `;
    }

    // 4. Update Apply Button
    const applyBtn = document.getElementById('apply-now-btn');
    if (applyBtn) {
      applyBtn.href = `application.html?propertyId=${property.id}`;
    }
  }

  // Gallery Lightbox Methods
  openGalleryLightbox(startIndex = 0) {
    const lightbox = document.getElementById('gallery-lightbox');
    const grid = document.getElementById('lightbox-gallery-grid');

    if (!this.currentPropertyImages || this.currentPropertyImages.length === 0) return;

    if (grid) {
      grid.innerHTML = this.currentPropertyImages.map((img, index) => `
            <div style="position: relative; border-radius: 12px; overflow: hidden; cursor: pointer;" onclick="window.open('${img}', '_blank')">
                <img src="${img}" alt="Property image ${index + 1}" style="width: 100%; height: 250px; object-fit: cover; display: block;" onerror="this.src='IMAGES/default-property.jpg'">
                <div style="position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; padding: 4px 12px; border-radius: 6px; font-size: 12px;">
                    ${index + 1} / ${this.currentPropertyImages.length}
                </div>
            </div>
        `).join('');
    }

    if (lightbox) {
      lightbox.style.display = 'block';
      document.body.style.overflow = 'hidden';
    }
  }

  closeGalleryLightbox() {
    const lightbox = document.getElementById('gallery-lightbox');
    if (lightbox) {
      lightbox.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  }
}

// Expose RentalApp class globally
window.RentalApp = RentalApp;

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  RentalApp.instance = new RentalApp();
  window.rentalApp = RentalApp.instance; // Keep backward compatibility
});

// Utility functions
window.formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(amount);
};

window.formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};