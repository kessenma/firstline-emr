#!/bin/bash

# Database Setup Script for Fajr Medical Flow EMR
# This script will set up your PostgreSQL database for the first time

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║   Fajr Medical Flow EMR - Database Setup                  ║"
echo "║   PostgreSQL + Drizzle ORM                                ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${YELLOW}⚠️  .env.local not found. Creating from .env.example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env.local
        echo -e "${GREEN}✅ Created .env.local${NC}"
        echo -e "${YELLOW}⚠️  Please update DATABASE_URL in .env.local and run this script again${NC}"
        exit 1
    else
        echo -e "${RED}❌ .env.example not found!${NC}"
        exit 1
    fi
fi

echo -e "${BLUE}📦 Step 1: Installing dependencies...${NC}"
pnpm install
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

echo -e "${BLUE}🔌 Step 2: Testing database connection...${NC}"
if pnpm db:test; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
else
    echo -e "${RED}❌ Database connection failed${NC}"
    echo -e "${YELLOW}Please check your DATABASE_URL in .env.local${NC}"
    exit 1
fi
echo ""

echo -e "${BLUE}🔄 Step 3: Generating migration files...${NC}"
pnpm db:generate
echo -e "${GREEN}✅ Migrations generated${NC}"
echo ""

echo -e "${BLUE}🚀 Step 4: Applying migrations to database...${NC}"
pnpm db:migrate
echo -e "${GREEN}✅ Migrations applied - All tables created${NC}"
echo ""

echo -e "${BLUE}🧪 Step 5: Running comprehensive tests...${NC}"
if pnpm db:test-setup; then
    echo -e "${GREEN}✅ All tests passed${NC}"
else
    echo -e "${YELLOW}⚠️  Some tests failed, but database is set up${NC}"
fi
echo ""

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                  🎉 Setup Complete! 🎉                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Your PostgreSQL database is ready to use!${NC}"
echo ""
echo "📊 Next steps:"
echo ""
echo "1. View your database:"
echo -e "   ${BLUE}pnpm db:studio${NC}"
echo ""
echo "2. Start your dev server:"
echo -e "   ${BLUE}pnpm dev${NC}"
echo ""
echo "3. Test signup at:"
echo -e "   ${BLUE}http://localhost:3000/auth/signup${NC}"
echo ""
echo "4. First user will automatically become admin!"
echo ""
echo "📚 Documentation:"
echo "   - Quick Start: POSTGRES_MIGRATION_QUICKSTART.md"
echo "   - Setup Guide: SETUP_STEPS.md"
echo "   - Schema Info: POSTGRES_SCHEMA_SUMMARY.md"
echo ""
