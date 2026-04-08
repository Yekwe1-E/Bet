const axios = require('axios');

async function testRegistration() {
    try {
        const payload = {
            name: 'Test User ' + Date.now(),
            email: 'test' + Date.now() + '@example.com',
            phone: '0' + Math.floor(Math.random() * 1000000000),
            password: 'password123'
        };

        console.log('Testing registration with payload:', payload);
        const response = await axios.post('http://localhost:5000/api/auth/register', payload);
        console.log('Registration Response:', response.data);
    } catch (error) {
        console.error('Registration Failed:', error.response ? error.response.data : error.message);
    }
}

// Start the server in the background and then test
// Actually, it's easier to just call the function directly if I can import it, 
// but it uses the DB connection.
// I'll just run the server and test it.
testRegistration();
