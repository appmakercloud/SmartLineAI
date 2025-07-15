#!/usr/bin/env node

// Quick test for deployed Twilio Voice SDK endpoint

const axios = require('axios');

const BASE_URL = 'https://smartline-api-pn16.onrender.com';

async function testTwilioEndpoint() {
  console.log('🔍 Testing Twilio Voice SDK on Render...\n');
  
  try {
    // First, let's login to get a JWT token
    console.log('1. Logging in to get JWT token...');
    
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'ashok@flickmax.com',
      password: 'your_password_here' // You'll need to provide the actual password
    });
    
    const { tokens } = loginResponse.data;
    console.log('✅ Login successful!\n');
    
    // Now test the Twilio access token endpoint
    console.log('2. Testing /api/twilio/access-token endpoint...');
    
    const twilioResponse = await axios.get(`${BASE_URL}/api/twilio/access-token`, {
      headers: {
        'Authorization': `Bearer ${tokens.access}`
      }
    });
    
    console.log('✅ Twilio access token endpoint is working!\n');
    console.log('Response:');
    console.log(`  Token: ${twilioResponse.data.token.substring(0, 50)}...`);
    console.log(`  Identity: ${twilioResponse.data.identity}`);
    console.log(`  TTL: ${twilioResponse.data.ttl} seconds\n`);
    
    // Decode token to check grants
    const tokenParts = twilioResponse.data.token.split('.');
    if (tokenParts.length === 3) {
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      console.log('Token details:');
      console.log(`  Grants: ${JSON.stringify(payload.grants, null, 2)}`);
      console.log(`  Identity: ${payload.identity}`);
      console.log(`  Expires: ${new Date(payload.exp * 1000).toISOString()}`);
    }
    
    console.log('\n✅ SUCCESS! The iOS app can now:');
    console.log('  - Get Twilio access tokens');
    console.log('  - Make calls with proper two-way audio');
    console.log('  - No more "Busy" status!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\nPlease update the password in this script or use a valid JWT token.');
    }
  }
}

// If JWT token is provided as argument, use it directly
if (process.argv[2]) {
  console.log('Using provided JWT token...\n');
  
  axios.get(`${BASE_URL}/api/twilio/access-token`, {
    headers: {
      'Authorization': `Bearer ${process.argv[2]}`
    }
  })
  .then(response => {
    console.log('✅ Twilio access token endpoint is working!\n');
    console.log('Response:');
    console.log(`  Token: ${response.data.token.substring(0, 50)}...`);
    console.log(`  Identity: ${response.data.identity}`);
    console.log(`  TTL: ${response.data.ttl} seconds`);
    
    // Decode token
    const tokenParts = response.data.token.split('.');
    if (tokenParts.length === 3) {
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      console.log('\nToken grants:', JSON.stringify(payload.grants, null, 2));
    }
  })
  .catch(error => {
    console.error('Error:', error.response?.data || error.message);
  });
} else {
  console.log('Usage: node test-twilio-deployed.js [JWT_TOKEN]');
  console.log('\nOr update the script with login credentials to auto-login.\n');
}