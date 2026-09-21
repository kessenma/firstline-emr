#!/bin/bash

# Bun Migration Deployment Script
# Deploys updated web app (Bun) and notifications server to production

set -e  # Exit on any error

echo "🚀 Bun Migration Deployment Script"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER="${DEPLOY_SSH_TARGET:?set DEPLOY_SSH_TARGET, e.g. user@host}"
PROJECT_DIR="/root/fajr-medflow-emr"  # Adjust this path as needed
BACKUP_DIR="~/deployments/backup-$(date +%Y%m%d-%H%M%S)"

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to run command on server
run_remote() {
    ssh $SERVER "$1"
}

# Step 0: Pre-flight checks
echo ""
print_info "Step 0: Pre-flight checks"
echo "----------------------------"

# Check if we're in the correct directory
if [ ! -f "docker-compose.web.yml" ]; then
    print_error "Not in project root directory. Please run from /Users/ke/ws/fajr-medflow-emr"
    exit 1
fi

# Check if all changes are committed
if ! git diff-index --quiet HEAD --; then
    print_warning "You have uncommitted changes. Commit them first!"
    echo ""
    git status --short
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

print_success "Pre-flight checks passed"

# Step 1: Push to Git
echo ""
print_info "Step 1: Pushing code to Git"
echo "----------------------------"

git push origin main
print_success "Code pushed to main branch"

# Step 2: Connect to server and backup
echo ""
print_info "Step 2: Creating backup on server"
echo "-----------------------------------"

print_info "Creating backup directory..."
run_remote "mkdir -p $BACKUP_DIR"

print_info "Backing up current state..."
run_remote "cd $PROJECT_DIR && docker ps > $BACKUP_DIR/docker-ps.txt"
run_remote "cd $PROJECT_DIR && docker images | grep -E 'web|notifications' > $BACKUP_DIR/docker-images.txt"
print_success "Backup created at $BACKUP_DIR"

# Step 3: Pull latest code
echo ""
print_info "Step 3: Pulling latest code on server"
echo "---------------------------------------"

run_remote "cd $PROJECT_DIR && git pull origin main"
print_success "Latest code pulled"

# Step 4: Rebuild and deploy web app
echo ""
print_info "Step 4: Deploying web app (Bun)"
echo "--------------------------------"

print_info "Stopping current web container..."
run_remote "cd $PROJECT_DIR && docker-compose -f docker-compose.web.yml down"

print_info "Building new image with Bun... (this may take 2-3 minutes)"
run_remote "cd $PROJECT_DIR && docker-compose -f docker-compose.web.yml build --no-cache web"

print_info "Starting web app..."
run_remote "cd $PROJECT_DIR && docker-compose -f docker-compose.web.yml up -d web"

print_success "Web app deployed"

# Step 5: Rebuild and deploy notifications server
echo ""
print_info "Step 5: Deploying notifications server"
echo "---------------------------------------"

print_info "Stopping current notifications server..."
run_remote "cd $PROJECT_DIR && docker-compose -f docker-compose.notifications.yml down"

print_info "Building new image with improved logging..."
run_remote "cd $PROJECT_DIR && docker-compose -f docker-compose.notifications.yml build notifications-server"

print_info "Starting notifications server..."
run_remote "cd $PROJECT_DIR && docker-compose -f docker-compose.notifications.yml up -d notifications-server"

print_success "Notifications server deployed"

# Step 6: Wait for services to start
echo ""
print_info "Step 6: Waiting for services to start"
echo "--------------------------------------"

print_info "Waiting 10 seconds for containers to initialize..."
sleep 10

# Step 7: Verify deployment
echo ""
print_info "Step 7: Verifying deployment"
echo "-----------------------------"

# Check if containers are running
WEB_STATUS=$(run_remote "docker ps | grep web | wc -l")
NOTIF_STATUS=$(run_remote "docker ps | grep notifications | wc -l")

if [ "$WEB_STATUS" -gt "0" ]; then
    print_success "Web app container is running"
else
    print_error "Web app container is NOT running!"
fi

if [ "$NOTIF_STATUS" -gt "0" ]; then
    print_success "Notifications server container is running"
else
    print_error "Notifications server container is NOT running!"
fi

# Check web app endpoint
print_info "Testing web app endpoint..."
if curl -s -o /dev/null -w "%{http_code}" https://dev.emr.fajrscientific.org | grep -q "200"; then
    print_success "Web app is accessible at https://dev.emr.fajrscientific.org"
else
    print_warning "Web app endpoint returned non-200 status (might be loading)"
fi

# Check RustFS endpoint
print_info "Testing RustFS S3 endpoint..."
if curl -s -o /dev/null -w "%{http_code}" https://s3.emr.fajr.org | grep -qE "200|403|501"; then
    print_success "RustFS S3 endpoint is accessible at https://s3.emr.fajr.org"
else
    print_warning "RustFS endpoint might not be configured correctly"
fi

# Step 8: Show recent logs
echo ""
print_info "Step 8: Recent logs"
echo "-------------------"

echo ""
print_info "Web app logs (last 20 lines):"
echo "------------------------------"
run_remote "docker logs web --tail 20"

echo ""
print_info "Notifications server logs (last 20 lines):"
echo "------------------------------------------"
run_remote "docker logs notifications-server --tail 20"

# Step 9: Summary
echo ""
echo "===================================="
print_success "Deployment Complete!"
echo "===================================="
echo ""
echo "📊 Summary:"
echo "  • Web app: Migrated to Bun 1.3.4"
echo "  • Notifications server: Enhanced error logging"
echo "  • Backup location: $BACKUP_DIR"
echo ""
echo "🧪 Testing Checklist:"
echo "  □ Upload photo from web app"
echo "  □ Record and send audio message"
echo "  □ Send photo from Telegram bot"
echo "  □ Send voice message from Telegram bot"
echo "  □ Check logs for detailed error messages"
echo ""
echo "📝 Next Steps:"
echo "  1. Monitor logs: ssh $SERVER 'docker logs -f web'"
echo "  2. Test all critical flows"
echo "  3. Check for any errors in first hour"
echo ""
echo "🔄 Rollback (if needed):"
echo "  ssh $SERVER 'cd $PROJECT_DIR && git checkout <previous-commit>'"
echo "  ssh $SERVER 'cd $PROJECT_DIR && docker-compose -f docker-compose.web.yml up -d --build'"
echo ""
print_success "Deployment script finished successfully! 🎉"
echo ""
