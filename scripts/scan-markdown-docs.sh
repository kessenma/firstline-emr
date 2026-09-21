#!/bin/bash

# Markdown Documentation Scanner
# This script runs the markdown scan and provides a summary

echo "📚 Markdown Documentation Scanner"
echo "=================================="
echo ""

# Check if we're in the correct directory
if [ ! -f "scan-markdown-docs.js" ]; then
    echo "❌ Error: scan-markdown-docs.js not found!"
    echo "   Please run this script from the project root directory"
    exit 1
fi

# Run the scan
echo "🔍 Scanning for markdown files..."
echo ""
node scan-markdown-docs.js

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Scan completed successfully!"
    echo ""

    # Show latest reports
    echo "📄 Latest reports:"
    LATEST_REPORT=$(ls -t markdown-scan-*.md 2>/dev/null | head -1)
    LATEST_CSV=$(ls -t markdown-scan-*.csv 2>/dev/null | head -1)

    if [ ! -z "$LATEST_REPORT" ]; then
        echo "   📋 Report: $LATEST_REPORT"
    fi
    if [ ! -z "$LATEST_CSV" ]; then
        echo "   📊 CSV: $LATEST_CSV"
    fi

    # Offer to open the latest report
    if [ ! -z "$LATEST_REPORT" ]; then
        echo ""
        echo "📖 Report generated: $LATEST_REPORT"
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

        # Suggest next steps
        echo ""
        echo "💡 Quick Actions:"
        echo "   1. Review the report for organization suggestions"
        echo "   2. Check the 'Recommended Files to Move' section"
        echo "   3. Use the CSV file for bulk processing if needed"
        echo ""
        echo "📝 Example commands:"
        echo "   # View the report"
        echo "   cat $LATEST_REPORT"
        echo ""
        echo "   # View CSV in spreadsheet-friendly format"
        echo "   column -t -s, $LATEST_CSV | less -S"
        echo ""
        echo "   # Count files by category"
        echo "   grep -E '^- \[' $LATEST_REPORT | wc -l"
        echo ""
    fi
else
    echo ""
    echo "❌ Scan failed! Please check the error messages above."
    exit 1
fi
