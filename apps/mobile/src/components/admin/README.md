# Admin Components Directory

This directory contains all React Native components for the admin dashboard feature.

## Structure

```
admin/
├── AdminDashboardView.tsx        # Main dashboard container (Phase 2)
├── AdminDashboardHeader.tsx      # Header with search, refresh, help (Phase 2)
├── AdminAccordion.tsx            # Admin-themed accordion wrapper (Phase 2)
├── index.ts                      # Central exports file
├── sections/                     # Individual admin sections (Phase 3)
│   ├── createUser/              # Create new users
│   ├── newSignups/              # Pending user approvals
│   ├── existingUsers/           # Active user management
│   ├── deniedUsers/             # Denied user management
│   ├── adminManagement/         # Admin role management
│   ├── passwordReset/           # Password reset tools
│   ├── notifications/           # System notifications
│   ├── medOrders/               # Medical orders overview
│   ├── statistics/              # User statistics & charts
│   ├── analytics/               # Analytics dashboard
│   ├── patientIntake/           # Telegram bot settings
│   ├── imageStorage/            # Image storage management
│   └── clearTestData/           # Test data cleanup (dev only)
└── shared/                       # Reusable components (Phase 2)
    ├── EmptyState.tsx
    ├── ErrorState.tsx
    ├── LoadingState.tsx
    ├── BulkActionBar.tsx
    ├── UserCard.tsx
    └── ConfirmDialog.tsx
```

## Implementation Status

### Phase 1: Foundation ✅
- [x] Directory structure created
- [x] Index files set up
- [x] README documentation

### Phase 2: Core Components (Next)
- [ ] AdminDashboardView
- [ ] AdminDashboardHeader
- [ ] AdminAccordion
- [ ] Shared components

### Phase 3: Sections
- [ ] Create User (HIGH)
- [ ] New Signups (HIGH)
- [ ] Existing Users (HIGH)
- [ ] Denied Users (HIGH)
- [ ] Admin Management (HIGH)
- [ ] Password Reset (MEDIUM)
- [ ] Notifications (MEDIUM)
- [ ] Medical Orders (MEDIUM)
- [ ] Statistics (LOW)
- [ ] Analytics (LOW)
- [ ] Patient Intake (LOW)
- [ ] Image Storage (LOW)
- [ ] Clear Test Data (LOW)

## Component Patterns

### View Component Structure
```typescript
export function MyView() {
  const vm = useMyViewModel();
  const colors = useThemeColors();
  
  if (vm.isLoading) return <LoadingState />;
  if (vm.error) return <ErrorState error={vm.error} onRetry={vm.refresh} />;
  if (vm.data.length === 0) return <EmptyState />;
  
  return (
    <View style={{ backgroundColor: colors.background }}>
      {/* Main content */}
    </View>
  );
}
```

### Section Organization
Each section directory should contain:
- `[Section]View.tsx` - Main view component
- `[Section]Card.tsx` - Item/card component (if needed)
- `[Section]Modal.tsx` - Modal dialogs (if needed)
- `[Section].styles.ts` - Styles (optional)

## Guidelines

1. **Use ViewModels**: All business logic goes in ViewModels, not Views
2. **Handle States**: Always handle loading, error, and empty states
3. **Reuse Components**: Use shared components whenever possible
4. **Theme-Aware**: Use `useThemeColors()` for all styling
5. **TypeScript**: Properly type all props and state
6. **Mobile-First**: Consider touch targets, gestures, and mobile UX

## Related Documentation

- **ViewModels**: `src/viewModels/admin/`
- **Utilities**: `src/utils/admin/`
- **Types**: `src/types/admin.ts`
- **Strategy**: `docs/mobile/admin-dashboard/REFACTOR_STRATEGY.md`

## Next Steps

1. Proceed to Phase 2: Create core components
2. Start with AdminAccordion
3. Then AdminDashboardView
4. Build shared components
5. Move to Phase 3: Implement sections

---

**Status**: Phase 1 Complete ✅  
**Next**: Phase 2 - Core Components  
**Last Updated**: 2024-01-01