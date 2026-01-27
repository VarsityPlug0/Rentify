/**
 * Analytics Routes
 * Admin endpoints for viewing conversation data and metrics
 */

const express = require('express');
const router = express.Router();
const AnalyticsService = require('../services/AnalyticsService');
const AuthMiddleware = require('../middleware/AuthMiddleware');

const analyticsService = new AnalyticsService();

// ============================================
// METRICS ENDPOINTS
// ============================================

/**
 * GET /api/analytics/metrics
 * Get aggregated conversation metrics
 */
router.get('/metrics', AuthMiddleware.requireAuth, async (req, res) => {
    try {
        const { startDate, endDate, channel } = req.query;

        const metrics = await analyticsService.getMetrics({
            startDate,
            endDate,
            channel
        });

        res.json(metrics);
    } catch (error) {
        console.error('❌ Metrics error:', error);
        res.status(500).json({ error: 'Failed to fetch metrics' });
    }
});

/**
 * GET /api/analytics/funnel
 * Get lead funnel data
 */
router.get('/funnel', AuthMiddleware.requireAuth, async (req, res) => {
    try {
        const funnel = await analyticsService.getFunnel();
        res.json(funnel);
    } catch (error) {
        console.error('❌ Funnel error:', error);
        res.status(500).json({ error: 'Failed to fetch funnel data' });
    }
});

// ============================================
// CONVERSATION ENDPOINTS
// ============================================

/**
 * GET /api/analytics/conversations
 * List conversations with filters and pagination
 */
router.get('/conversations', AuthMiddleware.requireAuth, async (req, res) => {
    try {
        const { page, limit, channel, state } = req.query;

        const result = await analyticsService.getConversationList({
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20,
            channel,
            state
        });

        res.json(result);
    } catch (error) {
        console.error('❌ Conversations list error:', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

/**
 * GET /api/analytics/conversations/:id
 * Get full conversation transcript
 */
router.get('/conversations/:id', AuthMiddleware.requireAuth, async (req, res) => {
    try {
        const transcript = await analyticsService.getConversationTranscript(
            parseInt(req.params.id)
        );

        if (!transcript) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        res.json(transcript);
    } catch (error) {
        console.error('❌ Transcript error:', error);
        res.status(500).json({ error: 'Failed to fetch transcript' });
    }
});

// ============================================
// LEAD ENDPOINTS
// ============================================

/**
 * GET /api/analytics/leads
 * Get lead list with status
 */
router.get('/leads', AuthMiddleware.requireAuth, async (req, res) => {
    try {
        const Lead = require('../models/Lead');
        const leadModel = new Lead();

        const { status, source } = req.query;
        const leads = await leadModel.getAll({ status, source });

        res.json({
            leads: leads.map(l => ({
                id: l.id,
                phone: l.phone,
                email: l.email,
                name: l.name,
                status: l.status,
                source: l.source,
                qualified: l.qualificationData?.completed || false,
                createdAt: l.createdAt,
                updatedAt: l.updatedAt
            })),
            total: leads.length
        });
    } catch (error) {
        console.error('❌ Leads error:', error);
        res.status(500).json({ error: 'Failed to fetch leads' });
    }
});

/**
 * GET /api/analytics/leads/:id
 * Get lead details with conversation history
 */
router.get('/leads/:id', AuthMiddleware.requireAuth, async (req, res) => {
    try {
        const Lead = require('../models/Lead');
        const Conversation = require('../models/Conversation');

        const leadModel = new Lead();
        const conversationModel = new Conversation();

        const lead = await leadModel.findById(parseInt(req.params.id));
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        const conversations = await conversationModel.findByLeadId(lead.id);

        res.json({
            lead,
            conversations: conversations.map(c => ({
                id: c.id,
                channel: c.channel,
                state: c.state,
                messageCount: c.messages?.length || 0,
                createdAt: c.createdAt,
                updatedAt: c.updatedAt
            }))
        });
    } catch (error) {
        console.error('❌ Lead detail error:', error);
        res.status(500).json({ error: 'Failed to fetch lead' });
    }
});

// ============================================
// PUBLIC HEALTH CHECK
// ============================================

/**
 * GET /api/analytics/health
 * Health check (no auth required)
 */
router.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'analytics'
    });
});

module.exports = router;
