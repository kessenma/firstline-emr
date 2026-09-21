#!/bin/bash

# Test Signup API Health Check
# This script tests the signup endpoint to ensure it's working

echo "🧪 Testing Signup API Endpoint"
echo "==============================="
echo ""

# Check if server is running
echo "1️⃣ Checking if server is running..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "   ✅ Server is running on http://localhost:3000"
else
    echo "   ❌ Server is not running!"
    echo "   Please start the server with: npm run dev"
    exit 1
fi

echo ""
echo "2️⃣ Testing signup endpoint with test data..."

# Create a test signup request
TIMESTAMP=$(date +%s)
TEST_EMAIL="test-${TIMESTAMP}@example.com"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${TEST_EMAIL}\",
    \"password\": \"TestPassword123!\",
    \"accountType\": \"Doctor\",
    \"firstName\": \"Test\",
    \"lastName\": \"User\",
    \"doctorSpecialty\": [\"Cardiology\"],
    \"languages\": [\"English\"],
    \"countries\": [\"United States\"],
    \"gender\": \"Male\",
    \"securityQuestions\": [
      {\"question\": \"What is your favorite color?\", \"answer\": \"Blue\"},
      {\"question\": \"What is your pet's name?\", \"answer\": \"Fluffy\"},
      {\"question\": \"What city were you born in?\", \"answer\": \"New York\"}
    ]
  }")

# Split response body and status code
HTTP_BODY=$(echo "$RESPONSE" | head -n -1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

echo ""
echo "Response Status: $HTTP_CODE"
echo "Response Body:"
echo "$HTTP_BODY" | jq '.' 2>/dev/null || echo "$HTTP_BODY"
echo ""

if [ "$HTTP_CODE" -eq 201 ] || [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Signup API is working!"
    echo "   Test user created: $TEST_EMAIL"
    echo ""
    echo "3️⃣ Check server logs for notification creation:"
    echo "   Look for: '✉️ Notified X admins about new user signup'"
    echo ""
    echo "4️⃣ Next steps:"
    echo "   - Run: npm run debug:notifications"
    echo "   - Check: http://localhost:3000/notifications (as admin)"
elif [ "$HTTP_CODE" -eq 400 ]; then
    echo "⚠️  Signup validation error (expected if user exists)"
    echo "   This is normal if testing multiple times"
else
    echo "❌ Signup API returned error!"
    echo "   Check server logs for details"
    exit 1
fi

echo ""
echo "📊 To see detailed notification flow:"
echo "   npm run test:signup-notifications"
