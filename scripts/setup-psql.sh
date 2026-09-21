#!/bin/bash

# Setup script to configure psql in current shell session
# Usage: source ./scripts/setup-psql.sh

# Add PostgreSQL to PATH
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"

# Verify psql is available
if command -v psql &> /dev/null; then
    echo "✓ psql is now available"
    echo "  Location: $(which psql)"
    echo "  Version: $(psql --version)"

    # Test database connection if DATABASE_URL is set
    if [ -f .env ]; then
        export $(grep -v '^#' .env | grep DATABASE_URL | xargs)
        if [ ! -z "$DATABASE_URL" ]; then
            echo ""
            echo "Testing database connection..."
            if psql "$DATABASE_URL" -c "SELECT version();" &> /dev/null; then
                echo "✓ Database connection successful"
            else
                echo "✗ Could not connect to database"
            fi
        fi
    fi
else
    echo "✗ psql not found"
    echo ""
    echo "Please install PostgreSQL first:"
    echo "  brew install postgresql@16"
fi

echo ""
echo "Available scripts:"
echo "  ./scripts/test-postgres-connection.sh     - Test PostgreSQL connection"
echo "  ./scripts/configure-postgresql-for-powersync.sh - Full PowerSync setup"
