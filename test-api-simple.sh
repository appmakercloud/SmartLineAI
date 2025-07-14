#!/bin/bash

# Simple API test without rate limit issues
API_URL="https://smartline-api-pn16.onrender.com"

echo "=== SmartLine AI Simple API Test ==="
echo ""

# 1. Health check
echo "1. Health Check:"
curl -s "$API_URL/api/health" | jq .
echo ""

# 2. Test validation endpoint (shouldn't hit rate limit)
echo "2. Testing validation (empty registration):"
curl -s -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{}' | jq .
echo ""

# 3. Wait a bit to avoid rate limit
echo "Waiting 5 seconds to avoid rate limit..."
sleep 5

# 4. Test with proper data
UNIQUE_EMAIL="test_$(date +%s)@example.com"
echo "3. Testing registration with email: $UNIQUE_EMAIL"
RESPONSE=$(curl -s -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$UNIQUE_EMAIL\",\"password\":\"TestPass123!\",\"name\":\"Test User\"}")

echo "$RESPONSE" | jq . 2>/dev/null || echo "Raw response: $RESPONSE"
echo ""

# 5. Check if it's a configuration issue
echo "4. Checking for configuration issues:"
echo "If you see 'Registration failed', check Render logs for:"
echo "- Stripe API errors (if Stripe integration is required)"
echo "- Email service errors"
echo "- Database write permissions"