/**
 * Webhook Routes
 * Handles incoming webhooks from Twilio for SMS, WhatsApp, and Voice
 */

const express = require('express');
const router = express.Router();
const ConversationService = require('../services/ConversationService');
const LeadCommunicationService = require('../services/LeadCommunicationService');

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Validate Twilio webhook signature
 * Skips validation in development/stub mode
 */
function validateTwilioSignature(req, res, next) {
    // Skip validation in stub mode or development
    if (!LeadCommunicationService.isConfigured()) {
        return next();
    }

    const signature = req.headers['x-twilio-signature'];
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

    if (!LeadCommunicationService.validateWebhook(signature, url, req.body)) {
        console.error('❌ Invalid Twilio webhook signature');
        return res.status(403).send('Forbidden');
    }

    next();
}

// ============================================
// SMS WEBHOOKS
// ============================================

/**
 * POST /api/webhook/sms
 * Receive inbound SMS messages from Twilio
 */
router.post('/sms', validateTwilioSignature, async (req, res) => {
    try {
        const message = LeadCommunicationService.parseIncomingMessage(req.body);
        console.log(`📱 Inbound SMS from ${message.from}: ${message.body}`);

        // Process through conversation engine
        const result = await ConversationService.processMessage(
            message.from,
            message.body,
            'sms'
        );

        // Send SMS response via Twilio webhook response
        const twiml = LeadCommunicationService.generateSmsTwiML(result.response);
        res.type('text/xml').send(twiml);

    } catch (error) {
        console.error('❌ SMS webhook error:', error);
        const errorTwiml = LeadCommunicationService.generateSmsTwiML(
            'Sorry, we encountered an issue. Please try again or call us directly.'
        );
        res.type('text/xml').send(errorTwiml);
    }
});

// ============================================
// WHATSAPP WEBHOOKS
// ============================================

/**
 * POST /api/webhook/whatsapp
 * Receive inbound WhatsApp messages from Twilio
 */
router.post('/whatsapp', validateTwilioSignature, async (req, res) => {
    try {
        const message = LeadCommunicationService.parseIncomingMessage(req.body);
        // Remove 'whatsapp:' prefix from phone number
        const phone = message.from.replace('whatsapp:', '');
        console.log(`💬 Inbound WhatsApp from ${phone}: ${message.body}`);

        // Process through conversation engine
        const result = await ConversationService.processMessage(
            phone,
            message.body,
            'whatsapp'
        );

        // Send WhatsApp response via Twilio webhook response
        const twiml = LeadCommunicationService.generateSmsTwiML(result.response);
        res.type('text/xml').send(twiml);

    } catch (error) {
        console.error('❌ WhatsApp webhook error:', error);
        const errorTwiml = LeadCommunicationService.generateSmsTwiML(
            'Sorry, we encountered an issue. Please try again.'
        );
        res.type('text/xml').send(errorTwiml);
    }
});

// ============================================
// VOICE WEBHOOKS
// ============================================

/**
 * POST /api/webhook/voice
 * Handle incoming voice calls - initial greeting
 */
router.post('/voice', validateTwilioSignature, async (req, res) => {
    try {
        const call = LeadCommunicationService.parseIncomingCall(req.body);
        console.log(`📞 Inbound call from ${call.from}`);

        // Create/get lead and conversation
        const result = await ConversationService.processMessage(
            call.from,
            'INCOMING_CALL',
            'voice'
        );

        // Generate voice response with gather for speech input
        const baseUrl = process.env.BASE_URL || 'https://rentify-yruw.onrender.com';
        const twiml = LeadCommunicationService.generateVoiceTwiML(result.response, {
            voice: 'Polly.Amy',
            language: 'en-ZA',
            gather: true,
            gatherUrl: `${baseUrl}/api/webhook/voice/gather`,
            gatherPrompt: 'Please tell me about your rental needs.'
        });

        res.type('text/xml').send(twiml);

    } catch (error) {
        console.error('❌ Voice webhook error:', error);
        const errorTwiml = LeadCommunicationService.generateVoiceTwiML(
            'Sorry, we are experiencing technical difficulties. Please call back later or visit our website.',
            { voice: 'Polly.Amy', language: 'en-ZA' }
        );
        res.type('text/xml').send(errorTwiml);
    }
});

/**
 * POST /api/webhook/voice/gather
 * Handle speech input from voice calls
 */
router.post('/voice/gather', validateTwilioSignature, async (req, res) => {
    try {
        const call = LeadCommunicationService.parseIncomingCall(req.body);
        const speechResult = call.speechResult;

        console.log(`🎤 Speech from ${call.from}: ${speechResult}`);

        if (!speechResult) {
            // No speech detected, prompt again
            const baseUrl = process.env.BASE_URL || 'https://rentify-yruw.onrender.com';
            const twiml = LeadCommunicationService.generateVoiceTwiML(
                "I didn't catch that. Could you please repeat?",
                {
                    voice: 'Polly.Amy',
                    language: 'en-ZA',
                    gather: true,
                    gatherUrl: `${baseUrl}/api/webhook/voice/gather`,
                    gatherPrompt: 'Please tell me what you are looking for.'
                }
            );
            return res.type('text/xml').send(twiml);
        }

        // Process speech through conversation engine
        const result = await ConversationService.processMessage(
            call.from,
            speechResult,
            'voice'
        );

        // Check if conversation should continue or end
        const conversation = result.conversation;
        const shouldGather = !['CLOSED', 'HANDOFF'].includes(conversation.state);

        const baseUrl = process.env.BASE_URL || 'https://rentify-yruw.onrender.com';
        const twiml = LeadCommunicationService.generateVoiceTwiML(result.response, {
            voice: 'Polly.Amy',
            language: 'en-ZA',
            gather: shouldGather,
            gatherUrl: shouldGather ? `${baseUrl}/api/webhook/voice/gather` : undefined,
            gatherPrompt: shouldGather ? 'Please respond.' : undefined
        });

        res.type('text/xml').send(twiml);

    } catch (error) {
        console.error('❌ Voice gather webhook error:', error);
        const errorTwiml = LeadCommunicationService.generateVoiceTwiML(
            'Sorry, I had trouble understanding. Let me connect you with a member of our team.',
            { voice: 'Polly.Amy', language: 'en-ZA' }
        );
        res.type('text/xml').send(errorTwiml);
    }
});

/**
 * POST /api/webhook/voice/status
 * Handle call status updates
 */
router.post('/voice/status', validateTwilioSignature, async (req, res) => {
    try {
        const { CallSid, CallStatus, CallDuration, From } = req.body;
        console.log(`📞 Call ${CallSid} status: ${CallStatus} (${CallDuration}s)`);

        // Log call completion for analytics
        if (CallStatus === 'completed' || CallStatus === 'failed' || CallStatus === 'no-answer') {
            console.log(`📊 Call ended: ${From} - ${CallStatus} after ${CallDuration || 0}s`);
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('❌ Voice status webhook error:', error);
        res.sendStatus(500);
    }
});

// ============================================
// MESSAGE STATUS WEBHOOKS
// ============================================

/**
 * POST /api/webhook/status
 * Handle message delivery status updates
 */
router.post('/status', validateTwilioSignature, async (req, res) => {
    try {
        const { MessageSid, MessageStatus, To, ErrorCode, ErrorMessage } = req.body;
        console.log(`📊 Message ${MessageSid} to ${To}: ${MessageStatus}`);

        if (ErrorCode) {
            console.error(`❌ Message error ${ErrorCode}: ${ErrorMessage}`);
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('❌ Status webhook error:', error);
        res.sendStatus(500);
    }
});

// ============================================
// TEST ENDPOINTS (Development Only)
// ============================================

/**
 * POST /api/webhook/test/sms
 * Test endpoint to simulate SMS without Twilio
 */
router.post('/test/sms', async (req, res) => {
    try {
        const { from, body } = req.body;

        if (!from || !body) {
            return res.status(400).json({ error: 'Missing from or body' });
        }

        console.log(`🧪 Test SMS from ${from}: ${body}`);

        const result = await ConversationService.processMessage(from, body, 'sms');

        res.json({
            success: true,
            response: result.response,
            lead: {
                id: result.lead.id,
                phone: result.lead.phone,
                status: result.lead.status,
                qualification: result.lead.qualificationData
            },
            conversation: {
                id: result.conversation.id,
                state: result.conversation.state,
                messageCount: result.conversation.messages.length
            }
        });

    } catch (error) {
        console.error('❌ Test SMS error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/webhook/health
 * Health check for webhook endpoints
 */
router.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        twilioConfigured: LeadCommunicationService.isConfigured(),
        endpoints: {
            sms: '/api/webhook/sms',
            whatsapp: '/api/webhook/whatsapp',
            voice: '/api/webhook/voice',
            voiceGather: '/api/webhook/voice/gather',
            status: '/api/webhook/status'
        }
    });
});

module.exports = router;
