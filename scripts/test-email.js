/**
 * Email Test Script
 * Tests the Resend email integration
 * 
 * Usage: node scripts/test-email.js
 * 
 * Prerequisites:
 * - Set RESEND_API_KEY in .env or environment
 * - Set EMAIL_FROM (optional, defaults to onboarding@resend.dev)
 * - Set OWNER_EMAIL for owner notification test
 */

require('dotenv').config();
const EmailService = require('../src/services/EmailService');

// Test recipient - change this to your email
const TEST_EMAIL = process.env.OWNER_EMAIL || 'test@example.com';

async function runTests() {
    console.log('🧪 Starting Email Integration Tests\n');
    console.log('📧 Using RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'Configured ✓' : 'NOT SET ✗');
    console.log('📧 EMAIL_FROM:', process.env.EMAIL_FROM || 'Rentify <onboarding@resend.dev>');
    console.log('📧 OWNER_EMAIL:', process.env.OWNER_EMAIL || 'NOT SET');
    console.log('📧 Test recipient:', TEST_EMAIL);
    console.log('\n---\n');

    // Test 1: Basic email send
    console.log('Test 1: Basic sendEmail()');
    const result1 = await EmailService.sendEmail({
        to: TEST_EMAIL,
        subject: 'Rentify Email Test',
        html: '<h1>Test Email</h1><p>If you see this, the Resend integration is working!</p>'
    });
    console.log('Result:', result1.success ? '✓ Success' : `✗ Failed: ${result1.error}`);
    console.log('');

    // Test 2: Owner notification
    console.log('Test 2: sendOwnerNotification()');
    const result2 = await EmailService.sendOwnerNotification({
        propertyId: 1,
        applicantName: 'Test Applicant',
        applicantEmail: 'applicant@test.com',
        applicantPhone: '555-123-4567',
        applicantIncome: 15000,
        applicantEmployment: 'Software Developer',
        applicantOccupants: 2,
        applicantMessage: 'This is a test application message.'
    }, {
        title: 'Modern 2BR Apartment',
        location: 'Pretoria, Gauteng'
    });
    console.log('Result:', result2.success ? '✓ Success' : `✗ Failed: ${result2.error}`);
    console.log('');

    // Test 3: Applicant confirmation
    console.log('Test 3: sendApplicantConfirmation()');
    const result3 = await EmailService.sendApplicantConfirmation({
        id: 12345,
        propertyId: 1,
        applicantName: 'Test Applicant',
        applicantEmail: TEST_EMAIL
    }, {
        title: 'Modern 2BR Apartment',
        location: 'Pretoria, Gauteng'
    });
    console.log('Result:', result3.success ? '✓ Success' : `✗ Failed: ${result3.error}`);
    console.log('');

    // Test 4: Status update (approved)
    console.log('Test 4: sendStatusUpdate(approved)');
    const result4 = await EmailService.sendStatusUpdate({
        propertyId: 1,
        applicantName: 'Test Applicant',
        applicantEmail: TEST_EMAIL
    }, 'approved', 'Welcome aboard! Your move-in date is February 1st.', {
        title: 'Modern 2BR Apartment',
        location: 'Pretoria, Gauteng'
    });
    console.log('Result:', result4.success ? '✓ Success' : `✗ Failed: ${result4.error}`);
    console.log('');

    // Summary
    console.log('---');
    console.log('🎯 Tests Complete');
    const passed = [result1, result2, result3, result4].filter(r => r.success).length;
    console.log(`   ${passed}/4 tests passed`);

    if (passed < 4) {
        console.log('\n⚠️  Some tests failed. Check:');
        console.log('   1. Is RESEND_API_KEY set correctly?');
        console.log('   2. Is OWNER_EMAIL set?');
        console.log('   3. Check Resend dashboard for delivery status');
    }
}

runTests().catch(console.error);
