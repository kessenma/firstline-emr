#!/bin/bash
# =============================================================================
# Generate secrets for Fajr SSO Authentication
# =============================================================================
# Run this script to generate the required secrets for .env.auth.local
# Usage: ./apps/auth/generate-secrets.sh
# =============================================================================

set -e

echo "=================================================="
echo "  Fajr SSO - Secret Generator"
echo "=================================================="
echo ""

# Generate Zitadel master key (exactly 32 hex characters - guaranteed)
MASTER_KEY=$(openssl rand -hex 16)
echo "ZITADEL_MASTERKEY=$MASTER_KEY"
echo ""

# Generate admin password (must include: uppercase, lowercase, number, symbol)
ADMIN_PASSWORD="$(openssl rand -base64 12 | head -c 12)@Zx1"
echo "ZITADEL_ADMIN_PASSWORD=$ADMIN_PASSWORD"
echo ""

# Generate OAuth2 Proxy cookie secret (must be exactly 16, 24, or 32 bytes for AES)
# Using hex encoding: 16 random bytes = 32 hex characters = 32 bytes when read as string
COOKIE_SECRET=$(openssl rand -hex 16)
echo "OAUTH2_PROXY_COOKIE_SECRET=$COOKIE_SECRET"
echo ""

echo "=================================================="
echo "  Instructions"
echo "=================================================="
echo ""
echo "1. Copy the values above to your .env.auth.local file"
echo ""
echo "2. Create the Zitadel database:"
echo "   psql -h <host> -U <user> -c 'CREATE DATABASE zitadel;'"
echo ""
echo "3. Start the auth stack:"
echo "   docker-compose -f docker-compose.auth.yml up -d"
echo ""
echo "4. Access Zitadel at https://identity.fajrmission.org"
echo "   Login with: admin / $ADMIN_PASSWORD"
echo ""
echo "5. Create OIDC applications in Zitadel console and"
echo "   add the client IDs/secrets to .env.auth.local"
echo ""
echo "=================================================="
