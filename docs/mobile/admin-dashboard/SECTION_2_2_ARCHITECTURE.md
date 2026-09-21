# Section 2.2 Architecture

## Component Hierarchy

```
AdminDashboardScreen (Screen)
└── SafeAreaView
    └── AdminDashboardView (Main Container)
        ├── AdminDashboardHeader
        │   ├── Title ("Admin Dashboard")
        │   └── Actions Row
        │       ├── Search Input (with icon)
        │       ├── Refresh Button (with loading state)
        │       └── Help Button
        │
        ├── ScrollView (with RefreshControl)
        │   └── AdminAccordion (allowMultiple=false)
        │       ├── AdminAccordionItem (Create New User)
        │       │   ├── Header (icon, title, subtitle, chevron)
        │       │   └── Content (placeholder or actual component)
        │       │
        │       ├── AdminAccordionItem (New Signups)
        │       │   ├── Header (with badge)
        │       │   └── Content
        │       │
        │       ├── AdminAccordionItem (Existing Users)
        │       ├── AdminAccordionItem (Denied Users)
        │       ├── AdminAccordionItem (Admin Management)
        │       ├── AdminAccordionItem (Password Reset)
        │       ├── AdminAccordionItem (Notifications)
        │       ├── AdminAccordionItem (Medical Orders)
        │       ├── AdminAccordionItem (Statistics)
        │       ├── AdminAccordionItem (Analytics)
        │       ├── AdminAccordionItem (Telegram Bot)
        │       ├── AdminAccordionItem (Image Storage)
        │       └── AdminAccordionItem (Clear Test Data)
        │
        └── Help Modal
            ├── Overlay (semi-transparent)
            └── Modal Content
                ├── Header (title + close button)
                ├── ScrollView (help text)
                └── Footer ("Got it!" button)
```

## Data Flow

```
User Action → Component State → UI Update
     │              │                │
     ├─ Type search → searchTerm → filteredSections
     │              │                │
     ├─ Tap refresh → isRefreshing → Loading indicators
     │              │                │
     ├─ Tap section → openSection  → Expand/collapse
     │              │                │
     └─ Tap help   → showHelpModal → Modal visible
```

## State Management

### AdminDashboardView State

```typescript
{
  searchTerm: string;              // Current search filter
  isRefreshing: boolean;           // Global refresh state
  openSection: string | null;      // Currently open section ID
  showHelpModal: boolean;          // Help modal visibility
  sectionLoadingStates: {          // Per-section loading (Phase 3)
    [sectionId: string]: boolean;
  };
}
```

### Computed State (useMemo)

```typescript
filteredSections = useMemo(() => {
  // Filter ADMIN_SECTIONS based on searchTerm
}, [searchTerm]);
```

## Props Flow

```
AdminDashboardView
    │
    ├── initialOpenSection (optional)
    │   └── Used to set initial openSection state
    │
    └── Props to AdminDashboardHeader
        ├── searchTerm
        ├── onSearchChange
        ├── onRefresh
        ├── onHelp
        └── isRefreshing
```

## Event Flow

### Search Flow
```
User types → TextInput onChange
          → onSearchChange(text)
          → setSearchTerm(text)
          → filteredSections recomputed
          → UI re-renders with filtered sections
          → If openSection not in filtered, close it
```

### Refresh Flow
```
User action → Pull-to-refresh OR Refresh button
           → handleRefreshAll()
           → setIsRefreshing(true)
           → [Future: Call ViewModel refreshes]
           → setIsRefreshing(false)
           → UI updates
```

### Section Toggle Flow
```
User taps section → handleSectionToggle(sectionId)
                  → setOpenSection(prev => prev === id ? null : id)
                  → AdminAccordion notified
                  → Section expands/collapses
                  → Content rendered/unmounted
```

### Help Modal Flow
```
User taps help → toggleHelpModal()
              → setShowHelpModal(!showHelpModal)
              → Modal appears/disappears
```

## Theme Integration

```
Components
    │
    ├── useThemeColors() hook
    │   └── Returns current theme colors
    │       ├── background
    │       ├── surface
    │       ├── primary
    │       ├── text
    │       ├── textSecondary
    │       └── border
    │
    └── Theme utilities
        ├── spacing (xs, sm, md, base, lg, xl, xxl, xxxl)
        ├── borderRadius (xs, sm, md, lg, xl, xxl, full)
        └── typography (fontSize, fontWeight)
```

## Section Configuration

```typescript
interface SectionConfig {
  id: string;                      // Unique identifier
  title: string;                   // Display title
  subtitle?: string;               // Description
  icon: LucideIcon;                // Icon component
  badge?: number;                  // Optional badge count
  disabled?: boolean;              // Optional disabled state
  component?: React.ComponentType; // Future: Actual component
}
```

## Performance Optimizations

### 1. useMemo for Filtered Sections
- Prevents recalculation on every render
- Only recalculates when searchTerm changes

### 2. Conditional Rendering
- Section content only rendered when open
- Help modal only rendered when visible
- Empty state only rendered when needed

### 3. Accordion Pattern
- Only one section open at a time
- Reduces DOM size
- Improves scroll performance

## Future Enhancements (Phase 3)

### 1. Section Components
```
AdminDashboardView
    │
    └── renderSectionContent(section)
        ├── switch (section.id)
        │   ├── case 'newSignups': <NewSignupsView />
        │   ├── case 'existing': <ExistingUsersView />
        │   └── ... other sections
        └── each with its own ViewModel
```

### 2. Data Fetching
```
Section Component
    │
    ├── useViewModel(sectionId)
    │   ├── useQuery for data fetching
    │   ├── Loading states
    │   ├── Error handling
    │   └── Refresh methods
    │
    └── Display data or states
```

### 3. Badge Updates
```
API Response → ViewModel → Badge Count → Section Header
```

## Dependencies Graph

```
AdminDashboardView
    │
    ├── React (useState, useMemo)
    ├── React Native (View, Text, ScrollView, Modal, etc.)
    ├── lucide-react-native (Icons)
    ├── ThemeContext (useThemeColors)
    ├── Theme utilities (spacing, borderRadius, typography)
    ├── AdminDashboardHeader (local component)
    └── AdminAccordion (from Section 2.1)
        └── AdminAccordionItem
```

## Testing Strategy

### Unit Tests (Future)
- Search filtering logic
- Refresh handler
- Section toggle logic
- Modal visibility toggle

### Component Tests (Future)
- AdminDashboardView renders correctly
- AdminDashboardHeader interactions
- Empty state displays
- Loading states

### Integration Tests (Future)
- Full user flow
- Search → filter → open section
- Refresh all sections
- Help modal workflow

## File Structure

```
apps/mobile/src/components/admin/
├── AdminDashboardView.tsx           480 lines
│   ├── Imports and types             50 lines
│   ├── Section configuration         90 lines
│   ├── Main component               340 lines
│   └── Styles                       100 lines
│
├── AdminDashboardHeader.tsx         161 lines
│   ├── Imports and types             30 lines
│   ├── Component                     70 lines
│   └── Styles                        61 lines
│
├── AdminAccordion.tsx               320 lines
│   └── (From Section 2.1)
│
└── index.ts                          35 lines
    └── Exports
```

## Summary

The architecture follows React best practices:
- ✅ Component composition
- ✅ Props drilling (minimal)
- ✅ Controlled components
- ✅ State management (hooks)
- ✅ Performance optimization (useMemo)
- ✅ Theme integration
- ✅ Separation of concerns
- ✅ Extensibility (easy to add sections)

Ready for Phase 3 section implementations!
