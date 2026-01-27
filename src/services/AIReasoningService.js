/**
 * AI Reasoning Service
 * LLM-powered response generation with confidence scoring and safety guardrails
 * Works in stub mode when LLM credentials are not configured
 */

const env = require('../config/environment');

// LLM client (lazy initialization)
let openaiClient = null;

/**
 * Initialize OpenAI client if credentials are available
 * @returns {Object|null} OpenAI client or null
 */
async function getOpenAIClient() {
    if (!openaiClient && env.ai?.llmApiKey) {
        try {
            const { OpenAI } = await import('openai');
            openaiClient = new OpenAI({ apiKey: env.ai.llmApiKey });
            console.log('🤖 OpenAI client initialized');
        } catch (error) {
            console.error('Failed to initialize OpenAI:', error.message);
        }
    }
    return openaiClient;
}

/**
 * Check if LLM is configured
 * @returns {boolean}
 */
function isConfigured() {
    return !!env.ai?.llmApiKey;
}

// ============================================
// SAFETY RULES
// ============================================

const SAFETY_RULES = [
    'Never negotiate prices or rental amounts',
    'Never make policy promises or guarantees',
    'Never provide legal advice',
    'Never share personal information of other tenants or owners',
    'Always recommend speaking to a human for complex issues',
    'If uncertain, acknowledge uncertainty and offer to connect with team'
];

const FORBIDDEN_TOPICS = [
    'price negotiation',
    'discount',
    'reduce rent',
    'lower price',
    'legal advice',
    'eviction rights',
    'sue',
    'lawyer',
    'court',
    'discrimination'
];

// ============================================
// PROMPTS
// ============================================

const SYSTEM_PROMPT = `You are a friendly, professional rental assistant for Rentify, a property rental platform. Your job is to help potential tenants find their perfect home.

IMPORTANT RULES:
${SAFETY_RULES.map((r, i) => `${i + 1}. ${r}`).join('\n')}

FORBIDDEN TOPICS (immediately hand off to human):
${FORBIDDEN_TOPICS.join(', ')}

RESPONSE FORMAT:
You must respond with valid JSON in this exact format:
{
    "response": "Your friendly response message to the user",
    "confidence": 0.95,
    "intent": "greeting|budget|location|move_in|view_properties|schedule_viewing|apply|handoff|unknown",
    "extractedData": {
        "budget": null,
        "location": null,
        "moveInDate": null
    },
    "shouldHandoff": false,
    "handoffReason": null
}

CONFIDENCE SCORING:
- 0.9-1.0: Very confident, clear user intent
- 0.7-0.89: Reasonably confident
- 0.5-0.69: Uncertain, may need clarification
- Below 0.5: Should hand off to human

Always be warm, helpful, and concise. Use emoji sparingly but appropriately.`;

const STATE_PROMPTS = {
    NEW_LEAD: `This is a new lead making first contact. Welcome them warmly and ask about their rental budget.`,

    GREETING: `The user should be providing their budget. Extract the budget amount (in South African Rand) if mentioned. If unclear, politely ask for clarification.`,

    QUALIFICATION: `We are collecting lead information. Based on context, we need:
- If asking for location: Extract the area/suburb they want to live in
- If asking for move-in date: Extract when they want to move (ASAP, next month, specific date)
Respond appropriately based on what information is still needed.`,

    ACTION: `The lead is qualified. They can:
1. View available properties
2. Schedule a viewing
3. Start an application
Help them with their choice or clarify if needed.`,

    HANDOFF: `The conversation has been escalated to a human. Let them know someone will be in touch.`,

    CLOSED: `The conversation is complete. Thank them and let them know they can reach out anytime.`
};

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Generate AI response for a message
 * @param {string} userMessage - User's message
 * @param {Object} context - Conversation context
 * @param {string} context.state - Current conversation state
 * @param {Array} context.messages - Previous messages
 * @param {Object} context.collectedData - Data collected so far
 * @returns {Promise<Object>} AI response with confidence
 */
async function generateResponse(userMessage, context = {}) {
    const { state = 'NEW_LEAD', messages = [], collectedData = {} } = context;

    // Check for forbidden topics first
    if (containsForbiddenTopic(userMessage)) {
        return {
            response: "I understand you have questions about that topic. Let me connect you with a member of our team who can help you better. Someone will be in touch shortly.",
            confidence: 1.0,
            intent: 'handoff',
            extractedData: {},
            shouldHandoff: true,
            handoffReason: 'forbidden_topic'
        };
    }

    const client = await getOpenAIClient();

    // If LLM not configured, use fallback
    if (!client) {
        console.log('🤖 [STUB MODE] Using fallback response');
        return generateFallbackResponse(userMessage, context);
    }

    try {
        const statePrompt = STATE_PROMPTS[state] || STATE_PROMPTS.NEW_LEAD;

        // Build conversation history
        const conversationHistory = messages.slice(-6).map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content
        }));

        const completion = await client.chat.completions.create({
            model: env.ai.llmModel || 'gpt-4o-mini',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'system', content: `Current State: ${state}\n${statePrompt}\n\nData collected so far: ${JSON.stringify(collectedData)}` },
                ...conversationHistory,
                { role: 'user', content: userMessage }
            ],
            temperature: 0.7,
            max_tokens: 500,
            response_format: { type: 'json_object' }
        });

        const responseText = completion.choices[0]?.message?.content;
        const parsed = JSON.parse(responseText);

        // Post-process for safety
        const result = {
            response: parsed.response || "I'm here to help! Could you tell me more about what you're looking for?",
            confidence: Math.min(Math.max(parsed.confidence || 0.5, 0), 1),
            intent: parsed.intent || 'unknown',
            extractedData: sanitizeExtractedData(parsed.extractedData || {}),
            shouldHandoff: parsed.shouldHandoff || false,
            handoffReason: parsed.handoffReason || null
        };

        // Force handoff if confidence too low
        if (result.confidence < env.ai.confidenceThreshold && !result.shouldHandoff) {
            result.shouldHandoff = true;
            result.handoffReason = 'low_confidence';
            result.response += "\n\nIf you'd prefer to speak with someone directly, just say 'human' and I'll connect you with our team.";
        }

        console.log(`🤖 AI Response (confidence: ${result.confidence.toFixed(2)}, intent: ${result.intent})`);
        return result;

    } catch (error) {
        console.error('❌ AI generation error:', error.message);
        return generateFallbackResponse(userMessage, context);
    }
}

/**
 * Check if message contains forbidden topics
 * @param {string} message - User message
 * @returns {boolean}
 */
function containsForbiddenTopic(message) {
    const lower = message.toLowerCase();
    return FORBIDDEN_TOPICS.some(topic => lower.includes(topic));
}

/**
 * Generate fallback response when LLM is unavailable
 * @param {string} userMessage - User message
 * @param {Object} context - Conversation context
 * @returns {Object} Fallback response
 */
function generateFallbackResponse(userMessage, context) {
    const { state = 'NEW_LEAD' } = context;
    const lower = userMessage.toLowerCase();

    // Basic intent detection
    let intent = 'unknown';
    let response = '';
    let extractedData = {};

    // Check for handoff keywords
    if (/human|agent|person|help|speak|call me/i.test(lower)) {
        return {
            response: "I'm connecting you with a member of our team. Someone will be in touch shortly.",
            confidence: 0.95,
            intent: 'handoff',
            extractedData: {},
            shouldHandoff: true,
            handoffReason: 'user_requested'
        };
    }

    switch (state) {
        case 'NEW_LEAD':
            response = "Hi! 👋 Thanks for reaching out to Rentify. I'm here to help you find your perfect rental home.\n\nTo get started, could you tell me your approximate monthly budget for rent?";
            intent = 'greeting';
            break;

        case 'GREETING':
            // Try to extract budget
            const budgetMatch = lower.match(/(?:r|zar)?\s*(\d{1,3}(?:[,\s]?\d{3})*)/i);
            if (budgetMatch) {
                const amount = parseInt(budgetMatch[1].replace(/[,\s]/g, ''));
                if (amount >= 1000 && amount <= 100000) {
                    extractedData.budget = `R${amount.toLocaleString()}`;
                    response = "Great! And which area or suburb are you looking to live in?";
                    intent = 'budget';
                } else {
                    response = "Could you tell me your monthly rent budget? For example, 'R5000' or 'around R8000'.";
                    intent = 'budget';
                }
            } else {
                response = "I didn't quite catch your budget. How much are you looking to spend on rent per month?";
                intent = 'unknown';
            }
            break;

        case 'QUALIFICATION':
            // Simplified qualification responses
            response = "Thanks for that information! We're building your rental profile. Would you like to:\n\n1️⃣ View available properties\n2️⃣ Schedule a viewing\n3️⃣ Start an application\n\nReply with 1, 2, or 3.";
            intent = 'qualification';
            break;

        case 'ACTION':
            if (/1|view|properties|list/i.test(lower)) {
                response = "Check our available properties at:\nhttps://rentify-yruw.onrender.com/our-properties.html\n\nReply 'viewing' to schedule a visit!";
                intent = 'view_properties';
            } else if (/2|viewing|visit|see/i.test(lower)) {
                response = "To schedule a viewing, please visit:\nhttps://rentify-yruw.onrender.com/contact.html\n\nOr reply 'call' and we'll call you.";
                intent = 'schedule_viewing';
            } else if (/3|apply|application/i.test(lower)) {
                response = "Start your application here:\nhttps://rentify-yruw.onrender.com/application.html\n\nThis takes about 5 minutes.";
                intent = 'apply';
            } else {
                response = "Please reply with:\n1️⃣ View properties\n2️⃣ Schedule a viewing\n3️⃣ Start application";
                intent = 'unknown';
            }
            break;

        default:
            response = "Thanks for reaching out! How can I help you with your rental search today?";
            intent = 'greeting';
    }

    return {
        response,
        confidence: 0.7,
        intent,
        extractedData,
        shouldHandoff: false,
        handoffReason: null
    };
}

/**
 * Sanitize extracted data
 * @param {Object} data - Extracted data
 * @returns {Object} Sanitized data
 */
function sanitizeExtractedData(data) {
    const sanitized = {};

    if (data.budget) {
        // Normalize budget format
        const amount = parseInt(String(data.budget).replace(/[^\d]/g, ''));
        if (amount >= 1000 && amount <= 100000) {
            sanitized.budget = `R${amount.toLocaleString()}`;
        }
    }

    if (data.location && typeof data.location === 'string') {
        sanitized.location = data.location.trim().substring(0, 100);
    }

    if (data.moveInDate && typeof data.moveInDate === 'string') {
        sanitized.moveInDate = data.moveInDate.trim().substring(0, 50);
    }

    return sanitized;
}

/**
 * Score confidence for a response
 * @param {string} response - Generated response
 * @param {string} intent - Detected intent
 * @param {Object} context - Conversation context
 * @returns {number} Confidence score 0-1
 */
function scoreConfidence(response, intent, context) {
    let score = 0.8; // Base score

    // Increase for clear intents
    if (['greeting', 'budget', 'location', 'move_in', 'handoff'].includes(intent)) {
        score += 0.1;
    }

    // Decrease for unknown intent
    if (intent === 'unknown') {
        score -= 0.2;
    }

    // Increase if we extracted data
    if (context.extractedData && Object.keys(context.extractedData).length > 0) {
        score += 0.1;
    }

    return Math.min(Math.max(score, 0), 1);
}

module.exports = {
    generateResponse,
    isConfigured,
    containsForbiddenTopic,
    generateFallbackResponse,
    scoreConfidence,
    SAFETY_RULES,
    FORBIDDEN_TOPICS
};
