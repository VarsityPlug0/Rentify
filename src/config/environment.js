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

  // Email Configuration
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },

  // Application Settings
  app: {
    url: process.env.APP_URL || 'http://localhost:3000'
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