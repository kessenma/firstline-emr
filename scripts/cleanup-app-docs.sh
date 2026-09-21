#!/bin/bash

# App Documentation Cleanup Script
# Intelligently cleans up .md files in apps/mobile and apps/web

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Counters
MOBILE_KEPT=0
MOBILE_ARCHIVED=0
MOBILE_DELETED=0
WEB_KEPT=0
WEB_ARCHIVED=0
WEB_DELETED=0

LOG_FILE="cleanup-app-docs-$(date +%Y-%m-%d-%H-%M-%S).log"
ARCHIVE_DIR="docs/archive/app-docs-cleanup-$(date +%Y-%m-%d)"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                          ║${NC}"
echo -e "${BLUE}║         📚 App Documentation Cleanup Tool               ║${NC}"
echo -e "${BLUE}║                                                          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

log() {
    echo "$1" | tee -a "$LOG_FILE"
}

# Function to check if file should be kept
should_keep_file() {
    local file=$1
    local basename=$(basename "$file")

    # Always keep these
    if [[ "$basename" == "README.md" ]]; then
        return 0
    fi

    # Keep essential mobile docs
    if echo "$file" | grep -q "apps/mobile"; then
        case "$basename" in
            ARCHITECTURE.md|DEPENDENCIES.md|DEPLOYMENT.md|COMMANDS.md)
                return 0
                ;;
            QUICK_START*.md|SETUP*.md|TROUBLESHOOTING.md)
                return 0
                ;;
        esac
    fi

    # Keep essential web docs
    if echo "$file" | grep -q "apps/web"; then
        case "$basename" in
            README.md|MIGRATION_README.md)
                return 0
                ;;
        esac
    fi

    return 1
}

# Function to check if file should be archived
should_archive_file() {
    local file=$1
    local basename=$(basename "$file")

    # Archive patterns
    if [[ "$basename" =~ PHASE.*COMPLETE|MIGRATION.*COMPLETE|.*_COMPLETE\.md ]]; then
        return 0
    fi

    if [[ "$basename" =~ CHECKLIST|SUMMARY|QUICK_REFERENCE ]]; then
        return 0
    fi

    if [[ "$basename" =~ mobile-auth-scan|mongodb-api-scan|theme-colors-scan ]]; then
        return 0
    fi

    return 1
}

# Function to check if file is likely outdated/duplicate
is_likely_duplicate() {
    local file=$1
    local content_size=$(wc -c < "$file" 2>/dev/null || echo 0)

    # Very small files (< 100 bytes) might be placeholders
    if [ "$content_size" -lt 100 ]; then
        return 0
    fi

    return 1
}

# Analyze function
analyze_docs() {
    local app=$1
    local app_path="apps/$app"

    log ""
    log "${YELLOW}📊 Analyzing $app documentation...${NC}"
    log ""

    local total=$(find "$app_path" -name "*.md" | wc -l)
    local in_docs=$(find "$app_path/docs" -name "*.md" 2>/dev/null | wc -l || echo 0)
    local at_root=$(find "$app_path" -maxdepth 1 -name "*.md" | wc -l)

    log "  Total .md files: ${CYAN}$total${NC}"
    log "  In $app/docs/: ${CYAN}$in_docs${NC}"
    log "  At $app root: ${CYAN}$at_root${NC}"

    # Show root files
    if [ "$at_root" -gt 0 ]; then
        log ""
        log "  ${MAGENTA}Root-level files:${NC}"
        find "$app_path" -maxdepth 1 -name "*.md" | while read file; do
            log "    - $(basename "$file")"
        done
    fi

    # Sample some docs/ files
    if [ "$in_docs" -gt 0 ]; then
        log ""
        log "  ${MAGENTA}Sample from $app/docs/:${NC}"
        find "$app_path/docs" -name "*.md" 2>/dev/null | head -10 | while read file; do
            local rel=$(echo "$file" | sed "s|$app_path/docs/||")
            log "    - $rel"
        done
        if [ "$in_docs" -gt 10 ]; then
            log "    ... and $((in_docs - 10)) more"
        fi
    fi
}

# Cleanup function
cleanup_app() {
    local app=$1
    local app_path="apps/$app"

    log ""
    log "${YELLOW}🧹 Cleaning up $app documentation...${NC}"
    log ""

    mkdir -p "$ARCHIVE_DIR/$app"

    # Process all .md files
    find "$app_path" -name "*.md" | while read file; do
        local basename=$(basename "$file")
        local relative=$(echo "$file" | sed "s|$app_path/||")

        if should_keep_file "$file"; then
            log "  ${GREEN}✓ KEEP${NC} $relative"
            if [ "$app" == "mobile" ]; then
                ((MOBILE_KEPT++))
            else
                ((WEB_KEPT++))
            fi
        elif should_archive_file "$file"; then
            # Archive it
            local archive_path="$ARCHIVE_DIR/$app/$relative"
            mkdir -p "$(dirname "$archive_path")"
            cp "$file" "$archive_path"
            rm "$file"
            log "  ${YELLOW}📦 ARCHIVE${NC} $relative → docs/archive/"
            if [ "$app" == "mobile" ]; then
                ((MOBILE_ARCHIVED++))
            else
                ((WEB_ARCHIVED++))
            fi
        else
            # Suggest deletion but don't auto-delete
            log "  ${RED}❓ REVIEW${NC} $relative (suggest delete if outdated)"
            if [ "$app" == "mobile" ]; then
                ((MOBILE_DELETED++))
            else
                ((WEB_DELETED++))
            fi
        fi
    done
}

# Review mode - just show what would happen
review_mode() {
    log "${CYAN}🔍 REVIEW MODE - Showing what would be kept/archived/reviewed${NC}"
    log ""
    log "${YELLOW}Legend:${NC}"
    log "  ${GREEN}✓ KEEP${NC}     - Essential docs, keep in place"
    log "  ${YELLOW}📦 ARCHIVE${NC} - Move to docs/archive/"
    log "  ${RED}❓ REVIEW${NC}   - Manually review (might be duplicate/outdated)"
    log ""

    analyze_docs "mobile"
    analyze_docs "web"
}

# Execution mode
execute_cleanup() {
    log "${YELLOW}⚠️  EXECUTING CLEANUP${NC}"
    log ""
    log "This will:"
    log "  • Keep essential documentation in place"
    log "  • Archive completed/summary docs to docs/archive/"
    log "  • List files that need manual review"
    log ""

    read -p "Continue? (y/n) " -n 1 -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "${YELLOW}Cleanup cancelled.${NC}"
        return
    fi

    # Check if there are files to process
    local mobile_count=$(find apps/mobile -name '*.md' 2>/dev/null | wc -l | tr -d ' ')
    local web_count=$(find apps/web -name '*.md' 2>/dev/null | wc -l | tr -d ' ')

    if [ "$mobile_count" -eq 0 ] && [ "$web_count" -eq 0 ]; then
        log "${YELLOW}⚠️  No .md files found in apps/mobile or apps/web${NC}"
        log "${GREEN}✅ Nothing to clean up - already done!${NC}"
        return
    fi

    cleanup_app "mobile"
    cleanup_app "web"

    log ""
    log "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
    log "${BLUE}║                  📊 Cleanup Summary                      ║${NC}"
    log "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
    log ""
    log "${GREEN}Mobile App:${NC}"
    log "  Kept: $MOBILE_KEPT"
    log "  Archived: $MOBILE_ARCHIVED"
    log "  Need Review: $MOBILE_DELETED"
    log ""
    log "${GREEN}Web App:${NC}"
    log "  Kept: $WEB_KEPT"
    log "  Archived: $WEB_ARCHIVED"
    log "  Need Review: $WEB_DELETED"
    log ""
    if [ $MOBILE_ARCHIVED -gt 0 ] || [ $WEB_ARCHIVED -gt 0 ]; then
        log "${CYAN}Archive location:${NC} $ARCHIVE_DIR"
    fi
    log "${CYAN}Log file:${NC} $LOG_FILE"
}

# Recommendations
show_recommendations() {
    log ""
    log "${YELLOW}📋 Recommendations for Manual Cleanup:${NC}"
    log ""
    log "${CYAN}1. Mobile App Docs Strategy:${NC}"
    log "   KEEP in apps/mobile/:"
    log "   • README.md (package overview)"
    log "   • Essential setup docs (ARCHITECTURE, DEPLOYMENT, COMMANDS)"
    log ""
    log "   MOVE to main docs/mobile/:"
    log "   • Feature-specific docs (auth, theming, components)"
    log "   • Testing guides"
    log "   • Troubleshooting guides"
    log ""
    log "   ARCHIVE to docs/archive/:"
    log "   • Completed phases (PHASE_*_COMPLETE.md)"
    log "   • Migration summaries"
    log "   • Old checklists"
    log ""
    log "   DELETE:"
    log "   • Duplicate scan reports"
    log "   • Outdated temporary notes"
    log "   • Very old migration docs (check dates)"
    log ""
    log "${CYAN}2. Web App Docs Strategy:${NC}"
    log "   KEEP in apps/web/:"
    log "   • README.md"
    log "   • Current migration guide (if actively migrating)"
    log ""
    log "   MOVE to main docs/:"
    log "   • API migration docs → docs/migrations/"
    log "   • Phase completions → docs/archive/phases/"
    log ""
    log "   ARCHIVE/DELETE:"
    log "   • Old scan reports (mobile-auth-scan-*.md)"
    log "   • Completed phase docs in deep folders"
    log "   • Duplicate migration checklists"
    log ""
    log "${CYAN}3. Specific Patterns to Clean:${NC}"
    log "   # Archive all old scans"
    log "   mv apps/web/*-scan-*.md docs/scans/"
    log ""
    log "   # Move API migration docs"
    log "   mv apps/web/app/api/*/MIGRATION*.md docs/migrations/api/"
    log ""
    log "   # Archive completed phases"
    log "   find apps/web -name '*PHASE*COMPLETE*.md' -exec mv {} docs/archive/phases/ \\;"
    log ""
    log "${CYAN}4. Quick Wins:${NC}"
    log "   # Find and count scan reports"
    log "   find apps -name '*-scan-*.md' | wc -l"
    log ""
    log "   # Find migration complete docs"
    log "   find apps -name '*MIGRATION*COMPLETE*.md'"
    log ""
    log "   # Find phase completions"
    log "   find apps -name '*PHASE*COMPLETE*.md'"
    log ""
}

# Main menu
show_menu() {
    while true; do
        echo ""
        echo "What would you like to do?"
        echo ""
        echo "1) Analyze only (see what's in mobile/web docs)"
        echo "2) Review mode (show what would be kept/archived/reviewed)"
        echo "3) Execute cleanup (actually move/archive files)"
        echo "4) Show recommendations for manual cleanup"
        echo "5) Quick stats"
        echo "6) Exit"
        echo ""
        read -p "Enter your choice (1-6): " choice
        echo ""

        case $choice in
            1)
                analyze_docs "mobile"
                analyze_docs "web"
                ;;
            2)
                review_mode
                ;;
            3)
                execute_cleanup
                log ""
                log "${GREEN}✅ Cleanup complete! Press 6 to exit or choose another option.${NC}"
                ;;
            4)
                show_recommendations
                ;;
            5)
                log "Quick Stats:"
                log "  Mobile .md files: $(find apps/mobile -name '*.md' 2>/dev/null | wc -l)"
                log "  Web .md files: $(find apps/web -name '*.md' 2>/dev/null | wc -l)"
                log "  Total: $(find apps/mobile apps/web -name '*.md' 2>/dev/null | wc -l)"
                ;;
            6)
                log "${GREEN}👋 Goodbye!${NC}"
                exit 0
                ;;
            *)
                log "${RED}Invalid choice. Please try again.${NC}"
                ;;
        esac
    done
}

# Start
log "Cleanup started at $(date)"
show_menu
