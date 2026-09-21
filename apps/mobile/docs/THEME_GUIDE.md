# Theme System Quick Reference Guide

> **Source of truth for colors/spacing**: `packages/shared/src/theme/` (`@fajr/shared/theme`)
> Mobile imports shared palette via `apps/mobile/src/utils/colors.ts`

## Overview

This guide provides quick examples for using the theme system in the Fajr Mobile EMR app.

## Import Statements

```typescript
// Import theme hook
import { useTheme, useThemeColors } from '../contexts/ThemeContext';

// Import theme constants
import { spacing, borderRadius, typography, shadows, helpers } from '../utils/theme';

// Import color palette
import { palette } from '../utils/colors';
```

## Basic Usage

### Getting Theme Colors

```typescript
function MyComponent() {
  const colors = useThemeColors();
  
  return (
    <View style={{ backgroundColor: colors.background }}>
      <Text style={{ color: colors.text }}>Hello World</Text>
    </View>
  );
}
```

### Using Theme Object

```typescript
function MyComponent() {
  const { theme, themeMode, toggleTheme } = useTheme();
  
  return (
    <View>
      <Text style={{ color: theme.colors.text }}>
        Current mode: {themeMode}
      </Text>
      <Button title="Toggle Theme" onPress={toggleTheme} />
    </View>
  );
}
```

## Color Reference

### Brand Colors

```typescript
colors.primary           // Eastern Blue 600: #3a7580
colors.primaryLight      // Eastern Blue 400: #5eaab2
colors.primaryDark       // Eastern Blue 800: #315159

colors.secondary         // Cello 600: #2880e8
colors.secondaryLight    // Cello 400: #62bbf8
colors.secondaryDark     // Cello 800: #2056ad
```

### Background Colors

```typescript
colors.background        // Main background (white in light, black in dark)
colors.backgroundSecondary
colors.backgroundTertiary
```

### Surface Colors (Cards, Containers)

```typescript
colors.surface           // Card backgrounds
colors.surfaceSecondary
colors.surfaceTertiary
```

### Text Colors

```typescript
colors.text              // Primary text color
colors.textSecondary     // Secondary text (lighter)
colors.textTertiary      // Tertiary text (even lighter)
colors.textInverse       // Inverse text (for dark backgrounds)
```

### Status Colors

```typescript
colors.success           // Green: #008387
colors.error            // Red: #FF2121
colors.warning          // Orange: #ff5722
colors.info             // Blue: #3e9df3
```

### UI Element Colors

```typescript
colors.border           // Standard border color
colors.borderLight
colors.borderDark
colors.divider          // For divider lines
```

### Tab Bar Colors

```typescript
colors.tabBarBackground
colors.tabBarActive
colors.tabBarInactive
colors.tabBarIconActive
colors.tabBarIconInactive
```

## Spacing Reference

```typescript
spacing.xs      // 4
spacing.sm      // 8
spacing.md      // 12
spacing.base    // 16
spacing.lg      // 20
spacing.xl      // 24
spacing.xxl     // 32
spacing.xxxl    // 40
spacing.huge    // 48
spacing.massive // 64
```

### Usage Example

```typescript
const styles = StyleSheet.create({
  container: {
    padding: spacing.base,        // 16
    marginHorizontal: spacing.lg, // 20
    gap: spacing.sm,              // 8
  },
});
```

## Border Radius Reference

```typescript
borderRadius.none   // 0
borderRadius.xs     // 4
borderRadius.sm     // 6
borderRadius.md     // 8
borderRadius.lg     // 12
borderRadius.xl     // 16
borderRadius.xxl    // 20
borderRadius.full   // 9999
borderRadius.pill   // 99
```

### Usage Example

```typescript
const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,  // 12
  },
  button: {
    borderRadius: borderRadius.md,  // 8
  },
  avatar: {
    borderRadius: borderRadius.full, // Circle
  },
});
```

## Typography Reference

### Font Sizes

```typescript
typography.fontSize.xs      // 11
typography.fontSize.sm      // 12
typography.fontSize.base    // 14
typography.fontSize.md      // 16
typography.fontSize.lg      // 18
typography.fontSize.xl      // 20
typography.fontSize.xxl     // 24
typography.fontSize.xxxl    // 28
typography.fontSize.huge    // 32
typography.fontSize.massive // 40
```

### Font Weights

```typescript
typography.fontWeight.normal    // '400'
typography.fontWeight.medium    // '500'
typography.fontWeight.semibold  // '600'
typography.fontWeight.bold      // '700'
typography.fontWeight.extrabold // '800'
```

### Usage Example

```typescript
const styles = StyleSheet.create({
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
  },
  body: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.normal,
  },
});
```

## Shadows Reference

```typescript
shadows.none  // No shadow
shadows.sm    // Small shadow
shadows.md    // Medium shadow (default)
shadows.lg    // Large shadow
shadows.xl    // Extra large shadow
shadows.tabBar // Tab bar specific shadow
```

### Usage Example

```typescript
const styles = StyleSheet.create({
  card: {
    ...shadows.md,  // Spread shadow properties
  },
});
```

## Helper Functions

### Center Content

```typescript
<View style={helpers.center}>
  <Text>Centered</Text>
</View>
```

### Flex Direction

```typescript
<View style={helpers.row}>
  <Text>Row Layout</Text>
</View>

<View style={helpers.column}>
  <Text>Column Layout</Text>
</View>
```

### Card Component

```typescript
const { theme } = useTheme();

<View style={helpers.card(theme)}>
  <Text>Card Content</Text>
</View>
```

### Button Component

```typescript
const { theme } = useTheme();

// Primary button
<View style={helpers.button(theme, 'primary')}>
  <Text>Primary</Text>
</View>

// Secondary button
<View style={helpers.button(theme, 'secondary')}>
  <Text>Secondary</Text>
</View>

// Outline button
<View style={helpers.button(theme, 'outline')}>
  <Text>Outline</Text>
</View>
```

### Input Component

```typescript
const { theme } = useTheme();

<TextInput style={helpers.input(theme)} />
```

### Divider

```typescript
const { theme } = useTheme();

// Horizontal divider
<View style={helpers.divider(theme, 'horizontal')} />

// Vertical divider
<View style={helpers.divider(theme, 'vertical')} />
```

## Complete Component Example

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../contexts/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../utils/theme';

export default function ProfileCard({ user }) {
  const colors = useThemeColors();
  
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          {user.name}
        </Text>
      </View>
      
      <View style={styles.content}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Email
        </Text>
        <Text style={[styles.value, { color: colors.text }]}>
          {user.email}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  header: {
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
  },
  content: {
    gap: spacing.xs,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  value: {
    fontSize: typography.fontSize.base,
  },
});
```

## Direct Palette Access

For special cases where you need specific color shades:

```typescript
import { palette } from '../utils/colors';

const myColor = palette.easternBlue[500]; // #4b9fa9
const errorColor = palette.red[600];       // #CC1A1A
const successColor = palette.green[700];   // #056E73
```

## Medical Status Colors

```typescript
import { getMedicalStatusColor } from '../utils/colors';

const criticalColor = getMedicalStatusColor('critical'); // Red
const stableColor = getMedicalStatusColor('stable');     // Green
const urgentColor = getMedicalStatusColor('urgent');     // Orange
```

## Document Type Colors

```typescript
import { getDocumentTypeColor } from '../utils/colors';

const pdfColor = getDocumentTypeColor('pdf');   // Red
const docxColor = getDocumentTypeColor('docx'); // Blue
const mdColor = getDocumentTypeColor('md');     // Green
```

## Theme Toggle Example

```typescript
import { useTheme } from '../contexts/ThemeContext';

function SettingsScreen() {
  const { themeMode, toggleTheme, setThemeMode, isSystemTheme, setIsSystemTheme } = useTheme();
  
  return (
    <View>
      <Text>Current Theme: {themeMode}</Text>
      
      <Button title="Toggle Theme" onPress={toggleTheme} />
      
      <Button 
        title="Use System Theme" 
        onPress={() => setIsSystemTheme(true)} 
      />
      
      <Button 
        title="Light Mode" 
        onPress={() => setThemeMode('light')} 
      />
      
      <Button 
        title="Dark Mode" 
        onPress={() => setThemeMode('dark')} 
      />
    </View>
  );
}
```

## Common Patterns

### Conditional Styling Based on Theme

```typescript
const colors = useThemeColors();
const isDark = useIsDarkMode();

<View 
  style={{
    backgroundColor: colors.surface,
    borderWidth: isDark ? 0 : 1,
    borderColor: colors.border,
  }}
/>
```

### Responsive Spacing

```typescript
const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
});
```

### Consistent Card Pattern

```typescript
const colors = useThemeColors();

const cardStyle = {
  backgroundColor: colors.surface,
  borderRadius: borderRadius.lg,
  padding: spacing.base,
  borderWidth: 1,
  borderColor: colors.border,
  ...shadows.md,
};
```

## Tips

1. **Always use theme colors** - Never hardcode colors like `#FFFFFF` or `#000000`
2. **Use spacing constants** - Never hardcode spacing values
3. **Consistent shadows** - Use the predefined shadow presets
4. **Typography scale** - Use the typography scale for consistent text sizing
5. **Helper functions** - Leverage helper functions for common patterns

## Resources

- Full color palette: `src/utils/colors.ts`
- Theme configuration: `src/utils/theme.ts`
- Theme context: `src/contexts/ThemeContext.tsx`
- Architecture docs: `ARCHITECTURE.md`
