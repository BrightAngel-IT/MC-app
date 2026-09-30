const axios = require('axios');

async function testAPI() {
    try {
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'pharmacistkamal@gmail.com',
            password: 'password123'
        });
        const token = loginRes.data.token;
        console.log('Logged in successfully');

        const dashRes = await axios.get('http://localhost:5000/api/vendor/dashboard?filter=all', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(JSON.stringify(dashRes.data, null, 2));
    } catch (e) {
        console.error(e.response ? e.response.data : e.message);
    }
}
testAPI();
