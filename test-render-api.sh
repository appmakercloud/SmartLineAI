#!/bin/bash

# SmartLine AI API Testing Script for Render Deployment
# Usage: ./test-render-api.sh

API_URL="https://smartline-api-pn16.onrender.com"
echo "Testing SmartLine AI API at: $API_URL"
echo "========================================"

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test health check
echo -e "\n${YELLOW}1. Testing Health Check Endpoint${NC}"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n 1)
BODY=$(echo "$HEALTH_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✓ Health check passed${NC}"
    echo "Response: $BODY"
else
    echo -e "${RED}✗ Health check failed (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
fi

# Test registration endpoint
echo -e "\n${YELLOW}2. Testing Registration Endpoint${NC}"
TIMESTAMP=$(date +%s)
REG_DATA='{
  "email": "test'$TIMESTAMP'@example.com",
  "password": "TestPass123!",
  "name": "Test User"
}'

REG_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "$REG_DATA")
REG_HTTP_CODE=$(echo "$REG_RESPONSE" | tail -n 1)
REG_BODY=$(echo "$REG_RESPONSE" | sed '$d')

if [ "$REG_HTTP_CODE" == "201" ] || [ "$REG_HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✓ Registration endpoint accessible${NC}"
    # Extract token if available
    TOKEN=$(echo "$REG_BODY" | grep -o '"token":"[^"]*' | grep -o '[^"]*$')
else
    echo -e "${RED}✗ Registration failed (HTTP $REG_HTTP_CODE)${NC}"
    echo "Response: $REG_BODY"
fi

# Test login endpoint
echo -e "\n${YELLOW}3. Testing Login Endpoint${NC}"
LOGIN_DATA='{
  "email": "test@example.com",
  "password": "password123"
}'

LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "$LOGIN_DATA")
LOGIN_HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -n 1)
LOGIN_BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')

if [ "$LOGIN_HTTP_CODE" == "200" ] || [ "$LOGIN_HTTP_CODE" == "401" ]; then
    echo -e "${GREEN}✓ Login endpoint accessible${NC}"
    echo "Response: $LOGIN_BODY"
else
    echo -e "${RED}✗ Login endpoint error (HTTP $LOGIN_HTTP_CODE)${NC}"
    echo "Response: $LOGIN_BODY"
fi

# Test CORS headers
echo -e "\n${YELLOW}4. Testing CORS Configuration${NC}"
CORS_RESPONSE=$(curl -s -I -X OPTIONS "$API_URL/api/health" \
  -H "Origin: https://smartlineai.com" \
  -H "Access-Control-Request-Method: GET")

if echo "$CORS_RESPONSE" | grep -q "access-control-allow-origin"; then
    echo -e "${GREEN}✓ CORS headers present${NC}"
    echo "$CORS_RESPONSE" | grep -i "access-control"
else
    echo -e "${RED}✗ CORS headers missing${NC}"
fi

# Test rate limiting
echo -e "\n${YELLOW}5. Testing Rate Limiting${NC}"
echo "Sending 6 requests to test rate limiting..."
for i in {1..6}; do
    RATE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/api/auth/login" \
      -H "Content-Type: application/json" \
      -d "$LOGIN_DATA")
    echo "Request $i: HTTP $RATE_RESPONSE"
    if [ "$RATE_RESPONSE" == "429" ]; then
        echo -e "${GREEN}✓ Rate limiting is working${NC}"
        break
    fi
done

# Test webhook endpoints
echo -e "\n${YELLOW}6. Testing Webhook Endpoints${NC}"
WEBHOOK_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/webhooks/twilio/voice" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=+1234567890&To=+0987654321")
WEBHOOK_HTTP_CODE=$(echo "$WEBHOOK_RESPONSE" | tail -n 1)

if [ "$WEBHOOK_HTTP_CODE" == "200" ] || [ "$WEBHOOK_HTTP_CODE" == "400" ]; then
    echo -e "${GREEN}✓ Webhook endpoint accessible${NC}"
else
    echo -e "${RED}✗ Webhook endpoint error (HTTP $WEBHOOK_HTTP_CODE)${NC}"
fi

# Summary
echo -e "\n${YELLOW}========================================"
echo "API Testing Complete"
echo "========================================${NC}"
echo -e "\n${GREEN}Next Steps:${NC}"
echo "1. Update your Stripe webhook URL to: $API_URL/webhooks/stripe"
echo "2. Update Twilio/Plivo webhook URLs to:"
echo "   - Voice: $API_URL/webhooks/twilio/voice"
echo "   - SMS: $API_URL/webhooks/twilio/sms"
echo "3. Configure environment variables in Render dashboard"
echo "4. Update iOS app API endpoint to: $API_URL"