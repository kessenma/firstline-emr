# Icon Reference Guide - Mobile Patient Dashboard

This document provides a quick reference for all Lucide icons used in the mobile patient dashboard components.

## Installation

```bash
npm install lucide-react-native
# or
yarn add lucide-react-native
```

## Import Statement

```typescript
import { IconName } from 'lucide-react-native';
```

## Icon Usage

### Basic Usage
```tsx
<IconName 
  size={16} 
  color="#c71e07" 
/>
```

### With Styling
```tsx
<IconName 
  size={20} 
  color={lightTheme.colors.primary}
  style={{ marginRight: 8 }}
/>
```

## Patient Dashboard Icons

### Patient Information Icons

| Icon | Component | Usage | Size | Color |
|------|-----------|-------|------|-------|
| `IdCard` | Patient ID | Display patient identifier | 16 | `#c71e07` |
| `Globe` | Language | Patient's language preference | 16 | `#c71e07` |
| `User` | Triaged By | User who triaged the patient | 16 | `#c71e07` |
| `UserPlus` | Doctor | Assigned doctor | 16 | `#c71e07` |

### Medical Information Icons

| Icon | Component | Usage | Size | Color |
|------|-----------|-------|------|-------|
| `Stethoscope` | Specialty | Medical specialty | 16 | `#c71e07` |
| `MessageSquare` | Messages | Unread message count | 16 | `#c71e07` |
| `StickyNote` | Notes | Dashboard notes | 16 | `#c71e07` |

### UI Control Icons

| Icon | Component | Usage | Size | Color |
|------|-----------|-------|------|-------|
| `Search` | Search Bar | Search functionality | 20 | `textTertiary` |
| `X` | Close/Clear | Close filter, clear search | 16-24 | `textSecondary` or `orange[700]` |
| `Menu` | Menu Toggle | Open filter panel | 24 | `orange[700]` |
| `Clipboard` | Empty State | No patients found | 48 | `textTertiary` |
| `AlertCircle` | Error State | Error messages | 48 | `error` |
| `RotateCcw` | Retry Button | Retry failed action | 16 | `textInverse` |

## Color Palette

### Icon Colors Used

```typescript
// Primary icon color (orange)
const ICON_COLOR = '#c71e07'; // palette.orange[700]

// Theme-based colors
lightTheme.colors.textTertiary    // #999999
lightTheme.colors.textSecondary   // #666666
lightTheme.colors.error           // #FF2121
lightTheme.colors.textInverse     // #FFFFFF
palette.orange[700]               // #c71e07
```

## Size Guidelines

| Context | Size (px) | Usage |
|---------|-----------|-------|
| Small | 16 | Inline with text, detail rows |
| Medium | 20 | Search bars, input fields |
| Large | 24 | Buttons, headers |
| Extra Large | 48 | Empty states, error states |

## Complete Icon List

### Currently Used in Patient Dashboard

```typescript
import {
  // Patient Info
  IdCard,
  Globe,
  User,
  UserPlus,
  
  // Medical Info
  Stethoscope,
  MessageSquare,
  StickyNote,
  
  // UI Controls
  Search,
  X,
  Menu,
  Clipboard,
  AlertCircle,
  RotateCcw,
} from 'lucide-react-native';
```

## Example Code

### MobilePatientDashboardTable.tsx
```tsx
import {
  IdCard,
  Globe,
  Stethoscope,
  MessageSquare,
  User,
  UserPlus,
  StickyNote,
  Clipboard,
} from 'lucide-react-native';

// Patient ID
<View style={styles.detailItem}>
  <IdCard size={16} color={ICON_COLOR} />
  <Text>{patientId}</Text>
</View>

// Language
<View style={styles.detailItem}>
  <Globe size={16} color={ICON_COLOR} />
  <Text>{language}</Text>
</View>

// Empty State
<Clipboard
  size={48}
  color={lightTheme.colors.textTertiary}
  style={styles.emptyIcon}
/>
```

### PatientDashboardScreenView.tsx
```tsx
import { 
  Search, 
  X, 
  AlertCircle, 
  RotateCcw, 
  Menu 
} from 'lucide-react-native';

// Search Bar
<Search size={20} color={lightTheme.colors.textTertiary} />

// Clear Button
<X size={16} color={lightTheme.colors.textSecondary} />

// Menu Toggle
{showFilters ? (
  <X size={24} color={palette.orange[700]} />
) : (
  <Menu size={24} color={palette.orange[700]} />
)}

// Error State
<AlertCircle
  size={48}
  color={lightTheme.colors.error}
/>

// Retry Button
<RotateCcw size={16} color={lightTheme.colors.textInverse} />
```

## Common Patterns

### Icon with Text
```tsx
<View style={styles.row}>
  <IconName size={16} color={ICON_COLOR} />
  <Text style={styles.text}>{value}</Text>
</View>

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
```

### Conditional Icon
```tsx
{unreadMessages > 0 && (
  <View style={styles.detailItem}>
    <MessageSquare size={16} color={ICON_COLOR} />
    <Text>{unreadMessages} unread</Text>
  </View>
)}
```

### Loading State Icon
```tsx
{isNavigating ? (
  <ActivityIndicator size="small" color={ICON_COLOR} />
) : (
  <ExternalLink size={20} color={ICON_COLOR} />
)}
```

## Additional Useful Icons

These icons are available in `lucide-react-native` and might be useful for future features:

### Patient Actions
- `Edit` - Edit patient info
- `Trash2` - Delete/Archive
- `Archive` - Archive patient
- `Clock` - Appointment time
- `Calendar` - Schedule
- `Phone` - Contact patient
- `Mail` - Email patient

### Medical
- `Heart` - Vital signs
- `Pill` - Medications
- `FileText` - Medical records
- `Activity` - Health status
- `AlertTriangle` - Warnings
- `CheckCircle` - Completed tasks

### Navigation
- `ChevronRight` - Navigate forward
- `ChevronLeft` - Navigate back
- `ChevronDown` - Expand
- `ChevronUp` - Collapse
- `ExternalLink` - Open external
- `ArrowLeft` - Back button

### Filters & Actions
- `Filter` - Filter options
- `SortAsc` - Sort ascending
- `SortDesc` - Sort descending
- `Download` - Export data
- `Upload` - Import data
- `RefreshCw` - Refresh
- `Plus` - Add new

## Best Practices

1. **Consistent Sizing**: Use the same size for similar context (all detail icons are 16px)
2. **Color Consistency**: Use `ICON_COLOR` for primary icons, theme colors for UI controls
3. **Accessibility**: Always provide context for icons (text labels or aria-labels)
4. **Performance**: Import only the icons you need
5. **Alignment**: Use `alignItems: 'center'` when pairing icons with text
6. **Spacing**: Maintain consistent gap between icon and text (typically 8px)

## Accessibility

```tsx
// Good: Icon with text label
<View>
  <User size={16} color={ICON_COLOR} />
  <Text>Dr. Smith</Text>
</View>

// Better: Icon with accessible label
<View accessible={true} accessibilityLabel="Assigned to Dr. Smith">
  <User size={16} color={ICON_COLOR} />
  <Text>Dr. Smith</Text>
</View>
```

## Troubleshooting

### Icons not appearing
- Ensure `lucide-react-native` is installed
- Check that icons are imported correctly
- Verify color is not transparent or matches background

### Icons look blurry
- Use integer sizes (16, 20, 24) instead of decimals
- Avoid scaling with transform

### Performance issues
- Import icons individually, not as `import * from 'lucide-react-native'`
- Consider using memo for icon components in lists

## Related Documentation

- [Lucide Icons Documentation](https://lucide.dev/)
- [Lucide React Native Package](https://www.npmjs.com/package/lucide-react-native)
- [Theme System](../utils/theme.ts)
- [Color Palette](../utils/colors.ts)