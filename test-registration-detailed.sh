#!/bin/bash

API_URL="https://smartline-api-pn16.onrender.com"
TIMESTAMP=$(date +%s)
EMAIL="testuser${TIMESTAMP}@example.com"

echo "=== Testing Registration with Detailed Output ==="
echo "Email: $EMAIL"
echo ""

# Test with curl verbose mode
echo "Response:"
curl -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"TestPassword123!\",\"name\":\"Test User\"}" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo "=== Testing with different email format ==="
curl -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"email":"simpletest@test.com","password":"Password123!"}' \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s