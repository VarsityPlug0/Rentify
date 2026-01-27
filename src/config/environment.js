/**
 * Environment Configuration
 * Centralized configuration management for different environments
 */

require('dotenv').config();

const config = {
  // Server Configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database Configuration (prepared for future integration)
  // Database Configuration
  database: {
    url: process.env.DATABASE_URL
  },

  // Session Configuration
  session: {
    secret: process.env.SESSION_SECRET || 'your-secret-key-here-change-in-production',
    cookieMaxAge: 24 * 60 * 60 * 1000 // 24 hours
  },

  // Admin Credentials
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'password123'
  },

  // Security Settings
  security: {
    jwtSecret: process.env.JWT_SECRET || 'jwt-secret-key-change-in-production',
    saltRounds: parseInt(process.env.SALT_ROUNDS) || 12
  },

  // API Settings
  api: {
    basePath: '/api',
    version: 'v1'
  },

  // Base URL for email links
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',

  // Email Configuration (Resend)
  email: {
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.EMAIL_FROM || 'Rentify <onboarding@resend.dev>',
    ownerEmail: process.env.OWNER_EMAIL
  },

  // Twilio Configuration (SMS, WhatsApp, Voice)
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER
  },

  // AI Configuration (LLM, STT, TTS)
  ai: {
    llmApiKey: process.env.LLM_API_KEY,
    llmModel: process.env.LLM_MODEL || 'gpt-4o-mini',
    sttApiKey: process.env.STT_API_KEY,
    ttsApiKey: process.env.TTS_API_KEY,
    confidenceThreshold: parseFloat(process.env.AI_CONFIDENCE_THRESHOLD) || 0.7
  }
};

// Environment-specific configurations
const environments = {
  development: {
    debug: true,
    logging: true
  },
  production: {
    debug: false,
    logging: true
  },
  test: {
    debug: true,
    logging: false
  }
};

module.exports = {
  ...config,
  ...environments[config.nodeEnv],
  isDevelopment: config.nodeEnv === 'development',
  isProduction: config.nodeEnv === 'production',
  isTest: config.nodeEnv === 'test'
};