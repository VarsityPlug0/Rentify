/**
 * Application Model
 * Represents rental applications submitted by potential tenants
 */

class Application {
  constructor(data) {
    this.id = data.id;
    this.propertyId = data.propertyId;
    this.applicantName = data.applicantName;
    this.applicantEmail = data.applicantEmail;
    this.applicantPhone = data.applicantPhone;
    this.moveInDate = data.moveInDate ? new Date(data.moveInDate) : null;
    this.income = data.income;
    this.employmentStatus = data.employmentStatus;
    this.pets = data.pets || false;
    this.numberOfPets = data.numberOfPets || 0;
    this.petTypes = data.petTypes || [];
    this.message = data.message;
    this.status = data.status || 'pending'; // pending, approved, rejected, withdrawn
    this.adminNotes = data.adminNotes;
    this.processedAt = data.processedAt;
    this.processedBy = data.processedBy; // Admin user ID
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Status management
  setStatus(newStatus, userId = null, notes = null) {
    const validStatuses = ['pending', 'approved', 'rejected', 'withdrawn'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }

    this.status = newStatus;
    this.updatedAt = new Date();

    if (newStatus !== 'pending') {
      this.processedAt = new Date();
      this.processedBy = userId;
    }

    if (notes) {
      this.adminNotes = notes;
    }
  }

  isPending() {
    return this.status === 'pending';
  }

  isApproved() {
    return this.status === 'approved';
  }

  isRejected() {
    return this.status === 'rejected';
  }

  isWithdrawn() {
    return this.status === 'withdrawn';
  }

  // Processing methods
  approve(userId, notes = null) {
    this.setStatus('approved', userId, notes);
  }

  reject(userId, notes = null) {
    this.setStatus('rejected', userId, notes);
  }

  withdraw() {
    this.setStatus('withdrawn');
  }

  // Data validation
  validate() {
    const errors = [];

    if (!this.propertyId) {
      errors.push('Property ID is required');
    }

    if (!this.applicantName || this.applicantName.trim().length === 0) {
      errors.push('Applicant name is required');
    }

    if (!this.applicantEmail || this.applicantEmail.trim().length === 0) {
      errors.push('Applicant email is required');
    } else if (!this.isValidEmail(this.applicantEmail)) {
      errors.push('Valid email is required');
    }

    if (!this.applicantPhone || this.applicantPhone.trim().length === 0) {
      errors.push('Applicant phone is required');
    }

    if (!this.moveInDate) {
      errors.push('Move-in date is required');
    } else if (new Date(this.moveInDate) < new Date()) {
      errors.push('Move-in date must be in the future');
    }

    if (!this.income || this.income <= 0) {
      errors.push('Valid income amount is required');
    }

    const validEmploymentStatuses = ['employed', 'self-employed', 'unemployed', 'student', 'retired'];
    if (!this.employmentStatus || !validEmploymentStatuses.includes(this.employmentStatus)) {
      errors.push('Valid employment status is required');
    }

    const validStatuses = ['pending', 'approved', 'rejected', 'withdrawn'];
    if (!validStatuses.includes(this.status)) {
      errors.push('Invalid status');
    }

    if (this.pets && this.numberOfPets <= 0) {
      errors.push('Number of pets must be greater than 0 if pets are indicated');
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

  // Income verification (basic ratio check)
  meetsIncomeRequirement(rentAmount) {
    // Standard rule: income should be at least 3x the monthly rent
    return this.income >= (rentAmount * 3);
  }

  // Convert to plain object for API responses
  toJSON() {
    return {
      id: this.id,
      propertyId: this.propertyId,
      applicantName: this.applicantName,
      applicantEmail: this.applicantEmail,
      applicantPhone: this.applicantPhone,
      moveInDate: this.moveInDate,
      income: this.income,
      employmentStatus: this.employmentStatus,
      pets: this.pets,
      numberOfPets: this.numberOfPets,
      petTypes: this.petTypes,
      message: this.message,
      status: this.status,
      adminNotes: this.adminNotes,
      processedAt: this.processedAt,
      processedBy: this.processedBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Create minimal response object (for public API)
  toPublicJSON() {
    return {
      id: this.id,
      propertyId: this.propertyId,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Create from database/data source
  static fromData(data) {
    return new Application({
      ...data,
      moveInDate: data.moveInDate ? new Date(data.moveInDate) : null,
      processedAt: data.processedAt ? new Date(data.processedAt) : null,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date()
    });
  }

  // Create from application form submission
  static fromApplicationForm(data) {
    return new Application({
      propertyId: data.propertyId,
      applicantName: data.name,
      applicantEmail: data.email,
      applicantPhone: data.phone,
      moveInDate: data.moveInDate,
      income: data.income,
      employmentStatus: data.employmentStatus,
      pets: data.pets || false,
      numberOfPets: data.numberOfPets || 0,
      petTypes: data.petTypes || [],
      message: data.message,
      status: 'pending'
    });
  }
}

module.exports = Application;