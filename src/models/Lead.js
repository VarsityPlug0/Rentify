/**
 * Lead Model
 * Represents a potential tenant lead tracked through the communication system
 */

const JsonStore = require('../utils/JsonStore');

class Lead {
    constructor() {
        this.store = new JsonStore('leads');
    }

    /**
     * Create a new lead
     * @param {Object} leadData - Lead information
     * @returns {Object} Created lead
     */
    async create(leadData) {
        const lead = {
            id: Date.now(),
            phone: leadData.phone,
            email: leadData.email || null,
            name: leadData.name || null,
            source: leadData.source || 'sms', // sms, whatsapp, web, call
            status: 'new', // new, contacted, qualified, converted, lost
            propertyInterest: leadData.propertyId || null,
            qualificationData: {
                budget: null,
                location: null,
                moveInDate: null,
                bedrooms: null,
                completed: false
            },
            metadata: leadData.metadata || {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await this.store.add(lead);
        console.log(`📋 New lead created: ${lead.id} (${lead.phone})`);
        return lead;
    }

    /**
     * Find lead by phone number
     * @param {string} phone - Phone number
     * @returns {Object|null} Lead or null
     */
    async findByPhone(phone) {
        const leads = await this.store.getAll();
        // Normalize phone number for comparison
        const normalizedPhone = this.normalizePhone(phone);
        return leads.find(l => this.normalizePhone(l.phone) === normalizedPhone) || null;
    }

    /**
     * Find lead by ID
     * @param {number} id - Lead ID
     * @returns {Object|null} Lead or null
     */
    async findById(id) {
        return await this.store.getById(id);
    }

    /**
     * Update lead
     * @param {number} id - Lead ID
     * @param {Object} updates - Fields to update
     * @returns {Object} Updated lead
     */
    async update(id, updates) {
        const lead = await this.store.getById(id);
        if (!lead) {
            throw new Error('Lead not found');
        }

        const updatedLead = {
            ...lead,
            ...updates,
            updatedAt: new Date().toISOString()
        };

        await this.store.update(id, updatedLead);
        return updatedLead;
    }

    /**
     * Update qualification data
     * @param {number} id - Lead ID
     * @param {Object} qualData - Qualification updates
     * @returns {Object} Updated lead
     */
    async updateQualification(id, qualData) {
        const lead = await this.store.getById(id);
        if (!lead) {
            throw new Error('Lead not found');
        }

        const updatedQual = {
            ...lead.qualificationData,
            ...qualData
        };

        // Check if qualification is complete
        updatedQual.completed = !!(
            updatedQual.budget &&
            updatedQual.location &&
            updatedQual.moveInDate
        );

        return await this.update(id, {
            qualificationData: updatedQual,
            status: updatedQual.completed ? 'qualified' : lead.status
        });
    }

    /**
     * Get all leads with optional filters
     * @param {Object} filters - Filter criteria
     * @returns {Array} Leads
     */
    async getAll(filters = {}) {
        let leads = await this.store.getAll();

        if (filters.status) {
            leads = leads.filter(l => l.status === filters.status);
        }
        if (filters.source) {
            leads = leads.filter(l => l.source === filters.source);
        }

        // Sort by most recent
        leads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return leads;
    }

    /**
     * Normalize phone number for comparison
     * @param {string} phone - Phone number
     * @returns {string} Normalized phone
     */
    normalizePhone(phone) {
        if (!phone) return '';
        // Remove all non-digit characters except leading +
        return phone.replace(/[^\d+]/g, '');
    }

    /**
     * Get or create lead by phone
     * @param {string} phone - Phone number
     * @param {Object} defaults - Default values for new lead
     * @returns {Object} Lead (existing or new)
     */
    async getOrCreate(phone, defaults = {}) {
        let lead = await this.findByPhone(phone);
        if (!lead) {
            lead = await this.create({ phone, ...defaults });
        }
        return lead;
    }
}

module.exports = Lead;
