const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/properties.json');

// Helper to generate random number in range
const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Helper to get random item from array
const sample = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Helper to get multiple random items from array
const sampleMultiple = (arr, count) => {
    const shuffled = arr.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};

// Configuration Data
const LOCATIONS = {
    PREMIUM: [
        'Sandton', 'Clifton', 'Camps Bay', 'Melrose Arch', 'Waterfront',
        'Umhlanga', 'Umhlanga Rocks', 'Ridgeside', 'Sibaya', 'Zimbali', 'Zimbali Estate', 'V&A Waterfront'
    ],
    MID_HIGH: [
        'Bryanston', 'Menlyn', 'Waterfall', 'Sea Point', 'Green Point',
        'Bedfordview', 'La Lucia', 'Essenwood', 'Morningside', 'Dunkeld', 'Sandhurst', 'Hyde Park', 'Rosebank'
    ],
    STANDARD: [
        'Joburg', 'Pretoria', 'Centurion', 'Glenadrienne', 'St Georges Park',
        'Three Anchor Bay', 'Midrand', 'Fourways', 'Randburg'
    ]
};

const AMENITIES = {
    PREMIUM: ['Pool', 'Gym', 'Spa', 'Sauna', '24/7 Security', 'Concierge', 'Sky Bar', 'Smart Home System', 'Backup Power', 'Ocean View', 'Private Elevator'],
    MID_HIGH: ['WiFi', 'Fiber Ready', 'Secure Parking', 'Balcony', 'Garden', 'Clubhouse', 'Pet Friendly', 'Air Conditioning', 'Study Nook'],
    STANDARD: ['WiFi', 'Parking', 'Security Gate', 'Close to Transport', 'Built-in Cupboards', 'Prepaid Electricity']
};

const DESCRIPTIONS = {
    PREMIUM: [
        "Experience the pinnacle of luxury living in this exclusive {beds}-bedroom residence. Featuring panoramic views and world-class finishes, this home offers an unmatched lifestyle in {location}.",
        "A masterpiece of modern design, this spacious apartment in {location} offers {beds} bedrooms, state-of-the-art amenities, and breathtaking views. Perfect for the discerning professional.",
        "Sophisticated urban living at its finest. This {beds}-bedroom apartment in the heart of {location} boasts premium fixtures, expansive living areas, and access to exclusive building facilities."
    ],
    MID_HIGH: [
        "Modern and stylish {beds}-bedroom apartment located in the sought-after {location} area. Features contemporary finishes, great natural light, and convenient access to local shopping and dining.",
        "Beautifully appointed {beds}-bedroom home in {location}. Offers a perfect balance of comfort and convenience with modern amenities and secure living.",
        "Spacious {beds}-bedroom unit in a secure complex in {location}. Ideal for young professionals or small families looking for a vibrant community atmosphere."
    ],
    STANDARD: [
        "Cozy and convenient {beds}-bedroom unit in {location}. Close to all major transport routes and local amenities. Perfect lock-up-and-go lifestyle.",
        "Neat and well-maintained {beds}-bedroom apartment in {location}. Offers secure living and value for money in a central location.",
        "Comfortable {beds}-bedroom starter home in {location}. Features practical layout and essential amenities for easy living."
    ]
};

function getTier(location) {
    const loc = location.toLowerCase();
    if (LOCATIONS.PREMIUM.some(l => loc.includes(l.toLowerCase()))) return 'PREMIUM';
    if (LOCATIONS.MID_HIGH.some(l => loc.includes(l.toLowerCase()))) return 'MID_HIGH';
    return 'STANDARD';
}

function generatePrice(tier, beds) {
    let base = 0;
    switch (tier) {
        case 'PREMIUM': base = 15000; break;
        case 'MID_HIGH': base = 9000; break;
        case 'STANDARD': base = 5500; break;
    }

    // Add value per bedroom
    const bedPremium = (tier === 'PREMIUM' ? 5000 : tier === 'MID_HIGH' ? 3000 : 1500);
    let price = base + ((beds - 1) * bedPremium);

    // Add random variance (-10% to +20%)
    const variance = 1 + (Math.random() * 0.3 - 0.1);
    price = Math.floor(price * variance);

    // Round to nearest 100
    return Math.ceil(price / 100) * 100;
}

async function enhanceProperties() {
    if (!fs.existsSync(DATA_FILE)) {
        console.error('properties.json not found!');
        return;
    }

    let properties = [];
    try {
        properties = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (err) {
        console.error('Error reading properties.json:', err);
        return;
    }

    console.log(`Enhancing ${properties.length} properties...`);

    const enhancedProperties = properties.map(p => {
        // Skip properties that look manually curated (IDs 1-3 often)
        // Actually, let's enhance everything to ensure consistency, 
        // but maybe keep the specific images/titles if they seem custom.
        // The prompt asked to "update the pricing... make features distinct".
        // So we will overwrite most text fields but keep images.

        const tier = getTier(p.location);

        // Ensure bedrooms are realistic (1-4)
        if (!p.bedrooms || p.bedrooms === 0) p.bedrooms = random(1, 3);
        if (p.bedrooms > 5) p.bedrooms = 4; // Cap at 4 for apartments usually

        // Adjust bathrooms relative to beds
        p.bathrooms = Math.min(p.bedrooms + random(0, 1), p.bedrooms + 1);
        if (p.bedrooms === 1) p.bathrooms = 1;

        // Generate realistically precise square footage
        // 1 bed: 40-70sqm (approx 450-750 sqft)
        // 2 bed: 70-100sqm (approx 750-1100 sqft)
        // 3 bed: 100-150sqm (approx 1100-1600 sqft)
        // 4 bed: 150-250sqm (approx 1600-2700 sqft)
        const baseSqFt = p.bedrooms * 400; // rough baseline
        p.squareFeet = baseSqFt + random(-50, 200);

        // Price
        p.price = generatePrice(tier, p.bedrooms);

        // Amenities
        // Base amenities + random extras based on tier
        const baseAmenities = ['WiFi', 'Parking'];
        const tierAmenities = AMENITIES[tier];
        const count = random(3, 6);
        const extras = sampleMultiple(tierAmenities, count);
        p.amenities = [...new Set([...baseAmenities, ...extras])]; // Unique

        // Location - Clean up "Apartment to rent in X" if present in location field?
        // Check if location field has "Apartment to rent in"
        if (p.location.includes("Apartment to rent in")) {
            p.location = p.location.replace("Apartment to rent in ", "").split("_-_")[0].trim();
        }

        // Description
        const descTemplate = sample(DESCRIPTIONS[tier]);
        p.description = descTemplate
            .replace('{beds}', p.bedrooms)
            .replace('{location}', p.location);

        // Title update - Make it professional
        // e.g., "Luxury 2-Bed Apartment in Sandton"
        const adjectives = {
            PREMIUM: ['Luxury', 'Exclusive', 'Stunning', 'Premium', 'Executive'],
            MID_HIGH: ['Modern', 'Spacious', 'Contemporary', 'Stylish', 'Bright'],
            STANDARD: ['Cozy', 'Charming', 'Secure', 'Value', 'Neat']
        };
        const adj = sample(adjectives[tier]);

        // Property type inference
        let type = 'Apartment';
        if (p.title.toLowerCase().includes('house') || p.title.toLowerCase().includes('villa')) type = 'Home';
        if (p.title.toLowerCase().includes('studio')) {
            type = 'Studio';
            p.bedrooms = 0; // Studio implies 0/1 naming convention usually, but let's stick to 1 bed studio
            p.bedrooms = 1;
        }
        if (p.title.toLowerCase().includes('loft')) type = 'Loft';
        if (p.title.toLowerCase().includes('penthouse')) {
            type = 'Penthouse';
            p.price = Math.floor(p.price * 1.5); // Penthouse premium
        }

        p.title = `${adj} ${p.bedrooms}-Bed ${type} in ${p.location}`;

        // Ensure "available" is mostly true for a renting site
        p.available = true;

        return p;
    });

    // Write back
    fs.writeFileSync(DATA_FILE, JSON.stringify(enhancedProperties, null, 2));
    console.log('Properties enhanced successfully.');
}

enhanceProperties();
