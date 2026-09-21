#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

/**
 * CSV Export Script for Component Analysis
 *
 * Exports component usage data to CSV format for easy analysis in spreadsheets
 */

const WEB_COMPONENTS_DIR = path.join(__dirname, "../apps/web/components");
const WEB_APP_DIR = path.join(__dirname, "../apps/web");
const OUTPUT_FILE = path.join(
  __dirname,
  "../docs/web/component-analysis/component-usage.csv",
);

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

const componentUsage = new Map();
const componentsByCategory = new Map();

function getFilesRecursively(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;

  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (file !== "node_modules" && file !== ".next" && file !== "dist") {
        getFilesRecursively(filePath, fileList);
      }
    } else if (file.match(/\.(tsx?|jsx?)$/)) {
      if (
        !file.match(/\.(test|spec)\.(tsx?|jsx?)$/) &&
        !file.endsWith(".d.ts")
      ) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

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

function getCategoryFromPath(filePath) {
  const relativePath = path.relative(WEB_COMPONENTS_DIR, filePath);
  const category = relativePath.split(path.sep)[0];
  return COMPONENT_CATEGORIES.includes(category) ? category : "other";
}

function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const relativeFilePath = path.relative(WEB_APP_DIR, filePath);

    const importPatterns = [
      /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g,
      /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g,
    ];

    importPatterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        let importPath = match[2] || match[1];
        let importedNames = [];

        if (pattern.source.includes("{")) {
          importedNames = match[1]
            .split(",")
            .map((n) => n.trim().split(" as ")[0].trim());
        } else if (match[1] && !match[1].includes("/")) {
          importedNames = [match[1]];
        }

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
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error.message);
  }
}

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

function categorizeComponents() {
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
}

function escapeCSV(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function generateCSV() {
  console.log("Analyzing components for CSV export...\n");

  const filesToAnalyze = getFilesRecursively(WEB_APP_DIR);
  console.log(`Analyzing ${filesToAnalyze.length} files...\n`);

  filesToAnalyze.forEach((file, index) => {
    if (index % 100 === 0) {
      console.log(`Progress: ${index + 1}/${filesToAnalyze.length}`);
    }
    analyzeFile(file);
  });

  console.log("\nCategorizing components...\n");
  categorizeComponents();

  // Determine category for each component
  const componentsWithCategory = Array.from(componentUsage.values()).map(
    (usage) => {
      let category = "unknown";
      for (const [cat, components] of componentsByCategory.entries()) {
        // Check exact match first
        if (components.has(usage.name)) {
          category = cat;
          break;
        }

        // Check case-insensitive match
        for (const comp of components) {
          if (comp.toLowerCase() === usage.name.toLowerCase()) {
            category = cat;
            break;
          }
        }

        if (category !== "unknown") break;
      }
      return { ...usage, category };
    },
  );

  // Sort by usage count (descending)
  componentsWithCategory.sort((a, b) => b.count - a.count);

  // Build CSV
  const headers = [
    "Component Name",
    "Usage Count",
    "Category",
    "Priority Level",
    "In Mobile?",
    "Sample Files (first 3)",
    "Total Files Using",
  ];

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

  let csv = headers.map(escapeCSV).join(",") + "\n";

  componentsWithCategory.forEach((usage) => {
    const priorityLevel =
      usage.count >= 50
        ? "High"
        : usage.count >= 20
          ? "Medium"
          : usage.count >= 10
            ? "Lower"
            : "Optional";

    const inMobile = MOBILE_COMPONENTS.includes(usage.name) ? "Yes" : "No";

    const sampleFiles = usage.usedIn.slice(0, 3).join("; ");

    const uniqueFiles = new Set(usage.usedIn).size;

    const row = [
      usage.name,
      usage.count,
      usage.category,
      priorityLevel,
      inMobile,
      sampleFiles,
      uniqueFiles,
    ];

    csv += row.map(escapeCSV).join(",") + "\n";
  });

  return {
    csv,
    stats: {
      total: componentsWithCategory.length,
      files: filesToAnalyze.length,
    },
  };
}

function main() {
  try {
    const { csv, stats } = generateCSV();

    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write CSV
    fs.writeFileSync(OUTPUT_FILE, csv, "utf-8");

    console.log("\n✅ CSV export complete!");
    console.log(`📄 File saved to: ${OUTPUT_FILE}`);
    console.log(`\nStats:`);
    console.log(`- Total components: ${stats.total}`);
    console.log(`- Files analyzed: ${stats.files}`);
    console.log(
      `\nYou can now open this CSV in Excel, Google Sheets, or any spreadsheet application.`,
    );
  } catch (error) {
    console.error("Error generating CSV:", error);
    process.exit(1);
  }
}

main();
