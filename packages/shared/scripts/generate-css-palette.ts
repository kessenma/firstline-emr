/**
 * Generates CSS @theme variables from the shared palette.
 * Output: apps/web/styles/generated-palette.css
 *
 * Run: pnpm --filter @fajr/shared generate:css
 * Turbo caches this — only re-runs when packages/shared/src/theme/** changes.
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { palette, brandColors, roleColors } from '../src/theme/index';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, '../../../apps/web/styles/generated-palette.css');

// Map palette keys to CSS names (camelCase → kebab-case)
const paletteNameMap: Record<string, string> = {
  teal: 'teal',
  blue: 'blue',
  red: 'red',
  navy: 'navy',
  easternBlue: 'eastern-blue',
  cello: 'cello',
  orange: 'orange',
  yellow: 'yellow',
  green: 'green',
  grey: 'grey',
};

// Map role keys to CSS role token names
const roleShadeMap: Record<string, string> = {
  primary: 'primary',
  light: 'light',
  dark: 'dark',
  lightest: 'lightest',
  darkest: 'darkest',
};

function generateCSS(): string {
  const lines: string[] = [
    '/* AUTO-GENERATED from @fajr/shared/theme — do not edit manually */',
    '/* Source: packages/shared/src/theme/palette.ts */',
    '/* Run: pnpm --filter @fajr/shared generate:css */',
    '',
    '@theme {',
  ];

  // Palette colors
  for (const [key, shades] of Object.entries(palette)) {
    const cssName = paletteNameMap[key] || key;
    lines.push('');
    for (const [shade, hex] of Object.entries(shades)) {
      lines.push(`  --color-${cssName}-${shade}: ${hex};`);
    }
  }

  // Brand colors
  lines.push('');
  lines.push(`  --color-black: ${brandColors.black};`);
  lines.push(`  --color-white: ${brandColors.white};`);

  // Role tokens (reference palette variables)
  lines.push('');
  for (const [role, colors] of Object.entries(roleColors)) {
    for (const [shade, hex] of Object.entries(colors)) {
      const cssShade = roleShadeMap[shade] || shade;
      // Find which palette variable this hex maps to for a var() reference
      const varRef = findPaletteVar(hex);
      if (varRef) {
        lines.push(`  --color-${role}-${cssShade}: var(${varRef});`);
      } else {
        lines.push(`  --color-${role}-${cssShade}: ${hex};`);
      }
    }
  }

  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

function findPaletteVar(hex: string): string | null {
  for (const [key, shades] of Object.entries(palette)) {
    const cssName = paletteNameMap[key] || key;
    for (const [shade, value] of Object.entries(shades)) {
      if (value.toLowerCase() === hex.toLowerCase()) {
        return `--color-${cssName}-${shade}`;
      }
    }
  }
  return null;
}

const css = generateCSS();
writeFileSync(OUTPUT_PATH, css, 'utf-8');
console.log(`Generated ${OUTPUT_PATH}`);
