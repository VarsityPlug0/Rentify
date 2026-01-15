// Debug script to test all button functionality
console.log('=== BUTTON FUNCTIONALITY DEBUG ===');

// Test 1: Check if DOM elements exist
console.log('\n1. Checking DOM Elements:');
const elementsToCheck = [
    'logout-btn',
    'property-form',
    'property-modal',
    'properties-table-body',
    'total-properties',
    'pending-applications', 
    'unread-messages'
];

elementsToCheck.forEach(id => {
    const element = document.getElementById(id);
    console.log(`${id}: ${element ? 'FOUND' : 'MISSING'}`);
    if (element) {
        console.log(`  - Tag: ${element.tagName}`);
        console.log(`  - Class: ${element.className}`);
    }
});

// Test 2: Check global functions
console.log('\n2. Checking Global Functions:');
const functionsToCheck = [
    'checkAdminAuth',
    'loadDashboardData',
    'loadProperties',
    'renderPropertiesTable',
    'setupFormHandlers',
    'openAddPropertyModal',
    'editProperty',
    'deleteProperty',
    'closePropertyModal',
    'loadApplications',
    'loadMessages',
    'logout'
];

functionsToCheck.forEach(funcName => {
    console.log(`${funcName}: ${typeof window[funcName] === 'function' ? 'AVAILABLE' : 'MISSING'}`);
});

// Test 3: Check event listeners
console.log('\n3. Checking Event Listeners:');
try {
    const form = document.getElementById('property-form');
    console.log(`Property form event listeners: ${form ? 'SET UP' : 'FORM NOT FOUND'}`);
    
    const logoutBtn = document.getElementById('logout-btn');
    console.log(`Logout button event listeners: ${logoutBtn ? 'SET UP' : 'BUTTON NOT FOUND'}`);
} catch (error) {
    console.log('Error checking event listeners:', error);
}

// Test 4: Check API connectivity
console.log('\n4. Checking API Connectivity:');
async function testAPI() {
    try {
        const response = await fetch('/api/properties');
        const data = await response.json();
        console.log(`Properties API: ${data.success ? 'WORKING' : 'FAILED'}`);
        console.log(`Properties count: ${data.data ? data.data.length : 0}`);
    } catch (error) {
        console.log('Properties API Error:', error.message);
    }
    
    try {
        const authResponse = await fetch('/api/auth/status');
        const authData = await authResponse.json();
        console.log(`Auth Status: ${authData.isAuthenticated ? 'LOGGED IN' : 'NOT LOGGED IN'}`);
        console.log(`User Role: ${authData.user?.role || 'UNKNOWN'}`);
    } catch (error) {
        console.log('Auth API Error:', error.message);
    }
}

testAPI();

// Test 5: Manual button trigger test
console.log('\n5. Testing Manual Button Triggers:');
console.log('Try running these in console:');
console.log('- openAddPropertyModal()');
console.log('- loadProperties()');
console.log('- loadDashboardData()');

console.log('\n=== DEBUG COMPLETE ===');