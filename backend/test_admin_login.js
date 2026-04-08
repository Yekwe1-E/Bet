const axios = require('axios');

const adminEmail = 'emmanuelwilson630@gmail.com';
const adminPass = 'Doubra18me';

async function testLogin() {
    try {
        console.log('Testing admin login...');
        const response = await axios.post('http://localhost:5000/api/auth/login', {
            email: adminEmail,
            password: adminPass
        });

        console.log('Login Response:', JSON.stringify(response.data, null, 2));
        
        if (response.data.success && response.data.data.role === 'admin') {
            console.log('SUCCESS: Admin login verified.');
        } else {
            console.log('FAILURE: Login successful but role is not admin or success is false.');
        }

    } catch (error) {
        console.error('Login Failed:', error.response ? error.response.data : error.message);
    }
}

testLogin();
