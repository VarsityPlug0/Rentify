const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/properties.json');

async function cleanupProperties() {
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

    const initialCount = properties.length;
    console.log(`Total properties before cleanup: ${initialCount}`);

    // Filter criteria
    const cleanProperties = properties.filter(p => {
        const titleLower = p.title.toLowerCase();
        const descLower = p.description.toLowerCase();

        // 1. Check for "test", "dummy", "example" in title
        if (titleLower.includes('test') || titleLower.includes('dummy') || titleLower.includes('example')) {
            console.log(`Removing (Title mismatch): [${p.id}] ${p.title}`);
            return false;
        }

        // 2. Check for specific junk
        if (titleLower.includes('nenjelele') || titleLower.includes('mkhabeleenterprices')) {
            console.log(`Removing (Junk Title): [${p.id}] ${p.title}`);
            return false;
        }

        if (descLower.includes('wurbjnor') || descLower.includes('testing persistence')) {
            console.log(`Removing (Junk Desc): [${p.id}] ${p.title}`);
            return false;
        }

        return true;
    });

    const finalCount = cleanProperties.length;
    console.log(`Total properties after cleanup: ${finalCount}`);
    console.log(`Removed: ${initialCount - finalCount}`);

    // Write back
    fs.writeFileSync(DATA_FILE, JSON.stringify(cleanProperties, null, 2));
    console.log('properties.json cleaned and updated.');
}

cleanupProperties();
