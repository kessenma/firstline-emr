#!/bin/bash

# Script to find all client pages that might need the force-dynamic fix
# Usage: bun scripts/find-client-pages.sh

echo "🔍 Scanning for client pages in Next.js app..."
echo ""
echo "================================================"
echo "CLIENT PAGES (with 'use client' directive):"
echo "================================================"

# Find all page.tsx files with "use client"
grep -r "use client" app --include="page.tsx" | sed 's/:.*$//' | sort

echo ""
echo "================================================"
echo "SUMMARY:"
echo "================================================"

# Count total client pages
CLIENT_COUNT=$(grep -r "use client" app --include="page.tsx" | wc -l | tr -d ' ')
TOTAL_PAGES=$(find app -name "page.tsx" | wc -l | tr -d ' ')

echo "Total pages: $TOTAL_PAGES"
echo "Client pages: $CLIENT_COUNT"
echo "Server pages: $((TOTAL_PAGES - CLIENT_COUNT))"

echo ""
echo "================================================"
echo "PAGES ALREADY FIXED (with force-dynamic):"
echo "================================================"

# Find pages/layouts that already have force-dynamic
grep -r "dynamic.*=.*'force-dynamic'" app --include="*.tsx" | sed 's/:.*$//' | sort

echo ""
echo "================================================"
echo "RECOMMENDED ACTION:"
echo "================================================"
echo ""
echo "Option 1 (FASTEST): Add to root layout"
echo "  Edit: app/layout.tsx"
echo "  Add:  export const dynamic = 'force-dynamic';"
echo ""
echo "Option 2 (BETTER): Fix each failing page"
echo "  1. Run: bun run test:build"
echo "  2. Note the failing page from error output"
echo "  3. Create layout.tsx in parent directory with force-dynamic"
echo "  4. Repeat until build passes"
echo ""
echo "See docs/NEXTJS_16_BUILD_ERRORS.md for full details"
