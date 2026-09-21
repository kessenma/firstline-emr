#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

/**
 * Markdown Documentation Scanner
 * Scans the entire project for .md files and categorizes them
 * to help organize documentation structure
 */

// Directories to skip
const SKIP_DIRS = [
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  ".turbo",
  ".trae",
  "coverage",
];

// Categories based on filename patterns and content
const CATEGORIES = {
  PHASE_COMPLETIONS: /PHASE.*(?:COMPLETE|COMPLETION|READY|RESULTS|SUMMARY)/i,
  STAGE_COMPLETIONS: /STAGE.*(?:COMPLETE|COMPLETION|SUMMARY)/i,
  SETUP_GUIDES: /(?:SETUP|QUICKSTART|QUICK.?START|QUICK.?REF)/i,
  TROUBLESHOOTING: /(?:TROUBLESHOOT|DEBUG|FIX|ERROR)/i,
  CHECKLISTS: /CHECKLIST/i,
  ARCHITECTURE: /(?:ARCHITECTURE|DESIGN|STRUCTURE)/i,
  DEPLOYMENT: /(?:DEPLOY|PRODUCTION|BUILD)/i,
  MIGRATION: /MIGRATION/i,
  TESTING: /TEST/i,
  API_DOCS: /API/i,
  README: /^README\.md$/i,
};

function shouldSkipDirectory(dirName) {
  return SKIP_DIRS.includes(dirName) || dirName.startsWith(".");
}

function categorizeFile(filePath, fileName) {
  const categories = [];

  for (const [category, pattern] of Object.entries(CATEGORIES)) {
    if (pattern.test(fileName)) {
      categories.push(category);
    }
  }

  // Special handling for docs that are already in docs folders
  if (filePath.includes("/docs/")) {
    categories.push("ALREADY_IN_DOCS");
  }

  // Root level files
  if (!filePath.includes("/")) {
    categories.push("ROOT_LEVEL");
  }

  return categories.length > 0 ? categories : ["UNCATEGORIZED"];
}

function getFileInfo(filePath) {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    const content = fs.readFileSync(fullPath, "utf8");
    const stats = fs.statSync(fullPath);
    const lines = content.split("\n");

    // Extract title (first # heading)
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : null;

    // Count headings
    const headingCount = (content.match(/^#+\s+/gm) || []).length;

    // Get first few lines for preview
    const preview = lines
      .slice(0, 5)
      .filter((line) => line.trim())
      .join(" ")
      .substring(0, 100);

    return {
      path: filePath,
      fileName: path.basename(filePath),
      directory: path.dirname(filePath),
      size: stats.size,
      modified: stats.mtime,
      lineCount: lines.length,
      title: title,
      headingCount: headingCount,
      preview: preview,
      categories: categorizeFile(filePath, path.basename(filePath)),
    };
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

function scanDirectory(dirPath = ".") {
  const results = [];

  function scanRecursive(currentPath) {
    try {
      const items = fs.readdirSync(currentPath);

      for (const item of items) {
        const fullPath = path.join(currentPath, item);
        const relativePath = path.relative(process.cwd(), fullPath);

        try {
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            if (!shouldSkipDirectory(item)) {
              scanRecursive(fullPath);
            }
          } else if (item.endsWith(".md")) {
            const fileInfo = getFileInfo(relativePath);
            if (fileInfo) {
              results.push(fileInfo);
            }
          }
        } catch (error) {
          // Skip files we can't access
          continue;
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
    .toISOString()
    .replace(/[:.]/g, "-")
    .substring(0, 19);

  const reportFile = `markdown-scan-${timestamp}.md`;

  // Group by category
  const byCategory = {};
  results.forEach((file) => {
    file.categories.forEach((category) => {
      if (!byCategory[category]) {
        byCategory[category] = [];
      }
      byCategory[category].push(file);
    });
  });

  // Group by directory
  const byDirectory = {};
  results.forEach((file) => {
    const topDir = file.directory.split("/")[0];
    if (!byDirectory[topDir]) {
      byDirectory[topDir] = [];
    }
    byDirectory[topDir].push(file);
  });

  let report = `# Markdown Documentation Scan Report\n\n`;
  report += `**Generated:** ${new Date().toLocaleString()}\n\n`;
  report += `**Total Markdown Files:** ${results.length}\n\n`;

  // Summary statistics
  report += `## 📊 Statistics\n\n`;
  report += `- **Total Files:** ${results.length}\n`;
  report += `- **Total Size:** ${formatBytes(results.reduce((sum, f) => sum + f.size, 0))}\n`;
  report += `- **Total Lines:** ${results.reduce((sum, f) => sum + f.lineCount, 0).toLocaleString()}\n`;
  report += `- **Already in docs/ folder:** ${results.filter((f) => f.categories.includes("ALREADY_IN_DOCS")).length}\n`;
  report += `- **At root level:** ${results.filter((f) => f.categories.includes("ROOT_LEVEL")).length}\n\n`;

  // Category breakdown
  report += `## 📑 By Category\n\n`;
  const categoryOrder = [
    "ROOT_LEVEL",
    "PHASE_COMPLETIONS",
    "STAGE_COMPLETIONS",
    "MIGRATION",
    "SETUP_GUIDES",
    "DEPLOYMENT",
    "ARCHITECTURE",
    "API_DOCS",
    "TROUBLESHOOTING",
    "TESTING",
    "CHECKLISTS",
    "README",
    "ALREADY_IN_DOCS",
    "UNCATEGORIZED",
  ];

  categoryOrder.forEach((category) => {
    const files = byCategory[category];
    if (files && files.length > 0) {
      report += `### ${formatCategoryName(category)} (${files.length})\n\n`;
      files
        .sort((a, b) => a.path.localeCompare(b.path))
        .slice(0, 20) // Show first 20 per category
        .forEach((file) => {
          report += `- \`${file.path}\`\n`;
          if (file.title) {
            report += `  - **Title:** ${file.title}\n`;
          }
          report += `  - **Size:** ${formatBytes(file.size)} | **Lines:** ${file.lineCount}\n`;
        });
      if (files.length > 20) {
        report += `\n*... and ${files.length - 20} more files*\n`;
      }
      report += `\n`;
    }
  });

  // Directory breakdown
  report += `## 📁 By Directory (Top 15)\n\n`;
  const sortedDirs = Object.entries(byDirectory)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 15);

  sortedDirs.forEach(([dir, files]) => {
    report += `### ${dir}/ (${files.length} files)\n\n`;
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    report += `- **Total Size:** ${formatBytes(totalSize)}\n`;
    report += `- **Files:**\n`;
    files
      .sort((a, b) => b.size - a.size)
      .slice(0, 10)
      .forEach((file) => {
        report += `  - \`${file.fileName}\` (${formatBytes(file.size)})\n`;
      });
    if (files.length > 10) {
      report += `  - *... and ${files.length - 10} more*\n`;
    }
    report += `\n`;
  });

  // Files that should be moved (not in docs)
  const filesToMove = results.filter(
    (f) =>
      !f.categories.includes("ALREADY_IN_DOCS") &&
      !f.categories.includes("README"),
  );

  report += `## 🚚 Recommended Files to Move (${filesToMove.length})\n\n`;
  report += `These files are not currently in a docs/ folder:\n\n`;

  const moveGroups = {
    "Root Level (High Priority)": filesToMove.filter((f) =>
      f.categories.includes("ROOT_LEVEL"),
    ),
    "Phase/Stage Completions": filesToMove.filter(
      (f) =>
        f.categories.includes("PHASE_COMPLETIONS") ||
        f.categories.includes("STAGE_COMPLETIONS"),
    ),
    "Setup & Guides": filesToMove.filter((f) =>
      f.categories.includes("SETUP_GUIDES"),
    ),
    "Other Documentation": filesToMove.filter(
      (f) =>
        !f.categories.includes("ROOT_LEVEL") &&
        !f.categories.includes("PHASE_COMPLETIONS") &&
        !f.categories.includes("STAGE_COMPLETIONS") &&
        !f.categories.includes("SETUP_GUIDES"),
    ),
  };

  Object.entries(moveGroups).forEach(([groupName, files]) => {
    if (files.length > 0) {
      report += `### ${groupName} (${files.length})\n\n`;
      files.slice(0, 20).forEach((file) => {
        report += `- [ ] \`${file.path}\`\n`;
        if (file.title) {
          report += `      → Title: "${file.title}"\n`;
        }
      });
      if (files.length > 20) {
        report += `\n*... and ${files.length - 20} more files*\n`;
      }
      report += `\n`;
    }
  });

  // Recommendations
  report += `## 💡 Organization Recommendations\n\n`;
  report += `Based on the scan, here's a suggested docs/ folder structure:\n\n`;
  report += `\`\`\`\n`;
  report += `docs/\n`;
  report += `├── README.md                 # Main documentation index\n`;
  report += `├── setup/                    # Setup and quick start guides\n`;
  report += `│   ├── quick-start/\n`;
  report += `│   └── deployment/\n`;
  report += `├── architecture/             # Architecture and design docs\n`;
  report += `├── api/                      # API documentation\n`;
  report += `├── migration/                # Migration guides and phases\n`;
  report += `│   ├── phases/              # Phase completion docs\n`;
  report += `│   └── stages/              # Stage completion docs\n`;
  report += `├── features/                 # Feature-specific docs\n`;
  report += `│   ├── authentication/\n`;
  report += `│   ├── messaging/\n`;
  report += `│   ├── livekit/\n`;
  report += `│   └── theming/\n`;
  report += `├── troubleshooting/          # Debugging and fixes\n`;
  report += `├── testing/                  # Testing guides\n`;
  report += `├── mobile/                   # Mobile-specific docs\n`;
  report += `├── web/                      # Web-specific docs\n`;
  report += `├── analytics/                # Analytics docs\n`;
  report += `└── archive/                  # Old/completed docs\n`;
  report += `    └── yyyy-mm/             # Organized by date\n`;
  report += `\`\`\`\n\n`;

  report += `## 🎯 Next Steps\n\n`;
  report += `1. Review the "Recommended Files to Move" section\n`;
  report += `2. Create the suggested folder structure in docs/\n`;
  report += `3. Move root-level markdown files first (highest priority)\n`;
  report += `4. Organize phase/stage completion docs by date in archive/\n`;
  report += `5. Consolidate related documentation\n`;
  report += `6. Update any broken links after moving files\n`;
  report += `7. Create a docs/README.md as a documentation index\n`;
  report += `8. Consider removing duplicate or outdated docs\n\n`;

  // Generate CSV for easy processing
  const csvFile = `markdown-scan-${timestamp}.csv`;
  let csv = "Path,FileName,Directory,Size,Lines,Title,Categories\n";
  results.forEach((file) => {
    csv += `"${file.path}","${file.fileName}","${file.directory}",${file.size},${file.lineCount},"${file.title || ""}","${file.categories.join(";")}"\n`;
  });

  fs.writeFileSync(reportFile, report);
  fs.writeFileSync(csvFile, csv);

  console.log(`\n📊 Scan Complete!`);
  console.log(`📄 Detailed report: ${reportFile}`);
  console.log(`📊 CSV export: ${csvFile}`);
  console.log(`\n📈 Summary:`);
  console.log(`   - Total markdown files: ${results.length}`);
  console.log(
    `   - Files at root level: ${results.filter((f) => f.categories.includes("ROOT_LEVEL")).length}`,
  );
  console.log(
    `   - Files already in docs/: ${results.filter((f) => f.categories.includes("ALREADY_IN_DOCS")).length}`,
  );
  console.log(`   - Files to organize: ${filesToMove.length}`);
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

function formatCategoryName(category) {
  return category
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function main() {
  console.log("🔍 Scanning project for markdown documentation...");
  console.log("📝 This scan will:");
  console.log("   - Find all .md files in the project");
  console.log("   - Categorize them by type");
  console.log("   - Identify files that should be organized");
  console.log("   - Suggest a documentation structure");
  console.log("");

  const results = scanDirectory();
  generateReport(results);
}

if (require.main === module) {
  main();
}

module.exports = { scanDirectory, getFileInfo };
