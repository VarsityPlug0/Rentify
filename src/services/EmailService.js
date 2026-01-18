/**
 * EmailService.js
 * Handles sending transactional emails using Nodemailer and SMTP
 */

const nodemailer = require('nodemailer');
const env = require('../config/environment');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.brandColor = '#0071c2'; // Matches --primary-blue
    this.brandName = 'Rentify';
    this.contactEmail = env.email.user || 'support@rentify.com';
    this.appUrl = env.app.url;

    this.init();
  }

  /**
   * Initialize the Nodemailer transporter
   */
  init() {
    if (env.email.user && env.email.pass) {
      this.transporter = nodemailer.createTransport({
        host: env.email.host,
        port: env.email.port,
        secure: env.email.port === 465, // true for 465, false for other ports
        auth: {
          user: env.email.user,
          pass: env.email.pass
        }
      });
      this.isConfigured = true;
      console.log(`📧 EmailService: SMTP Transporter initialized (${env.email.host}:${env.email.port})`);
    } else {
      console.warn('⚠️ EmailService: EMAIL_USER or EMAIL_PASS missing in configuration. Emails will not be sent.');
    }
  }

  /**
   * Wrapper to send email with error handling
   * @param {Object} options - { to, subject, html }
   */
  async sendMail(options) {
    if (!this.isConfigured) {
      console.log('🚫 EmailService: Skipped sending (not configured)', options.subject);
      return false;
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"${this.brandName}" <${env.email.user}>`,
        ...options
      });
      console.log('✅ Email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ EmailService Error:', error);
      return false;
    }
  }

  /**
   * Generate common HTML layout for emails
   * @param {string} content - Body content of the email
   * @returns {string} - Full HTML string
   */
  getLayout(content, title) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 20px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          .header { background-color: ${this.brandColor}; padding: 30px 20px; text-align: center; color: #fff; }
          .header h1 { margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px; }
          .content { padding: 40px 30px; }
          .footer { background-color: #f9f9f9; padding: 20px; text-align: center; font-size: 13px; color: #999; border-top: 1px solid #eee; }
          .button { display: inline-block; padding: 14px 28px; background-color: ${this.brandColor}; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 25px; text-align: center; }
          .info-table { width: 100%; border-collapse: separate; border-spacing: 0 8px; margin: 20px 0; }
          .info-table td { padding: 8px 0; vertical-align: top; }
          .label { font-weight: 600; color: #666; width: 140px; }
          .value { font-weight: 500; color: #333; }
          .status { display: inline-block; padding: 6px 14px; border-radius: 20px; font-size: 14px; font-weight: bold; }
          .status-approved { background: #d1fae5; color: #065f46; }
          .status-rejected { background: #fee2e2; color: #991b1b; }
          .status-pending { background: #fef3c7; color: #92400e; }
          .property-card { background: #f8fbff; border: 1px solid #e5e7eb; border-left: 4px solid ${this.brandColor}; padding: 15px; border-radius: 4px; margin: 20px 0; }
          .property-title { font-weight: bold; color: ${this.brandColor}; font-size: 16px; margin-bottom: 4px; display: block; }
          .property-location { color: #666; font-size: 14px; }
          .ref-number { font-family: monospace; background: #eee; padding: 2px 6px; border-radius: 4px; font-size: 13px; color: #555; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${this.brandName}</h1>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${this.brandName}. All rights reserved.</p>
            <p>123 Real Estate St, Sandton, South Africa</p>
            <p><a href="mailto:${this.contactEmail}" style="color: ${this.brandColor}; text-decoration: none;">Contact Support</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Helper to format currency
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
  }

  /**
   * Generate Reference Number
   */
  generateRef(appId) {
    return `APP-${new Date().getFullYear()}-${String(appId).padStart(4, '0')}`;
  }

  /**
   * Send notification to Owner when a new application is received
   */
  async sendOwnerNotification(application, property) {
    const refNumber = application.id ? this.generateRef(application.id) : 'PENDING';
    const subject = `New Application: ${application.applicantName} for ${property.title}`;

    const content = `
      <h2>New Rental Application Received</h2>
      <p>A new application has been submitted and is waiting for your review.</p>
      
      <div class="property-card">
        <span class="property-title">${property.title}</span>
        <span class="property-location">${property.location}</span>
        <div style="margin-top: 5px; font-size: 13px; color: #777;">
            ${property.bedrooms} Bed &bull; ${property.bathrooms} Bath &bull; ${this.formatCurrency(property.price)} / month
        </div>
      </div>
      
      <h3>Applicant Details</h3>
      <table class="info-table">
        <tr><td class="label">Reference:</td><td class="value"><span class="ref-number">${refNumber}</span></td></tr>
        <tr><td class="label">Name:</td><td class="value">${application.applicantName}</td></tr>
        <tr><td class="label">Email:</td><td class="value"><a href="mailto:${application.applicantEmail}">${application.applicantEmail}</a></td></tr>
        <tr><td class="label">Phone:</td><td class="value">${application.applicantPhone}</td></tr>
        <tr><td class="label">Monthly Income:</td><td class="value">${this.formatCurrency(application.applicantIncome)}</td></tr>
        <tr><td class="label">Submitted:</td><td class="value">${new Date().toLocaleString()}</td></tr>
      </table>

      <p><strong>Documents Attached:</strong> ${application.documents ? application.documents.length : 0} files</p>
      
      <p style="text-align: center;">
        <a href="${this.appUrl}/admin" class="button">Log in to Review Application</a>
      </p>
    `;

    return this.sendMail({
      to: env.email.user,
      subject,
      html: this.getLayout(content, subject)
    });
  }

  /**
   * Send confirmation to Applicant when they submit
   */
  async sendApplicantConfirmation(application, property) {
    const refNumber = application.id ? this.generateRef(application.id) : 'PENDING';
    const subject = `Application Received: ${property.title} - ${this.brandName}`;

    const content = `
      <h2>We received your application!</h2>
      <p>Dear ${application.applicantName},</p>
      <p>Thank you for choosing ${this.brandName}. We have successfully received your rental application for:</p>
      
      <div class="property-card">
        <span class="property-title">${property.title}</span>
        <span class="property-location">${property.location}</span>
      </div>
      
      <p>Your application reference number is: <span class="ref-number">${refNumber}</span></p>

      <h3>What happens next?</h3>
      <p>Our leasing team reviews applications in the order they are received.</p>
      <ul>
        <li><strong>Review Process:</strong> 24-48 hours</li>
        <li><strong>Verification:</strong> We will verify your income and documents.</li>
        <li><strong>Decision:</strong> You will receive an email update as soon as a decision is made.</li>
      </ul>
      
      <p>If you have any urgent questions, please reply to this email.</p>
    `;

    return this.sendMail({
      to: application.applicantEmail,
      subject,
      html: this.getLayout(content, subject)
    });
  }

  /**
   * Send status update to Applicant (Approved/Rejected)
   */
  async sendStatusUpdate(application, status, adminNotes, property) {
    const capsStatus = status.charAt(0).toUpperCase() + status.slice(1);
    const refNumber = this.generateRef(application.id);
    const subject = `Update on your Application: ${property.title} - ${this.brandName}`;

    let statusMessage = '';
    let statusClass = `status-${status.toLowerCase()}`;

    // Custom messages based on status
    if (status === 'approved') {
      statusMessage = `
        <p>Congratulations! We are pleased to inform you that your application has been <strong>APPROVED</strong> by the property owner.</p>
        <p>We are excited to welcome you to your new home!</p>
        
        <h3>Next Steps:</h3>
        <ol>
            <li>We will send a lease agreement to your email within 24 hours.</li>
            <li>Please review and sign the agreement digitally.</li>
            <li>The deposit will be due upon signing to secure the property.</li>
        </ol>
      `;
    } else if (status === 'rejected') {
      statusMessage = `
        <p>Thank you for your interest in <strong>${property.title}</strong>.</p>
        <p>After careful review of your application (Ref: ${refNumber}), we regret to inform you that we are unable to proceed with your tenancy at this time.</p>
        <p>We wish you the best in your search for a new home.</p>
      `;
    } else {
      statusMessage = `<p>Your application status has been updated to <strong>${capsStatus}</strong>.</p>`;
    }

    const content = `
      <h2>Application Status Update</h2>
      <p>Dear ${application.applicantName},</p>
      
      <div class="property-card">
        <span class="property-title">${property.title}</span>
        <span class="property-location">${property.location}</span>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <div style="margin-bottom: 10px; color: #666; font-size: 14px;">Current Status</div>
        <span class="status ${statusClass}">${capsStatus}</span>
      </div>

      ${statusMessage}

      ${adminNotes ? `<div style="background: #fff3cd; padding: 15px; border-radius: 4px; margin-top: 20px; border-left: 4px solid #ffc107;"><strong>Note from Agent:</strong><br>${adminNotes}</div>` : ''}
    `;

    return this.sendMail({
      to: application.applicantEmail,
      subject,
      html: this.getLayout(content, subject)
    });
  }
}

module.exports = new EmailService();
