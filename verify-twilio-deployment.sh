#!/bin/bash

echo "================================================"
echo "Verifying Twilio Voice SDK Deployment on Render"
echo "================================================"
echo ""

BASE_URL="https://smartline-api-pn16.onrender.com"

# Check server health
echo "1. Checking server health..."
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/health)
if [ "$HEALTH_STATUS" = "200" ]; then
    echo "   ✅ Server is healthy"
else
    echo "   ❌ Server health check failed (Status: $HEALTH_STATUS)"
    exit 1
fi

# Check if Twilio access token endpoint exists
echo ""
echo "2. Checking Twilio access token endpoint..."
TWILIO_RESPONSE=$(curl -s $BASE_URL/api/twilio/access-token)
if [[ "$TWILIO_RESPONSE" == *"No token provided"* ]]; then
    echo "   ✅ Endpoint exists and requires authentication"
elif [[ "$TWILIO_RESPONSE" == *"Route not found"* ]]; then
    echo "   ❌ Endpoint not found - deployment may have failed"
    exit 1
else
    echo "   ✅ Endpoint is responding"
fi

# Check webhook endpoints
echo ""
echo "3. Checking Twilio Voice SDK webhooks..."
WEBHOOK_RESPONSE=$(curl -s -X POST $BASE_URL/webhooks/twilio/voice-sdk \
    -H "Content-Type: application/json" \
    -d '{"test": true}')

if [[ "$WEBHOOK_RESPONSE" == *"<?xml"* ]] && [[ "$WEBHOOK_RESPONSE" == *"<Response>"* ]]; then
    echo "   ✅ Voice webhook is responding with TwiML"
else
    echo "   ❌ Voice webhook not responding correctly"
fi

# Check status webhook
STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE_URL/webhooks/twilio/voice-sdk-status \
    -H "Content-Type: application/json" \
    -d '{"CallSid": "test", "CallStatus": "completed"}')

if [ "$STATUS_CODE" = "200" ] || [ "$STATUS_CODE" = "204" ]; then
    echo "   ✅ Status webhook is responding"
else
    echo "   ⚠️  Status webhook returned: $STATUS_CODE"
fi

echo ""
echo "================================================"
echo "Deployment Verification Complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. The iOS app should now automatically detect the endpoint"
echo "2. Calls will use Twilio Voice SDK for proper audio"
echo "3. Monitor the logs at: https://dashboard.render.com"
echo ""
echo "To test with authentication:"
echo "  node test-twilio-deployed.js YOUR_JWT_TOKEN"
echo ""