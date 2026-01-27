/**
 * Analytics Service
 * Tracks conversation metrics, conversion rates, and lead funnel analytics
 */

const JsonStore = require('../utils/JsonStore');

class AnalyticsService {
    constructor() {
        this.store = new JsonStore('analytics');
        this.metricsCache = null;
        this.cacheExpiry = null;
    }

    // ============================================
    // EVENT LOGGING
    // ============================================

    /**
     * Log a conversation event
     * @param {Object} event - Event data
     */
    async logEvent(event) {
        const entry = {
            id: Date.now(),
            type: event.type,
            leadId: event.leadId,
            conversationId: event.conversationId,
            channel: event.channel || 'sms',
            data: event.data || {},
            timestamp: new Date().toISOString()
        };

        await this.store.add(entry);
        this.invalidateCache();

        console.log(`📊 Event logged: ${event.type} for lead ${event.leadId}`);
        return entry;
    }

    /**
     * Log lead creation
     */
    async logLeadCreated(lead, channel) {
        return this.logEvent({
            type: 'lead_created',
            leadId: lead.id,
            channel,
            data: { source: lead.source, phone: lead.phone }
        });
    }

    /**
     * Log conversation started
     */
    async logConversationStarted(conversation, lead) {
        return this.logEvent({
            type: 'conversation_started',
            leadId: lead.id,
            conversationId: conversation.id,
            channel: conversation.channel
        });
    }

    /**
     * Log message sent/received
     */
    async logMessage(conversation, message, direction) {
        return this.logEvent({
            type: direction === 'inbound' ? 'message_received' : 'message_sent',
            leadId: conversation.leadId,
            conversationId: conversation.id,
            channel: conversation.channel,
            data: {
                intent: message.intent,
                confidence: message.confidence
            }
        });
    }

    /**
     * Log qualification progress
     */
    async logQualificationStep(lead, field, value) {
        return this.logEvent({
            type: 'qualification_step',
            leadId: lead.id,
            data: { field, value, qualificationComplete: lead.qualificationData?.completed }
        });
    }

    /**
     * Log lead qualified
     */
    async logLeadQualified(lead) {
        return this.logEvent({
            type: 'lead_qualified',
            leadId: lead.id,
            data: lead.qualificationData
        });
    }

    /**
     * Log handoff to human
     */
    async logHandoff(conversation, reason) {
        return this.logEvent({
            type: 'handoff',
            leadId: conversation.leadId,
            conversationId: conversation.id,
            channel: conversation.channel,
            data: { reason }
        });
    }

    /**
     * Log conversion action
     */
    async logConversion(lead, action) {
        return this.logEvent({
            type: 'conversion',
            leadId: lead.id,
            data: { action } // 'viewing_booked', 'application_started', 'application_submitted'
        });
    }

    // ============================================
    // METRICS CALCULATION
    // ============================================

    /**
     * Get aggregated metrics
     * @param {Object} options - Filter options
     * @returns {Object} Metrics
     */
    async getMetrics(options = {}) {
        const { startDate, endDate, channel } = options;

        // Check cache
        if (this.metricsCache && this.cacheExpiry > Date.now()) {
            return this.metricsCache;
        }

        const events = await this.store.getAll();
        let filtered = events;

        // Apply filters
        if (startDate) {
            filtered = filtered.filter(e => new Date(e.timestamp) >= new Date(startDate));
        }
        if (endDate) {
            filtered = filtered.filter(e => new Date(e.timestamp) <= new Date(endDate));
        }
        if (channel) {
            filtered = filtered.filter(e => e.channel === channel);
        }

        const metrics = {
            summary: {
                totalLeads: this.countByType(filtered, 'lead_created'),
                totalConversations: this.countByType(filtered, 'conversation_started'),
                totalMessages: this.countByType(filtered, 'message_received') + this.countByType(filtered, 'message_sent'),
                totalQualified: this.countByType(filtered, 'lead_qualified'),
                totalHandoffs: this.countByType(filtered, 'handoff'),
                totalConversions: this.countByType(filtered, 'conversion')
            },
            rates: {},
            byChannel: {
                sms: this.getChannelMetrics(filtered, 'sms'),
                whatsapp: this.getChannelMetrics(filtered, 'whatsapp'),
                voice: this.getChannelMetrics(filtered, 'voice')
            },
            timeline: this.getTimeline(filtered),
            generatedAt: new Date().toISOString()
        };

        // Calculate rates
        if (metrics.summary.totalLeads > 0) {
            metrics.rates.qualificationRate = (metrics.summary.totalQualified / metrics.summary.totalLeads * 100).toFixed(1) + '%';
            metrics.rates.handoffRate = (metrics.summary.totalHandoffs / metrics.summary.totalLeads * 100).toFixed(1) + '%';
            metrics.rates.conversionRate = (metrics.summary.totalConversions / metrics.summary.totalLeads * 100).toFixed(1) + '%';
        }

        // Cache for 5 minutes
        this.metricsCache = metrics;
        this.cacheExpiry = Date.now() + 5 * 60 * 1000;

        return metrics;
    }

    /**
     * Count events by type
     */
    countByType(events, type) {
        return events.filter(e => e.type === type).length;
    }

    /**
     * Get metrics for a specific channel
     */
    getChannelMetrics(events, channel) {
        const channelEvents = events.filter(e => e.channel === channel);
        return {
            leads: this.countByType(channelEvents, 'lead_created'),
            conversations: this.countByType(channelEvents, 'conversation_started'),
            qualified: this.countByType(channelEvents, 'lead_qualified'),
            handoffs: this.countByType(channelEvents, 'handoff'),
            conversions: this.countByType(channelEvents, 'conversion')
        };
    }

    /**
     * Get daily timeline of events
     */
    getTimeline(events) {
        const daily = {};

        events.forEach(event => {
            const date = event.timestamp.split('T')[0];
            if (!daily[date]) {
                daily[date] = { leads: 0, qualified: 0, conversions: 0 };
            }

            if (event.type === 'lead_created') daily[date].leads++;
            if (event.type === 'lead_qualified') daily[date].qualified++;
            if (event.type === 'conversion') daily[date].conversions++;
        });

        return Object.entries(daily)
            .map(([date, data]) => ({ date, ...data }))
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-30); // Last 30 days
    }

    /**
     * Get lead funnel data
     */
    async getFunnel() {
        const events = await this.store.getAll();

        const leadIds = new Set(events.filter(e => e.type === 'lead_created').map(e => e.leadId));
        const qualifiedIds = new Set(events.filter(e => e.type === 'lead_qualified').map(e => e.leadId));
        const convertedIds = new Set(events.filter(e => e.type === 'conversion').map(e => e.leadId));

        return {
            total: leadIds.size,
            contacted: events.filter(e => e.type === 'message_sent').map(e => e.leadId).filter((v, i, a) => a.indexOf(v) === i).length,
            qualified: qualifiedIds.size,
            converted: convertedIds.size,
            funnel: [
                { stage: 'New Leads', count: leadIds.size, percentage: '100%' },
                { stage: 'Contacted', count: events.filter(e => e.type === 'message_sent').length, percentage: leadIds.size > 0 ? Math.round(events.filter(e => e.type === 'message_sent').length / leadIds.size * 100) + '%' : '0%' },
                { stage: 'Qualified', count: qualifiedIds.size, percentage: leadIds.size > 0 ? Math.round(qualifiedIds.size / leadIds.size * 100) + '%' : '0%' },
                { stage: 'Converted', count: convertedIds.size, percentage: leadIds.size > 0 ? Math.round(convertedIds.size / leadIds.size * 100) + '%' : '0%' }
            ]
        };
    }

    /**
     * Invalidate cache
     */
    invalidateCache() {
        this.metricsCache = null;
        this.cacheExpiry = null;
    }

    // ============================================
    // CONVERSATION TRANSCRIPTS
    // ============================================

    /**
     * Get conversation list with summary
     * @param {Object} options - Filter/pagination options
     */
    async getConversationList(options = {}) {
        const { page = 1, limit = 20, channel, state } = options;
        const Conversation = require('../models/Conversation');
        const conversationModel = new Conversation();

        let conversations = await conversationModel.store.getAll();

        // Apply filters
        if (channel) {
            conversations = conversations.filter(c => c.channel === channel);
        }
        if (state) {
            conversations = conversations.filter(c => c.state === state);
        }

        // Sort by most recent
        conversations.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        // Paginate
        const total = conversations.length;
        const start = (page - 1) * limit;
        const paged = conversations.slice(start, start + limit);

        return {
            conversations: paged.map(c => ({
                id: c.id,
                leadId: c.leadId,
                channel: c.channel,
                state: c.state,
                messageCount: c.messages?.length || 0,
                createdAt: c.createdAt,
                updatedAt: c.updatedAt,
                handoffReason: c.handoffReason
            })),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get full conversation transcript
     * @param {number} conversationId - Conversation ID
     */
    async getConversationTranscript(conversationId) {
        const Conversation = require('../models/Conversation');
        const Lead = require('../models/Lead');

        const conversationModel = new Conversation();
        const leadModel = new Lead();

        const conversation = await conversationModel.findById(conversationId);
        if (!conversation) {
            return null;
        }

        const lead = await leadModel.findById(conversation.leadId);

        return {
            conversation: {
                id: conversation.id,
                channel: conversation.channel,
                state: conversation.state,
                createdAt: conversation.createdAt,
                updatedAt: conversation.updatedAt,
                handoffAt: conversation.handoffAt,
                closedAt: conversation.closedAt,
                handoffReason: conversation.handoffReason
            },
            lead: lead ? {
                id: lead.id,
                phone: lead.phone,
                email: lead.email,
                name: lead.name,
                status: lead.status,
                qualification: lead.qualificationData
            } : null,
            messages: conversation.messages || [],
            context: conversation.context
        };
    }
}

module.exports = AnalyticsService;
