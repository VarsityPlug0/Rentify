const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, '../IMAGES/newly added  images');
const DEST_DIR = path.join(__dirname, '../IMAGES');
const DATA_FILE = path.join(__dirname, '../data/properties.json');

// Helper to generate random number in range
const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Helper to parse location from folder name
const parseLocation = (folderName) => {
    // Expected format: "Apartment_to_rent_in_LOCATION_-_CODE"
    // or just assume the whole thing is a location if format doesn't match
    const parts = folderName.split('_-_');
    if (parts.length > 0) {
        let locPart = parts[0].replace('Apartment_to_rent_in_', '').replace(/_/g, ' ');
        return locPart;
    }
    return folderName.replace(/_/g, ' ');
};

async function importImages() {
    if (!fs.existsSync(SOURCE_DIR)) {
        console.error(`Source directory not found: ${SOURCE_DIR}`);
        return;
    }

    // Read existing properties
    let properties = [];
    if (fs.existsSync(DATA_FILE)) {
        try {
            properties = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        } catch (err) {
            console.error('Error reading properties.json:', err);
            return;
        }
    }

    // Find max ID
    let maxId = properties.reduce((max, p) => Math.max(max, p.id || 0), 0);

    const entries = fs.readdirSync(SOURCE_DIR, { withFileTypes: true });

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const sourcePath = path.join(SOURCE_DIR, entry.name);
        // Rename folder to avoid spaces/issues if needed, or keep as is. 
        // Let's keep as is but make sure we reference it correctly.
        // Actually, let's move the *contents* or the *folder*?
        // Plan: Move the folder itself to IMAGES/

        const destPath = path.join(DEST_DIR, entry.name);

        if (fs.existsSync(destPath)) {
            console.log(`Skipping ${entry.name}, destination already exists.`);
            continue;
        }

        // Move folder
        try {
            fs.renameSync(sourcePath, destPath);
            console.log(`Moved ${entry.name} to IMAGES/`);
        } catch (err) {
            console.error(`Failed to move ${entry.name}:`, err);
            continue;
        }

        // Get images in the new folder
        const propertyImages = [];
        try {
            const files = fs.readdirSync(destPath);
            for (const file of files) {
                if (/\.(jpg|jpeg|png|webp)$/i.test(file)) {
                    propertyImages.push(`IMAGES/${entry.name}/${file}`);
                }
            }
        } catch (err) {
            console.error(`Error reading images for ${entry.name}:`, err);
        }

        if (propertyImages.length === 0) {
            console.warn(`No images found for ${entry.name}, adding property anyway but it might look empty.`);
        }

        maxId++;
        const location = parseLocation(entry.name);

        const newProperty = {
            id: maxId,
            title: `${random(1, 3)} Bedroom Apartment in ${location}`,
            description: `Beautiful apartment available for rent in ${location}. Features modern amenities and great views.`,
            price: random(600, 2500) * 10, // Random price
            location: location,
            bedrooms: random(1, 4),
            bathrooms: random(1, 3),
            squareFeet: random(500, 2000),
            images: propertyImages,
            available: true,
            featured: Math.random() > 0.8, // 20% chance of being featured
            amenities: ["WiFi", "Parking", "Security"],
            address: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        properties.push(newProperty);
        console.log(`Added property: ${newProperty.title}`);
    }

    // Write back to file
    fs.writeFileSync(DATA_FILE, JSON.stringify(properties, null, 2));
    console.log('properties.json updated successfully.');
}

importImages();
