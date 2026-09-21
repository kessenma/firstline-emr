#!/bin/bash

# Markdown Documentation Migration Script
# Intelligently moves markdown files to organized docs/ structure

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Statistics
TOTAL_MOVED=0
TOTAL_SKIPPED=0
TOTAL_ERRORS=0

# Log file
LOG_FILE="markdown-migration-$(date +%Y-%m-%d-%H-%M-%S).log"
BACKUP_DIR=".markdown-backup-$(date +%Y-%m-%d-%H-%M-%S)"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                          ║${NC}"
echo -e "${BLUE}║       📚 Markdown Documentation Migration Tool          ║${NC}"
echo -e "${BLUE}║                                                          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if we're in the correct directory
if [ ! -d "docs" ]; then
    echo -e "${RED}❌ Error: docs/ directory not found!${NC}"
    echo "   Please run this script from the project root directory"
    exit 1
fi

# Function to log messages
log() {
    echo "$1" >> "$LOG_FILE"
    echo -e "$1"
}

# Function to create directory if it doesn't exist
ensure_dir() {
    local dir=$1
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        log "  ${GREEN}✓${NC} Created directory: $dir"
    fi
}

# Function to backup a file before moving
backup_file() {
    local file=$1
    if [ -f "$file" ]; then
        local backup_path="$BACKUP_DIR/$file"
        local backup_dir=$(dirname "$backup_path")
        mkdir -p "$backup_dir"
        cp "$file" "$backup_path"
    fi
}

# Function to add metadata to a markdown file
add_metadata_to_file() {
    local file=$1
    local original_location=$2
    local migration_date=$(date +%Y-%m-%d)

    # Create temporary file with metadata
    local temp_file="${file}.tmp"

    # Add metadata header
    cat > "$temp_file" << EOF
> **📋 File Migration Info**
> - **Original Location:** \`$original_location\`
> - **Moved Date:** $migration_date
> - **Moved By:** migrate-markdown-docs.sh

---

EOF

    # Append original content
    cat "$file" >> "$temp_file"

    # Replace original with metadata version
    mv "$temp_file" "$file"
}

# Function to move file with confirmation
move_file() {
    local source=$1
    local dest=$2
    local reason=$3

    if [ ! -f "$source" ]; then
        return 1
    fi

    # Backup before moving
    backup_file "$source"

    # Create destination directory
    local dest_dir=$(dirname "$dest")
    ensure_dir "$dest_dir"

    # Move the file
    if mv "$source" "$dest" 2>/dev/null; then
        # Add metadata to the moved file
        add_metadata_to_file "$dest" "$source"

        log "  ${GREEN}→${NC} $source"
        log "    ${CYAN}to${NC} $dest"
        if [ ! -z "$reason" ]; then
            log "    ${MAGENTA}»${NC} $reason"
        fi
        log "    ${BLUE}✓${NC} Added migration metadata to file"
        ((TOTAL_MOVED++))
        return 0
    else
        log "  ${RED}✗${NC} Failed to move $source"
        ((TOTAL_ERRORS++))
        return 1
    fi
}

# Function to create folder structure
create_structure() {
    log "${YELLOW}📁 Creating structured documentation folders...${NC}"
    echo ""
    log "${CYAN}Creating the following structure:${NC}"
    log "  docs/"
    log "  ├── setup/           ${BLUE}(Getting started guides)${NC}"
    log "  ├── architecture/    ${BLUE}(System design)${NC}"
    log "  ├── api/            ${BLUE}(API documentation)${NC}"
    log "  ├── features/       ${BLUE}(Feature-specific docs)${NC}"
    log "  ├── migrations/     ${BLUE}(Migration docs)${NC}"
    log "  ├── troubleshooting/${BLUE}(Debugging & fixes)${NC}"
    log "  ├── testing/        ${BLUE}(Testing docs)${NC}"
    log "  ├── mobile/         ${BLUE}(Mobile-specific)${NC}"
    log "  ├── web/            ${BLUE}(Web-specific)${NC}"
    log "  ├── analytics/      ${BLUE}(Analytics-specific)${NC}"
    log "  ├── fixes/          ${BLUE}(Bug fix reports)${NC}"
    log "  ├── archive/        ${BLUE}(Historical docs)${NC}"
    log "  └── scans/          ${BLUE}(Scan reports)${NC}"
    echo ""

    ensure_dir "docs/setup/quick-start"
    ensure_dir "docs/setup/deployment"
    ensure_dir "docs/setup/environment"
    ensure_dir "docs/architecture/database"
    ensure_dir "docs/architecture/authentication"
    ensure_dir "docs/architecture/messaging"
    ensure_dir "docs/api/endpoints"
    ensure_dir "docs/api/helpers"
    ensure_dir "docs/features/authentication"
    ensure_dir "docs/features/messaging"
    ensure_dir "docs/features/livekit"
    ensure_dir "docs/features/theming"
    ensure_dir "docs/features/analytics"
    ensure_dir "docs/features/medevac"
    ensure_dir "docs/migrations/mongodb-to-postgres"
    ensure_dir "docs/migrations/couchbase-to-powersync"
    ensure_dir "docs/migrations/phases"
    ensure_dir "docs/troubleshooting/authentication"
    ensure_dir "docs/troubleshooting/deployment"
    ensure_dir "docs/troubleshooting/database"
    ensure_dir "docs/testing/checklists"
    ensure_dir "docs/testing/strategies"
    ensure_dir "docs/mobile/setup"
    ensure_dir "docs/mobile/components"
    ensure_dir "docs/mobile/deployment"
    ensure_dir "docs/web/setup"
    ensure_dir "docs/web/components"
    ensure_dir "docs/analytics/setup"
    ensure_dir "docs/fixes/$(date +%Y-%m)"
    ensure_dir "docs/archive/$(date +%Y-%m)"
    ensure_dir "docs/archive/phases"
    ensure_dir "docs/archive/stages"
    ensure_dir "docs/archive/deprecated"
    ensure_dir "docs/scans"

    echo ""
    log "${GREEN}✅ Structured documentation folders created!${NC}"
    echo ""
}

# Function to migrate root-level files
migrate_root_files() {
    log "${YELLOW}📦 Migrating root-level markdown files...${NC}"
    echo ""

    # Phase completions
    if [ -f "PHASE_0_3_COMPLETE.md" ]; then
        move_file "PHASE_0_3_COMPLETE.md" "docs/archive/phases/phase-0.3-complete.md" "Phase completion"
    fi

    if [ -f "PHASE_0_COMPLETE.md" ]; then
        move_file "PHASE_0_COMPLETE.md" "docs/archive/phases/phase-0-complete.md" "Phase completion"
    fi

    if [ -f "PHASE_1_MIGRATION_SUMMARY.md" ]; then
        move_file "PHASE_1_MIGRATION_SUMMARY.md" "docs/archive/phases/phase-1-migration-summary.md" "Phase completion"
    fi

    # Migration completions
    if [ -f "MONGODB-MIGRATION-COMPLETE.md" ]; then
        move_file "MONGODB-MIGRATION-COMPLETE.md" "docs/migrations/mongodb-to-postgres/completion.md" "Migration documentation"
    fi

    # Setup files
    if [ -f "SETUP_COMPLETE.md" ]; then
        move_file "SETUP_COMPLETE.md" "docs/archive/setup-complete-$(date +%Y-%m-%d).md" "Historical setup doc"
    fi

    # Feature-specific: LiveKit
    if [ -f "LIVEKIT_SETUP_SUMMARY.md" ]; then
        move_file "LIVEKIT_SETUP_SUMMARY.md" "docs/features/livekit/setup-summary.md" "LiveKit feature doc"
    fi

    if [ -f "LIVEKIT_TODO.md" ]; then
        move_file "LIVEKIT_TODO.md" "docs/features/livekit/todo.md" "LiveKit feature doc"
    fi

    # Feature-specific: Telegram
    if [ -f "TELEGRAM_PHASE_1_READY.md" ]; then
        move_file "TELEGRAM_PHASE_1_READY.md" "docs/features/messaging/telegram-phase-1.md" "Messaging feature doc"
    fi

    # Fixes
    if [ -f "REDIRECT_LOOP_FIX_SUMMARY.md" ]; then
        move_file "REDIRECT_LOOP_FIX_SUMMARY.md" "docs/fixes/$(date +%Y-%m)/redirect-loop-fix.md" "Bug fix documentation"
    fi

    # Feature-specific: Medevac
    if [ -f "MEDEVAC_AUDIT_TRAIL.md" ]; then
        move_file "MEDEVAC_AUDIT_TRAIL.md" "docs/features/medevac/audit-trail.md" "Feature documentation"
    fi

    # PowerSync
    if [ -f "POWERSYNC_NEXT_STEPS.md" ]; then
        move_file "POWERSYNC_NEXT_STEPS.md" "docs/migrations/couchbase-to-powersync/next-steps.md" "Migration documentation"
    fi

    # Scan reports (move to scans folder)
    for file in mongodb-api-scan-*.md mongodb-endpoints-list-*.txt mobile-auth-scan-*.md mobile-auth-*.csv theme-colors-scan-*.md markdown-scan-*.md markdown-scan-*.csv; do
        if [ -f "$file" ]; then
            move_file "$file" "docs/scans/$file" "Scan report"
        fi
    done

    # My profile logs (probably temporary)
    if [ -f "my-profile-logs.md" ]; then
        move_file "my-profile-logs.md" "docs/archive/$(date +%Y-%m)/my-profile-logs.md" "Temporary log file"
    fi

    log "${GREEN}✅ Root files migrated!${NC}"
    echo ""
}

# Function to migrate apps/docs folder
migrate_apps_docs() {
    log "${YELLOW}📦 Migrating apps/docs/ files...${NC}"
    echo ""

    if [ ! -d "apps/docs" ]; then
        log "  ${YELLOW}⚠${NC}  apps/docs/ not found, skipping..."
        return
    fi

    # Login-related docs
    if [ -f "apps/docs/LOGIN_DEBUG_GUIDE.md" ]; then
        move_file "apps/docs/LOGIN_DEBUG_GUIDE.md" "docs/troubleshooting/authentication/login-debug-guide.md" "Auth troubleshooting"
    fi

    if [ -f "apps/docs/LOGIN_FIX_SUMMARY.md" ]; then
        move_file "apps/docs/LOGIN_FIX_SUMMARY.md" "docs/fixes/$(date +%Y-%m)/login-fix-summary.md" "Bug fix"
    fi

    if [ -f "apps/docs/LOGIN_TEST_CHECKLIST.md" ]; then
        move_file "apps/docs/LOGIN_TEST_CHECKLIST.md" "docs/testing/checklists/login-tests.md" "Test checklist"
    fi

    # WebSocket docs
    if [ -f "apps/docs/WEBSOCKET_QUICKSTART.md" ]; then
        move_file "apps/docs/WEBSOCKET_QUICKSTART.md" "docs/features/messaging/websocket-quickstart.md" "Feature doc"
    fi

    if [ -f "apps/docs/WEBSOCKET_SETUP.md" ]; then
        move_file "apps/docs/WEBSOCKET_SETUP.md" "docs/features/messaging/websocket-setup.md" "Feature doc"
    fi

    # Internal messages
    if [ -f "apps/docs/INTERNAL_MESSAGES_MEDIA_LOADING_FIX.md" ]; then
        move_file "apps/docs/INTERNAL_MESSAGES_MEDIA_LOADING_FIX.md" "docs/fixes/$(date +%Y-%m)/internal-messages-media-fix.md" "Bug fix"
    fi

    if [ -f "apps/docs/INTERNAL_MESSAGES_MEDIA_SETUP.md" ]; then
        move_file "apps/docs/INTERNAL_MESSAGES_MEDIA_SETUP.md" "docs/features/messaging/internal-messages-media.md" "Feature doc"
    fi

    if [ -f "apps/docs/INTERNAL_MESSAGES_OPTIMISTIC_UI.md" ]; then
        move_file "apps/docs/INTERNAL_MESSAGES_OPTIMISTIC_UI.md" "docs/features/messaging/internal-messages-optimistic-ui.md" "Feature doc"
    fi

    if [ -f "apps/docs/INTERNAL_MESSAGES_UI_POLISH.md" ]; then
        move_file "apps/docs/INTERNAL_MESSAGES_UI_POLISH.md" "docs/features/messaging/internal-messages-ui-polish.md" "Feature doc"
    fi

    # Migration docs
    if [ -f "apps/docs/mongoDB-upgrade-notes.md" ]; then
        move_file "apps/docs/mongoDB-upgrade-notes.md" "docs/migrations/mongodb-to-postgres/upgrade-notes.md" "Migration doc"
    fi

    if [ -f "apps/docs/mongoose-upgrade.md" ]; then
        move_file "apps/docs/mongoose-upgrade.md" "docs/migrations/mongodb-to-postgres/mongoose-upgrade.md" "Migration doc"
    fi

    # Setup guides
    if [ -f "apps/docs/coolify_setup.md" ]; then
        move_file "apps/docs/coolify_setup.md" "docs/setup/deployment/coolify.md" "Deployment guide"
    fi

    if [ -f "apps/docs/pip-to-uv-guide.md" ]; then
        move_file "apps/docs/pip-to-uv-guide.md" "docs/setup/environment/pip-to-uv-guide.md" "Environment setup"
    fi

    if [ -f "apps/docs/tailwind-upgrade-guide.md" ]; then
        move_file "apps/docs/tailwind-upgrade-guide.md" "docs/web/setup/tailwind-upgrade.md" "Web setup"
    fi

    log "${GREEN}✅ apps/docs/ migrated!${NC}"
    echo ""
}

# Function to migrate theme-refactor docs
migrate_theme_refactor_docs() {
    log "${YELLOW}📦 Migrating theme-refactor docs...${NC}"
    echo ""

    if [ ! -d "apps/docs/theme-refactor" ]; then
        log "  ${YELLOW}⚠${NC}  apps/docs/theme-refactor/ not found, skipping..."
        return
    fi

    ensure_dir "docs/archive/stages/theme-refactor"
    ensure_dir "docs/features/theming"

    # Move completion docs to archive
    for file in apps/docs/theme-refactor/*complete*.md apps/docs/theme-refactor/*completion*.md apps/docs/theme-refactor/*COMPLETE*.md apps/docs/theme-refactor/*COMPLETION*.md; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            move_file "$file" "docs/archive/stages/theme-refactor/$filename" "Completed stage"
        fi
    done

    # Move phase/stage summary docs
    for file in apps/docs/theme-refactor/*PHASE*.md apps/docs/theme-refactor/*STAGE*.md apps/docs/theme-refactor/*SUMMARY*.md; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            move_file "$file" "docs/archive/stages/theme-refactor/$filename" "Stage summary"
        fi
    done

    # Move active theme docs to features
    if [ -f "apps/docs/theme-refactor/theme-refactor-checklist.md" ]; then
        move_file "apps/docs/theme-refactor/theme-refactor-checklist.md" "docs/features/theming/refactor-checklist.md" "Active theme doc"
    fi

    if [ -f "apps/docs/theme-refactor/theme-refactor-strategy.md" ]; then
        move_file "apps/docs/theme-refactor/theme-refactor-strategy.md" "docs/features/theming/refactor-strategy.md" "Active theme doc"
    fi

    # Archive the rest
    for file in apps/docs/theme-refactor/*.md; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            move_file "$file" "docs/archive/stages/theme-refactor/$filename" "Theme refactor archive"
        fi
    done

    log "${GREEN}✅ Theme-refactor docs migrated!${NC}"
    echo ""
}

# Function to migrate livekit docs
migrate_livekit_docs() {
    log "${YELLOW}📦 Migrating LiveKit docs...${NC}"
    echo ""

    if [ -d "apps/docs/livekit" ]; then
        ensure_dir "docs/features/livekit"

        for file in apps/docs/livekit/*.md; do
            if [ -f "$file" ]; then
                filename=$(basename "$file")
                # Convert to lowercase kebab-case
                new_name=$(echo "$filename" | tr '[:upper:]' '[:lower:]' | sed 's/_/-/g')
                move_file "$file" "docs/features/livekit/$new_name" "LiveKit feature doc"
            fi
        done
    fi

    if [ -d "apps/livekit-server" ]; then
        # Keep these in place but note them
        log "  ${BLUE}ℹ${NC}  Keeping apps/livekit-server/*.md in place (app-specific)"
        ((TOTAL_SKIPPED++))
    fi

    log "${GREEN}✅ LiveKit docs migrated!${NC}"
    echo ""
}

# Function to migrate mobile docs
migrate_mobile_docs() {
    log "${YELLOW}📦 Migrating mobile docs (selective)...${NC}"
    echo ""

    if [ ! -d "apps/mobile/docs" ]; then
        log "  ${YELLOW}⚠${NC}  apps/mobile/docs/ not found, skipping..."
        return
    fi

    # Move phase completion docs
    for file in apps/mobile/PHASE_*.md; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            move_file "$file" "docs/archive/phases/$filename" "Mobile phase completion"
        fi
    done

    # Move SQL transition docs
    if [ -d "apps/mobile/docs/sql-transtion" ]; then
        ensure_dir "docs/migrations/couchbase-to-powersync/mobile"
        for file in apps/mobile/docs/sql-transtion/*.md; do
            if [ -f "$file" ]; then
                filename=$(basename "$file")
                move_file "$file" "docs/migrations/couchbase-to-powersync/mobile/$filename" "Mobile migration doc"
            fi
        done
    fi

    # Note: Keep most mobile docs in place as they're app-specific
    log "  ${BLUE}ℹ${NC}  Keeping most apps/mobile/docs/*.md in place (app-specific)"
    log "  ${BLUE}ℹ${NC}  Only migrated phase completions and migration docs"

    log "${GREEN}✅ Mobile docs (selective) migrated!${NC}"
    echo ""
}

# Function to migrate analytics docs
migrate_analytics_docs() {
    log "${YELLOW}📦 Migrating analytics docs (selective)...${NC}"
    echo ""

    if [ ! -d "apps/analytics" ]; then
        log "  ${YELLOW}⚠${NC}  apps/analytics/ not found, skipping..."
        return
    fi

    # Move migration docs
    if [ -f "apps/analytics/UV_MIGRATION.md" ]; then
        move_file "apps/analytics/UV_MIGRATION.md" "docs/analytics/setup/uv-migration.md" "Analytics migration"
    fi

    if [ -f "apps/analytics/analytics_postgres_upgrade.md" ]; then
        move_file "apps/analytics/analytics_postgres_upgrade.md" "docs/analytics/setup/postgres-upgrade.md" "Analytics upgrade"
    fi

    if [ -f "apps/analytics/ARCHITECTURE_DETECTION.md" ]; then
        move_file "apps/analytics/ARCHITECTURE_DETECTION.md" "docs/analytics/architecture-detection.md" "Analytics architecture"
    fi

    # Note: Keep app-specific docs in place
    log "  ${BLUE}ℹ${NC}  Keeping apps/analytics/docs/ in place (app-specific)"

    log "${GREEN}✅ Analytics docs migrated!${NC}"
    echo ""
}

# Function to show summary
show_summary() {
    echo ""
    log "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
    log "${BLUE}║                                                          ║${NC}"
    log "${BLUE}║                  📊 Migration Summary                    ║${NC}"
    log "${BLUE}║                                                          ║${NC}"
    log "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""

    log "  ${GREEN}✓${NC} Files moved: ${GREEN}$TOTAL_MOVED${NC}"
    log "  ${YELLOW}⊘${NC} Files skipped: ${YELLOW}$TOTAL_SKIPPED${NC}"
    log "  ${RED}✗${NC} Errors: ${RED}$TOTAL_ERRORS${NC}"
    echo ""

    if [ $TOTAL_MOVED -gt 0 ]; then
        log "  ${CYAN}📦 Backup created:${NC} $BACKUP_DIR"
        log "  ${CYAN}📋 Log file:${NC} $LOG_FILE"
    fi

    echo ""
    log "${YELLOW}📝 Next Steps:${NC}"
    echo ""
    log "  1. Review the changes:"
    log "     ${CYAN}cat $LOG_FILE${NC}"
    echo ""
    log "  2. Check for broken links:"
    log "     ${CYAN}grep -r \"\\[.*\\](.*\\.md)\" docs/${NC}"
    echo ""
    log "  3. Run scanner to verify organization:"
    log "     ${CYAN}./scan-markdown-docs.sh${NC}"
    echo ""
    log "  4. If everything looks good, you can remove the backup:"
    log "     ${CYAN}rm -rf $BACKUP_DIR${NC}"
    echo ""
    log "  5. Commit the changes:"
    log "     ${CYAN}git add docs/ apps/${NC}"
    log "     ${CYAN}git commit -m \"docs: organize markdown documentation\"${NC}"
    echo ""
}

# Main execution
main() {
    log "Migration started at $(date)"
    echo ""
    echo -e "${YELLOW}This script will:${NC}"
    echo "  • Create a backup of all files before moving"
    echo "  • Create the complete docs/ folder structure with categories"
    echo "  • Move root-level .md files to appropriate locations"
    echo "  • Add metadata to each moved file showing original location"
    echo "  • Migrate select files from apps/docs/"
    echo "  • Archive completed phase/stage documentation"
    echo "  • Keep app-specific docs in place"
    echo ""
    echo -e "${CYAN}Structured folders to be created:${NC}"
    echo "  docs/setup, docs/features, docs/migrations, docs/archive,"
    echo "  docs/troubleshooting, docs/testing, docs/fixes, docs/scans, etc."
    echo ""
    read -p "Do you want to proceed? (y/n) " -n 1 -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Migration cancelled.${NC}"
        exit 0
    fi

    echo ""
    log "${GREEN}Starting migration...${NC}"
    echo ""

    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    log "${CYAN}📦 Backup directory created: $BACKUP_DIR${NC}"
    echo ""

    # Execute migrations
    create_structure
    migrate_root_files
    migrate_apps_docs
    migrate_theme_refactor_docs
    migrate_livekit_docs
    migrate_mobile_docs
    migrate_analytics_docs

    # Show summary
    show_summary

    log "Migration completed at $(date)"
}

# Run main function
main
