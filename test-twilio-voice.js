#!/usr/bin/env node

// Test script for Twilio Voice SDK integration

const axios = require('axios');
require('dotenv').config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testTwilioVoiceSetup() {
  console.log('🔍 Testing Twilio Voice SDK Setup...\n');
  
  // Check environment variables
  console.log('1. Checking environment variables:');
  const requiredVars = [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_API_KEY_SID',
    'TWILIO_API_KEY_SECRET',
    'TWILIO_TWIML_APP_SID'
  ];
  
  let allVarsSet = true;
  for (const varName of requiredVars) {
    const value = process.env[varName];
    const isSet = value && !value.includes('your-');
    console.log(`  ${varName}: ${isSet ? '✅ Set' : '❌ Not set or contains placeholder'}`);
    if (!isSet) allVarsSet = false;
  }
  
  if (!allVarsSet) {
    console.log('\n❌ Missing required environment variables!');
    console.log('Run ./setup-twilio-voice.sh to configure them.\n');
    process.exit(1);
  }
  
  console.log('\n2. Testing API endpoint (requires authentication):');
  console.log('   Please provide a valid JWT token to test the endpoint.');
  console.log('   You can get one by logging in through the app or API.\n');
  
  // If JWT token is provided as argument
  const jwtToken = process.argv[2];
  if (!jwtToken) {
    console.log('Usage: node test-twilio-voice.js YOUR_JWT_TOKEN\n');
    console.log('To get a JWT token, you can:');
    console.log('1. Login through the iOS app and check the logs');
    console.log('2. Use the login API endpoint');
    console.log('3. Check your app\'s local storage/keychain\n');
    process.exit(0);
  }
  
  try {
    console.log('3. Testing /api/twilio/access-token endpoint...');
    const response = await axios.get(`${BASE_URL}/api/twilio/access-token`, {
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      }
    });
    
    console.log('\n✅ Success! Access token endpoint is working.');
    console.log('\nResponse:');
    console.log(`  - Token: ${response.data.token.substring(0, 50)}...`);
    console.log(`  - Identity: ${response.data.identity}`);
    console.log(`  - TTL: ${response.data.ttl} seconds`);
    
    // Decode the token to verify it's valid
    const tokenParts = response.data.token.split('.');
    if (tokenParts.length === 3) {
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      console.log('\nToken payload:');
      console.log(`  - Grants: ${JSON.stringify(payload.grants)}`);
      console.log(`  - Expiration: ${new Date(payload.exp * 1000).toISOString()}`);
    }
    
    console.log('\n✅ Twilio Voice SDK is properly configured!');
    console.log('\nThe iOS app should now be able to:');
    console.log('  - Get access tokens');
    console.log('  - Make calls with two-way audio');
    console.log('  - No more "Busy" status\n');
    
  } catch (error) {
    console.log('\n❌ Error testing endpoint:');
    if (error.response) {
      console.log(`  Status: ${error.response.status}`);
      console.log(`  Error: ${JSON.stringify(error.response.data)}`);
      
      if (error.response.status === 401) {
        console.log('\n  The JWT token might be expired or invalid.');
        console.log('  Please get a fresh token and try again.');
      } else if (error.response.status === 503) {
        console.log('\n  Twilio service is not properly configured.');
        console.log('  Check your environment variables.');
      }
    } else {
      console.log(`  ${error.message}`);
      console.log('\n  Is the backend running on ' + BASE_URL + '?');
    }
    process.exit(1);
  }
}

// Run the test
testTwilioVoiceSetup().catch(console.error);