/**
 * User Model
 * Represents system users (primarily admins for now)
 */

class User {
  constructor(data) {
    this.id = data.id;
    this.username = data.username;
    this.email = data.email;
    this.password = data.password; // Will be hashed in service layer
    this.role = data.role || 'admin';
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.lastLoginAt = data.lastLoginAt;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Business logic methods
  isActiveUser() {
    return this.isActive;
  }

  deactivate() {
    this.isActive = false;
    this.updatedAt = new Date();
  }

  activate() {
    this.isActive = true;
    this.updatedAt = new Date();
  }

  updateLastLogin() {
    this.lastLoginAt = new Date();
    this.updatedAt = new Date();
  }

  // Role checking
  isAdmin() {
    return this.role === 'admin';
  }

  hasPermission(permission) {
    // Simple role-based permission system
    if (this.role === 'admin') {
      return true; // Admins have all permissions
    }
    return false;
  }

  // Data validation
  validate() {
    const errors = [];

    if (!this.username || this.username.trim().length === 0) {
      errors.push('Username is required');
    }

    if (!this.email || this.email.trim().length === 0) {
      errors.push('Email is required');
    } else if (!this.isValidEmail(this.email)) {
      errors.push('Valid email is required');
    }

    if (!this.password || this.password.length < 6) {
      errors.push('Password must be at least 6 characters');
    }

    if (!['admin'].includes(this.role)) {
      errors.push('Invalid role');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Email validation helper
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Convert to plain object (excluding sensitive data)
  toJSON() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      role: this.role,
      isActive: this.isActive,
      lastLoginAt: this.lastLoginAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Convert to plain object for authentication (excluding password)
  toAuthJSON() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      role: this.role,
      isActive: this.isActive
    };
  }

  // Create from database/data source
  static fromData(data) {
    return new User({
      ...data,
      lastLoginAt: data.lastLoginAt ? new Date(data.lastLoginAt) : null,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date()
    });
  }

  // Create guest user (for non-authenticated users)
  static createGuest() {
    return new User({
      id: 'guest',
      username: 'Guest',
      email: 'guest@example.com',
      role: 'guest',
      isActive: true
    });
  }
}

module.exports = User;