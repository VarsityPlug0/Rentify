/**
 * Inquiry Model
 * Represents contact form submissions and general inquiries
 */

class Inquiry {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.phone = data.phone;
    this.subject = data.subject || 'General Inquiry';
    this.message = data.message;
    this.propertyId = data.propertyId; // Optional - if inquiry is about specific property
    this.status = data.status || 'pending'; // pending, responded, closed
    this.source = data.source || 'website'; // website, phone, email, etc.
    this.response = data.response; // Admin response
    this.respondedAt = data.respondedAt;
    this.respondedBy = data.respondedBy; // Admin user ID
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Status management
  setStatus(newStatus, userId = null) {
    const validStatuses = ['pending', 'responded', 'closed'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }

    this.status = newStatus;
    this.updatedAt = new Date();

    if (newStatus === 'responded') {
      this.respondedAt = new Date();
      this.respondedBy = userId;
    }
  }

  isPending() {
    return this.status === 'pending';
  }

  isResponded() {
    return this.status === 'responded';
  }

  isClosed() {
    return this.status === 'closed';
  }

  // Response management
  addResponse(responseText, userId) {
    this.response = responseText;
    this.setStatus('responded', userId);
  }

  close(userId) {
    this.setStatus('closed', userId);
  }

  // Data validation
  validate() {
    const errors = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push('Name is required');
    }

    if (!this.email || this.email.trim().length === 0) {
      errors.push('Email is required');
    } else if (!this.isValidEmail(this.email)) {
      errors.push('Valid email is required');
    }

    if (!this.message || this.message.trim().length === 0) {
      errors.push('Message is required');
    }

    if (this.propertyId && typeof this.propertyId !== 'number') {
      errors.push('Invalid property ID');
    }

    const validStatuses = ['pending', 'responded', 'closed'];
    if (!validStatuses.includes(this.status)) {
      errors.push('Invalid status');
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

  // Convert to plain object for API responses
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      phone: this.phone,
      subject: this.subject,
      message: this.message,
      propertyId: this.propertyId,
      status: this.status,
      source: this.source,
      response: this.response,
      respondedAt: this.respondedAt,
      respondedBy: this.respondedBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Create minimal response object (for public API)
  toPublicJSON() {
    return {
      id: this.id,
      subject: this.subject,
      status: this.status,
      createdAt: this.createdAt
    };
  }

  // Create from database/data source
  static fromData(data) {
    return new Inquiry({
      ...data,
      respondedAt: data.respondedAt ? new Date(data.respondedAt) : null,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date()
    });
  }

  // Create from contact form submission
  static fromContactForm(data) {
    return new Inquiry({
      name: data.name,
      email: data.email,
      phone: data.phone,
      subject: data.subject || 'Contact Form Submission',
      message: data.message,
      source: 'contact_form',
      status: 'pending'
    });
  }
}

module.exports = Inquiry;