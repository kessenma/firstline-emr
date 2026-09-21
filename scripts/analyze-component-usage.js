#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

/**
 * Component Usage Analyzer
 *
 * This script analyzes component usage across the web application to help prioritize
 * which components should be built for the mobile app.
 *
 * It scans all TypeScript/JavaScript files and tracks:
 * - How many times each component is imported
 * - Where each component is used
 * - Component categories (ui, form, etc.)
 */

const WEB_COMPONENTS_DIR = path.join(__dirname, "../apps/web/components");
const WEB_APP_DIR = path.join(__dirname, "../apps/web");
const OUTPUT_FILE = path.join(
  __dirname,
  "../docs/web/component-analysis/usage-report.md",
);

// Component categories to track
const COMPONENT_CATEGORIES = [
  "ui",
  "form",
  "admin",
  "adminDashboard",
  "patient-chart",
  "patient-dashboard",
  "messages",
  "notifications",
  "auth",
  "nav",
  "user-profile",
  "medEvac-form",
  "telegram-patient",
  "rxQrCode",
  "aboutPage",
  "hooks",
  "globalContext",
  "debug",
];

// Store component usage data
const componentUsage = new Map();
const componentsByCategory = new Map();

/**
 * Get all TypeScript/JavaScript files in a directory recursively
 */
function getFilesRecursively(dir, fileList = []) {
  if (!fs.existsSync(dir)) {
    return fileList;
  }

  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules and .next directories
      if (file !== "node_modules" && file !== ".next" && file !== "dist") {
        getFilesRecursively(filePath, fileList);
      }
    } else if (
      file.endsWith(".tsx") ||
      file.endsWith(".ts") ||
      file.endsWith(".jsx") ||
      file.endsWith(".js")
    ) {
      // Skip test files and type definition files
      if (
        !file.endsWith(".test.tsx") &&
        !file.endsWith(".test.ts") &&
        !file.endsWith(".spec.tsx") &&
        !file.endsWith(".spec.ts") &&
        !file.endsWith(".d.ts")
      ) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

/**
 * Extract component names from a file path
 */
function getComponentNameFromPath(filePath) {
  const basename = path.basename(filePath, path.extname(filePath));

  // Handle index files - use directory name
  if (basename === "index") {
    const dirName = path.basename(path.dirname(filePath));
    // Convert to PascalCase
    return dirName.charAt(0).toUpperCase() + dirName.slice(1);
  }

  // Convert kebab-case or lowercase to PascalCase
  // e.g., "button" -> "Button", "alert-dialog" -> "AlertDialog"
  return basename
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/**
 * Get the category of a component based on its path
 */
function getCategoryFromPath(filePath) {
  const relativePath = path.relative(WEB_COMPONENTS_DIR, filePath);
  const parts = relativePath.split(path.sep);

  if (parts.length > 0) {
    const category = parts[0];
    if (COMPONENT_CATEGORIES.includes(category)) {
      return category;
    }
  }

  return "other";
}

/**
 * Parse a file and extract component imports
 */
function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const relativeFilePath = path.relative(WEB_APP_DIR, filePath);

    // Match various import patterns
    const importPatterns = [
      // Named imports: import { ComponentName } from '...'
      /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g,
      // Default imports: import ComponentName from '...'
      /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g,
      // Dynamic imports: import('...')
      /import\(['"]([^'"]+)['"]\)/g,
    ];

    importPatterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        let importPath = match[2] || match[1];
        let importedNames = [];

        if (pattern.source.includes("{")) {
          // Named imports
          const names = match[1]
            .split(",")
            .map((n) => n.trim().split(" as ")[0].trim());
          importedNames = names;
        } else if (match[1] && !match[1].includes("/")) {
          // Default import (match[1] is the component name)
          importedNames = [match[1]];
        }

        // Check if it's importing from components directory
        if (
          importPath &&
          (importPath.includes("/components/") ||
            importPath.startsWith("@/components/") ||
            importPath.startsWith("../components/") ||
            importPath.startsWith("./components/") ||
            importPath.startsWith("../../components/"))
        ) {
          importedNames.forEach((componentName) => {
            if (componentName && componentName !== "default") {
              recordComponentUsage(componentName, relativeFilePath, importPath);
            }
          });
        }
      }
    });

    // Also check for JSX usage of components (to catch components used without explicit imports)
    const jsxPattern = /<([A-Z][a-zA-Z0-9]*)/g;
    let jsxMatch;
    const jsxComponents = new Set();

    while ((jsxMatch = jsxPattern.exec(content)) !== null) {
      jsxComponents.add(jsxMatch[1]);
    }

    // Record JSX usage separately (lighter weight)
    jsxComponents.forEach((componentName) => {
      if (!componentUsage.has(componentName)) {
        // Only record if we haven't seen this component in imports
        recordComponentUsage(componentName, relativeFilePath, "JSX-usage-only");
      }
    });
  } catch (error) {
    console.error(`Error analyzing file ${filePath}:`, error.message);
  }
}

/**
 * Record component usage
 */
function recordComponentUsage(componentName, usedInFile, importPath) {
  if (!componentUsage.has(componentName)) {
    componentUsage.set(componentName, {
      name: componentName,
      count: 0,
      usedIn: [],
      importPaths: new Set(),
    });
  }

  const usage = componentUsage.get(componentName);
  usage.count++;
  usage.usedIn.push(usedInFile);
  usage.importPaths.add(importPath);
}

/**
 * Categorize components
 */
function categorizeComponents() {
  // First, scan components directory to build a map of component -> category
  const componentFiles = getFilesRecursively(WEB_COMPONENTS_DIR);

  componentFiles.forEach((filePath) => {
    const componentName = getComponentNameFromPath(filePath);
    const category = getCategoryFromPath(filePath);

    if (!componentsByCategory.has(category)) {
      componentsByCategory.set(category, new Set());
    }

    componentsByCategory.get(category).add(componentName);

    // Also read the file to find related exports (e.g., CardContent from card.tsx)
    try {
      const content = fs.readFileSync(filePath, "utf-8");

      // Look for named exports like: export { Card, CardHeader, CardTitle }
      const exportPattern = /export\s+\{\s*([^}]+)\s*\}/g;
      let match;
      while ((match = exportPattern.exec(content)) !== null) {
        const exports = match[1]
          .split(",")
          .map((e) => e.trim().split(" as ")[0].trim());
        exports.forEach((exportName) => {
          if (exportName && exportName !== "default") {
            componentsByCategory.get(category).add(exportName);
          }
        });
      }

      // Look for individual exports like: export const CardHeader = ...
      const individualExportPattern =
        /export\s+(?:const|function|class)\s+(\w+)/g;
      while ((match = individualExportPattern.exec(content)) !== null) {
        const exportName = match[1];
        if (exportName && exportName !== "default") {
          componentsByCategory.get(category).add(exportName);
        }
      }
    } catch (error) {
      // Ignore read errors
    }
  });

  // Now categorize usage data
  const categorizedUsage = new Map();

  componentUsage.forEach((usage, componentName) => {
    let category = "unknown";

    // Find which category this component belongs to
    // Use case-insensitive comparison
    for (const [cat, components] of componentsByCategory.entries()) {
      // Check exact match first
      if (components.has(componentName)) {
        category = cat;
        break;
      }

      // Check case-insensitive match
      for (const comp of components) {
        if (comp.toLowerCase() === componentName.toLowerCase()) {
          category = cat;
          break;
        }
      }

      if (category !== "unknown") break;
    }

    if (!categorizedUsage.has(category)) {
      categorizedUsage.set(category, []);
    }

    categorizedUsage.get(category).push(usage);
  });

  return categorizedUsage;
}

/**
 * Generate the analysis report
 */
function generateReport() {
  console.log("Starting component usage analysis...\n");

  // Get all files to analyze
  const filesToAnalyze = getFilesRecursively(WEB_APP_DIR);
  console.log(`Found ${filesToAnalyze.length} files to analyze\n`);

  // Analyze each file
  filesToAnalyze.forEach((file, index) => {
    if (index % 100 === 0) {
      console.log(`Analyzing file ${index + 1}/${filesToAnalyze.length}...`);
    }
    analyzeFile(file);
  });

  console.log("\nAnalysis complete! Generating report...\n");

  // Categorize and sort
  const categorizedUsage = categorizeComponents();

  // Build report
  let report = "";
  report += "# Web Component Usage Analysis\n\n";
  report += `Generated: ${new Date().toISOString()}\n\n`;
  report += `Total unique components found: ${componentUsage.size}\n`;
  report += `Total files analyzed: ${filesToAnalyze.length}\n\n`;

  report += "---\n\n";
  report += "## Summary Statistics\n\n";

  // Overall top components
  const allComponents = Array.from(componentUsage.values()).sort(
    (a, b) => b.count - a.count,
  );

  report += "### Top 30 Most Used Components (Overall)\n\n";
  report += "| Rank | Component | Usage Count | Category |\n";
  report += "|------|-----------|-------------|----------|\n";

  allComponents.slice(0, 30).forEach((usage, index) => {
    let category = "unknown";
    for (const [cat, components] of componentsByCategory.entries()) {
      if (components.has(usage.name)) {
        category = cat;
        break;
      }
      // Check case-insensitive
      for (const comp of components) {
        if (comp.toLowerCase() === usage.name.toLowerCase()) {
          category = cat;
          break;
        }
      }
      if (category !== "unknown") break;
    }
    report += `| ${index + 1} | ${usage.name} | ${usage.count} | ${category} |\n`;
  });

  report += "\n---\n\n";
  report += "## Detailed Analysis by Category\n\n";

  // Sort categories by total usage
  const sortedCategories = Array.from(categorizedUsage.entries()).sort(
    (a, b) => {
      const aTotal = a[1].reduce((sum, u) => sum + u.count, 0);
      const bTotal = b[1].reduce((sum, u) => sum + u.count, 0);
      return bTotal - aTotal;
    },
  );

  sortedCategories.forEach(([category, components]) => {
    const totalUsage = components.reduce((sum, u) => sum + u.count, 0);
    components.sort((a, b) => b.count - a.count);

    report += `### ${category} (${components.length} components, ${totalUsage} total uses)\n\n`;
    report += "| Component | Usage Count | Used In Files (sample) |\n";
    report += "|-----------|-------------|------------------------|\n";

    components.forEach((usage) => {
      const sampleFiles = usage.usedIn.slice(0, 3).join(", ");
      const moreFiles =
        usage.usedIn.length > 3
          ? ` ... and ${usage.usedIn.length - 3} more`
          : "";
      report += `| ${usage.name} | ${usage.count} | ${sampleFiles}${moreFiles} |\n`;
    });

    report += "\n";
  });

  report += "---\n\n";
  report += "## Mobile App Component Priority Recommendations\n\n";
  report +=
    "Based on usage frequency, here are the components you should prioritize for mobile:\n\n";

  // Group by category and show top components
  report += "### High Priority (Used 50+ times)\n\n";
  const highPriority = allComponents.filter((u) => u.count >= 50);
  highPriority.forEach((usage) => {
    let category = "unknown";
    for (const [cat, components] of componentsByCategory.entries()) {
      if (components.has(usage.name)) {
        category = cat;
        break;
      }
      for (const comp of components) {
        if (comp.toLowerCase() === usage.name.toLowerCase()) {
          category = cat;
          break;
        }
      }
      if (category !== "unknown") break;
    }
    report += `- **${usage.name}** (${category}) - ${usage.count} uses\n`;
  });

  report += "\n### Medium Priority (Used 20-49 times)\n\n";
  const mediumPriority = allComponents.filter(
    (u) => u.count >= 20 && u.count < 50,
  );
  mediumPriority.forEach((usage) => {
    let category = "unknown";
    for (const [cat, components] of componentsByCategory.entries()) {
      if (components.has(usage.name)) {
        category = cat;
        break;
      }
      for (const comp of components) {
        if (comp.toLowerCase() === usage.name.toLowerCase()) {
          category = cat;
          break;
        }
      }
      if (category !== "unknown") break;
    }
    report += `- **${usage.name}** (${category}) - ${usage.count} uses\n`;
  });

  report += "\n### Lower Priority (Used 10-19 times)\n\n";
  const lowerPriority = allComponents.filter(
    (u) => u.count >= 10 && u.count < 20,
  );
  lowerPriority.forEach((usage) => {
    let category = "unknown";
    for (const [cat, components] of componentsByCategory.entries()) {
      if (components.has(usage.name)) {
        category = cat;
        break;
      }
      for (const comp of components) {
        if (comp.toLowerCase() === usage.name.toLowerCase()) {
          category = cat;
          break;
        }
      }
      if (category !== "unknown") break;
    }
    report += `- **${usage.name}** (${category}) - ${usage.count} uses\n`;
  });

  report += "\n---\n\n";
  report += "## Component Gaps Analysis\n\n";
  report +=
    "Components that exist in web but might be missing or under-represented in mobile:\n\n";

  // Get mobile components list
  const MOBILE_COMPONENTS = [
    "Card",
    "Accordion",
    "SwitchField",
    "RadioCardSelector",
    "SelectField",
    "CheckboxField",
    "DatePickerField",
    "TextInputField",
    "BottomSheet",
    "AudioPlayer",
    "ErrorCard",
    "CustomTabBar",
    "ErrorBoundary",
    "AdminAccordion",
    "AdminDashboardHeader",
    "AdminDashboardView",
    "MobilePatientDashboardTable",
    "ConfirmDialog",
    "ErrorState",
    "UserCard",
    "EmptyState",
    "BulkActionBar",
    "LoadingState",
  ];

  report += "### High-usage web components NOT in mobile yet:\n\n";
  highPriority.forEach((usage) => {
    if (!MOBILE_COMPONENTS.includes(usage.name)) {
      let category = "unknown";
      for (const [cat, components] of componentsByCategory.entries()) {
        if (components.has(usage.name)) {
          category = cat;
          break;
        }
        for (const comp of components) {
          if (comp.toLowerCase() === usage.name.toLowerCase()) {
            category = cat;
            break;
          }
        }
        if (category !== "unknown") break;
      }
      report += `- **${usage.name}** (${category}) - ${usage.count} uses - ⚠️ MISSING IN MOBILE\n`;
    }
  });

  report += "\n### Mobile components that exist but are low-usage in web:\n\n";
  MOBILE_COMPONENTS.forEach((mobileComp) => {
    const usage = componentUsage.get(mobileComp);
    if (!usage || usage.count < 10) {
      const count = usage ? usage.count : 0;
      report += `- **${mobileComp}** - ${count} uses (consider if this is needed)\n`;
    }
  });

  report += "\n---\n\n";
  report += "## Detailed Component Usage Locations\n\n";
  report += "For the top 20 components, here's where they are used:\n\n";

  allComponents.slice(0, 20).forEach((usage) => {
    report += `### ${usage.name} (${usage.count} uses)\n\n`;

    // Group usage by directory
    const byDirectory = {};
    usage.usedIn.forEach((file) => {
      const dir = path.dirname(file);
      if (!byDirectory[dir]) {
        byDirectory[dir] = [];
      }
      byDirectory[dir].push(path.basename(file));
    });

    Object.entries(byDirectory)
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([dir, files]) => {
        report += `- **${dir}**: ${files.length} file(s)\n`;
        files.slice(0, 5).forEach((file) => {
          report += `  - ${file}\n`;
        });
        if (files.length > 5) {
          report += `  - ... and ${files.length - 5} more\n`;
        }
      });

    report += "\n";
  });

  report += "---\n\n";
  report += "## Next Steps\n\n";
  report +=
    '1. Review the "High Priority" components and ensure they exist in mobile\n';
  report += "2. For each missing high-priority component, assess:\n";
  report += "   - Is this functionality needed in mobile?\n";
  report += "   - Can it be adapted from the web version?\n";
  report += "   - Or does it need a mobile-specific implementation?\n";
  report += "3. Create a backlog of components to implement\n";
  report +=
    "4. Consider creating a shared component library for truly universal components\n";

  return report;
}

/**
 * Main execution
 */
function main() {
  try {
    const report = generateReport();

    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write report
    fs.writeFileSync(OUTPUT_FILE, report, "utf-8");

    console.log(`\n✅ Analysis complete!`);
    console.log(`📄 Report saved to: ${OUTPUT_FILE}`);
    console.log(`\nSummary:`);
    console.log(`- Total unique components: ${componentUsage.size}`);
    console.log(`- Categories analyzed: ${componentsByCategory.size}`);

    const allComponents = Array.from(componentUsage.values()).sort(
      (a, b) => b.count - a.count,
    );
    console.log(`\nTop 5 most used components:`);
    allComponents.slice(0, 5).forEach((usage, index) => {
      console.log(`  ${index + 1}. ${usage.name} (${usage.count} uses)`);
    });
  } catch (error) {
    console.error("Error generating report:", error);
    process.exit(1);
  }
}

main();
