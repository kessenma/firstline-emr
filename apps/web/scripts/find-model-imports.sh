#!/bin/bash
# filepath: /Users/ke/ws/fajr-medflow-emr/apps/web/scripts/find-model-imports.sh

echo "🔍 Searching for remaining @/models imports..."
echo ""

# Find all TypeScript/TSX files with @/models imports
grep -rn "from ['\"]@/models" . \
  --include="*.ts" \
  --include="*.tsx" \
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  --exclude="*.md" \
  --color=always

echo ""
echo "✅ Search complete!"