/**
 * Authentication Middleware
 * Handles user authentication and authorization
 */

const User = require('../models/User');
const env = require('../config/environment');

class AuthMiddleware {
  // Session-based authentication
  static requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
      next();
    } else {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
  }

  // Admin-only authorization
  static requireAdmin(req, res, next) {
    if (req.session && req.session.isAdmin) {
      next();
    } else {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
  }

  // Get current user from session
  static getCurrentUser(req) {
    if (req.session && req.session.userId) {
      // In a real app, you'd fetch user from database
      // For now, return mock admin user
      if (req.session.isAdmin) {
        return new User({
          id: req.session.userId,
          username: env.admin.username,
          email: 'admin@rentalplatform.com',
          role: 'admin',
          isActive: true
        });
      }
    }
    return User.createGuest();
  }

  // Simple in-memory rate limiter
  static loginAttempts = new Map();

  // Login handler
  static async login(req, res) {
    try {
      const { username, password } = req.body;
      const ip = req.ip;

      // Rate Limiting Check
      const now = Date.now();
      const attempts = AuthMiddleware.loginAttempts.get(ip) || { count: 0, firstAttempt: now };

      if (attempts.count >= 5 && (now - attempts.firstAttempt) < 15 * 60 * 1000) {
        return res.status(429).json({
          success: false,
          message: 'Too many login attempts. Please try again in 15 minutes.'
        });
      }

      // Reset window if time passed
      if ((now - attempts.firstAttempt) > 15 * 60 * 1000) {
        attempts.count = 0;
        attempts.firstAttempt = now;
      }

      // Validate input
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username and password are required'
        });
      }

      // Secure Password Check (Bcrypt)
      // Hash: $2a$10$Kv35ACoP2jiaoJqSsJYvYR9SYbK9/3ly (password123)
      const ADMIN_HASH = '$2a$10$Kv35ACoP2jiaoJqSsJYvYR9SYbK9/3ly';

      const bcrypt = require('bcryptjs');
      const isMatch = await bcrypt.compare(password, ADMIN_HASH);

      if (username === env.admin.username && isMatch) {
        // Success - Clear rate limit
        AuthMiddleware.loginAttempts.delete(ip);

        // Create session
        req.session.userId = 1;
        req.session.isAdmin = true;

        // Update last login (mock)
        const user = new User({
          id: 1,
          username: env.admin.username,
          email: 'admin@rentalplatform.com',
          role: 'admin',
          isActive: true
        });
        user.updateLastLogin();

        return res.json({
          success: true,
          message: 'Login successful',
          user: user.toAuthJSON()
        });
      } else {
        // Failed attempt - Increment counter
        attempts.count++;
        AuthMiddleware.loginAttempts.set(ip, attempts);

        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed'
      });
    }
  }

  // Logout handler
  static logout(req, res) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Logout failed'
        });
      }

      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    });
  }

  // Get auth status
  static getStatus(req, res) {
    const user = AuthMiddleware.getCurrentUser(req);

    res.json({
      success: true,
      isAuthenticated: user.id !== 'guest',
      user: user.toAuthJSON()
    });
  }
}

module.exports = AuthMiddleware;