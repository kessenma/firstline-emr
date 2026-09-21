#!/usr/bin/env node

/**
 * PowerSync Setup Test Script - Phase 0.2
 * Tests minimal sync rules (patients + notes)
 */

const fs = require('fs');
const path = require('path');

// Test 1: Check if sync-rules.yaml exists and is valid
function testSyncRules() {
  console.log('🧪 Testing PowerSync Sync Rules Configuration...\n');

  const syncRulesPath = path.join(__dirname, '..', 'powersync', 'sync-rules.yaml');

  if (!fs.existsSync(syncRulesPath)) {
    console.error('❌ sync-rules.yaml not found at:', syncRulesPath);
    return false;
  }

  try {
    const content = fs.readFileSync(syncRulesPath, 'utf8');
    console.log('✅ sync-rules.yaml exists');

    // Check for minimal sync rules
    if (!content.includes('assigned_patients')) {
      console.error('❌ assigned_patients sync rule not found');
      return false;
    }
    console.log('✅ assigned_patients sync rule configured');

    if (!content.includes('patient_notes')) {
      console.error('❌ patient_notes sync rule not found');
      return false;
    }
    console.log('✅ patient_notes sync rule configured');

    if (!content.includes('current_user')) {
      console.error('❌ current_user sync rule not found');
      return false;
    }
    console.log('✅ current_user sync rule configured');

    return true;
  } catch (error) {
    console.error('❌ Error reading sync-rules.yaml:', error.message);
    return false;
  }
}

// Test 2: Check if .env.powersync exists
function testEnvConfig() {
  console.log('\n🧪 Testing PowerSync Environment Configuration...\n');

  const envPath = path.join(__dirname, '..', '.env.powersync');

  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.powersync not found at:', envPath);
    return false;
  }

  try {
    const content = fs.readFileSync(envPath, 'utf8');
    console.log('✅ .env.powersync exists');

    // Check for essential settings
    if (!content.includes('POWERSYNC_PORT=8080')) {
      console.error('❌ POWERSYNC_PORT not configured');
      return false;
    }
    console.log('✅ POWERSYNC_PORT configured');

    if (!content.includes('POWERSYNC_DEBUG=true')) {
      console.error('❌ POWERSYNC_DEBUG not enabled for Phase 0.2');
      return false;
    }
    console.log('✅ POWERSYNC_DEBUG enabled for testing');

    return true;
  } catch (error) {
    console.error('❌ Error reading .env.powersync:', error.message);
    return false;
  }
}

// Test 3: Check if data directory exists
function testDataDirectory() {
  console.log('\n🧪 Testing PowerSync Data Directory...\n');

  const dataPath = path.join(__dirname, '..', 'data', 'powersync');

  if (!fs.existsSync(dataPath)) {
    console.error('❌ PowerSync data directory not found at:', dataPath);
    return false;
  }

  console.log('✅ PowerSync data directory exists');
  return true;
}

// Test 4: Validate sync rule filters (basic syntax check)
function testSyncRuleFilters() {
  console.log('\n🧪 Testing Sync Rule Filters...\n');

  const syncRulesPath = path.join(__dirname, '..', 'powersync', 'sync-rules.yaml');

  try {
    const content = fs.readFileSync(syncRulesPath, 'utf8');

    // Check for user-based filtering
    if (!content.includes('token_user_id()')) {
      console.error('❌ token_user_id() function not used in filters');
      return false;
    }
    console.log('✅ User-based filtering configured');

    // Check for proper patient-doctor relationship
    if (!content.includes('doctor_id = token_user_id()')) {
      console.error('❌ Doctor-patient relationship filter not found');
      return false;
    }
    console.log('✅ Doctor-patient relationship filtering configured');

    return true;
  } catch (error) {
    console.error('❌ Error validating sync rule filters:', error.message);
    return false;
  }
}

// Run all tests
function runTests() {
  console.log('🚀 PowerSync Phase 0.2 Setup Test Suite\n');
  console.log('Testing minimal sync configuration (patients + notes)\n');

  let passed = 0;
  let total = 4;

  if (testSyncRules()) passed++;
  if (testEnvConfig()) passed++;
  if (testDataDirectory()) passed++;
  if (testSyncRuleFilters()) passed++;

  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('✅ All Phase 0.2 setup tests passed!');
    console.log('\n📋 Next Steps:');
    console.log('1. Ensure PostgreSQL has logical replication enabled');
    console.log('2. Run: docker compose -f docker-compose.powersync.yml up -d');
    console.log('3. Check PowerSync health: curl http://localhost:8080/health');
    console.log('4. Verify sync rules: curl -H "Authorization: Bearer <jwt>" http://localhost:8080/sync/patients');
  } else {
    console.log('❌ Some tests failed. Please fix the issues above.');
  }

  return passed === total;
}

// Export for use as module or run directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests, testSyncRules, testEnvConfig, testDataDirectory, testSyncRuleFilters };
