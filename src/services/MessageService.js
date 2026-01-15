/**
 * Message Service
 * Business logic layer for contact message management
 */

const JsonStore = require('../utils/JsonStore');

class MessageService {
    constructor() {
        this.store = new JsonStore('messages.json', []);
    }

    async getAll(filters = {}) {
        let messages = await this.store.read();

        if (filters.status) {
            messages = messages.filter(m => m.status === filters.status);
        }

        if (filters.propertyId) {
            messages = messages.filter(m => m.propertyId === parseInt(filters.propertyId));
        }

        return messages;
    }

    async getById(id) {
        const messages = await this.store.read();
        return messages.find(m => m.id === id);
    }

    async create(messageData) {
        const messages = await this.store.read();

        // Auto-increment ID
        const newId = messages.length > 0 ? Math.max(...messages.map(m => m.id)) + 1 : 1;

        const newMessage = {
            ...messageData,
            id: newId,
            status: 'unread',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            repliedAt: null
        };

        messages.push(newMessage);
        await this.store.write(messages);
        return newMessage;
    }

    async updateStatus(id, status) {
        const messages = await this.store.read();
        const index = messages.findIndex(m => m.id === id);

        if (index === -1) {
            throw new Error('Message not found');
        }

        messages[index].status = status;
        messages[index].updatedAt = new Date().toISOString();

        if (status === 'read' && !messages[index].readAt) {
            messages[index].readAt = new Date().toISOString();
        }

        await this.store.write(messages);
        return messages[index];
    }

    async reply(id, replyMessage) {
        const messages = await this.store.read();
        const index = messages.findIndex(m => m.id === id);

        if (index === -1) {
            throw new Error('Message not found');
        }

        messages[index].status = 'replied';
        messages[index].updatedAt = new Date().toISOString();
        messages[index].repliedAt = new Date().toISOString();
        // In a real app, store reply content or send email here
        console.log(`[Email Service] Sending reply to message ${id}: ${replyMessage}`);

        await this.store.write(messages);
        return messages[index];
    }
}

module.exports = MessageService;
