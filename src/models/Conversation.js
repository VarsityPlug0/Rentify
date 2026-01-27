/**
 * Conversation Model
 * Manages conversation state and message history for lead communication
 */

const JsonStore = require('../utils/JsonStore');

// Conversation states
const STATES = {
    NEW_LEAD: 'NEW_LEAD',
    GREETING: 'GREETING',
    QUALIFICATION: 'QUALIFICATION',
    ACTION: 'ACTION',
    HANDOFF: 'HANDOFF',
    CLOSED: 'CLOSED'
};

// Qualification fields to collect
const QUALIFICATION_FIELDS = ['budget', 'location', 'moveInDate'];

class Conversation {
    constructor() {
        this.store = new JsonStore('conversations');
    }

    /**
     * Create a new conversation
     * @param {number} leadId - Associated lead ID
     * @param {string} channel - Communication channel (sms, whatsapp, voice)
     * @returns {Object} Created conversation
     */
    async create(leadId, channel = 'sms') {
        const conversation = {
            id: Date.now(),
            leadId: leadId,
            channel: channel,
            state: STATES.NEW_LEAD,
            context: {
                currentField: null,
                collectedData: {},
                attempts: 0,
                lastIntent: null
            },
            messages: [],
            handoffReason: null,
            handoffAt: null,
            closedAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await this.store.add(conversation);
        console.log(`💬 New conversation created: ${conversation.id} for lead ${leadId}`);
        return conversation;
    }

    /**
     * Find active conversation for a lead
     * @param {number} leadId - Lead ID
     * @returns {Object|null} Active conversation or null
     */
    async findActiveByLeadId(leadId) {
        const conversations = await this.store.getAll();
        return conversations.find(c =>
            c.leadId === leadId &&
            ![STATES.CLOSED, STATES.HANDOFF].includes(c.state)
        ) || null;
    }

    /**
     * Find conversation by ID
     * @param {number} id - Conversation ID
     * @returns {Object|null} Conversation or null
     */
    async findById(id) {
        return await this.store.getById(id);
    }

    /**
     * Get all conversations for a lead
     * @param {number} leadId - Lead ID
     * @returns {Array} Conversations
     */
    async findByLeadId(leadId) {
        const conversations = await this.store.getAll();
        return conversations.filter(c => c.leadId === leadId);
    }

    /**
     * Add a message to conversation
     * @param {number} conversationId - Conversation ID
     * @param {Object} message - Message data
     * @returns {Object} Updated conversation
     */
    async addMessage(conversationId, message) {
        const conversation = await this.store.getById(conversationId);
        if (!conversation) {
            throw new Error('Conversation not found');
        }

        const newMessage = {
            id: Date.now(),
            role: message.role, // 'user' or 'assistant'
            content: message.content,
            confidence: message.confidence || null,
            intent: message.intent || null,
            timestamp: new Date().toISOString()
        };

        conversation.messages.push(newMessage);
        conversation.updatedAt = new Date().toISOString();

        await this.store.update(conversationId, conversation);
        return conversation;
    }

    /**
     * Update conversation state
     * @param {number} conversationId - Conversation ID
     * @param {string} newState - New state
     * @param {Object} contextUpdates - Context updates
     * @returns {Object} Updated conversation
     */
    async updateState(conversationId, newState, contextUpdates = {}) {
        const conversation = await this.store.getById(conversationId);
        if (!conversation) {
            throw new Error('Conversation not found');
        }

        conversation.state = newState;
        conversation.context = {
            ...conversation.context,
            ...contextUpdates
        };
        conversation.updatedAt = new Date().toISOString();

        // Handle special state transitions
        if (newState === STATES.HANDOFF) {
            conversation.handoffAt = new Date().toISOString();
        }
        if (newState === STATES.CLOSED) {
            conversation.closedAt = new Date().toISOString();
        }

        await this.store.update(conversationId, conversation);
        console.log(`🔄 Conversation ${conversationId} state: ${newState}`);
        return conversation;
    }

    /**
     * Mark conversation for human handoff
     * @param {number} conversationId - Conversation ID
     * @param {string} reason - Handoff reason
     * @returns {Object} Updated conversation
     */
    async handoff(conversationId, reason) {
        const conversation = await this.store.getById(conversationId);
        if (!conversation) {
            throw new Error('Conversation not found');
        }

        conversation.state = STATES.HANDOFF;
        conversation.handoffReason = reason;
        conversation.handoffAt = new Date().toISOString();
        conversation.updatedAt = new Date().toISOString();

        await this.store.update(conversationId, conversation);
        console.log(`🙋 Conversation ${conversationId} handed off: ${reason}`);
        return conversation;
    }

    /**
     * Close conversation
     * @param {number} conversationId - Conversation ID
     * @param {string} outcome - Outcome (booked, applied, declined, etc.)
     * @returns {Object} Updated conversation
     */
    async close(conversationId, outcome = 'completed') {
        const conversation = await this.store.getById(conversationId);
        if (!conversation) {
            throw new Error('Conversation not found');
        }

        conversation.state = STATES.CLOSED;
        conversation.context.outcome = outcome;
        conversation.closedAt = new Date().toISOString();
        conversation.updatedAt = new Date().toISOString();

        await this.store.update(conversationId, conversation);
        console.log(`✅ Conversation ${conversationId} closed: ${outcome}`);
        return conversation;
    }

    /**
     * Get or create active conversation for lead
     * @param {number} leadId - Lead ID
     * @param {string} channel - Channel
     * @returns {Object} Conversation
     */
    async getOrCreate(leadId, channel = 'sms') {
        let conversation = await this.findActiveByLeadId(leadId);
        if (!conversation) {
            conversation = await this.create(leadId, channel);
        }
        return conversation;
    }

    /**
     * Get conversation statistics
     * @returns {Object} Stats
     */
    async getStats() {
        const conversations = await this.store.getAll();
        return {
            total: conversations.length,
            active: conversations.filter(c => ![STATES.CLOSED, STATES.HANDOFF].includes(c.state)).length,
            handoffs: conversations.filter(c => c.state === STATES.HANDOFF).length,
            closed: conversations.filter(c => c.state === STATES.CLOSED).length,
            byState: STATES
        };
    }
}

// Export states for external use
Conversation.STATES = STATES;
Conversation.QUALIFICATION_FIELDS = QUALIFICATION_FIELDS;

module.exports = Conversation;
