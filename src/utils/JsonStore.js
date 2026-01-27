const fs = require('fs').promises;
const path = require('path');

class JsonStore {
    constructor(filename, defaultData = []) {
        // Ensure filename ends with .json
        if (!filename.endsWith('.json')) {
            filename = filename + '.json';
        }
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

    // ============================================
    // CRUD OPERATIONS
    // ============================================

    /**
     * Get all items
     * @returns {Promise<Array>} All items
     */
    async getAll() {
        return await this.read();
    }

    /**
     * Get item by ID
     * @param {number|string} id - Item ID
     * @returns {Promise<Object|null>} Item or null
     */
    async getById(id) {
        const items = await this.read();
        return items.find(item => item.id === id || item.id === parseInt(id)) || null;
    }

    /**
     * Add a new item
     * @param {Object} item - Item to add
     * @returns {Promise<Object>} Added item
     */
    async add(item) {
        const items = await this.read();
        items.push(item);
        await this.write(items);
        return item;
    }

    /**
     * Update an item by ID
     * @param {number|string} id - Item ID
     * @param {Object} updates - Updated item data
     * @returns {Promise<Object|null>} Updated item or null
     */
    async update(id, updates) {
        const items = await this.read();
        const index = items.findIndex(item => item.id === id || item.id === parseInt(id));

        if (index === -1) {
            return null;
        }

        items[index] = { ...items[index], ...updates };
        await this.write(items);
        return items[index];
    }

    /**
     * Delete an item by ID
     * @param {number|string} id - Item ID
     * @returns {Promise<boolean>} True if deleted
     */
    async delete(id) {
        const items = await this.read();
        const initialLength = items.length;
        const filtered = items.filter(item => item.id !== id && item.id !== parseInt(id));

        if (filtered.length === initialLength) {
            return false;
        }

        await this.write(filtered);
        return true;
    }

    /**
     * Find items matching criteria
     * @param {Function} predicate - Filter function
     * @returns {Promise<Array>} Matching items
     */
    async find(predicate) {
        const items = await this.read();
        return items.filter(predicate);
    }

    /**
     * Find first item matching criteria
     * @param {Function} predicate - Filter function
     * @returns {Promise<Object|null>} First matching item or null
     */
    async findOne(predicate) {
        const items = await this.read();
        return items.find(predicate) || null;
    }

    /**
     * Count items
     * @returns {Promise<number>} Item count
     */
    async count() {
        const items = await this.read();
        return items.length;
    }

    /**
     * Clear all items
     * @returns {Promise<void>}
     */
    async clear() {
        await this.write([]);
    }
}

module.exports = JsonStore;
