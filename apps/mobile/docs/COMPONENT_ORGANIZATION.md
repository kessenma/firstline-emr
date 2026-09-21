# Component Organization Update

## Recent Changes

### Settings Components Moved

**Date**: December 2024

The settings-related components have been reorganized for better modularity and maintainability.

---

## What Changed

### Component Moves

1. **ThemeSwitcher** 
   - **From**: `src/components/ThemeSwitcher.tsx`
   - **To**: `src/screens/settings/ThemeSwitcher.tsx`
   - **Reason**: Settings-specific component

2. **SettingsSheet**
   - **From**: `src/components/SettingsSheet.tsx`
   - **To**: `src/screens/settings/SettingsSheet.tsx`
   - **Reason**: Settings screen component

### What Stayed

- **BottomSheet** remains in `src/components/`
  - **Reason**: Generic, reusable component used across the app

---

## New Structure

```
src/
├── components/
│   ├── BottomSheet.tsx          ← Reusable UI component
│   ├── Card.tsx
│   ├── Accordion.tsx
│   └── form/
│       ├── TextInputField.tsx
│       ├── DatePickerField.tsx
│       └── ...
│
├── screens/
│   ├── settings/                 ← NEW: Settings folder
│   │   ├── SettingsSheet.tsx    ← Settings drawer
│   │   └── ThemeSwitcher.tsx    ← Theme selector
│   │
│   ├── user-profile/
│   │   ├── ProfileScreenView.tsx
│   │   └── useProfileViewModel.ts
│   │
│   └── ...
```

---

## Updated Imports

### Before

```typescript
// In ProfileScreenView.tsx
import { SettingsSheet } from '../../components/SettingsSheet';

// In SettingsSheet.tsx
import { ThemeSwitcher } from '../../components/ThemeSwitcher';
```

### After

```typescript
// In ProfileScreenView.tsx
import { SettingsSheet } from '../settings/SettingsSheet';

// In SettingsSheet.tsx
import { ThemeSwitcher } from './ThemeSwitcher';
```

---

## Component Categories

### Generic Components (`src/components/`)

**Purpose**: Reusable UI components used across multiple screens

**Examples**:
- BottomSheet - Generic drawer/modal
- Card - Content container
- Accordion - Expandable sections
- Form components - Inputs, selects, etc.

**Criteria**:
- ✅ Used in multiple places
- ✅ No business logic
- ✅ Highly reusable
- ✅ Generic purpose

### Screen-Specific Components (`src/screens/[feature]/`)

**Purpose**: Components specific to a particular feature or screen

**Examples**:
- SettingsSheet - Profile settings drawer
- ThemeSwitcher - Theme selection UI
- PatientDetailView - Patient screen layout

**Criteria**:
- ✅ Used in one feature area
- ✅ May contain feature-specific logic
- ✅ Coupled to specific screen
- ✅ Domain-specific

---

## Benefits

### Better Organization
- Components grouped by feature/purpose
- Clear separation of concerns
- Easier to find related components

### Improved Modularity
- Settings feature self-contained
- Related components together
- Clear dependencies

### Easier Maintenance
- Changes to settings isolated
- Less risk of breaking unrelated code
- Clear ownership of components

### Future Growth
- Easy to add more settings components
- Pattern established for other features
- Scalable architecture

---

## Migration Checklist

If you need to move components in the future:

1. **Identify Component Type**
   - [ ] Is it reusable across features? → `components/`
   - [ ] Is it feature-specific? → `screens/[feature]/`

2. **Move Files**
   - [ ] Create destination folder if needed
   - [ ] Move component file
   - [ ] Move related files (tests, utils)

3. **Update Imports**
   - [ ] Find all files importing the component
   - [ ] Update import paths
   - [ ] Test that imports work

4. **Update Documentation**
   - [ ] Update component docs
   - [ ] Update README if needed
   - [ ] Note in migration log

5. **Test**
   - [ ] Run TypeScript checker
   - [ ] Test component functionality
   - [ ] Verify no broken imports

---

## File Locations Reference

### Settings Components

| Component | Path | Purpose |
|-----------|------|---------|
| SettingsSheet | `src/screens/settings/SettingsSheet.tsx` | Settings drawer UI |
| ThemeSwitcher | `src/screens/settings/ThemeSwitcher.tsx` | Theme selector |

### Generic Components

| Component | Path | Purpose |
|-----------|------|---------|
| BottomSheet | `src/components/BottomSheet.tsx` | Reusable drawer |
| Card | `src/components/ui/Card.tsx` | Content container |
| Accordion | `src/components/ui/Accordion.tsx` | Expandable sections |

### Form Components

| Component | Path | Purpose |
|-----------|------|---------|
| TextInputField | `src/components/form/TextInputField.tsx` | Text input |
| DatePickerField | `src/components/form/DatePickerField.tsx` | Date picker |
| SelectField | `src/components/form/SelectField.tsx` | Dropdown select |
| ... | `src/components/form/...` | Other form fields |

---

## Best Practices

### When Creating New Components

1. **Ask yourself**:
   - Will this be used in multiple features?
   - Is this feature-specific?
   - Does it contain business logic?

2. **Place accordingly**:
   - Generic → `src/components/`
   - Feature-specific → `src/screens/[feature]/`

3. **Use clear naming**:
   - Descriptive names
   - Consistent with existing patterns
   - Indicates purpose

4. **Document**:
   - Add JSDoc comments
   - Update relevant docs
   - Note in component index

### Folder Structure Guidelines

```
src/screens/[feature]/
├── [Feature]Screen.tsx      ← Main screen component
├── [Feature]View.tsx        ← UI presentation layer
├── use[Feature]ViewModel.ts ← Business logic
├── [Feature]Sheet.tsx       ← Feature-specific sheets
├── components/              ← Feature-specific components
│   └── [Component].tsx
└── utils/                   ← Feature-specific utilities
    └── [utility].ts
```

---

## Common Questions

### Q: Should I create a new folder for every feature?

**A**: Only if the feature has multiple related components. A single component can live in the screen file or alongside it.

### Q: When should I extract a component to `components/`?

**A**: When you find yourself using it in 2+ different features, or when it's clearly generic and reusable.

### Q: Can screen-specific components import from `components/`?

**A**: Yes! That's expected. Generic components should be imported and composed by feature-specific ones.

### Q: Should tests live with components?

**A**: Yes, keep `[Component].test.tsx` next to `[Component].tsx` for easy maintenance.

---

## Related Documentation

- **Bottom Sheet**: `/docs/BOTTOM_SHEET.md`
- **Theme Switcher**: `/docs/THEME_SWITCHER.md`
- **Component Guidelines**: `/docs/COMPONENT_GUIDELINES.md` (coming soon)

---

## Status

- ✅ Settings components moved
- ✅ Imports updated
- ✅ Tests passing
- ✅ Documentation updated

**Version**: 1.0.0  
**Last Updated**: December 2024  
**Breaking Changes**: None (internal reorganization)