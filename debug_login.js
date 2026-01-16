
const axios = require('axios');
const wrapper = axios.create({
    baseURL: 'http://localhost:3000',
    validateStatus: () => true,
    withCredentials: true // Important for cookies
});

async function testLogin() {
    console.log('1. Attempting login...');
    const loginRes = await wrapper.post('/api/auth/login', {
        username: 'admin',
        password: 'password123'
    });

    console.log('Login Status:', loginRes.status);
    console.log('Login Data:', loginRes.data);

    const cookies = loginRes.headers['set-cookie'];
    console.log('Set-Cookie:', cookies);

    if (!cookies) {
        console.error('FATAL: No cookies received!');
        return;
    }

    // extract the connect.sid
    const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');

    console.log('2. checking auth status...');
    const statusRes = await wrapper.get('/api/auth/status', {
        headers: { Cookie: cookieHeader }
    });
    console.log('Status Code:', statusRes.status);
    console.log('Status Data:', statusRes.data);

    console.log('3. Fetching protected applications...');
    const appRes = await wrapper.get('/api/application', {
        headers: { Cookie: cookieHeader }
    });
    console.log('App Status:', appRes.status);
    // console.log('App Data:', appRes.data); // Data might be large
}

testLogin().catch(console.error);
