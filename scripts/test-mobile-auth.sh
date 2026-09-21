#!/bin/bash

# Mobile Authentication Test Script
# This script tests the mobile authentication endpoints

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
BASE_URL="${BASE_URL:-https://emr.fajr.org}"
EMAIL="${EMAIL:-}"
PASSWORD="${PASSWORD:-}"
TOKEN="${TOKEN:-}"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Mobile Auth Test Script${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Function to print section headers
print_header() {
    echo -e "\n${YELLOW}>>> $1${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --url)
            BASE_URL="$2"
            shift 2
            ;;
        --email)
            EMAIL="$2"
            shift 2
            ;;
        --password)
            PASSWORD="$2"
            shift 2
            ;;
        --token)
            TOKEN="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --url URL          API base URL (default: https://emr.fajr.org)"
            echo "  --email EMAIL      User email for login"
            echo "  --password PASS    User password for login"
            echo "  --token TOKEN      JWT token to test (skips login)"
            echo "  -h, --help         Show this help message"
            echo ""
            echo "Examples:"
            echo "  # Login and test"
            echo "  $0 --email user@example.com --password mypassword"
            echo ""
            echo "  # Test with existing token"
            echo "  $0 --token eyJhbGci..."
            echo ""
            echo "  # Use different server"
            echo "  $0 --url https://stage.emr.fajr.org --email user@example.com --password mypassword"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo "Base URL: ${BASE_URL}"
echo ""

# Step 1: Get token (either from login or use provided token)
if [ -z "$TOKEN" ]; then
    if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
        print_error "Either provide --token or both --email and --password"
        exit 1
    fi

    print_header "Step 1: Logging in..."

    LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/mobile-login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

    # Check if login was successful
    SUCCESS=$(echo "$LOGIN_RESPONSE" | jq -r '.success // false')

    if [ "$SUCCESS" = "true" ]; then
        TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')
        USER_EMAIL=$(echo "$LOGIN_RESPONSE" | jq -r '.user.email')
        USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.user.id')

        print_success "Login successful"
        echo "   User: ${USER_EMAIL}"
        echo "   ID: ${USER_ID}"
        echo "   Token length: ${#TOKEN}"
        echo "   Token preview: ${TOKEN:0:30}..."
    else
        ERROR=$(echo "$LOGIN_RESPONSE" | jq -r '.error // "Unknown error"')
        print_error "Login failed: ${ERROR}"
        exit 1
    fi
else
    print_header "Step 1: Using provided token..."
    echo "   Token length: ${#TOKEN}"
    echo "   Token preview: ${TOKEN:0:30}..."
fi

# Step 2: Test the mobile auth test endpoint
print_header "Step 2: Testing auth diagnostics endpoint..."

TEST_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/test-mobile-auth" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json")

# Parse the response
TEST_SUCCESS=$(echo "$TEST_RESPONSE" | jq -r '.success // false')
JWT_DECODED=$(echo "$TEST_RESPONSE" | jq -r '.authentication.jwtDecoded // false')
FINAL_USER=$(echo "$TEST_RESPONSE" | jq -r '.authentication.finalUser // null')

if [ "$TEST_SUCCESS" = "true" ] && [ "$JWT_DECODED" = "true" ]; then
    print_success "Auth test endpoint passed"

    USER_EMAIL=$(echo "$TEST_RESPONSE" | jq -r '.authentication.finalUser.email')
    USER_ID=$(echo "$TEST_RESPONSE" | jq -r '.authentication.finalUser.id')
    ACCOUNT_TYPE=$(echo "$TEST_RESPONSE" | jq -r '.authentication.finalUser.accountType')
    IS_ADMIN=$(echo "$TEST_RESPONSE" | jq -r '.authentication.finalUser.isAdmin')

    echo "   User: ${USER_EMAIL}"
    echo "   ID: ${USER_ID}"
    echo "   Account Type: ${ACCOUNT_TYPE}"
    echo "   Is Admin: ${IS_ADMIN}"
else
    print_error "Auth test endpoint failed"
    echo "$TEST_RESPONSE" | jq '.'
    exit 1
fi

# Step 3: Test messages endpoint
print_header "Step 3: Testing /api/messages endpoint..."

MESSAGES_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "${BASE_URL}/api/messages" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json")

HTTP_STATUS=$(echo "$MESSAGES_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
MESSAGES_BODY=$(echo "$MESSAGES_RESPONSE" | sed -e 's/HTTP_STATUS:.*//')

if [ "$HTTP_STATUS" = "200" ]; then
    THREAD_COUNT=$(echo "$MESSAGES_BODY" | jq -r '.threads | length')
    print_success "Messages endpoint working (${THREAD_COUNT} threads)"
else
    print_error "Messages endpoint failed (HTTP ${HTTP_STATUS})"
    echo "$MESSAGES_BODY" | jq '.'
fi

# Step 4: Test internal messages endpoint
print_header "Step 4: Testing /api/internal-messages endpoint..."

INTERNAL_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "${BASE_URL}/api/internal-messages" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json")

HTTP_STATUS=$(echo "$INTERNAL_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
INTERNAL_BODY=$(echo "$INTERNAL_RESPONSE" | sed -e 's/HTTP_STATUS:.*//')

if [ "$HTTP_STATUS" = "200" ]; then
    THREAD_COUNT=$(echo "$INTERNAL_BODY" | jq -r '.threads | length')
    print_success "Internal messages endpoint working (${THREAD_COUNT} threads)"
else
    print_error "Internal messages endpoint failed (HTTP ${HTTP_STATUS})"
    echo "$INTERNAL_BODY" | jq '.'
fi

# Summary
print_header "Test Summary"
echo ""
echo "All tests completed. Check the results above."
echo ""
echo -e "${BLUE}================================${NC}"
