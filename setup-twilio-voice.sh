#!/bin/bash

# Twilio Voice SDK Setup Script for SmartLine AI

echo "================================================"
echo "SmartLine AI - Twilio Voice SDK Setup"
echo "================================================"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    echo "Please create .env file from .env.example first"
    exit 1
fi

# Check if required Twilio credentials exist
if grep -q "TWILIO_ACCOUNT_SID=your" .env || ! grep -q "TWILIO_ACCOUNT_SID=" .env; then
    echo "Error: TWILIO_ACCOUNT_SID not configured in .env"
    echo "Please add your Twilio Account SID first"
    exit 1
fi

if grep -q "TWILIO_AUTH_TOKEN=your" .env || ! grep -q "TWILIO_AUTH_TOKEN=" .env; then
    echo "Error: TWILIO_AUTH_TOKEN not configured in .env"
    echo "Please add your Twilio Auth Token first"
    exit 1
fi

echo "Existing Twilio credentials found ✓"
echo ""

# Check if Voice SDK credentials are already configured
if grep -q "TWILIO_API_KEY_SID=" .env && ! grep -q "TWILIO_API_KEY_SID=your" .env; then
    echo "Twilio Voice SDK credentials already configured!"
    echo ""
    read -p "Do you want to update them? (y/n): " UPDATE_CREDS
    if [ "$UPDATE_CREDS" != "y" ]; then
        echo "Keeping existing credentials."
        exit 0
    fi
fi

echo "Please provide the following information from Twilio Console:"
echo "(https://console.twilio.com)"
echo ""

# Get API Key SID
echo "1. Create an API Key:"
echo "   - Go to Account → API keys & tokens"
echo "   - Click 'Create API Key'"
echo "   - Name: 'SmartLine AI Voice SDK'"
echo "   - Type: Standard"
echo ""
read -p "Enter your Twilio API Key SID (starts with SK): " API_KEY_SID
if [ -z "$API_KEY_SID" ]; then
    echo "Error: API Key SID is required"
    exit 1
fi

# Get API Key Secret
read -p "Enter your Twilio API Key Secret: " API_KEY_SECRET
if [ -z "$API_KEY_SECRET" ]; then
    echo "Error: API Key Secret is required"
    exit 1
fi

# Get TwiML App SID
echo ""
echo "2. Create a TwiML Application:"
echo "   - Go to Voice → TwiML → TwiML Apps"
echo "   - Click 'Create new TwiML App'"
echo "   - Name: 'SmartLine AI Voice'"
echo "   - Voice URL: ${BASE_URL:-https://smartline-api-pn16.onrender.com}/webhooks/twilio/voice-sdk"
echo "   - Voice Method: POST"
echo "   - Status Callback: ${BASE_URL:-https://smartline-api-pn16.onrender.com}/webhooks/twilio/voice-sdk-status"
echo ""
read -p "Enter your TwiML App SID (starts with AP): " TWIML_APP_SID
if [ -z "$TWIML_APP_SID" ]; then
    echo "Error: TwiML App SID is required"
    exit 1
fi

# Update .env file
echo ""
echo "Updating .env file..."

# Check if variables exist and update or append
if grep -q "TWILIO_API_KEY_SID=" .env; then
    sed -i.bak "s/TWILIO_API_KEY_SID=.*/TWILIO_API_KEY_SID=$API_KEY_SID/" .env
else
    echo "" >> .env
    echo "# Twilio Voice SDK Configuration" >> .env
    echo "TWILIO_API_KEY_SID=$API_KEY_SID" >> .env
fi

if grep -q "TWILIO_API_KEY_SECRET=" .env; then
    sed -i.bak "s/TWILIO_API_KEY_SECRET=.*/TWILIO_API_KEY_SECRET=$API_KEY_SECRET/" .env
else
    echo "TWILIO_API_KEY_SECRET=$API_KEY_SECRET" >> .env
fi

if grep -q "TWILIO_TWIML_APP_SID=" .env; then
    sed -i.bak "s/TWILIO_TWIML_APP_SID=.*/TWILIO_TWIML_APP_SID=$TWIML_APP_SID/" .env
else
    echo "TWILIO_TWIML_APP_SID=$TWIML_APP_SID" >> .env
fi

# Clean up backup files
rm -f .env.bak

echo ""
echo "✅ Twilio Voice SDK configuration complete!"
echo ""
echo "Next steps:"
echo "1. Deploy your backend: npm run deploy (or your deployment command)"
echo "2. Test the access token endpoint:"
echo "   curl -H 'Authorization: Bearer YOUR_JWT_TOKEN' ${BASE_URL:-https://smartline-api-pn16.onrender.com}/api/twilio/access-token"
echo "3. The iOS app will automatically use the Voice SDK for calls"
echo ""
echo "================================================"