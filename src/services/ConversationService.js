/**
 * Conversation Service
 * Manages conversation flow, state transitions, and AI responses
 * Implements the core logic for lead qualification
 * Now with AI reasoning integration and analytics
 */

const Lead = require('../models/Lead');
const Conversation = require('../models/Conversation');
const LeadCommunicationService = require('./LeadCommunicationService');
const AIReasoningService = require('./AIReasoningService');
const AnalyticsService = require('./AnalyticsService');
const env = require('../config/environment');

const STATES = Conversation.STATES;
const analyticsService = new AnalyticsService();

// Response templates for each state (fallback when AI unavailable)
const TEMPLATES = {
    greeting: {
        sms: `Hi! 👋 Thanks for your interest in renting with Rentify. I'm here to help you find your perfect home.

To get started, could you tell me your approximate monthly budget for rent?`,
        whatsapp: `Hi! 👋 Thanks for your interest in renting with Rentify. I'm here to help you find your perfect home.

To get started, could you tell me your approximate monthly budget for rent?`
    },

    askLocation: `Great! And which area or suburb are you looking to live in?`,

    askMoveIn: `Perfect! When are you looking to move in? (e.g., "next month", "March 2026", "ASAP")`,

    qualified: `Excellent! Based on what you've shared:
💰 Budget: {budget}
📍 Location: {location}
📅 Move-in: {moveInDate}

I can help you:
1️⃣ View available properties matching your criteria
2️⃣ Schedule a viewing
3️⃣ Start an application

Reply with 1, 2, or 3 to continue, or type "human" to speak with our team.`,

    viewProperties: `Here are some properties that match your criteria:
{properties}

Reply with a property number to learn more, or "viewing" to schedule a visit.`,

    scheduleViewing: `Great! To schedule a viewing, please visit:
{viewingLink}

Or reply "call" and we'll call you to arrange a time.`,

    startApplication: `You can start your application here:
{applicationLink}

This takes about 5 minutes and helps us process your request faster.`,

    handoff: `I'm connecting you with a member of our team. Someone will be in touch shortly. If urgent, call us at {phone}.`,

    error: `I'm sorry, I didn't quite understand that. Could you please try again?`,

    closed: `Thank you for chatting with Rentify! If you need anything else, just message us anytime. 🏠`
};

// Keywords that trigger human handoff
const HANDOFF_TRIGGERS = [
    'human', 'agent', 'person', 'speak to someone', 'call me',
    'complaint', 'problem', 'issue', 'angry', 'frustrated',
    'legal', 'lawyer', 'court', 'sue'
];

// Keywords for intent detection (fallback)
const INTENT_PATTERNS = {
    budget: /(?:budget|afford|spend|pay|rent.*?(?:is|of|around|about)?)\s*(?:R|r|ZAR)?\s*(\d{1,3}(?:[,\s]?\d{3})*)/i,
    location: /(?:in|at|near|around|looking for)\s+([A-Za-z\s]+?)(?:\s*(?:area|suburb|city|town)|$|[,.])/i,
    moveIn: /(?:move|start|from|by|in)\s*((?:january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?|asap|immediately|next\s+(?:week|month)|soon))/i,
    yes: /^(?:yes|yeah|yep|sure|ok|okay|1)$/i,
    no: /^(?:no|nope|not|cancel|stop)$/i,
    viewProperties: /^(?:1|view|properties|listings|show)$/i,
    scheduleViewing: /^(?:2|viewing|visit|schedule|see)$/i,
    startApplication: /^(?:3|apply|application|start)$/i
};

/**
 * Process an incoming message and generate a response
 * Uses AI when available, falls back to templates
 * @param {string} from - Sender phone number
 * @param {string} body - Message body
 * @param {string} channel - Communication channel (sms/whatsapp/voice)
 * @returns {Promise<{response: string, conversation: Object, lead: Object}>}
 */
async function processMessage(from, body, channel = 'sms') {
    const leadModel = new Lead();
    const conversationModel = new Conversation();

    // Get or create lead
    let lead = await leadModel.findByPhone(from);
    const isNewLead = !lead;

    if (isNewLead) {
        lead = await leadModel.create({ phone: from, source: channel });
        await analyticsService.logLeadCreated(lead, channel);
    }

    // Get or create active conversation
    let conversation = await conversationModel.findActiveByLeadId(lead.id);
    const isNewConversation = !conversation;

    if (isNewConversation) {
        conversation = await conversationModel.create(lead.id, channel);
        await analyticsService.logConversationStarted(conversation, lead);
    }

    // Log incoming message
    await conversationModel.addMessage(conversation.id, {
        role: 'user',
        content: body,
        intent: detectIntent(body)
    });

    await analyticsService.logMessage(conversation, { intent: detectIntent(body) }, 'inbound');

    // Check for handoff triggers first
    if (shouldHandoff(body)) {
        const response = TEMPLATES.handoff.replace('{phone}', env.twilio?.phoneNumber || '(contact support)');
        await conversationModel.handoff(conversation.id, 'user_requested');
        await conversationModel.addMessage(conversation.id, {
            role: 'assistant',
            content: response,
            confidence: 1.0
        });
        await analyticsService.logHandoff(conversation, 'user_requested');
        return { response, conversation, lead };
    }

    // Try AI-powered response first
    let result;
    if (AIReasoningService.isConfigured()) {
        result = await processWithAI(body, conversation, lead, leadModel, conversationModel);
    } else {
        result = await processWithTemplates(body, conversation, lead, leadModel, conversationModel, channel);
    }

    // Get updated conversation and lead
    const updatedConversation = await conversationModel.findById(conversation.id);
    const updatedLead = await leadModel.findById(lead.id);

    return {
        response: result.response,
        conversation: updatedConversation,
        lead: updatedLead
    };
}

/**
 * Process message using AI reasoning
 */
async function processWithAI(body, conversation, lead, leadModel, conversationModel) {
    try {
        const aiResult = await AIReasoningService.generateResponse(body, {
            state: conversation.state,
            messages: conversation.messages || [],
            collectedData: conversation.context?.collectedData || {}
        });

        // Handle AI-suggested handoff
        if (aiResult.shouldHandoff) {
            const response = aiResult.response;
            await conversationModel.handoff(conversation.id, aiResult.handoffReason || 'ai_uncertain');
            await conversationModel.addMessage(conversation.id, {
                role: 'assistant',
                content: response,
                confidence: aiResult.confidence,
                intent: aiResult.intent
            });
            await analyticsService.logHandoff(conversation, aiResult.handoffReason);
            return { response };
        }

        // Process extracted data
        let newState = conversation.state;
        let contextUpdates = { ...conversation.context };

        if (aiResult.extractedData) {
            const extracted = aiResult.extractedData;

            if (extracted.budget) {
                await leadModel.updateQualification(lead.id, { budget: extracted.budget });
                contextUpdates.collectedData = { ...contextUpdates.collectedData, budget: extracted.budget };
                await analyticsService.logQualificationStep(lead, 'budget', extracted.budget);

                if (conversation.state === STATES.GREETING) {
                    newState = STATES.QUALIFICATION;
                    contextUpdates.currentField = 'location';
                }
            }

            if (extracted.location) {
                await leadModel.updateQualification(lead.id, { location: extracted.location });
                contextUpdates.collectedData = { ...contextUpdates.collectedData, location: extracted.location };
                await analyticsService.logQualificationStep(lead, 'location', extracted.location);
                contextUpdates.currentField = 'moveInDate';
            }

            if (extracted.moveInDate) {
                await leadModel.updateQualification(lead.id, { moveInDate: extracted.moveInDate });
                contextUpdates.collectedData = { ...contextUpdates.collectedData, moveInDate: extracted.moveInDate };
                await analyticsService.logQualificationStep(lead, 'moveInDate', extracted.moveInDate);

                // Check if fully qualified
                const updatedLead = await leadModel.findById(lead.id);
                if (updatedLead.qualificationData?.completed) {
                    newState = STATES.ACTION;
                    await analyticsService.logLeadQualified(updatedLead);
                }
            }
        }

        // Determine state from AI intent
        if (aiResult.intent === 'view_properties' || aiResult.intent === 'schedule_viewing' || aiResult.intent === 'apply') {
            newState = STATES.ACTION;

            // Log conversion if taking action
            if (aiResult.intent === 'schedule_viewing') {
                await analyticsService.logConversion(lead, 'viewing_booked');
            } else if (aiResult.intent === 'apply') {
                await analyticsService.logConversion(lead, 'application_started');
            }
        }

        // Update state if changed
        if (newState !== conversation.state || Object.keys(contextUpdates).length > 0) {
            await conversationModel.updateState(conversation.id, newState, contextUpdates);
        }

        // Log response
        await conversationModel.addMessage(conversation.id, {
            role: 'assistant',
            content: aiResult.response,
            confidence: aiResult.confidence,
            intent: aiResult.intent
        });

        return { response: aiResult.response };

    } catch (error) {
        console.error('AI processing error, falling back to templates:', error.message);
        return processWithTemplates(body, conversation, lead, leadModel, conversationModel, 'sms');
    }
}

/**
 * Process message using templates (fallback)
 */
async function processWithTemplates(body, conversation, lead, leadModel, conversationModel, channel) {
    let response;
    let newState = conversation.state;
    let contextUpdates = {};

    switch (conversation.state) {
        case STATES.NEW_LEAD:
            response = TEMPLATES.greeting[channel] || TEMPLATES.greeting.sms;
            newState = STATES.GREETING;
            break;

        case STATES.GREETING:
            const budgetMatch = extractBudget(body);
            if (budgetMatch) {
                await leadModel.updateQualification(lead.id, { budget: budgetMatch });
                contextUpdates.collectedData = { ...conversation.context?.collectedData, budget: budgetMatch };
                contextUpdates.currentField = 'location';
                response = TEMPLATES.askLocation;
                newState = STATES.QUALIFICATION;
                await analyticsService.logQualificationStep(lead, 'budget', budgetMatch);
            } else {
                response = `I didn't catch your budget. Could you tell me how much you're looking to spend on rent per month? (e.g., "R5000" or "around R8000")`;
            }
            break;

        case STATES.QUALIFICATION:
            const result = await handleQualification(body, lead, conversation, leadModel);
            response = result.response;
            newState = result.newState;
            contextUpdates = result.contextUpdates;
            break;

        case STATES.ACTION:
            const actionResult = await handleAction(body, lead, conversation);
            if (actionResult.close) {
                newState = STATES.CLOSED;
            }
            response = actionResult.message || actionResult;
            break;

        default:
            response = TEMPLATES.greeting[channel] || TEMPLATES.greeting.sms;
            newState = STATES.GREETING;
    }

    // Update conversation state
    if (newState !== conversation.state || Object.keys(contextUpdates).length > 0) {
        await conversationModel.updateState(conversation.id, newState, contextUpdates);
    }

    // Log response
    await conversationModel.addMessage(conversation.id, {
        role: 'assistant',
        content: response,
        confidence: 0.8
    });

    return { response };
}

/**
 * Handle qualification state
 */
async function handleQualification(body, lead, conversation, leadModel) {
    const currentField = conversation.context?.currentField || 'location';
    const collectedData = conversation.context?.collectedData || {};
    let response;
    let newState = STATES.QUALIFICATION;
    let contextUpdates = { collectedData };

    if (currentField === 'location') {
        const location = extractLocation(body);
        if (location) {
            await leadModel.updateQualification(lead.id, { location });
            contextUpdates.collectedData.location = location;
            contextUpdates.currentField = 'moveInDate';
            response = TEMPLATES.askMoveIn;
            await analyticsService.logQualificationStep(lead, 'location', location);
        } else {
            response = `Which area or suburb are you interested in? (e.g., "Sandton", "Cape Town CBD", "Pretoria East")`;
        }
    } else if (currentField === 'moveInDate') {
        const moveIn = extractMoveIn(body);
        if (moveIn) {
            await leadModel.updateQualification(lead.id, { moveInDate: moveIn });
            contextUpdates.collectedData.moveInDate = moveIn;
            await analyticsService.logQualificationStep(lead, 'moveInDate', moveIn);

            // All qualification data collected
            const qualData = {
                budget: collectedData.budget || lead.qualificationData?.budget,
                location: collectedData.location,
                moveInDate: moveIn
            };

            response = TEMPLATES.qualified
                .replace('{budget}', qualData.budget || 'Not specified')
                .replace('{location}', qualData.location || 'Not specified')
                .replace('{moveInDate}', qualData.moveInDate || 'Not specified');

            newState = STATES.ACTION;
            contextUpdates.currentField = null;

            // Log qualification complete
            await analyticsService.logLeadQualified(lead);
        } else {
            response = `When are you looking to move in? (e.g., "February", "next month", "ASAP")`;
        }
    }

    return { response, newState, contextUpdates };
}

/**
 * Handle action state
 */
async function handleAction(body, lead, conversation) {
    const baseUrl = env.baseUrl || 'https://rentify-yruw.onrender.com';

    if (INTENT_PATTERNS.viewProperties.test(body)) {
        return {
            message: TEMPLATES.viewProperties.replace('{properties}',
                `🏠 Check our available properties at:\n${baseUrl}/our-properties.html`
            )
        };
    }

    if (INTENT_PATTERNS.scheduleViewing.test(body)) {
        await analyticsService.logConversion(lead, 'viewing_booked');
        return {
            message: TEMPLATES.scheduleViewing.replace('{viewingLink}',
                `${baseUrl}/contact.html`
            )
        };
    }

    if (INTENT_PATTERNS.startApplication.test(body)) {
        await analyticsService.logConversion(lead, 'application_started');
        return {
            message: TEMPLATES.startApplication.replace('{applicationLink}',
                `${baseUrl}/application.html`
            ),
            close: true
        };
    }

    return {
        message: `Please reply with:
1️⃣ View properties
2️⃣ Schedule a viewing
3️⃣ Start an application

Or type "human" to speak with our team.`
    };
}

/**
 * Check if message should trigger human handoff
 */
function shouldHandoff(message) {
    const lower = message.toLowerCase();
    return HANDOFF_TRIGGERS.some(trigger => lower.includes(trigger));
}

/**
 * Detect intent from message
 */
function detectIntent(message) {
    for (const [intent, pattern] of Object.entries(INTENT_PATTERNS)) {
        if (pattern.test(message)) {
            return intent;
        }
    }
    return 'unknown';
}

/**
 * Extract budget from message
 */
function extractBudget(message) {
    // Match patterns like R5000, R 5000, 5000, R5,000, etc.
    const match = message.match(/[Rr]?\s*(\d[\d,\s]*)/);
    if (match) {
        const amount = parseInt(match[1].replace(/[,\s]/g, ''));
        if (amount >= 1000 && amount <= 100000) {
            return `R${amount.toLocaleString()}`;
        }
    }
    return null;
}

/**
 * Extract location from message
 */
function extractLocation(message) {
    const cleaned = message
        .replace(/(?:in|at|near|around|looking for|area|suburb|city|town)/gi, '')
        .trim();

    if (cleaned.length >= 3 && cleaned.length <= 50) {
        return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
    }
    return null;
}

/**
 * Extract move-in date from message
 */
function extractMoveIn(message) {
    const lower = message.toLowerCase().trim();

    if (/asap|immediately|urgent/i.test(lower)) return 'ASAP';
    if (/next\s+week/i.test(lower)) return 'Next week';
    if (/next\s+month/i.test(lower)) return 'Next month';
    if (/this\s+month/i.test(lower)) return 'This month';

    const months = ['january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'];
    for (const month of months) {
        if (lower.includes(month)) {
            return month.charAt(0).toUpperCase() + month.slice(1) + ' 2026';
        }
    }

    if (lower.length <= 20) {
        return message.trim();
    }

    return null;
}

/**
 * Send auto-response to new lead
 * @param {string} phone - Phone number
 * @param {string} channel - Channel
 * @returns {Promise<Object>} Result
 */
async function sendAutoResponse(phone, channel = 'sms') {
    const result = await processMessage(phone, 'Hi', channel);

    if (channel === 'whatsapp') {
        await LeadCommunicationService.sendWhatsApp(phone, result.response);
    } else {
        await LeadCommunicationService.sendSMS(phone, result.response);
    }

    return result;
}

/**
 * Initiate outbound follow-up call
 * @param {string} phone - Phone number
 * @param {string} purpose - Call purpose
 */
async function initiateFollowUpCall(phone, purpose = 'qualification') {
    const baseUrl = env.baseUrl || 'https://rentify-yruw.onrender.com';
    const twimlUrl = `${baseUrl}/api/webhook/voice`;

    const result = await LeadCommunicationService.initiateCall(phone, twimlUrl);

    if (result.success) {
        console.log(`📞 Follow-up call initiated to ${phone}`);
    }

    return result;
}

module.exports = {
    processMessage,
    sendAutoResponse,
    initiateFollowUpCall,
    shouldHandoff,
    detectIntent,
    STATES,
    TEMPLATES
};
