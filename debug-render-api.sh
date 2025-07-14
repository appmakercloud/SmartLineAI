#!/bin/bash

# Debug script to get detailed error information
API_URL="https://smartline-api-pn16.onrender.com"

echo "=== SmartLine AI Debug Script ==="
echo "API URL: $API_URL"
echo ""

# 1. Test basic connectivity
echo "1. Testing basic connectivity..."
curl -s "$API_URL/api/health" | jq . || echo "No JSON response"
echo ""

# 2. Test registration with verbose error output
echo "2. Testing registration endpoint (verbose)..."
curl -s -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}' | jq . || echo "No JSON response"
echo ""

# 3. Test with no data to see error handling
echo "3. Testing registration with no data..."
curl -s -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{}' | jq . || echo "No JSON response"
echo ""

# 4. Check if it's a database issue
echo "4. Testing a simple GET endpoint..."
curl -s "$API_URL/api/numbers/search?areaCode=415" | jq . || echo "No JSON response"
echo ""

echo "=== Debugging Tips ==="
echo "If you see HTML responses or no JSON, the errors are likely:"
echo "1. Missing environment variables (JWT_SECRET, etc.)"
echo "2. Database not connected"
echo "3. Application crash on startup"
echo ""
echo "Check Render logs for detailed error messages!"