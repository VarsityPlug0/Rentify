/**
 * Viewing Scheduler Service
 * Handles scheduling viewings and sending reminders
 */

const JsonStore = require('../utils/JsonStore');
const LeadCommunicationService = require('./LeadCommunicationService');
const EmailService = require('./EmailService');
const env = require('../config/environment');

class ViewingScheduler {
    constructor() {
        this.store = new JsonStore('viewings');
    }

    /**
     * Schedule a viewing
     * @param {Object} data - Viewing data
     * @returns {Object} Created viewing
     */
    async scheduleViewing(data) {
        const viewing = {
            id: Date.now(),
            leadId: data.leadId,
            propertyId: data.propertyId,
            phone: data.phone,
            email: data.email,
            name: data.name,
            scheduledAt: data.scheduledAt,
            status: 'scheduled', // scheduled, confirmed, completed, cancelled, no_show
            reminderSent: false,
            confirmationSent: false,
            notes: data.notes || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await this.store.add(viewing);
        console.log(`📅 Viewing scheduled: ${viewing.id} for ${viewing.scheduledAt}`);

        // Send confirmation
        await this.sendConfirmation(viewing);

        return viewing;
    }

    /**
     * Send viewing confirmation
     * @param {Object} viewing - Viewing data
     */
    async sendConfirmation(viewing) {
        const baseUrl = env.baseUrl || 'https://rentify-yruw.onrender.com';
        const viewingDate = new Date(viewing.scheduledAt).toLocaleDateString('en-ZA', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const viewingTime = new Date(viewing.scheduledAt).toLocaleTimeString('en-ZA', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const message = `✅ Viewing Confirmed!\n\n` +
            `📅 Date: ${viewingDate}\n` +
            `⏰ Time: ${viewingTime}\n` +
            `📍 Property: ${baseUrl}/property-details.html?id=${viewing.propertyId}\n\n` +
            `Reply "CANCEL" to cancel or "RESCHEDULE" to change the time.`;

        // Send SMS
        if (viewing.phone) {
            await LeadCommunicationService.sendSMS(viewing.phone, message);
        }

        // Update viewing
        await this.update(viewing.id, { confirmationSent: true });
    }

    /**
     * Send viewing reminder (1 day before)
     * @param {Object} viewing - Viewing data
     */
    async sendReminder(viewing) {
        const viewingDate = new Date(viewing.scheduledAt).toLocaleDateString('en-ZA', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const viewingTime = new Date(viewing.scheduledAt).toLocaleTimeString('en-ZA', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const message = `⏰ Reminder: Your property viewing is tomorrow!\n\n` +
            `📅 ${viewingDate} at ${viewingTime}\n\n` +
            `Reply "CONFIRM" to confirm or "CANCEL" to cancel.`;

        if (viewing.phone) {
            await LeadCommunicationService.sendSMS(viewing.phone, message);
        }

        await this.update(viewing.id, { reminderSent: true });
        console.log(`📱 Reminder sent for viewing ${viewing.id}`);
    }

    /**
     * Update viewing
     * @param {number} id - Viewing ID
     * @param {Object} updates - Updates
     * @returns {Object} Updated viewing
     */
    async update(id, updates) {
        const viewing = await this.store.getById(id);
        if (!viewing) {
            throw new Error('Viewing not found');
        }

        const updated = {
            ...viewing,
            ...updates,
            updatedAt: new Date().toISOString()
        };

        await this.store.update(id, updated);
        return updated;
    }

    /**
     * Cancel viewing
     * @param {number} id - Viewing ID
     * @param {string} reason - Cancellation reason
     */
    async cancel(id, reason = 'user_requested') {
        const viewing = await this.update(id, {
            status: 'cancelled',
            cancellationReason: reason
        });

        // Notify lead
        if (viewing.phone) {
            await LeadCommunicationService.sendSMS(
                viewing.phone,
                `Your viewing has been cancelled. Reply "RESCHEDULE" to book a new time, or visit our website to browse other properties.`
            );
        }

        return viewing;
    }

    /**
     * Get upcoming viewings that need reminders
     * @returns {Array} Viewings needing reminders
     */
    async getViewingsNeedingReminders() {
        const viewings = await this.store.getAll();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const dayAfter = new Date(tomorrow);
        dayAfter.setDate(dayAfter.getDate() + 1);

        return viewings.filter(v => {
            if (v.status !== 'scheduled' || v.reminderSent) return false;
            const viewingDate = new Date(v.scheduledAt);
            return viewingDate >= tomorrow && viewingDate < dayAfter;
        });
    }

    /**
     * Process reminder queue
     * Should be called by a cron job
     */
    async processReminders() {
        const viewings = await this.getViewingsNeedingReminders();
        console.log(`📅 Processing ${viewings.length} viewing reminders`);

        for (const viewing of viewings) {
            try {
                await this.sendReminder(viewing);
            } catch (error) {
                console.error(`Failed to send reminder for viewing ${viewing.id}:`, error);
            }
        }
    }

    /**
     * Get viewings for a lead
     * @param {number} leadId - Lead ID
     * @returns {Array} Viewings
     */
    async getByLeadId(leadId) {
        const viewings = await this.store.getAll();
        return viewings.filter(v => v.leadId === leadId);
    }

    /**
     * Get all upcoming viewings
     * @returns {Array} Viewings
     */
    async getUpcoming() {
        const viewings = await this.store.getAll();
        const now = new Date();
        return viewings
            .filter(v => v.status === 'scheduled' && new Date(v.scheduledAt) > now)
            .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
    }

    /**
     * Generate booking link
     * @param {number} propertyId - Property ID
     * @param {number} leadId - Lead ID
     * @returns {string} Booking URL
     */
    generateBookingLink(propertyId, leadId) {
        const baseUrl = env.baseUrl || 'https://rentify-yruw.onrender.com';
        return `${baseUrl}/contact.html?property=${propertyId}&lead=${leadId}&action=viewing`;
    }
}

module.exports = ViewingScheduler;
