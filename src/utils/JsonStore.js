const fs = require('fs').promises;
const path = require('path');

class JsonStore {
    constructor(filename, defaultData = []) {
        this.filePath = path.join(process.cwd(), 'data', filename);
        this.defaultData = defaultData;
    }

    async read() {
        try {
            const data = await fs.readFile(this.filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                // File doesn't exist, create it with default data and return
                await this.write(this.defaultData);
                return this.defaultData;
            }
            throw error;
        }
    }

    async write(data) {
        // Ensure directory exists
        await fs.mkdir(path.dirname(this.filePath), { recursive: true });
        await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf8');
    }
}

module.exports = JsonStore;
