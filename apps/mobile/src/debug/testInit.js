// fajr-medflow-emr/apps/mobile/src/debug/testInit.js
// Debug utility to help identify white screen issues in the app

import { AppRegistry } from 'react-native';

// Store original console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
};

// Track initialization timeline
const initTimeline = [];
let initStartTime = Date.now();

// Enhanced console logging with timestamps
const enhanceConsole = () => {
  console.log = (...args) => {
    const timestamp = Date.now() - initStartTime;
    const message = `[+${timestamp}ms] ${args.join(' ')}`;
    initTimeline.push({ type: 'log', timestamp, message: args.join(' ') });
    originalConsole.log(message);
  };

  console.warn = (...args) => {
    const timestamp = Date.now() - initStartTime;
    const message = `[+${timestamp}ms] ⚠️ ${args.join(' ')}`;
    initTimeline.push({ type: 'warn', timestamp, message: args.join(' ') });
    originalConsole.warn(message);
  };

  console.error = (...args) => {
    const timestamp = Date.now() - initStartTime;
    const message = `[+${timestamp}ms] ❌ ${args.join(' ')}`;
    initTimeline.push({ type: 'error', timestamp, message: args.join(' ') });
    originalConsole.error(message);
  };
};

// Track component lifecycle
const componentTracker = new Map();

export const trackComponent = (componentName, phase = 'mount') => {
  const timestamp = Date.now() - initStartTime;

  if (!componentTracker.has(componentName)) {
    componentTracker.set(componentName, {
      mounts: 0,
      unmounts: 0,
      renders: 0,
      errors: 0,
      firstMount: null,
      lastActivity: null,
    });
  }

  const tracking = componentTracker.get(componentName);

  switch (phase) {
    case 'mount':
      tracking.mounts++;
      if (!tracking.firstMount) {
        tracking.firstMount = timestamp;
      }
      console.log(`🔵 [Component] ${componentName} mounted (${tracking.mounts}x)`);
      break;
    case 'unmount':
      tracking.unmounts++;
      console.log(`🔴 [Component] ${componentName} unmounted (${tracking.unmounts}x)`);
      break;
    case 'render':
      tracking.renders++;
      console.log(`🟢 [Component] ${componentName} rendered (${tracking.renders}x)`);
      break;
    case 'error':
      tracking.errors++;
      console.log(`💥 [Component] ${componentName} error (${tracking.errors}x)`);
      break;
  }

  tracking.lastActivity = timestamp;
};

// Track async operations
const asyncTracker = new Map();

export const trackAsync = (operationName, phase = 'start', metadata = {}) => {
  const timestamp = Date.now() - initStartTime;

  if (phase === 'start') {
    asyncTracker.set(operationName, {
      startTime: timestamp,
      endTime: null,
      duration: null,
      success: null,
      metadata,
    });
    console.log(`⏳ [Async] ${operationName} started`);
  } else if (phase === 'end') {
    const tracking = asyncTracker.get(operationName);
    if (tracking) {
      tracking.endTime = timestamp;
      tracking.duration = timestamp - tracking.startTime;
      tracking.success = metadata.success !== false;
      console.log(
        `${tracking.success ? '✅' : '❌'} [Async] ${operationName} ${
          tracking.success ? 'completed' : 'failed'
        } in ${tracking.duration}ms`
      );
    }
  }
};

// Check for common issues
export const checkForCommonIssues = () => {
  console.log('\n🔍 Checking for common white screen issues...\n');

  const issues = [];

  // Check if any components mounted
  if (componentTracker.size === 0) {
    issues.push('❌ No components tracked - possible module loading issue');
  }

  // Check for error patterns
  const errorCount = Array.from(componentTracker.values()).reduce(
    (sum, tracking) => sum + tracking.errors,
    0
  );
  if (errorCount > 0) {
    issues.push(`❌ ${errorCount} component errors detected`);
  }

  // Check for excessive re-renders
  componentTracker.forEach((tracking, name) => {
    if (tracking.renders > 10) {
      issues.push(
        `⚠️ ${name} rendered ${tracking.renders} times - possible render loop`
      );
    }
    if (tracking.mounts > 2) {
      issues.push(
        `⚠️ ${name} mounted ${tracking.mounts} times - possible remounting issue`
      );
    }
  });

  // Check for stuck async operations
  asyncTracker.forEach((tracking, name) => {
    if (tracking.endTime === null) {
      issues.push(`⚠️ Async operation "${name}" never completed`);
    }
    if (tracking.duration > 5000) {
      issues.push(
        `⚠️ Async operation "${name}" took ${tracking.duration}ms - performance issue`
      );
    }
  });

  // Check timeline for errors
  const errors = initTimeline.filter(entry => entry.type === 'error');
  if (errors.length > 0) {
    issues.push(`❌ ${errors.length} console errors logged`);
    errors.slice(0, 3).forEach(error => {
      issues.push(`  └─ ${error.message.substring(0, 80)}`);
    });
  }

  // Report findings
  if (issues.length === 0) {
    console.log('✅ No obvious issues detected');
  } else {
    console.log('⚠️ Found potential issues:');
    issues.forEach(issue => console.log(`  ${issue}`));
  }

  return issues;
};

// Generate initialization report
export const generateInitReport = () => {
  const totalTime = Date.now() - initStartTime;

  console.log('\n' + '='.repeat(60));
  console.log('📊 INITIALIZATION REPORT');
  console.log('='.repeat(60));

  console.log(`\n⏱️ Total initialization time: ${totalTime}ms`);

  console.log('\n🔵 Component Statistics:');
  componentTracker.forEach((tracking, name) => {
    console.log(`  ${name}:`);
    console.log(`    - First mount: ${tracking.firstMount}ms`);
    console.log(`    - Mounts: ${tracking.mounts}`);
    console.log(`    - Renders: ${tracking.renders}`);
    console.log(`    - Errors: ${tracking.errors}`);
  });

  console.log('\n⏳ Async Operations:');
  asyncTracker.forEach((tracking, name) => {
    console.log(`  ${name}:`);
    console.log(`    - Duration: ${tracking.duration || 'pending'}ms`);
    console.log(`    - Success: ${tracking.success ?? 'pending'}`);
  });

  console.log('\n📝 Timeline Summary:');
  console.log(`  - Total events: ${initTimeline.length}`);
  console.log(`  - Errors: ${initTimeline.filter(e => e.type === 'error').length}`);
  console.log(`  - Warnings: ${initTimeline.filter(e => e.type === 'warn').length}`);

  checkForCommonIssues();

  console.log('\n' + '='.repeat(60) + '\n');
};

// Auto-generate report after delay
setTimeout(() => {
  generateInitReport();
}, 10000); // Generate report after 10 seconds

// Intercept AppRegistry to track main component registration
const originalRegisterComponent = AppRegistry.registerComponent;
AppRegistry.registerComponent = (appKey, componentProvider) => {
  console.log(`📱 Registering app: ${appKey}`);
  trackAsync(`AppRegistry.${appKey}`, 'start');

  const wrappedProvider = () => {
    const Component = componentProvider();
    trackAsync(`AppRegistry.${appKey}`, 'end', { success: true });
    return Component;
  };

  return originalRegisterComponent(appKey, wrappedProvider);
};

// Initialize debugging
enhanceConsole();
console.log('🐛 Debug mode activated - tracking initialization...');

export default {
  trackComponent,
  trackAsync,
  checkForCommonIssues,
  generateInitReport,
};
