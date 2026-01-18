/**
 * Test Email Script
 * Run this to verify your email credentials and template rendering.
 * Usage: node scripts/test-email.js
 */

const EmailService = require('../src/services/EmailService');
require('dotenv').config();

async function runTest() {
    console.log('🧪 Starting Email Test...');

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error('❌ Error: EMAIL_USER or EMAIL_PASS not found in .env');
        console.log('Please add them to .env file first.');
        return;
    }

    const testEmail = process.env.EMAIL_USER; // Send to self for testing
    console.log(`📧 Sending test emails to ${testEmail}...`);

    // Mock Property Data
    const mockProperty = {
        id: 101,
        title: "Luxury 2-Bed Apartment in Sandton",
        location: "15 Alice Lane, Sandton, Johannesburg",
        price: 15000,
        bedrooms: 2,
        bathrooms: 2
    };

    // 1. Test Owner Notification
    console.log('   Sending Owner Notification...');
    await EmailService.sendOwnerNotification({
        id: 5001,
        applicantName: 'Test Applicant',
        applicantEmail: 'test@example.com', // This just shows in the body
        applicantPhone: '082 555 1234',
        applicantIncome: 45000,
        documents: [{}, {}]
    }, mockProperty);

    // 2. Test Applicant Confirmation
    console.log('   Sending Applicant Confirmation...');
    await EmailService.sendApplicantConfirmation({
        id: 5001,
        applicantName: 'Test Applicant',
        applicantEmail: testEmail // Send to self
    }, mockProperty);

    // 3. Test Status Update
    console.log('   Sending Status Update (Approved)...');
    await EmailService.sendStatusUpdate({
        id: 5001,
        applicantName: 'Test Applicant',
        applicantEmail: testEmail
    }, 'approved', 'Welcome to your new home! Please sign the lease attached.', mockProperty);

    console.log('✅ Test complete. Check your inbox!');
}

runTest().catch(console.error);
