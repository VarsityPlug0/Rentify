/**
 * Email Service
 * Transactional email sending via Resend API
 * All methods are non-blocking and never throw
 */

const { Resend } = require('resend');
const env = require('../config/environment');
const EmailLogService = require('./EmailLogService');

// Initialize email log service
const emailLogService = new EmailLogService();

// Base URL for dashboard links (set via env or default)
const getBaseUrl = () => env.baseUrl || 'http://localhost:3000';

// Initialize Resend client (lazy - only if API key exists)
let resend = null;
const getClient = () => {
  if (!resend && env.email?.apiKey) {
    resend = new Resend(env.email.apiKey);
  }
  return resend;
};

// ============================================
// EMAIL TEMPLATE STYLES
// ============================================
const STYLES = {
  primaryColor: '#4F46E5',
  secondaryColor: '#F8F8F8',
  textColor: '#1F2937',
  mutedColor: '#6B7280',
  successColor: '#10B981',
  warningColor: '#F59E0B',
  dangerColor: '#EF4444',
  fontFamily: "Arial, 'Helvetica Neue', Helvetica, sans-serif"
};

/**
 * Generate email wrapper with header and footer
 * @param {string} content - Main email content HTML
 * @param {string} preheader - Hidden preview text
 * @returns {string} Complete HTML email
 */
function wrapEmail(content, preheader = '') {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Rentify</title>
  <!--[if mso]>
  <style type="text/css">
    table {border-collapse: collapse;}
    td {padding: 0;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: ${STYLES.secondaryColor}; font-family: ${STYLES.fontFamily}; -webkit-font-smoothing: antialiased;">
  
  <!-- Preheader (hidden preview text) -->
  <div style="display: none; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: ${STYLES.secondaryColor};">
    ${preheader}
  </div>
  
  <!-- Email Container -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${STYLES.secondaryColor};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- Content Wrapper (max 600px) -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: ${STYLES.primaryColor}; padding: 12px 24px; border-radius: 8px;">
                    <span style="font-size: 24px; font-weight: bold; color: #FFFFFF; letter-spacing: -0.5px;">Rentify</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Main Content Card -->
          <tr>
            <td style="background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 40px 32px;">
                    ${content}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 30px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center; color: ${STYLES.mutedColor}; font-size: 13px; line-height: 20px;">
                    <p style="margin: 0 0 8px 0;">Rentify - Your Property Rental Platform</p>
                    <p style="margin: 0;">Questions? Reply to this email or contact support.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Generate styled button
 * @param {string} text - Button text
 * @param {string} href - Button link (optional)
 * @param {string} color - Background color
 * @returns {string} Button HTML
 */
function styledButton(text, href = '#', color = STYLES.primaryColor) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
      <tr>
        <td style="background-color: ${color}; border-radius: 8px; text-align: center;">
          <a href="${href}" style="display: inline-block; padding: 14px 28px; color: #FFFFFF; font-size: 16px; font-weight: 600; text-decoration: none; font-family: ${STYLES.fontFamily};">${text}</a>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Generate info card section
 * @param {string} title - Section title
 * @param {Object} items - Key-value pairs to display
 * @param {string} bgColor - Background color
 * @returns {string} Card HTML
 */
function infoCard(title, items, bgColor = '#F9FAFB') {
  const rows = Object.entries(items)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `
      <tr>
        <td style="padding: 8px 0; color: ${STYLES.mutedColor}; font-size: 14px; width: 140px; vertical-align: top;">${key}</td>
        <td style="padding: 8px 0; color: ${STYLES.textColor}; font-size: 14px; font-weight: 500;">${value}</td>
      </tr>
    `).join('');

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${bgColor}; border-radius: 8px; margin: 20px 0;">
      <tr>
        <td style="padding: 20px;">
          <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: ${STYLES.textColor};">${title}</h3>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${rows}
          </table>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Generate status badge
 * @param {string} status - Status text
 * @param {string} color - Badge color
 * @returns {string} Badge HTML
 */
function statusBadge(status, color) {
  return `<span style="display: inline-block; padding: 6px 14px; background-color: ${color}; color: #FFFFFF; font-size: 13px; font-weight: 600; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">${status}</span>`;
}

// ============================================
// CORE EMAIL FUNCTIONS
// ============================================

/**
 * Core email sending function
 * @param {Object} options - Email options
 * @param {string|string[]} options.to - Recipient email(s)
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body content
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
async function sendEmail({ to, subject, html }) {
  const client = getClient();

  if (!client) {
    console.warn('📧 Email skipped: RESEND_API_KEY not configured');
    return { success: false, error: 'Email not configured' };
  }

  try {
    const { data, error } = await client.emails.send({
      from: env.email.from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html
    });

    if (error) {
      console.error('📧 Email send failed:', error.message);
      return { success: false, error: error.message };
    }

    console.log('📧 Email sent successfully:', data.id);
    return { success: true, data };
  } catch (err) {
    console.error('📧 Email send error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send notification to property owner about new application
 * @param {Object} application - Application data
 * @param {Object} property - Property data
 */
async function sendOwnerNotification(application, property) {
  const ownerEmail = env.email?.ownerEmail;
  if (!ownerEmail) {
    console.warn('📧 Owner notification skipped: OWNER_EMAIL not configured');
    return { success: false, error: 'Owner email not configured' };
  }

  const propertyTitle = property.title || `Property #${application.propertyId}`;
  const propertyLocation = property.location || 'N/A';

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: ${STYLES.textColor};">New Application Received</h1>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: ${STYLES.mutedColor};">A new rental application has been submitted.</p>
    
    ${infoCard('Property Details', {
    'Property': propertyTitle,
    'Location': propertyLocation
  })}
    
    ${infoCard('Applicant Information', {
    'Name': application.applicantName,
    'Email': application.applicantEmail,
    'Phone': application.applicantPhone,
    'Monthly Income': application.applicantIncome ? `R${application.applicantIncome.toLocaleString()}` : 'N/A',
    'Employment': application.applicantEmployment || 'N/A',
    'Occupants': application.applicantOccupants || 'N/A'
  })}
    
    ${application.applicantMessage ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FEF3C7; border-radius: 8px; margin: 20px 0;">
      <tr>
        <td style="padding: 20px;">
          <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: ${STYLES.textColor};">Message from Applicant</h3>
          <p style="margin: 0; font-size: 14px; color: ${STYLES.textColor}; line-height: 1.5;">${application.applicantMessage}</p>
        </td>
      </tr>
    </table>
    ` : ''}
    
    <p style="margin: 24px 0 0 0; font-size: 14px; color: ${STYLES.mutedColor};">Log in to the admin panel to review and respond to this application.</p>
  `;

  const result = await sendEmail({
    to: ownerEmail,
    subject: `📋 New Application: ${propertyTitle}`,
    html: wrapEmail(content, `New rental application from ${application.applicantName}`)
  });

  if (result.success) {
    console.log('📧 Owner notification sent successfully');
  } else {
    console.error('📧 Owner notification failed:', result.error);
  }

  return result;
}

/**
 * Send confirmation email to applicant
 * @param {Object} application - Application data
 * @param {Object} property - Property data
 */
async function sendApplicantConfirmation(application, property) {
  const propertyTitle = property.title || `Property #${application.propertyId}`;
  const propertyLocation = property.location || 'N/A';

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: ${STYLES.textColor};">Application Received!</h1>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: ${STYLES.mutedColor};">Thank you for your interest in renting with us.</p>
    
    <p style="margin: 0 0 24px 0; font-size: 16px; color: ${STYLES.textColor}; line-height: 1.6;">
      Hi <strong>${application.applicantName}</strong>,<br><br>
      We've received your rental application for <strong>${propertyTitle}</strong>. Our team will review your application and get back to you as soon as possible.
    </p>
    
    ${infoCard('Application Summary', {
    'Property': propertyTitle,
    'Location': propertyLocation,
    'Application ID': application.id ? `#${application.id}` : 'Pending',
    'Status': statusBadge('Pending Review', STYLES.warningColor)
  })}
    
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #EEF2FF; border-left: 4px solid ${STYLES.primaryColor}; border-radius: 0 8px 8px 0; margin: 24px 0;">
      <tr>
        <td style="padding: 16px 20px;">
          <p style="margin: 0; font-size: 14px; color: ${STYLES.textColor}; line-height: 1.5;">
            <strong>What happens next?</strong><br>
            You'll receive an email notification once a decision has been made regarding your application.
          </p>
        </td>
      </tr>
    </table>
    
    ${styledButton('View Your Application', `${getBaseUrl()}/application-detail.html?id=${application.id}&email=${encodeURIComponent(application.applicantEmail)}`)}
    
    <p style="margin: 24px 0 0 0; font-size: 16px; color: ${STYLES.textColor};">
      Best regards,<br>
      <strong style="color: ${STYLES.primaryColor};">The Rentify Team</strong>
    </p>
  `;

  const result = await sendEmail({
    to: application.applicantEmail,
    subject: `✅ Application Received: ${propertyTitle}`,
    html: wrapEmail(content, `Your application for ${propertyTitle} has been received`)
  });

  // Log the email
  await emailLogService.log({
    type: 'confirmation',
    applicationId: application.id,
    propertyId: application.propertyId,
    recipient: application.applicantEmail,
    subject: `✅ Application Received: ${propertyTitle}`,
    status: result.success ? 'sent' : 'failed',
    error: result.error,
    resendId: result.data?.id
  });

  if (result.success) {
    console.log('📧 Applicant confirmation sent successfully');
  } else {
    console.error('📧 Applicant confirmation failed:', result.error);
  }

  return result;
}

/**
 * Send status update email to applicant
 * @param {Object} application - Application data
 * @param {string} status - New status (approved, rejected, etc.)
 * @param {string} notes - Optional admin notes
 * @param {Object} property - Property data
 */
async function sendStatusUpdate(application, status, notes, property) {
  const propertyTitle = property.title || `Property #${application.propertyId}`;
  const propertyLocation = property.location || 'N/A';

  const statusConfig = {
    approved: {
      color: STYLES.successColor,
      emoji: '🎉',
      headline: 'Congratulations!',
      message: 'Your application has been approved.',
      bgColor: '#ECFDF5'
    },
    rejected: {
      color: STYLES.dangerColor,
      emoji: '📋',
      headline: 'Application Update',
      message: 'Unfortunately, your application was not approved at this time.',
      bgColor: '#FEF2F2'
    },
    pending: {
      color: STYLES.warningColor,
      emoji: '⏳',
      headline: 'Still Under Review',
      message: 'Your application is still being reviewed.',
      bgColor: '#FFFBEB'
    },
    withdrawn: {
      color: STYLES.mutedColor,
      emoji: '📝',
      headline: 'Application Withdrawn',
      message: 'Your application has been withdrawn.',
      bgColor: '#F9FAFB'
    }
  };

  const config = statusConfig[status] || statusConfig.pending;
  const statusCapitalized = status.charAt(0).toUpperCase() + status.slice(1);

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 48px;">${config.emoji}</span>
    </div>
    
    <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: ${STYLES.textColor}; text-align: center;">${config.headline}</h1>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: ${STYLES.mutedColor}; text-align: center;">${config.message}</p>
    
    <p style="margin: 0 0 24px 0; font-size: 16px; color: ${STYLES.textColor}; line-height: 1.6;">
      Hi <strong>${application.applicantName}</strong>,
    </p>
    
    ${infoCard('Application Details', {
    'Property': propertyTitle,
    'Location': propertyLocation,
    'Status': statusBadge(statusCapitalized, config.color)
  })}
    
    ${notes ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${config.bgColor}; border-radius: 8px; margin: 20px 0;">
      <tr>
        <td style="padding: 20px;">
          <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: ${STYLES.textColor};">Additional Notes</h3>
          <p style="margin: 0; font-size: 14px; color: ${STYLES.textColor}; line-height: 1.5;">${notes}</p>
        </td>
      </tr>
    </table>
    ` : ''}
    
    ${status === 'approved' ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #ECFDF5; border-left: 4px solid ${STYLES.successColor}; border-radius: 0 8px 8px 0; margin: 24px 0;">
      <tr>
        <td style="padding: 16px 20px;">
          <p style="margin: 0; font-size: 14px; color: ${STYLES.textColor}; line-height: 1.5;">
            <strong>Next Steps</strong><br>
            We'll be in touch shortly with details about the lease agreement and move-in process.
          </p>
        </td>
      </tr>
    </table>
    ` : ''}
    
    ${styledButton('View Application Details', `${getBaseUrl()}/application-detail.html?id=${application.id}&email=${encodeURIComponent(application.applicantEmail)}`)}
    
    <p style="margin: 24px 0 0 0; font-size: 16px; color: ${STYLES.textColor};">
      Best regards,<br>
      <strong style="color: ${STYLES.primaryColor};">The Rentify Team</strong>
    </p>
  `;

  const result = await sendEmail({
    to: application.applicantEmail,
    subject: `${config.emoji} Application ${statusCapitalized}: ${propertyTitle}`,
    html: wrapEmail(content, `Your application for ${propertyTitle} has been ${status}`)
  });

  // Log the email
  await emailLogService.log({
    type: 'status_update',
    applicationId: application.id,
    propertyId: application.propertyId,
    recipient: application.applicantEmail,
    subject: `${config.emoji} Application ${statusCapitalized}: ${propertyTitle}`,
    status: result.success ? 'sent' : 'failed',
    error: result.error,
    resendId: result.data?.id
  });

  if (result.success) {
    console.log(`📧 Status update (${status}) sent successfully`);
  } else {
    console.error(`📧 Status update (${status}) failed:`, result.error);
  }

  return result;
}

module.exports = {
  sendEmail,
  sendOwnerNotification,
  sendApplicantConfirmation,
  sendStatusUpdate
};
