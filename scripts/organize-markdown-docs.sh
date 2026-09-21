#!/bin/bash

# Markdown Documentation Organization Helper
# This script helps organize markdown files into the docs/ structure

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📚 Markdown Documentation Organizer${NC}"
echo "===================================="
echo ""

# Check if we're in the correct directory
if [ ! -d "docs" ]; then
    echo -e "${RED}❌ Error: docs/ directory not found!${NC}"
    echo "   Please run this script from the project root directory"
    exit 1
fi

# Function to create directory structure
create_structure() {
    echo -e "${YELLOW}📁 Creating documentation structure...${NC}"

    mkdir -p docs/setup/quick-start
    mkdir -p docs/setup/deployment
    mkdir -p docs/setup/environment
    mkdir -p docs/architecture/database
    mkdir -p docs/architecture/authentication
    mkdir -p docs/architecture/messaging
    mkdir -p docs/api/endpoints
    mkdir -p docs/api/helpers
    mkdir -p docs/features/authentication
    mkdir -p docs/features/messaging
    mkdir -p docs/features/livekit
    mkdir -p docs/features/theming
    mkdir -p docs/features/analytics
    mkdir -p docs/migrations/mongodb-to-postgres
    mkdir -p docs/migrations/couchbase-to-powersync
    mkdir -p docs/migrations/phases
    mkdir -p docs/troubleshooting/authentication
    mkdir -p docs/troubleshooting/deployment
    mkdir -p docs/troubleshooting/database
    mkdir -p docs/testing/checklists
    mkdir -p docs/testing/strategies
    mkdir -p docs/mobile/setup
    mkdir -p docs/mobile/components
    mkdir -p docs/mobile/deployment
    mkdir -p docs/web/setup
    mkdir -p docs/web/components
    mkdir -p docs/analytics/setup
    mkdir -p docs/fixes/$(date +%Y-%m)
    mkdir -p docs/archive/$(date +%Y-%m)
    mkdir -p docs/archive/phases
    mkdir -p docs/archive/stages
    mkdir -p docs/archive/deprecated

    echo -e "${GREEN}✅ Structure created!${NC}"
    echo ""
}

# Function to move a file with confirmation
move_file() {
    local source=$1
    local dest=$2

    if [ ! -f "$source" ]; then
        echo -e "${YELLOW}⚠️  File not found: $source${NC}"
        return 1
    fi

    local dest_dir=$(dirname "$dest")
    mkdir -p "$dest_dir"

    echo -e "  ${BLUE}→${NC} $source"
    echo -e "    ${GREEN}to${NC} $dest"
    mv "$source" "$dest"
}

# Function to organize root level files
organize_root_files() {
    echo -e "${YELLOW}📦 Organizing root-level markdown files...${NC}"
    echo ""

    # Phase completion files
    if [ -f "PHASE_0_3_COMPLETE.md" ]; then
        move_file "PHASE_0_3_COMPLETE.md" "docs/archive/phases/phase-0.3-complete.md"
    fi

    if [ -f "PHASE_0_COMPLETE.md" ]; then
        move_file "PHASE_0_COMPLETE.md" "docs/archive/phases/phase-0-complete.md"
    fi

    if [ -f "PHASE_1_MIGRATION_SUMMARY.md" ]; then
        move_file "PHASE_1_MIGRATION_SUMMARY.md" "docs/archive/phases/phase-1-migration-summary.md"
    fi

    # Migration completions
    if [ -f "MONGODB-MIGRATION-COMPLETE.md" ]; then
        move_file "MONGODB-MIGRATION-COMPLETE.md" "docs/migrations/mongodb-to-postgres/completion.md"
    fi

    # Setup files
    if [ -f "SETUP_COMPLETE.md" ]; then
        move_file "SETUP_COMPLETE.md" "docs/archive/setup-complete-$(date +%Y-%m-%d).md"
    fi

    # Feature-specific
    if [ -f "LIVEKIT_SETUP_SUMMARY.md" ]; then
        move_file "LIVEKIT_SETUP_SUMMARY.md" "docs/features/livekit/setup-summary.md"
    fi

    if [ -f "LIVEKIT_TODO.md" ]; then
        move_file "LIVEKIT_TODO.md" "docs/features/livekit/todo.md"
    fi

    if [ -f "TELEGRAM_PHASE_1_READY.md" ]; then
        move_file "TELEGRAM_PHASE_1_READY.md" "docs/features/messaging/telegram-phase-1.md"
    fi

    # Fixes
    if [ -f "REDIRECT_LOOP_FIX_SUMMARY.md" ]; then
        move_file "REDIRECT_LOOP_FIX_SUMMARY.md" "docs/fixes/$(date +%Y-%m)/redirect-loop-fix.md"
    fi

    if [ -f "MEDEVAC_AUDIT_TRAIL.md" ]; then
        move_file "MEDEVAC_AUDIT_TRAIL.md" "docs/features/medevac-audit-trail.md"
    fi

    # PowerSync
    if [ -f "POWERSYNC_NEXT_STEPS.md" ]; then
        move_file "POWERSYNC_NEXT_STEPS.md" "docs/migrations/couchbase-to-powersync/next-steps.md"
    fi

    echo -e "${GREEN}✅ Root files organized!${NC}"
    echo ""
}

# Function to show manual review needed
show_manual_review() {
    echo -e "${YELLOW}🔍 Files that may need manual review:${NC}"
    echo ""
    echo "The following contain many docs that should be reviewed:"
    echo ""
    echo "1. apps/mobile/docs/ - ${YELLOW}$(find apps/mobile/docs -name "*.md" 2>/dev/null | wc -l)${NC} files"
    echo "   Suggestion: Consolidate duplicates, keep mobile-specific in place,"
    echo "   move general docs to main docs/"
    echo ""
    echo "2. apps/docs/ - ${YELLOW}$(find apps/docs -name "*.md" 2>/dev/null | wc -l)${NC} files"
    echo "   Suggestion: This seems to be a general docs folder, consider"
    echo "   merging with main docs/ or making it the primary docs location"
    echo ""
    echo "3. apps/docs/theme-refactor/ - ${YELLOW}$(find apps/docs/theme-refactor -name "*.md" 2>/dev/null | wc -l)${NC} files"
    echo "   Suggestion: Archive completed phases, keep active work"
    echo ""
    echo "4. Scan report files (mongodb-*, mobile-auth-*, markdown-scan-*)"
    echo "   Suggestion: Keep the latest, archive the rest"
    echo ""
}

# Function to create documentation index
create_docs_index() {
    echo -e "${YELLOW}📝 Creating documentation index...${NC}"

    cat > docs/README.md << 'EOF'
# Documentation Index

Welcome to the Fajr Mission EMR documentation!

**Last Updated:** $(date +%Y-%m-%d)

---

## 🚀 Getting Started

New to the project? Start here:

- [Quick Start - Web](./setup/quick-start/web.md)
- [Quick Start - Mobile](./setup/quick-start/mobile.md)
- [Local Development Setup](./setup/environment/local-dev.md)
- [Deployment Guide](./setup/deployment/production.md)

---

## 📖 Documentation Sections

### 🛠️ Setup & Configuration
- [Setup Overview](./setup/README.md)
- [Environment Configuration](./setup/environment/)
- [Deployment Guides](./setup/deployment/)

### 🏗️ Architecture
- [System Architecture](./architecture/README.md)
- [Database Design](./architecture/database/)
- [Authentication System](./architecture/authentication/)
- [Messaging Architecture](./architecture/messaging/)

### 🔌 API Documentation
- [API Overview](./api/README.md)
- [API Endpoints](./api/endpoints/)
- [Helper Functions](./api/helpers/)

### ✨ Features
- [Authentication](./features/authentication/)
- [Messaging System](./features/messaging/)
- [LiveKit Integration](./features/livekit/)
- [Theming](./features/theming/)
- [Analytics](./features/analytics/)

### 🔄 Migrations
- [Migration Overview](./migrations/README.md)
- [MongoDB → PostgreSQL](./migrations/mongodb-to-postgres/)
- [Couchbase → PowerSync](./migrations/couchbase-to-powersync/)
- [Current Phases](./migrations/phases/)

### 🔧 Troubleshooting
- [Common Issues](./troubleshooting/README.md)
- [Authentication Issues](./troubleshooting/authentication/)
- [Deployment Issues](./troubleshooting/deployment/)
- [Database Issues](./troubleshooting/database/)

### 🧪 Testing
- [Testing Overview](./testing/README.md)
- [Test Checklists](./testing/checklists/)
- [Testing Strategies](./testing/strategies/)

### 📱 Platform-Specific

#### Mobile
- [Mobile Overview](./mobile/README.md)
- [Mobile Setup](./mobile/setup/)
- [Components](./mobile/components/)
- [Deployment](./mobile/deployment/)

#### Web
- [Web Overview](./web/README.md)
- [Web Setup](./web/setup/)
- [Components](./web/components/)

#### Analytics
- [Analytics Overview](./analytics/README.md)
- [Analytics Setup](./analytics/setup/)

### 🐛 Bug Fixes
- [Recent Fixes](./fixes/README.md)
- [Fix Archive](./fixes/)

### 🗄️ Archive
- [Completed Phases](./archive/phases/)
- [Completed Stages](./archive/stages/)
- [Historical Documentation](./archive/)

---

## 🔍 Finding Documentation

### By Topic

**Authentication:**
- [Web Auth](./features/authentication/web-auth.md)
- [Mobile Auth](./features/authentication/mobile-auth.md)
- [Auth Troubleshooting](./troubleshooting/authentication/)

**Database:**
- [PostgreSQL Setup](./architecture/database/postgres.md)
- [Migration Guide](./migrations/mongodb-to-postgres/)

**Deployment:**
- [Production Deployment](./setup/deployment/production.md)
- [CI/CD Setup](./setup/deployment/github-actions.md)

### By Role

**New Developer:**
1. [Quick Start Guide](./setup/quick-start/)
2. [Architecture Overview](./architecture/README.md)
3. [Local Development](./setup/environment/local-dev.md)

**DevOps:**
1. [Deployment Guides](./setup/deployment/)
2. [Production Configuration](./setup/deployment/production.md)
3. [Troubleshooting](./troubleshooting/)

**Mobile Developer:**
1. [Mobile Quick Start](./setup/quick-start/mobile.md)
2. [Mobile Architecture](./mobile/README.md)
3. [Mobile Components](./mobile/components/)

---

## 🤝 Contributing to Documentation

See [Organization Guide](./ORGANIZATION_GUIDE.md) for:
- Where to place new documentation
- Naming conventions
- Documentation standards
- How to run the markdown scanner

---

## 📊 Documentation Tools

- **Scanner:** Run `./scan-markdown-docs.sh` to scan all markdown files
- **Organizer:** Run `./organize-markdown-docs.sh` to organize files
- **Organization Guide:** [ORGANIZATION_GUIDE.md](./ORGANIZATION_GUIDE.md)

---

## 📞 Need Help?

- Check [Troubleshooting](./troubleshooting/README.md)
- Review [Common Issues](./troubleshooting/quick-reference.md)
- See [Archive](./archive/README.md) for historical context

---

**Last Scanned:** Run `./scan-markdown-docs.sh` to update
EOF

    echo -e "${GREEN}✅ Documentation index created!${NC}"
    echo ""
}

# Main menu
show_menu() {
    echo ""
    echo "What would you like to do?"
    echo ""
    echo "1) Create complete docs/ folder structure"
    echo "2) Move root-level markdown files to docs/"
    echo "3) Create documentation index (docs/README.md)"
    echo "4) Do all of the above"
    echo "5) Show manual review items"
    echo "6) Run markdown scanner"
    echo "7) Exit"
    echo ""
    read -p "Enter your choice (1-7): " choice
    echo ""

    case $choice in
        1)
            create_structure
            show_menu
            ;;
        2)
            organize_root_files
            show_menu
            ;;
        3)
            create_docs_index
            show_menu
            ;;
        4)
            create_structure
            organize_root_files
            create_docs_index
            echo -e "${GREEN}✅ All automated organization complete!${NC}"
            echo ""
            show_manual_review
            show_menu
            ;;
        5)
            show_manual_review
            show_menu
            ;;
        6)
            if [ -f "scan-markdown-docs.sh" ]; then
                ./scan-markdown-docs.sh
            else
                echo -e "${RED}❌ scan-markdown-docs.sh not found${NC}"
            fi
            show_menu
            ;;
        7)
            echo -e "${GREEN}👋 Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid choice. Please try again.${NC}"
            show_menu
            ;;
    esac
}

# Start
show_menu
