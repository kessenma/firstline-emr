# Quick Start: Theme-Aware Components

A quick reference guide for creating theme-aware components in the mobile app.

## Basic Pattern

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../utils/theme';

export const MyComponent = () => {
  // 1. Get colors from hook
  const colors = useThemeColors();
  
  return (
    <View 
      style={[
        styles.container,
        // 2. Apply colors inline
        { 
          backgroundColor: colors.surface,
          borderColor: colors.border,
        }
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>
        Hello World
      </Text>
    </View>
  );
};

// 3. Keep static styles in StyleSheet
const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
});
```

## Available Colors

```typescript
const colors = useThemeColors();

// Primary & Secondary
colors.primary          // Main brand color
colors.secondary        // Secondary accent

// Backgrounds
colors.background       // Main background
colors.backgroundSecondary  // Secondary background
colors.surface          // Card/surface background

// Text
colors.text             // Primary text
colors.textSecondary    // Secondary/muted text
colors.textTertiary     // Even more muted
colors.textInverse      // Text on dark backgrounds

// UI Elements
colors.border           // Borders
colors.divider          // Dividers/separators

// Status Colors
colors.error            // Error states
colors.success          // Success states
colors.warning          // Warning states
colors.info             // Info states
```

## Common Patterns

### Conditional Colors

```typescript
// Error state
<TextInput
  style={[
    styles.input,
    { 
      borderColor: hasError ? colors.error : colors.border,
      backgroundColor: colors.surface,
    }
  ]}
/>
```

### Disabled State

```typescript
<TouchableOpacity
  style={[
    styles.button,
    { backgroundColor: colors.primary },
    disabled && { opacity: 0.5 },
  ]}
  disabled={disabled}
>
  <Text style={{ color: colors.surface }}>Press Me</Text>
</TouchableOpacity>
```

### Selected State

```typescript
<View
  style={[
    styles.card,
    {
      backgroundColor: isSelected 
        ? colors.primary + '10'  // Add transparency
        : colors.surface,
      borderColor: isSelected ? colors.primary : colors.border,
    }
  ]}
/>
```

### Icons

```typescript
import { Check } from 'lucide-react-native';

<Check 
  size={20} 
  color={colors.primary} 
  strokeWidth={2}
/>
```

## Do's and Don'ts

### ✅ DO

```typescript
// Keep static values in StyleSheet
const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
});

// Apply colors inline
<View style={[styles.container, { backgroundColor: colors.surface }]} />
```

### ❌ DON'T

```typescript
// Don't put colors in StyleSheet
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff', // ❌ Hardcoded
    borderColor: lightTheme.colors.border, // ❌ Direct import
  },
});

// Don't use palette directly
import { palette } from '../../utils/colors';
backgroundColor: palette.easternBlue[600] // ❌ Use colors.primary instead
```

## Examples from Real Components

### Button

```typescript
<TouchableOpacity
  style={[
    styles.button,
    { backgroundColor: colors.primary },
  ]}
  onPress={onPress}
>
  <Text style={[styles.buttonText, { color: colors.surface }]}>
    Click Me
  </Text>
</TouchableOpacity>
```

### Card

```typescript
<View
  style={[
    styles.card,
    {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    }
  ]}
>
  <Text style={[styles.title, { color: colors.text }]}>
    Card Title
  </Text>
  <Text style={[styles.description, { color: colors.textSecondary }]}>
    Card description text
  </Text>
</View>
```

### Input Field

```typescript
<TextInput
  style={[
    styles.input,
    {
      backgroundColor: colors.surface,
      borderColor: hasError ? colors.error : colors.border,
      color: colors.text,
    }
  ]}
  placeholderTextColor={colors.textTertiary}
  value={value}
  onChangeText={onChange}
/>
```

### List Item

```typescript
<TouchableOpacity
  style={[
    styles.item,
    {
      backgroundColor: isSelected ? colors.primary + '10' : 'transparent',
      borderBottomColor: colors.divider,
    }
  ]}
>
  <Text style={{ color: colors.text }}>Item Text</Text>
  {isSelected && <Check size={16} color={colors.primary} />}
</TouchableOpacity>
```

## Transparency

Add transparency to colors:

```typescript
// 10% opacity
backgroundColor: colors.primary + '10'

// 20% opacity
backgroundColor: colors.primary + '20'

// 50% opacity
backgroundColor: colors.primary + '80'
```

## Migration Checklist

When migrating an old component:

- [ ] Replace `lightTheme` import with `useThemeColors`
- [ ] Remove `palette` import (if not needed)
- [ ] Add `const colors = useThemeColors();` at component start
- [ ] Move colors from StyleSheet to inline styles
- [ ] Update all text colors
- [ ] Update all background colors
- [ ] Update all border colors
- [ ] Update icon colors
- [ ] Test in both light and dark mode

## Testing

```typescript
// Components should work in both themes
const MyScreen = () => {
  const colors = useThemeColors();
  
  // All colors automatically adapt
  return (
    <View style={{ backgroundColor: colors.background }}>
      <Text style={{ color: colors.text }}>
        This text adapts to the current theme!
      </Text>
    </View>
  );
};
```

## Need Help?

- See full documentation: `/docs/THEME_GUIDE.md`
- See form components: `/docs/FORM_COMPONENTS.md`
- See migration guide: `/docs/THEME_MIGRATION_TODO.md`
- Check examples: `/src/components/form/FormComponentsExample.tsx`

---

**Remember**: Colors are dynamic (inline), everything else is static (StyleSheet)!