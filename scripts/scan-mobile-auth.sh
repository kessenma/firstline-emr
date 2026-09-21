#!/bin/bash

# Mobile Authentication Migration Scanner
# This script runs the mobile auth scan and provides a summary

echo "🔍 Mobile Authentication Migration Scanner"
echo "=========================================="
echo ""

# Check if we're in the correct directory
if [ ! -f "apps/web/scripts/scan-mobile-auth.js" ]; then
    echo "❌ Error: scan-mobile-auth.js not found!"
    echo "   Please run this script from the project root directory"
    exit 1
fi

# Run the scan from the apps/web directory
echo "📊 Running authentication scan..."
echo ""
cd apps/web && node scripts/scan-mobile-auth.js

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Scan completed successfully!"
    echo ""

    # Show latest reports
    echo "📄 Latest reports:"
    ls -la apps/web/mobile-auth-*.md 2>/dev/null | tail -5
    ls -la apps/web/mobile-auth-*.csv 2>/dev/null | tail -5

    # Offer to open the latest report
    LATEST_REPORT=$(ls -t apps/web/mobile-auth-scan-*.md 2>/dev/null | head -1)
    if [ ! -z "$LATEST_REPORT" ]; then
        echo ""
        echo "📖 Latest report: $LATEST_REPORT"
        echo ""
        read -p "Would you like to view the report? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            # Try to use appropriate viewer
            if command -v code &> /dev/null; then
                code "$LATEST_REPORT"
            elif command -v open &> /dev/null; then
                open "$LATEST_REPORT"
            elif command -v less &> /dev/null; then
                less "$LATEST_REPORT"
            else
                cat "$LATEST_REPORT"
            fi
        fi
    fi
else
    echo ""
    echo "❌ Scan failed! Please check the error messages above."
    exit 1
fi
