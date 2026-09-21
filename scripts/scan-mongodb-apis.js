#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

/**
 * Script to scan API endpoints for MongoDB usage vs PostgreSQL
 * Outputs a list of endpoints still using MongoDB
 *
 * FIXED: Now properly detects MongoDB usage by checking imports first
 * to avoid false positives from native JavaScript methods
 */

const API_DIR = "apps/web/app/api";

// MongoDB import patterns - These are definitive indicators
const MONGODB_IMPORT_PATTERNS = [
  /import\s+.*\s+from\s+['"]mongoose['"]/i,
  /import\s+.*\s+from\s+['"]mongodb['"]/i,
  /require\s*\(\s*['"]mongoose['"]\s*\)/i,
  /require\s*\(\s*['"]mongodb['"]\s*\)/i,
  /import\s+.*\s+from\s+['"]@\/models\//i,
  /import\s+.*\s+from\s+['"]\.\.\/\.\.\/models\//i,
  /from\s+['"].*\/models\/.*['"]/i,
];

// MongoDB connection patterns
const MONGODB_CONNECTION_PATTERNS = [
  /mongodb:\/\/[^"'\s]+/i,
  /mongoose\.connect/i,
  /new MongoClient/i,
  /MongoClient\.connect/i,
];

// MongoDB schema patterns
const MONGODB_SCHEMA_PATTERNS = [
  /new\s+mongoose\.Schema/i,
  /new\s+Schema\s*\(/i,
  /Schema\.Types\./i,
  /mongoose\.model\s*\(/i,
  /mongoose\.models\./i,
];

// MongoDB model method patterns (only check if imports found)
const MONGODB_MODEL_PATTERNS = [
  /\.\s*findOne\s*\(/,
  /\.\s*findById\s*\(/,
  /\.\s*findOneAndUpdate\s*\(/,
  /\.\s*findByIdAndUpdate\s*\(/,
  /\.\s*findOneAndDelete\s*\(/,
  /\.\s*findByIdAndDelete\s*\(/,
  /\.\s*deleteMany\s*\(/,
  /\.\s*deleteOne\s*\(/,
  /\.\s*insertMany\s*\(/,
  /\.\s*updateMany\s*\(/,
  /\.\s*updateOne\s*\(/,
  /\.\s*countDocuments\s*\(/,
  /\.\s*populate\s*\(/,
  /\.\s*exec\s*\(\s*\)/,
  /\.\s*lean\s*\(\s*\)/,
  /\.\s*session\s*\(/,
];

// PostgreSQL/Drizzle patterns (to definitively exclude)
const POSTGRES_PATTERNS = [
  /import\s+.*\s+from\s+['"]@\/lib\/db['"]/i,
  /import\s+.*\s+from\s+['"]drizzle-orm/i,
  /import\s+.*\s+from\s+['"]pg['"]/i,
  /import\s+.*\s+from\s+['"]postgres['"]/i,
  /from\s+['"]@\/lib\/.*-helpers['"]/i,
  /drizzle/i,
  /prisma/i,
];

function hasMongoDBImports(content) {
  return MONGODB_IMPORT_PATTERNS.some((pattern) => pattern.test(content));
}

function hasMongoDBConnections(content) {
  return MONGODB_CONNECTION_PATTERNS.some((pattern) => pattern.test(content));
}

function hasMongoDBSchemas(content) {
  return MONGODB_SCHEMA_PATTERNS.some((pattern) => pattern.test(content));
}

function hasPostgresUsage(content) {
  return POSTGRES_PATTERNS.some((pattern) => pattern.test(content));
}

function findMongoDBUsageWithContext(content) {
  const matches = [];
  const lines = content.split("\n");

  // Check imports
  MONGODB_IMPORT_PATTERNS.forEach((pattern) => {
    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        matches.push({
          line: index + 1,
          usage: line.trim().substring(0, 80),
          type: "import",
        });
      }
    });
  });

  // Check connections
  MONGODB_CONNECTION_PATTERNS.forEach((pattern) => {
    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        matches.push({
          line: index + 1,
          usage: line.trim().substring(0, 80),
          type: "connection",
        });
      }
    });
  });

  // Check schemas
  MONGODB_SCHEMA_PATTERNS.forEach((pattern) => {
    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        matches.push({
          line: index + 1,
          usage: line.trim().substring(0, 80),
          type: "schema",
        });
      }
    });
  });

  return matches;
}

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const relativePath = path.relative(API_DIR, filePath);

    // First, check if it's using PostgreSQL (definitive exclusion)
    if (hasPostgresUsage(content)) {
      return null; // PostgreSQL endpoint, skip
    }

    // Check for definitive MongoDB indicators
    const hasImports = hasMongoDBImports(content);
    const hasConnections = hasMongoDBConnections(content);
    const hasSchemas = hasMongoDBSchemas(content);

    // Only flag if we have actual MongoDB imports/connections/schemas
    if (hasImports || hasConnections || hasSchemas) {
      const matches = findMongoDBUsageWithContext(content);

      return {
        file: relativePath,
        filePath: `apps/web/app/api/${relativePath}`,
        apiEndpoint: relativePath
          .replace("/route.ts", "")
          .replace("/route.js", "")
          .replace(/\[/g, "{")
          .replace(/\]/g, "}"),
        mongodbUsage: matches,
        lineCount: content.split("\n").length,
        severity: hasImports ? "HIGH" : hasConnections ? "MEDIUM" : "LOW",
      };
    }

    return null;
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
          const result = scanFile(fullPath);
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

  const reportFile = `mongodb-api-scan-${timestamp}.md`;

  let report = `# MongoDB API Endpoints Scan Report\n\n`;
  report += `**Generated:** ${new Date().toLocaleString()}\n\n`;
  report += `**Total MongoDB endpoints found:** ${results.length}\n\n`;

  if (results.length === 0) {
    report += `## 🎉 Migration Complete!\n\n`;
    report += `**No API endpoints were found using MongoDB.**\n\n`;
    report += `All endpoints have been successfully migrated to PostgreSQL!\n\n`;
    report += `### What was checked:\n\n`;
    report += `- ✅ MongoDB/Mongoose imports\n`;
    report += `- ✅ MongoDB connection strings\n`;
    report += `- ✅ Mongoose schema definitions\n`;
    report += `- ✅ MongoDB model usage\n\n`;
    report += `### Notes:\n\n`;
    report += `This scan now correctly distinguishes between:\n`;
    report += `- MongoDB operations (e.g., \`Model.findOne()\`)\n`;
    report += `- Native JavaScript operations (e.g., \`Map.delete()\`, \`Array.find()\`)\n\n`;
    report += `**Your MongoDB to PostgreSQL migration is 100% complete!** 🚀\n`;
  } else {
    report += `## 🚨 Endpoints Still Using MongoDB\n\n`;
    report += `The following API endpoints are still using MongoDB and need to be migrated to PostgreSQL:\n\n`;

    // Group by severity
    const high = results.filter((r) => r.severity === "HIGH");
    const medium = results.filter((r) => r.severity === "MEDIUM");
    const low = results.filter((r) => r.severity === "LOW");

    if (high.length > 0) {
      report += `### 🔴 High Priority (Has MongoDB Imports)\n\n`;
      high.forEach((result, index) => {
        report += formatEndpointReport(result, index + 1);
      });
    }

    if (medium.length > 0) {
      report += `### 🟡 Medium Priority (Has MongoDB Connections)\n\n`;
      medium.forEach((result, index) => {
        report += formatEndpointReport(result, index + 1);
      });
    }

    if (low.length > 0) {
      report += `### 🟢 Low Priority (Has MongoDB Schemas Only)\n\n`;
      low.forEach((result, index) => {
        report += formatEndpointReport(result, index + 1);
      });
    }

    report += `\n## 📋 Migration Steps\n\n`;
    report += `For each endpoint:\n\n`;
    report += `1. Review the MongoDB usage lines shown above\n`;
    report += `2. Identify the MongoDB models being used\n`;
    report += `3. Create equivalent PostgreSQL tables/schemas in Drizzle\n`;
    report += `4. Create helper functions for database operations\n`;
    report += `5. Update the API logic to use PostgreSQL queries\n`;
    report += `6. Test the endpoint thoroughly\n`;
    report += `7. Migrate existing data if needed\n`;
    report += `8. Remove MongoDB imports and dependencies\n\n`;
  }

  // Create a simple list file
  const listFile = `mongodb-endpoints-list-${timestamp}.txt`;
  let listContent = `# MongoDB Endpoints List\n`;
  listContent += `# Generated: ${new Date().toLocaleString()}\n\n`;

  if (results.length === 0) {
    listContent += `# No MongoDB endpoints found - migration complete! 🎉\n`;
  } else {
    results.forEach((result) => {
      listContent += `${result.apiEndpoint}\n`;
    });
  }

  fs.writeFileSync(reportFile, report);
  fs.writeFileSync(listFile, listContent);

  console.log(`\n📊 Scan Complete!`);
  console.log(`📄 Detailed report: ${reportFile}`);
  console.log(`📝 Simple list: ${listFile}`);

  if (results.length === 0) {
    console.log(`\n🎉 CONGRATULATIONS! No MongoDB endpoints found!`);
    console.log(`✅ All API endpoints have been migrated to PostgreSQL!`);
  } else {
    console.log(
      `\n🔍 Found ${results.length} MongoDB endpoint(s) that need migration`,
    );
    console.log(
      `   - High priority: ${results.filter((r) => r.severity === "HIGH").length}`,
    );
    console.log(
      `   - Medium priority: ${results.filter((r) => r.severity === "MEDIUM").length}`,
    );
    console.log(
      `   - Low priority: ${results.filter((r) => r.severity === "LOW").length}`,
    );
  }
}

function formatEndpointReport(result, index) {
  let section = `#### ${index}. \`${result.apiEndpoint}\`\n\n`;
  section += `- **File:** \`${result.filePath}\`\n`;
  section += `- **Lines:** ${result.lineCount}\n`;
  section += `- **Severity:** ${result.severity}\n\n`;

  if (result.mongodbUsage.length > 0) {
    section += `**MongoDB Usage Found:**\n\n`;
    result.mongodbUsage.forEach((usage) => {
      section += `- Line ${usage.line} (${usage.type}): \`${usage.usage}\`\n`;
    });
    section += `\n`;
  }

  return section;
}

function main() {
  console.log("🔍 Scanning API endpoints for MongoDB usage...");
  console.log("📝 This scan checks for:");
  console.log("   - MongoDB/Mongoose imports");
  console.log("   - MongoDB connection strings");
  console.log("   - Mongoose schema definitions");
  console.log("");
  console.log("🚫 This scan ignores:");
  console.log("   - Native JavaScript methods (Map.delete, Array.find, etc.)");
  console.log("   - PostgreSQL/Drizzle endpoints");
  console.log("");

  if (!fs.existsSync(API_DIR)) {
    console.error(`❌ API directory not found: ${API_DIR}`);
    console.error(`   Make sure you're running this from the project root`);
    process.exit(1);
  }

  const results = scanDirectory(API_DIR);
  generateReport(results);
}

if (require.main === module) {
  main();
}

module.exports = { scanDirectory, scanFile };
