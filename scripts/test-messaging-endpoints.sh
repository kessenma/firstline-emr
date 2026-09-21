#!/bin/bash

# Test script for messaging endpoints migration
# Usage: ./scripts/test-messaging-endpoints.sh [BASE_URL] [SESSION_TOKEN]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${1:-http://localhost:3000}"
SESSION_TOKEN="${2:-}"

if [ -z "$SESSION_TOKEN" ]; then
    echo -e "${RED}Error: SESSION_TOKEN is required${NC}"
    echo "Usage: $0 [BASE_URL] [SESSION_TOKEN]"
    echo "Example: $0 http://localhost:3000 your-session-token-here"
    exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Messaging Endpoints Test Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Base URL: ${YELLOW}$BASE_URL${NC}"
echo -e "Testing with session token: ${YELLOW}${SESSION_TOKEN:0:20}...${NC}"
echo ""

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0
THREAD_ID=""
SLUG="all-doctors"

# Helper function to test endpoint
test_endpoint() {
    local test_name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected_status="${5:-200}"

    echo -e "${BLUE}Testing:${NC} $test_name"

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -X GET \
            "$BASE_URL$endpoint" \
            -H "Cookie: next-auth.session-token=$SESSION_TOKEN" \
            -H "Content-Type: application/json")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            "$BASE_URL$endpoint" \
            -H "Cookie: next-auth.session-token=$SESSION_TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $http_code)"
        TESTS_PASSED=$((TESTS_PASSED + 1))

        # Pretty print response
        if command -v jq &> /dev/null; then
            echo "$body" | jq -C '.' 2>/dev/null || echo "$body"
        else
            echo "$body"
        fi

        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (Expected HTTP $expected_status, got $http_code)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "${RED}Response:${NC} $body"
        return 1
    fi
}

echo -e "${YELLOW}=== Internal Messages Tests ===${NC}"
echo ""

# Test 1: List internal messages
if test_endpoint \
    "GET /api/internal-messages" \
    "GET" \
    "/api/internal-messages" \
    "" \
    "200"; then

    # Extract first thread ID for subsequent tests
    if command -v jq &> /dev/null; then
        THREAD_ID=$(echo "$response" | sed '$d' | jq -r '.threads[0]._id // empty' 2>/dev/null)
        if [ -n "$THREAD_ID" ]; then
            echo -e "${GREEN}Found thread ID:${NC} $THREAD_ID"
        fi
    fi
fi
echo ""

# Test 2: Get thread by slug
test_endpoint \
    "GET /api/internal-messages/by-slug/all-doctors" \
    "GET" \
    "/api/internal-messages/by-slug/all-doctors" \
    "" \
    "200"
echo ""

# Test 3: Get thread by slug (specialty)
test_endpoint \
    "GET /api/internal-messages/by-slug/all-triage-and-doctors" \
    "GET" \
    "/api/internal-messages/by-slug/all-triage-and-doctors" \
    "" \
    "200"
echo ""

# Test 4: Get thread by ID (if we have one)
if [ -n "$THREAD_ID" ]; then
    test_endpoint \
        "GET /api/internal-messages/[id]" \
        "GET" \
        "/api/internal-messages/$THREAD_ID" \
        "" \
        "200"
    echo ""

    # Test 5: Post message to thread
    test_endpoint \
        "POST /api/internal-messages/[id]" \
        "POST" \
        "/api/internal-messages/$THREAD_ID" \
        '{"text":"Test message from migration script","type":"text"}' \
        "200"
    echo ""

    # Test 6: Mark thread as read
    test_endpoint \
        "POST /api/internal-messages/mark-read/[threadId]" \
        "POST" \
        "/api/internal-messages/mark-read/$THREAD_ID" \
        "" \
        "200"
    echo ""
else
    echo -e "${YELLOW}⊘ Skipping thread-specific tests (no thread ID available)${NC}"
    echo ""
fi

echo -e "${YELLOW}=== Patient Messages Tests ===${NC}"
echo ""

# Test 7: List patient messages
if test_endpoint \
    "GET /api/messages" \
    "GET" \
    "/api/messages" \
    "" \
    "200"; then

    # Extract first patient thread ID for subsequent tests
    if command -v jq &> /dev/null; then
        PATIENT_THREAD_ID=$(echo "$response" | sed '$d' | jq -r '.threads[0]._id // .threads[0].id // empty' 2>/dev/null)
        if [ -n "$PATIENT_THREAD_ID" ]; then
            echo -e "${GREEN}Found patient thread ID:${NC} $PATIENT_THREAD_ID"
        fi
    fi
fi
echo ""

# Test 8: Mark patient thread as read (if we have one)
if [ -n "$PATIENT_THREAD_ID" ]; then
    test_endpoint \
        "POST /api/messages/mark-read/[threadId]" \
        "POST" \
        "/api/messages/mark-read/$PATIENT_THREAD_ID" \
        "" \
        "200"
    echo ""
else
    echo -e "${YELLOW}⊘ Skipping patient thread tests (no thread ID available)${NC}"
    echo ""
fi

echo -e "${YELLOW}=== Error Handling Tests ===${NC}"
echo ""

# Test 9: Invalid thread ID
test_endpoint \
    "GET /api/internal-messages/[invalid-id]" \
    "GET" \
    "/api/internal-messages/00000000-0000-0000-0000-000000000000" \
    "" \
    "404"
echo ""

# Test 10: Invalid slug
test_endpoint \
    "GET /api/internal-messages/by-slug/[invalid-slug]" \
    "GET" \
    "/api/internal-messages/by-slug/invalid-slug-xyz" \
    "" \
    "400"
echo ""

# Test 11: Empty message post
if [ -n "$THREAD_ID" ]; then
    test_endpoint \
        "POST /api/internal-messages/[id] (empty message)" \
        "POST" \
        "/api/internal-messages/$THREAD_ID" \
        '{"text":"","type":"text"}' \
        "400"
    echo ""
fi

# Test 12: Unauthorized access (invalid session)
echo -e "${BLUE}Testing:${NC} Unauthorized access"
response=$(curl -s -w "\n%{http_code}" -X GET \
    "$BASE_URL/api/internal-messages" \
    -H "Cookie: next-auth.session-token=invalid-token" \
    -H "Content-Type: application/json")
http_code=$(echo "$response" | tail -n1)
if [ "$http_code" = "401" ]; then
    echo -e "${GREEN}✓ PASSED${NC} (HTTP $http_code)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ FAILED${NC} (Expected HTTP 401, got $http_code)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Passed:${NC} $TESTS_PASSED"
echo -e "${RED}Failed:${NC} $TESTS_FAILED"
echo -e "${BLUE}Total:${NC}  $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed.${NC}"
    exit 1
fi
