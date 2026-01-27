/**
 * Main Application Entry Point
 * Bootstraps the Express application with modular architecture
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const path = require('path');
const dotenv = require('dotenv');

// Load environment configuration
dotenv.config();
const env = require('./config/environment');

// Import middleware
const ErrorHandler = require('./middleware/ErrorHandler');
const AuthMiddleware = require('./middleware/AuthMiddleware');

// Import routes
const propertyRoutes = require('./routes/propertyRoutes');

// Initialize Express app
const app = express();

// Trust proxy (Required for Render/Heroku SSL)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https://*"],
      connectSrc: ["'self'"]
    }
  }
}));

// CORS configuration
app.use(cors({
  origin: true, // Allow all origins for development
  credentials: true
}));

// Session Store Configuration
const pg = require('pg');
const pgSession = require('connect-pg-simple')(session);

// Production/Render Database Check
if (env.isProduction && !env.database.url) {
  console.error('❌ CRITICAL ERROR: DATABASE_URL is missing in production environment.');
  console.error('   Please add DATABASE_URL to your Render environment variables.');
  process.exit(1);
}

const sessionConfig = {
  secret: env.session.secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: env.isProduction, // true on Render
    httpOnly: true,
    sameSite: env.isProduction ? 'lax' : 'lax', // 'lax' is generally safe for nav, 'none' needs secure:true
    maxAge: env.session.cookieMaxAge
  }
};

// Configure Session Store only if DATABASE_URL is present
if (env.database.url) {
  console.log('🔌 Configuring persistent session store with PostgreSQL...');
  sessionConfig.store = new pgSession({
    pool: new pg.Pool({
      connectionString: env.database.url,
      // Handle SSL for production (Render)
      ssl: env.isProduction ? { rejectUnauthorized: false } : false
    }),
    createTableIfMissing: true
  });
} else {
  console.warn('⚠️ No DATABASE_URL found. Using MemoryStore (Development Only). Sessions will not persist across restarts.');
  // No store defined means it defaults to MemoryStore
}

// Session middleware
app.use(session(sessionConfig));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware (development only)
if (env.logging) {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// API Routes
app.use(`${env.api.basePath}/webhook`, require('./routes/webhookRoutes'));
app.use(`${env.api.basePath}/analytics`, require('./routes/analyticsRoutes'));
app.use(`${env.api.basePath}/properties`, propertyRoutes);
app.use(`${env.api.basePath}/application`, require('./routes/applicationRoutes'));
app.use(`${env.api.basePath}/message`, require('./routes/messageRoutes'));
app.use(`${env.api.basePath}/upload`, require('./routes/uploadRoutes'));

// Authentication routes
app.post(`${env.api.basePath}/auth/login`, AuthMiddleware.login);
app.post(`${env.api.basePath}/auth/logout`, AuthMiddleware.logout);
app.get(`${env.api.basePath}/auth/status`, AuthMiddleware.getStatus);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Serve IMAGES directory
app.use('/IMAGES', express.static(path.join(__dirname, '../IMAGES')));

// Serve static files from parent directory
app.use(express.static(path.join(__dirname, '..')));

// Handle extension-less HTML requests (for cleaner URLs)
app.get('/:page', (req, res, next) => {
  const page = req.params.page;
  // Only handle requests that look like page names (no dots)
  if (!page.includes('.')) {
    const filePath = path.join(__dirname, '..', page + '.html');
    require('fs').access(filePath, require('fs').constants.F_OK, (err) => {
      if (!err) {
        return res.sendFile(filePath);
      }
      next(); // Continue to next middleware if file doesn't exist
    });
  } else {
    next(); // Continue to next middleware for files with extensions
  }
});

// Fallback to index.html for SPA routing
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json(ErrorHandler.handleNotFound('Endpoint'));
});

// Global error handler
app.use(ErrorHandler.expressErrorHandler);

// Start server
const server = app.listen(env.port, () => {
  console.log(`🚀 Server running on http://localhost:${env.port}`);
  console.log(`📦 API endpoints available at http://localhost:${env.port}${env.api.basePath}`);
  console.log(`🏥 Health check: http://localhost:${env.port}/health`);
  console.log(`🔐 Admin demo credentials: ${env.admin.username}/${env.admin.password}`);
  console.log(`🔧 Environment: ${env.nodeEnv}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

module.exports = app;