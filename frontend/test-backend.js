const axios = require('axios');

async function testBackend() {
  console.log('Testing backend connectivity...\n');
  
  const tests = [
    'http://localhost:8080/health',
    'http://localhost:8080/api/v1/auth/test/',
    'http://backend:8000/health/',
  ];
  
  for (const url of tests) {
    try {
      console.log(`Testing: ${url}`);
      const response = await axios.get(url, { timeout: 5000 });
      console.log(`✅ Success: ${response.status} ${response.statusText}\n`);
    } catch (error) {
      console.log(`❌ Failed: ${error.message}\n`);
    }
  }
}

testBackend();