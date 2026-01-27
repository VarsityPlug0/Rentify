/**
 * Email Log Service
 * Tracks all emails sent to applicants
 */

const JsonStore = require('../utils/JsonStore');

class EmailLogService {
    constructor() {
        this.store = new JsonStore('email_logs.json', []);
    }

    /**
     * Log an email that was sent
     * @param {Object} logEntry - Email log data
     * @returns {Promise<Object>} Created log entry
     */
    async log(logEntry) {
        const logs = await this.store.read();

        const newLog = {
            id: logs.length > 0 ? Math.max(...logs.map(l => l.id)) + 1 : 1,
            type: logEntry.type, // 'confirmation', 'status_update', 'owner_notification'
            applicationId: logEntry.applicationId,
            propertyId: logEntry.propertyId,
            recipient: logEntry.recipient,
            subject: logEntry.subject,
            status: logEntry.status, // 'sent', 'failed'
            error: logEntry.error || null,
            resendId: logEntry.resendId || null,
            createdAt: new Date().toISOString()
        };

        logs.push(newLog);
        await this.store.write(logs);

        console.log(`📧 Email logged: ${newLog.type} to ${newLog.recipient} (${newLog.status})`);
        return newLog;
    }

    /**
     * Get all email logs for an application
     * @param {number} applicationId - Application ID
     * @returns {Promise<Array>} Email logs
     */
    async getByApplicationId(applicationId) {
        const logs = await this.store.read();
        return logs
            .filter(l => l.applicationId === applicationId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    /**
     * Get all email logs for a recipient
     * @param {string} email - Recipient email
     * @returns {Promise<Array>} Email logs
     */
    async getByRecipient(email) {
        const logs = await this.store.read();
        const normalizedEmail = email.toLowerCase().trim();
        return logs
            .filter(l => l.recipient?.toLowerCase().trim() === normalizedEmail)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    /**
     * Get recent email logs
     * @param {number} limit - Max number of logs
     * @returns {Promise<Array>} Email logs
     */
    async getRecent(limit = 50) {
        const logs = await this.store.read();
        return logs
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, limit);
    }
}

module.exports = EmailLogService;
