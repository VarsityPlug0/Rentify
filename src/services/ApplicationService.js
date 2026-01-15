/**
 * Application Service
 * Business logic layer for application management
 */

const JsonStore = require('../utils/JsonStore');
const Application = require('../models/Application');

class ApplicationService {
    constructor() {
        this.store = new JsonStore('applications.json', []);
    }

    async getAll() {
        const data = await this.store.read();
        return data;
    }

    async getById(id) {
        const applications = await this.getAll();
        return applications.find(a => a.id === id);
    }

    async create(appData) {
        const applications = await this.getAll();

        // Auto-increment ID
        const newId = applications.length > 0 ? Math.max(...applications.map(a => a.id)) + 1 : 1;

        const newApplication = {
            ...appData,
            id: newId,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        applications.push(newApplication);
        await this.store.write(applications);
        return newApplication;
    }

    async updateStatus(id, status, adminNotes) {
        const applications = await this.getAll();
        const index = applications.findIndex(a => a.id === id);

        if (index === -1) {
            throw new Error('Application not found');
        }

        applications[index].status = status;
        applications[index].updatedAt = new Date().toISOString();

        if (adminNotes !== undefined) {
            applications[index].adminNotes = adminNotes;
        }

        await this.store.write(applications);
        return applications[index];
    }
}

module.exports = ApplicationService;
