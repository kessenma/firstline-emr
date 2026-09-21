#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

/**
 * Script to scan API endpoints for mobile authentication implementation
 * Checks if endpoints are using the new dual authentication approach
 * that supports both NextAuth sessions (web) and JWT tokens (mobile)
 */

const API_DIR = path.join(process.cwd(), "app/api");
const LIB_DIR = path.join(process.cwd(), "lib");
const MIDDLEWARE_PATH = path.join(process.cwd(), "middleware.ts");

// Patterns to detect old authentication (NextAuth only)
const OLD_AUTH_PATTERNS = [
  /const\s+session\s*=\s*await\s+getServerSession/,
  /if\s*\(\s*!session\s*\)/,
  /if\s*\(\s*!session\?\./,
  /session\s*&&\s*session\.user/,
  /session\s*\?\.\s*user\s*\?\.\s*id/,
];

// Patterns to detect new mobile auth implementation
const MOBILE_AUTH_PATTERNS = [
  /import\s+.*getUserFromRequest.*from\s+['"]@\/lib\/mobileAuth['"]/,
  /import\s+.*getUserIdFromRequest.*from\s+['"]@\/lib\/mobileAuth['"]/,
  /import\s+.*verifyMobileToken.*from\s+['"]@\/lib\/mobileAuth['"]/,
  /getUserFromRequest\s*\(/,
  /getUserIdFromRequest\s*\(/,
  /verifyMobileToken\s*\(/,
  /verifyAdminToken\s*\(/, // Admin token verification (supports dual auth)
];

// Patterns to detect API key authentication (server-to-server)
const API_KEY_AUTH_PATTERNS = [/validateApiKey\s*\(/];

// Patterns to detect authentication checks
const AUTH_CHECK_PATTERNS = [
  /if\s*\(\s*!user\s*\)/,
  /if\s*\(\s*!user\s*\|\|\s*!user\.id\s*\)/,
  /if\s*\(\s*!session\s*\)/,
  /return\s+.*NextResponse\.json\s*\(\s*{\s*error:\s*["']Unauthorized["']/,
];

// Patterns that indicate public endpoints (no auth needed)
// These will be augmented by reading the middleware.ts file
const PUBLIC_ENDPOINT_PATTERNS = [
  /\/auth\//,
  /\/public\//,
  /\/health/,
  /\/webhook/,
];

// Public routes extracted from middleware.ts
let MIDDLEWARE_PUBLIC_ROUTES = [];

// Patterns for different HTTP methods
const HTTP_METHOD_PATTERNS = [
  /export\s+(async\s+)?function\s+GET/,
  /export\s+(async\s+)?function\s+POST/,
  /export\s+(async\s+)?function\s+PUT/,
  /export\s+(async\s+)?function\s+PATCH/,
  /export\s+(async\s+)?function\s+DELETE/,
  /export\s+(async\s+)?function\s+HEAD/,
  /export\s+(async\s+)?function\s+OPTIONS/,
];

/**
 * Load public routes from middleware.ts
 */
function loadMiddlewarePublicRoutes() {
  try {
    if (fs.existsSync(MIDDLEWARE_PATH)) {
      const content = fs.readFileSync(MIDDLEWARE_PATH, "utf8");

      // Extract the publicRoutes array from middleware.ts
      const publicRoutesMatch = content.match(
        /const\s+publicRoutes\s*=\s*\[([\s\S]*?)\]/,
      );

      if (publicRoutesMatch && publicRoutesMatch[1]) {
        // Parse the routes from the array
        const routesString = publicRoutesMatch[1];
        const routes = routesString
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.startsWith('"') || line.startsWith("'"))
          .map((line) => {
            // Extract the route path from the string
            const match = line.match(/["']([^"']+)["']/);
            return match ? match[1] : null;
          })
          .filter((route) => route !== null);

        MIDDLEWARE_PUBLIC_ROUTES = routes;
        console.log(
          `📋 Loaded ${routes.length} public routes from middleware.ts`,
        );

        return routes;
      }
    }
  } catch (error) {
    console.warn(`⚠️  Could not load middleware.ts: ${error.message}`);
  }
  return [];
}

/**
 * Check if an API path matches a middleware public route
 */
function matchesMiddlewarePublicRoute(apiPath) {
  // Convert file path to API endpoint path
  // e.g., "admin/validate-verification-access" -> "/api/admin/validate-verification-access"
  const fullApiPath = `/api/${apiPath}`;

  // Check if it matches any middleware public route
  return MIDDLEWARE_PUBLIC_ROUTES.some((route) => {
    // Remove trailing slashes for comparison
    const normalizedRoute = route.replace(/\/$/, "");
    const normalizedPath = fullApiPath.replace(/\/$/, "");

    // Check exact match or prefix match
    return (
      normalizedPath === normalizedRoute ||
      normalizedPath.startsWith(normalizedRoute + "/")
    );
  });
}

function isPublicEndpoint(filePath) {
  // Check against hardcoded patterns
  if (PUBLIC_ENDPOINT_PATTERNS.some((pattern) => pattern.test(filePath))) {
    return true;
  }

  // Check against middleware public routes
  return matchesMiddlewarePublicRoute(filePath);
}

function hasOldAuthPattern(content) {
  return OLD_AUTH_PATTERNS.some((pattern) => pattern.test(content));
}

function hasMobileAuthPattern(content) {
  return MOBILE_AUTH_PATTERNS.some((pattern) => pattern.test(content));
}

function hasApiKeyAuthPattern(content) {
  return API_KEY_AUTH_PATTERNS.some((pattern) => pattern.test(content));
}

function hasAuthCheck(content) {
  return AUTH_CHECK_PATTERNS.some((pattern) => pattern.test(content));
}

function getHttpMethods(content) {
  const methods = [];
  HTTP_METHOD_PATTERNS.forEach((pattern) => {
    if (pattern.test(content)) {
      // Extract method name from pattern - handle both sync and async patterns
      const match = pattern.source.match(/function\s+(\w+)/);
      if (match && match[1]) {
        methods.push(match[1]);
      }
    }
  });
  return methods;
}

function findAuthUsageWithContext(content) {
  const matches = [];
  const lines = content.split("\n");

  // Check for old auth patterns
  OLD_AUTH_PATTERNS.forEach((pattern) => {
    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        matches.push({
          line: index + 1,
          usage: line.trim().substring(0, 100),
          type: "old_auth",
          pattern: pattern.source,
        });
      }
    });
  });

  // Check for mobile auth patterns
  MOBILE_AUTH_PATTERNS.forEach((pattern) => {
    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        matches.push({
          line: index + 1,
          usage: line.trim().substring(0, 100),
          type: "mobile_auth",
          pattern: pattern.source,
        });
      }
    });
  });

  // Check for auth checks
  AUTH_CHECK_PATTERNS.forEach((pattern) => {
    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        matches.push({
          line: index + 1,
          usage: line.trim().substring(0, 100),
          type: "auth_check",
          pattern: pattern.source,
        });
      }
    });
  });

  return matches;
}

function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const relativePath = path.relative(API_DIR, filePath);
    const apiEndpoint = relativePath
      .replace("/route.ts", "")
      .replace("/route.js", "")
      .replace(/\[/g, "{")
      .replace(/\]/g, "}");

    // Skip if it's a public endpoint
    const isPublic = isPublicEndpoint(relativePath);
    const isMiddlewarePublic = matchesMiddlewarePublicRoute(relativePath);

    if (isPublic) {
      return {
        file: relativePath,
        filePath: `app/api/${relativePath}`,
        apiEndpoint: apiEndpoint,
        status: "public",
        needsMigration: false,
        httpMethods: getHttpMethods(content),
        hasOldAuth: false,
        hasMobileAuth: false,
        severity: "info",
        middlewarePublic: isMiddlewarePublic,
        publicSource: isMiddlewarePublic
          ? "middleware.ts"
          : "hardcoded pattern",
      };
    }

    const hasOldAuth = hasOldAuthPattern(content);
    const hasMobileAuth = hasMobileAuthPattern(content);
    const hasApiKeyAuth = hasApiKeyAuthPattern(content);
    const hasAuth = hasAuthCheck(content);
    const httpMethods = getHttpMethods(content);
    const authUsage = findAuthUsageWithContext(content);

    // Determine migration status
    let status = "unknown";
    let needsMigration = false;
    let severity = "low";

    if (!hasAuth && httpMethods.length === 0) {
      // No HTTP methods exported, might be a helper file
      status = "not_api_route";
      needsMigration = false;
    } else if (!hasAuth && httpMethods.length > 0) {
      // Has HTTP methods but no auth - might be intentionally public
      status = "no_auth";
      needsMigration = false;
      severity = "info";
    } else if (hasApiKeyAuth) {
      // Server-to-server API key authentication (bots, CRON jobs, webhooks)
      status = "api_key_auth";
      needsMigration = false;
      severity = "info";
    } else if (hasMobileAuth && hasOldAuth) {
      // Fully migrated - has both patterns for dual auth support
      status = "migrated";
      needsMigration = false;
      severity = "low";
    } else if (hasMobileAuth && !hasOldAuth) {
      // Has mobile auth but missing old patterns - unusual but might be valid
      status = "migrated";
      needsMigration = false;
      severity = "low";
    } else if (hasOldAuth && !hasMobileAuth) {
      // Not migrated - only has old auth
      status = "not_migrated";
      needsMigration = true;
      severity = "high";
    } else if (hasAuth && !hasOldAuth && !hasMobileAuth) {
      // Has auth checks but unclear pattern
      status = "unclear";
      needsMigration = true;
      severity = "medium";
    }

    return {
      file: relativePath,
      filePath: `app/api/${relativePath}`,
      apiEndpoint: apiEndpoint,
      status,
      needsMigration,
      severity,
      httpMethods,
      hasOldAuth,
      hasMobileAuth,
      hasAuthCheck: hasAuth,
      authUsage,
      lineCount: content.split("\n").length,
      middlewarePublic: false,
    };
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

function scanDirectory(dirPath) {
  const results = [];

  function scanRecursive(currentPath) {
    try {
      const items = fs.readdirSync(currentPath);

      for (const item of items) {
        const fullPath = path.join(currentPath, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          // Skip node_modules and hidden directories
          if (item !== "node_modules" && !item.startsWith(".")) {
            scanRecursive(fullPath);
          }
        } else if (item === "route.ts" || item === "route.js") {
          const result = analyzeFile(fullPath);
          if (result) {
            results.push(result);
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning ${currentPath}:`, error.message);
    }
  }

  scanRecursive(dirPath);
  return results;
}

function generateReport(results) {
  const timestamp = new Date()
    .toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    .replace(/[/,:]/g, "-")
    .replace(/ /g, "T");

  const reportFile = path.join(
    process.cwd(),
    `mobile-auth-scan-${timestamp}.md`,
  );
  const csvFile = path.join(
    process.cwd(),
    `mobile-auth-status-${timestamp}.csv`,
  );

  // Group results by status
  const migrated = results.filter((r) => r.status === "migrated");
  const notMigrated = results.filter((r) => r.status === "not_migrated");
  const partial = results.filter((r) => r.status === "partial");
  const noAuth = results.filter((r) => r.status === "no_auth");
  const publicEndpoints = results.filter((r) => r.status === "public");
  const apiKeyAuth = results.filter((r) => r.status === "api_key_auth");
  const notApiRoutes = results.filter((r) => r.status === "not_api_route");
  const unclear = results.filter((r) => r.status === "unclear");

  // Calculate statistics
  const totalEndpoints = results.filter(
    (r) => r.status !== "not_api_route",
  ).length;

  // Calculate progress based only on endpoints that need user authentication
  // Exclude public routes and API key endpoints (they don't need user JWT migration)
  const applicableEndpoints = results.filter(
    (r) =>
      r.status !== "not_api_route" &&
      r.status !== "public" &&
      r.status !== "api_key_auth",
  ).length;

  const needingMigration = results.filter((r) => r.needsMigration).length;
  const completedMigration = migrated.length;
  const migrationProgress =
    applicableEndpoints > 0
      ? Math.round((completedMigration / applicableEndpoints) * 100)
      : 0;

  // Generate Markdown report
  let report = `# Mobile Authentication Migration Scan Report\n\n`;
  report += `**Generated:** ${new Date().toLocaleString()}\n\n`;
  report += `## 📊 Summary\n\n`;
  report += `- **Total API Endpoints:** ${totalEndpoints}\n`;
  report += `- **Applicable for Migration:** ${applicableEndpoints} (excludes public & API key)\n`;
  report += `- **Migrated:** ${migrated.length} ✅\n`;
  report += `- **Need Migration:** ${needingMigration} 🔄\n`;
  report += `- **Partially Migrated:** ${partial.length} ⚠️\n`;
  report += `- **No Auth Required:** ${noAuth.length} ℹ️\n`;
  report += `- **Public Endpoints:** ${publicEndpoints.length} 🌐\n`;
  report += `- **API Key Auth (Server-to-Server):** ${apiKeyAuth.length} 🔑\n`;
  report += `- **Migration Progress:** ${migrationProgress}% (${migrated.length}/${applicableEndpoints})\n\n`;

  // Progress bar
  const progressBar =
    "█".repeat(Math.floor(migrationProgress / 5)) +
    "░".repeat(20 - Math.floor(migrationProgress / 5));
  report += `### Progress: [${progressBar}] ${migrationProgress}%\n\n`;

  // Middleware info
  if (MIDDLEWARE_PUBLIC_ROUTES.length > 0) {
    report += `## 🔒 Middleware Public Routes\n\n`;
    report += `Found ${MIDDLEWARE_PUBLIC_ROUTES.length} public routes in middleware.ts that don't require authentication:\n\n`;
    MIDDLEWARE_PUBLIC_ROUTES.forEach((route) => {
      report += `- \`${route}\`\n`;
    });
    report += `\n`;
  }

  // High priority (not migrated)
  if (notMigrated.length > 0) {
    report += `## 🔴 High Priority - Not Migrated (${notMigrated.length})\n\n`;
    report += `These endpoints still use only NextAuth session authentication:\n\n`;
    notMigrated.forEach((result, index) => {
      report += formatEndpointReport(result, index + 1);
    });
  }

  // Medium priority (partial migration)
  if (partial.length > 0) {
    report += `## 🟡 Medium Priority - Partially Migrated (${partial.length})\n\n`;
    report += `These endpoints have both old and new authentication patterns:\n\n`;
    partial.forEach((result, index) => {
      report += formatEndpointReport(result, index + 1);
    });
  }

  // Unclear authentication
  if (unclear.length > 0) {
    report += `## 🟠 Review Required - Unclear Pattern (${unclear.length})\n\n`;
    report += `These endpoints have authentication checks but unclear patterns:\n\n`;
    unclear.forEach((result, index) => {
      report += formatEndpointReport(result, index + 1);
    });
  }

  // Successfully migrated
  if (migrated.length > 0) {
    report += `## ✅ Successfully Migrated (${migrated.length})\n\n`;
    report += `These endpoints support both web and mobile authentication:\n\n`;
    migrated.forEach((result) => {
      report += `- ✅ \`${result.apiEndpoint}\` - ${result.httpMethods.join(", ")}\n`;
    });
    report += `\n`;
  }

  // No authentication
  if (noAuth.length > 0) {
    report += `## ℹ️ No Authentication (${noAuth.length})\n\n`;
    report += `These endpoints don't have authentication checks. Verify if intentional or if middleware handles it:\n\n`;
    noAuth.forEach((result) => {
      const middlewareNote = result.middlewarePublic
        ? " (✅ Public in middleware)"
        : " (⚠️ Not in middleware public routes)";
      report += `- \`${result.apiEndpoint}\` - ${result.httpMethods.join(", ")}${middlewareNote}\n`;
    });
    report += `\n`;
  }

  // Public endpoints from middleware
  if (publicEndpoints.length > 0) {
    report += `## 🌐 Public Endpoints (${publicEndpoints.length})\n\n`;
    report += `These endpoints are marked as public (no authentication required):\n\n`;

    const middlewarePublic = publicEndpoints.filter((r) => r.middlewarePublic);
    const patternPublic = publicEndpoints.filter((r) => !r.middlewarePublic);

    if (middlewarePublic.length > 0) {
      report += `### From middleware.ts (${middlewarePublic.length}):\n\n`;
      middlewarePublic.forEach((result) => {
        report += `- \`${result.apiEndpoint}\`\n`;
      });
      report += `\n`;
    }

    if (patternPublic.length > 0) {
      report += `### From hardcoded patterns (${patternPublic.length}):\n\n`;
      patternPublic.forEach((result) => {
        report += `- \`${result.apiEndpoint}\` (${result.publicSource})\n`;
      });
      report += `\n`;
    }
  }

  // API Key Auth section
  if (apiKeyAuth.length > 0) {
    report += `## 🔑 API Key Authentication (${apiKeyAuth.length})\n\n`;
    report += `These endpoints use API key authentication for server-to-server communication (bots, CRON jobs, webhooks):\n\n`;
    report += `**Note:** These endpoints don't need user JWT migration as they're designed for server-to-server communication.\n\n`;

    apiKeyAuth.forEach((result, index) => {
      report += `### ${index + 1}. \`${result.apiEndpoint}\`\n\n`;
      report += `- **File:** \`${result.filePath}\`\n`;
      report += `- **Status:** api_key_auth (server-to-server)\n`;
      report += `- **HTTP Methods:** ${result.httpMethods.join(", ") || "none"}\n`;
      report += `- **Lines:** ${result.lines}\n`;
      report += `- **Auth Pattern:** \`validateApiKey()\`\n\n`;
    });
  }

  // Migration guide
  report += `## 📋 Migration Guide\n\n`;
  report += `### To migrate an endpoint:\n\n`;
  report += `1. **Add the import:**\n`;
  report += `   \`\`\`typescript\n`;
  report += `   import { getUserFromRequest } from "@/lib/mobileAuth";\n`;
  report += `   \`\`\`\n\n`;
  report += `2. **Update authentication check:**\n`;
  report += `   \`\`\`typescript\n`;
  report += `   // Old way (web only)\n`;
  report += `   const session = await getServerSession(authOptions);\n`;
  report += `   if (!session) {\n`;
  report += `     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });\n`;
  report += `   }\n\n`;
  report += `   // New way (web + mobile)\n`;
  report += `   const session = await getServerSession(authOptions);\n`;
  report += `   const user = getUserFromRequest(request, session);\n`;
  report += `   if (!user || !user.id) {\n`;
  report += `     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });\n`;
  report += `   }\n`;
  report += `   \`\`\`\n\n`;
  report += `3. **Use user object instead of session.user:**\n`;
  report += `   \`\`\`typescript\n`;
  report += `   // Old: session.user.id\n`;
  report += `   // New: user.id\n`;
  report += `   \`\`\`\n\n`;

  // Generate CSV file
  let csvContent = `Endpoint,Status,HTTP Methods,Needs Migration,Has Old Auth,Has Mobile Auth,Severity,Middleware Public\n`;
  results.forEach((result) => {
    if (result.status !== "not_api_route") {
      const methods = result.httpMethods
        ? result.httpMethods.join(";")
        : "none";
      const hasOldAuth = result.hasOldAuth || false;
      const hasMobileAuth = result.hasMobileAuth || false;
      const severity = result.severity || "info";
      const middlewarePublic = result.middlewarePublic || false;
      csvContent += `"${result.apiEndpoint}","${result.status}","${methods}",`;
      csvContent += `${result.needsMigration},${hasOldAuth},${hasMobileAuth},${severity},${middlewarePublic}\n`;
    }
  });

  // Write files
  fs.writeFileSync(reportFile, report);
  fs.writeFileSync(csvFile, csvContent);

  // Console output
  console.log(`\n📊 Mobile Auth Migration Scan Complete!\n`);
  console.log(
    `📄 Detailed report: ${path.relative(process.cwd(), reportFile)}`,
  );
  console.log(`📈 CSV data: ${path.relative(process.cwd(), csvFile)}`);
  console.log(`\n📊 Summary:`);
  console.log(`   Total Endpoints: ${totalEndpoints}`);
  console.log(`   ✅ Migrated: ${migrated.length}`);
  console.log(`   🔄 Need Migration: ${needingMigration}`);
  console.log(`   ⚠️  Partially Migrated: ${partial.length}`);
  console.log(`   📊 Progress: ${migrationProgress}%`);

  if (migrationProgress === 100) {
    console.log(
      `\n🎉 Congratulations! All endpoints support mobile authentication!`,
    );
  } else {
    console.log(
      `\n💡 Run 'node ${path.relative(process.cwd(), __filename)}' to check progress`,
    );
  }
}

function formatEndpointReport(result, index) {
  let section = `### ${index}. \`${result.apiEndpoint}\`\n\n`;
  section += `- **File:** \`${result.filePath}\`\n`;
  section += `- **Status:** ${result.status}\n`;
  section += `- **HTTP Methods:** ${result.httpMethods.join(", ") || "none"}\n`;
  section += `- **Lines:** ${result.lineCount}\n`;
  section += `- **Has Old Auth:** ${result.hasOldAuth ? "Yes" : "No"}\n`;
  section += `- **Has Mobile Auth:** ${result.hasMobileAuth ? "Yes" : "No"}\n\n`;

  if (result.authUsage.length > 0) {
    section += `**Authentication Usage:**\n\n`;

    const oldAuthUsage = result.authUsage.filter((u) => u.type === "old_auth");
    const mobileAuthUsage = result.authUsage.filter(
      (u) => u.type === "mobile_auth",
    );
    const authChecks = result.authUsage.filter((u) => u.type === "auth_check");

    if (oldAuthUsage.length > 0) {
      section += `Old Auth Patterns:\n`;
      oldAuthUsage.forEach((usage) => {
        section += `- Line ${usage.line}: \`${usage.usage}\`\n`;
      });
      section += `\n`;
    }

    if (mobileAuthUsage.length > 0) {
      section += `Mobile Auth Patterns:\n`;
      mobileAuthUsage.forEach((usage) => {
        section += `- Line ${usage.line}: \`${usage.usage}\`\n`;
      });
      section += `\n`;
    }

    if (authChecks.length > 0) {
      section += `Auth Checks:\n`;
      authChecks.forEach((usage) => {
        section += `- Line ${usage.line}: \`${usage.usage}\`\n`;
      });
      section += `\n`;
    }
  }

  return section;
}

function main() {
  console.log("🔍 Scanning API endpoints for mobile authentication support...");
  console.log("📝 Checking for:");
  console.log("   - Old authentication (NextAuth sessions only)");
  console.log("   - New authentication (supports mobile JWT tokens)");
  console.log("   - Partial migrations");
  console.log("   - Public routes from middleware.ts");
  console.log("");

  if (!fs.existsSync(API_DIR)) {
    console.error(`❌ API directory not found: ${API_DIR}`);
    console.error(`   Make sure you're running this from the project root`);
    process.exit(1);
  }

  // Load public routes from middleware
  loadMiddlewarePublicRoutes();
  console.log("");

  const results = scanDirectory(API_DIR);
  generateReport(results);
}

if (require.main === module) {
  main();
}

module.exports = { scanDirectory, analyzeFile };
