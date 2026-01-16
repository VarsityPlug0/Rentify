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

    async getAll(filters = {}) {
        const applications = await this.store.read();

        let filteredApps = applications;

        // Apply filters
        if (filters.status) {
            filteredApps = filteredApps.filter(app => app.status === filters.status);
        }

        // Sort by newest first
        return filteredApps.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    async getById(id) {
        const applications = await this.store.read();
        return applications.find(a => a.id === id);
    }

    async create(appData) {
        const applications = await this.store.read();

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

    async updateStatus(id, status, adminNotes, adminId) {
        const applications = await this.store.read();
        const index = applications.findIndex(a => a.id === id);

        if (index === -1) {
            throw new Error('Application not found');
        }

        applications[index].status = status;
        applications[index].updatedAt = new Date().toISOString();

        if (adminId) {
            applications[index].processedBy = adminId;
        }

        if (adminNotes !== undefined) {
            applications[index].adminNotes = adminNotes;
        }

        await this.store.write(applications);
        return applications[index];
    }
}

module.exports = ApplicationService;
