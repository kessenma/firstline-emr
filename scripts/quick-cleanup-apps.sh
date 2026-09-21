#!/bin/bash

# Quick App Documentation Cleanup Script
# One-time cleanup without loops

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                          ║${NC}"
echo -e "${BLUE}║      📚 Quick App Docs Cleanup (One-Time Run)          ║${NC}"
echo -e "${BLUE}║                                                          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check current state
MOBILE_COUNT=$(find apps/mobile -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
WEB_COUNT=$(find apps/web -name "*.md" 2>/dev/null | wc -l | tr -d ' ')

echo -e "${CYAN}Current state:${NC}"
echo "  Mobile: $MOBILE_COUNT .md files"
echo "  Web: $WEB_COUNT .md files"
echo ""

# Show what we'll do
echo -e "${YELLOW}This script will:${NC}"
echo ""
echo "  1. ✅ Keep essential docs in place:"
echo "     • README.md files"
echo "     • ARCHITECTURE.md, DEPLOYMENT.md, COMMANDS.md"
echo ""
echo "  2. 📦 Archive to docs/archive/app-cleanup/:"
echo "     • Old migration docs from mobile/docs/sql-transition/"
echo "     • Completed summaries and checklists"
echo ""
echo "  3. 🚚 Move to main docs/:"
echo "     • Scan reports → docs/scans/"
echo "     • API phase docs → docs/archive/phases/web-api/"
echo ""
echo "  4. 📊 Generate report of what remains for manual review"
echo ""

read -p "Continue with cleanup? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Cleanup cancelled.${NC}"
    exit 0
fi

LOG_FILE="quick-cleanup-$(date +%Y-%m-%d-%H-%M-%S).log"
MOVED=0
ARCHIVED=0

echo "" | tee -a "$LOG_FILE"
echo -e "${GREEN}Starting cleanup...${NC}" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Create archive directory
ARCHIVE_DIR="docs/archive/app-cleanup-$(date +%Y-%m-%d)"
mkdir -p "$ARCHIVE_DIR/mobile"
mkdir -p "$ARCHIVE_DIR/web"
mkdir -p "docs/archive/phases/web-api"

# 1. Archive mobile SQL transition docs
echo -e "${YELLOW}📦 Archiving mobile SQL transition docs...${NC}" | tee -a "$LOG_FILE"
if [ -d "apps/mobile/docs/sql-transtion" ]; then
    SQL_COUNT=$(find apps/mobile/docs/sql-transtion -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$SQL_COUNT" -gt 0 ]; then
        mv apps/mobile/docs/sql-transtion/* "$ARCHIVE_DIR/mobile/" 2>/dev/null || true
        echo "  ✓ Archived $SQL_COUNT SQL transition docs" | tee -a "$LOG_FILE"
        ARCHIVED=$((ARCHIVED + SQL_COUNT))
    fi
fi

# 2. Move web API phase/migration docs to archive
echo -e "${YELLOW}📦 Moving web API phase docs to archive...${NC}" | tee -a "$LOG_FILE"
WEB_API_COUNT=0
find apps/web/app/api -name "*.md" 2>/dev/null | while read file; do
    basename=$(basename "$file")
    # Create subdirectory structure
    rel_path=$(echo "$file" | sed 's|apps/web/app/api/||')
    dest_dir="docs/archive/phases/web-api/$(dirname "$rel_path")"
    mkdir -p "$dest_dir"
    mv "$file" "$dest_dir/" 2>/dev/null || true
    echo "  ✓ Moved $rel_path" | tee -a "$LOG_FILE"
    WEB_API_COUNT=$((WEB_API_COUNT + 1))
done
if [ "$WEB_API_COUNT" -gt 0 ]; then
    echo "  ✓ Moved $WEB_API_COUNT web API docs" | tee -a "$LOG_FILE"
    MOVED=$((MOVED + WEB_API_COUNT))
fi

# 3. Archive summaries and checklists (not essential)
echo -e "${YELLOW}📦 Archiving old summaries and checklists...${NC}" | tee -a "$LOG_FILE"
SUMMARY_COUNT=0
for file in $(find apps/mobile/docs apps/web -name "*SUMMARY*.md" -o -name "*CHECKLIST*.md" 2>/dev/null); do
    if [[ "$file" =~ "apps/mobile" ]]; then
        cp "$file" "$ARCHIVE_DIR/mobile/" 2>/dev/null || true
    else
        cp "$file" "$ARCHIVE_DIR/web/" 2>/dev/null || true
    fi
    rm "$file" 2>/dev/null || true
    echo "  ✓ Archived $(basename "$file")" | tee -a "$LOG_FILE"
    SUMMARY_COUNT=$((SUMMARY_COUNT + 1))
done
if [ "$SUMMARY_COUNT" -gt 0 ]; then
    echo "  ✓ Archived $SUMMARY_COUNT summary/checklist docs" | tee -a "$LOG_FILE"
    ARCHIVED=$((ARCHIVED + SUMMARY_COUNT))
fi

# 4. Move any remaining root-level docs in web (except README and MIGRATION_README)
echo -e "${YELLOW}🚚 Cleaning up web root docs...${NC}" | tee -a "$LOG_FILE"
WEB_ROOT_COUNT=0
for file in apps/web/*.md; do
    [ -f "$file" ] || continue
    basename=$(basename "$file")
    if [[ "$basename" != "README.md" ]] && [[ "$basename" != "MIGRATION_README.md" ]]; then
        mv "$file" "$ARCHIVE_DIR/web/" 2>/dev/null || true
        echo "  ✓ Archived $basename" | tee -a "$LOG_FILE"
        WEB_ROOT_COUNT=$((WEB_ROOT_COUNT + 1))
    fi
done
if [ "$WEB_ROOT_COUNT" -gt 0 ]; then
    echo "  ✓ Moved $WEB_ROOT_COUNT web root docs" | tee -a "$LOG_FILE"
    ARCHIVED=$((ARCHIVED + WEB_ROOT_COUNT))
fi

echo "" | tee -a "$LOG_FILE"
echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}" | tee -a "$LOG_FILE"
echo -e "${BLUE}║                  📊 Cleanup Summary                      ║${NC}" | tee -a "$LOG_FILE"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Final counts
MOBILE_AFTER=$(find apps/mobile -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
WEB_AFTER=$(find apps/web -name "*.md" 2>/dev/null | wc -l | tr -d ' ')

echo "Before cleanup:" | tee -a "$LOG_FILE"
echo "  Mobile: $MOBILE_COUNT files" | tee -a "$LOG_FILE"
echo "  Web: $WEB_COUNT files" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "After cleanup:" | tee -a "$LOG_FILE"
echo "  Mobile: $MOBILE_AFTER files (removed $((MOBILE_COUNT - MOBILE_AFTER)))" | tee -a "$LOG_FILE"
echo "  Web: $WEB_AFTER files (removed $((WEB_COUNT - WEB_AFTER)))" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "Actions taken:" | tee -a "$LOG_FILE"
echo "  Moved: $MOVED files" | tee -a "$LOG_FILE"
echo "  Archived: $ARCHIVED files" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo -e "${CYAN}Archive location:${NC} $ARCHIVE_DIR" | tee -a "$LOG_FILE"
echo -e "${CYAN}Log file:${NC} $LOG_FILE" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Show what remains
echo -e "${YELLOW}📋 What remains for manual review:${NC}" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

echo -e "${CYAN}Mobile docs that remain ($MOBILE_AFTER files):${NC}" | tee -a "$LOG_FILE"
find apps/mobile -name "*.md" 2>/dev/null | head -20 | while read file; do
    echo "  • $file" | tee -a "$LOG_FILE"
done
if [ "$MOBILE_AFTER" -gt 20 ]; then
    echo "  ... and $((MOBILE_AFTER - 20)) more" | tee -a "$LOG_FILE"
fi
echo "" | tee -a "$LOG_FILE"

echo -e "${CYAN}Web docs that remain ($WEB_AFTER files):${NC}" | tee -a "$LOG_FILE"
find apps/web -name "*.md" 2>/dev/null | while read file; do
    echo "  • $file" | tee -a "$LOG_FILE"
done
echo "" | tee -a "$LOG_FILE"

# Recommendations
echo -e "${YELLOW}💡 Next Steps:${NC}" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "1. Review the remaining mobile docs:" | tee -a "$LOG_FILE"
echo "   ls -la apps/mobile/docs/" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "2. Most mobile docs are feature-specific and can be moved:" | tee -a "$LOG_FILE"
echo "   # Auth docs → main docs" | tee -a "$LOG_FILE"
echo "   mv apps/mobile/docs/AUTHENTICATION.md docs/mobile/authentication/" | tee -a "$LOG_FILE"
echo "   mv apps/mobile/docs/AUTH_*.md docs/troubleshooting/mobile/" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "   # Theme docs → main docs" | tee -a "$LOG_FILE"
echo "   mv apps/mobile/docs/THEME_*.md docs/features/theming/mobile/" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "   # Setup docs → main docs" | tee -a "$LOG_FILE"
echo "   mv apps/mobile/docs/*SETUP*.md docs/mobile/setup/" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "3. Keep only these essentials in apps/mobile/:" | tee -a "$LOG_FILE"
echo "   • README.md" | tee -a "$LOG_FILE"
echo "   • ARCHITECTURE.md" | tee -a "$LOG_FILE"
echo "   • DEPLOYMENT.md" | tee -a "$LOG_FILE"
echo "   • COMMANDS.md" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "4. Run scanner to verify:" | tee -a "$LOG_FILE"
echo "   ./scan-markdown-docs.sh" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

echo -e "${GREEN}✅ Cleanup complete!${NC}" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "Review the log: cat $LOG_FILE" | tee -a "$LOG_FILE"
