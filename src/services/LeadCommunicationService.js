/**
 * Lead Communication Service
 * Handles SMS, WhatsApp, and Voice communication via Twilio
 * Works in stub mode when credentials are not configured
 */

const env = require('../config/environment');

// Twilio client (lazy initialization)
let twilioClient = null;

/**
 * Initialize Twilio client if credentials are available
 * @returns {Object|null} Twilio client or null
 */
function getTwilioClient() {
    if (!twilioClient && env.twilio?.accountSid && env.twilio?.authToken) {
        try {
            const twilio = require('twilio');
            twilioClient = twilio(env.twilio.accountSid, env.twilio.authToken);
            console.log('📞 Twilio client initialized');
        } catch (error) {
            console.error('Failed to initialize Twilio:', error.message);
        }
    }
    return twilioClient;
}

/**
 * Check if Twilio is configured
 * @returns {boolean}
 */
function isConfigured() {
    return !!(env.twilio?.accountSid && env.twilio?.authToken && env.twilio?.phoneNumber);
}

/**
 * Log communication for debugging/analytics
 * @param {string} type - Communication type
 * @param {Object} data - Communication data
 */
function logCommunication(type, data) {
    console.log(`📱 [${type.toUpperCase()}] ${JSON.stringify(data)}`);
}

// ============================================
// SMS FUNCTIONS
// ============================================

/**
 * Send SMS message
 * @param {string} to - Recipient phone number
 * @param {string} body - Message body
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendSMS(to, body) {
    logCommunication('sms_out', { to, body: body.substring(0, 50) + '...' });

    const client = getTwilioClient();

    if (!client || !isConfigured()) {
        console.log('📱 [STUB MODE] SMS would be sent to:', to);
        return {
            success: true,
            messageId: `stub_${Date.now()}`,
            stub: true
        };
    }

    try {
        const message = await client.messages.create({
            body: body,
            from: env.twilio.phoneNumber,
            to: to
        });

        console.log(`✅ SMS sent: ${message.sid}`);
        return {
            success: true,
            messageId: message.sid
        };
    } catch (error) {
        console.error('❌ SMS failed:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Send WhatsApp message
 * @param {string} to - Recipient phone number (with country code)
 * @param {string} body - Message body
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendWhatsApp(to, body) {
    logCommunication('whatsapp_out', { to, body: body.substring(0, 50) + '...' });

    const client = getTwilioClient();

    if (!client || !isConfigured()) {
        console.log('💬 [STUB MODE] WhatsApp would be sent to:', to);
        return {
            success: true,
            messageId: `stub_wa_${Date.now()}`,
            stub: true
        };
    }

    try {
        // WhatsApp requires 'whatsapp:' prefix
        const whatsappTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
        const whatsappFrom = `whatsapp:${env.twilio.phoneNumber}`;

        const message = await client.messages.create({
            body: body,
            from: whatsappFrom,
            to: whatsappTo
        });

        console.log(`✅ WhatsApp sent: ${message.sid}`);
        return {
            success: true,
            messageId: message.sid
        };
    } catch (error) {
        console.error('❌ WhatsApp failed:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// ============================================
// VOICE CALL FUNCTIONS
// ============================================

/**
 * Initiate outbound voice call
 * @param {string} to - Recipient phone number
 * @param {string} twimlUrl - URL for TwiML instructions
 * @returns {Promise<{success: boolean, callId?: string, error?: string}>}
 */
async function initiateCall(to, twimlUrl) {
    logCommunication('call_out', { to, twimlUrl });

    const client = getTwilioClient();

    if (!client || !isConfigured()) {
        console.log('📞 [STUB MODE] Call would be initiated to:', to);
        return {
            success: true,
            callId: `stub_call_${Date.now()}`,
            stub: true
        };
    }

    try {
        const call = await client.calls.create({
            url: twimlUrl,
            from: env.twilio.phoneNumber,
            to: to
        });

        console.log(`✅ Call initiated: ${call.sid}`);
        return {
            success: true,
            callId: call.sid
        };
    } catch (error) {
        console.error('❌ Call failed:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Generate TwiML response for voice
 * @param {string} message - Message to speak
 * @param {Object} options - Voice options
 * @returns {string} TwiML XML
 */
function generateVoiceTwiML(message, options = {}) {
    const voice = options.voice || 'alice';
    const language = options.language || 'en-ZA';

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}" language="${language}">${escapeXml(message)}</Say>
  ${options.gather ? `
  <Gather input="speech" timeout="5" action="${options.gatherUrl}" method="POST">
    <Say voice="${voice}" language="${language}">${escapeXml(options.gatherPrompt || 'Please respond.')}</Say>
  </Gather>` : ''}
</Response>`;
}

/**
 * Generate TwiML for SMS response
 * @param {string} message - Response message
 * @returns {string} TwiML XML
 */
function generateSmsTwiML(message) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(message)}</Message>
</Response>`;
}

/**
 * Escape XML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeXml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Validate Twilio webhook signature
 * @param {string} signature - X-Twilio-Signature header
 * @param {string} url - Webhook URL
 * @param {Object} params - Request params
 * @returns {boolean} Valid or not
 */
function validateWebhook(signature, url, params) {
    if (!isConfigured()) {
        // Skip validation in stub mode
        return true;
    }

    try {
        const twilio = require('twilio');
        return twilio.validateRequest(
            env.twilio.authToken,
            signature,
            url,
            params
        );
    } catch (error) {
        console.error('Webhook validation error:', error.message);
        return false;
    }
}

/**
 * Parse incoming Twilio webhook
 * @param {Object} body - Request body
 * @returns {Object} Parsed message data
 */
function parseIncomingMessage(body) {
    return {
        messageId: body.MessageSid || body.SmsSid,
        from: body.From,
        to: body.To,
        body: body.Body,
        numMedia: parseInt(body.NumMedia) || 0,
        channel: body.From?.startsWith('whatsapp:') ? 'whatsapp' : 'sms',
        timestamp: new Date().toISOString()
    };
}

/**
 * Parse incoming Twilio voice webhook
 * @param {Object} body - Request body
 * @returns {Object} Parsed call data
 */
function parseIncomingCall(body) {
    return {
        callId: body.CallSid,
        from: body.From,
        to: body.To,
        status: body.CallStatus,
        direction: body.Direction,
        speechResult: body.SpeechResult || null,
        timestamp: new Date().toISOString()
    };
}

module.exports = {
    // Configuration
    isConfigured,

    // SMS
    sendSMS,
    sendWhatsApp,

    // Voice
    initiateCall,
    generateVoiceTwiML,
    generateSmsTwiML,

    // Utilities
    validateWebhook,
    parseIncomingMessage,
    parseIncomingCall
};
