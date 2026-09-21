#!/bin/bash

# Setup script for Admin Signup Notifications
# This script runs the database migration and verifies the setup

set -e

echo "🚀 Setting up Admin Signup Notifications..."
echo ""

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the apps/web directory"
    exit 1
fi

# Check if .env file exists in monorepo root
if [ ! -f "../../.env" ]; then
    echo "❌ Error: .env file not found in monorepo root (../../.env)"
    echo "Please create a .env file with your DATABASE_URL"
    exit 1
fi

echo "📋 Step 1: Generating migration files..."
echo ""

# Generate migration files from schema
npm run db:generate

echo ""
echo "📋 Step 2: Running database migrations..."
echo ""

# Run the migrations using Drizzle
npm run db:migrate

echo ""
echo "📋 Step 3: Verifying notification type was added..."
echo ""

# Load DATABASE_URL from .env
export $(grep -v '^#' ../../.env | xargs)

if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL not found in .env file"
    exit 1
fi

# Verify the enum value was added
VERIFY_QUERY="SELECT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'new_user_signup'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')
) as type_exists;"

if command -v psql &> /dev/null; then
    RESULT=$(psql "$DATABASE_URL" -t -c "$VERIFY_QUERY" | xargs)

    if [ "$RESULT" = "t" ]; then
        echo "✅ Notification type 'new_user_signup' verified in database"
    else
        echo "⚠️  Warning: Could not verify notification type. Please check manually."
    fi
else
    echo "⚠️  psql not available. Skipping verification step."
    echo "   Migration should have succeeded. You can verify manually with:"
    echo "   npm run db:studio"
fi

echo ""
echo "📋 Step 4: Checking admin count..."
echo ""

# Check if there are any admins
if command -v psql &> /dev/null; then
    ADMIN_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM admins;" | xargs)

    if [ "$ADMIN_COUNT" -gt 0 ]; then
        echo "✅ Found $ADMIN_COUNT admin(s) who will receive signup notifications"
    else
        echo "⚠️  Warning: No admins found in the database."
        echo "   New user signups will not trigger notifications until at least one admin exists."
        echo "   The first user to sign up will automatically become an admin."
    fi
else
    echo "⚠️  psql not available. Skipping admin count check."
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 What was set up:"
echo "  • Generated Drizzle migration files"
echo "  • Added 'new_user_signup' notification type to the database"
echo "  • Notification helper function: notifyAdminsOfNewSignup()"
echo "  • Integration in signup route: /api/auth/signup"
echo "  • Notifications viewable at: /notifications"
echo ""
echo "🧪 Testing Instructions:"
echo "  1. Start your development server: npm run dev"
echo "  2. Log in as an admin user (or sign up as first user)"
echo "  3. Sign up a new user through the signup form"
echo "  4. Navigate to /notifications as admin"
echo "  5. You should see a notification about the new signup"
echo ""
echo "📚 Documentation:"
echo "  • Full documentation: ADMIN_SIGNUP_NOTIFICATIONS.md"
echo "  • Quick reference: ADMIN_SIGNUP_NOTIFICATIONS_QUICK_REF.md"
echo "  • Setup guide: ADMIN_SIGNUP_NOTIFICATIONS_SETUP.md"
echo "  • Schema: db/schema/notifications.ts"
echo "  • Helper functions: lib/notification-helpers.ts"
echo ""
echo "💡 Useful commands:"
echo "  • View database: npm run db:studio"
echo "  • Run migrations: npm run db:migrate"
echo "  • Generate migrations: npm run db:generate"
echo ""
echo "🎉 Admin signup notifications are now active!"
echo ""
