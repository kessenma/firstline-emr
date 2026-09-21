# Admin Dashboard Quick Reference Card

## 🚀 Quick Start

```bash
# 1. Navigate to mobile app
cd apps/mobile

# 2. Install dependencies
npm install @tanstack/react-query lucide-react-native

# 3. Create directory structure
mkdir -p src/screens/admin
mkdir -p src/components/admin/sections
mkdir -p src/viewModels/admin
mkdir -p src/utils/admin
```

## 📚 Documentation Map

| Document | Purpose | Use When |
|----------|---------|----------|
| **README.md** | Overview & navigation | First time here |
| **REFACTOR_STRATEGY.md** | Complete strategy | Planning implementation |
| **IMPLEMENTATION_CHECKLIST.md** | Progress tracking | During implementation |
| **SECTION_TEMPLATE.md** | Code examples | Building a section |
| **API_REFERENCE.md** | API endpoints | Making API calls |
| **ARCHITECTURE.md** | Visual diagrams | Understanding structure |
| **QUICK_REFERENCE.md** | This file! | Quick lookup |

## 🎯 Implementation Order

### Phase 1: Foundation (Start Here!)
1. Create directory structure
2. Set up `adminApi.ts` utility
3. Create `AdminContext.tsx`
4. Add admin route to navigation

### Phase 2: Core Components
1. `AdminAccordion.tsx`
2. `AdminDashboardView.tsx`
3. Shared components (EmptyState, ErrorState, etc.)

### Phase 3: Sections (Priority Order)
⭐ **High Priority**
1. New Signups
2. Existing Users
3. Admin Management
4. Create User

🔶 **Medium Priority**
5. Password Reset
6. Denied Users
7. Notifications
8. Medical Orders

🔹 **Low Priority**
9. Statistics
10. Analytics
11. Patient Intake
12. Image Storage
13. Clear Test Data

## 📝 File Naming Quick Guide

```
View:       NewSignupsView.tsx
ViewModel:  useNewSignupsViewModel.ts
Card:       NewSignupCard.tsx
Modal:      AddAdminModal.tsx
Types:      admin.types.ts
Utils:      adminApi.ts
```

## 🏗️ Section Boilerplate

### ViewModel Template
```typescript
export function useMyViewModel() {
  // State
  const [data, setData] = useState({...});
  
  // Effects
  useEffect(() => {...}, []);
  
  // Computed
  const computed = useMemo(() => {...}, []);
  
  // Actions
  const handleAction = useCallback(async () => {...}, []);
  
  // Return API
  return { data, computed, handleAction };
}
```

### View Template
```typescript
export function MyView() {
  const vm = useMyViewModel();
  
  if (vm.isLoading) return <LoadingState />;
  if (vm.error) return <ErrorState />;
  if (vm.data.length === 0) return <EmptyState />;
  
  return <View>{/* content */}</View>;
}
```

## 🔌 API Quick Reference

### Common Endpoints
```typescript
// Get new signups
GET /api/admin/GET/new-users?page=1&limit=20

// Approve users
POST /api/admin/POST/approve-users
Body: { userIds: ["id1", "id2"] }

// Deny users
POST /api/admin/POST/deny-users
Body: { userIds: ["id1", "id2"] }

// Search users
GET /api/admin/GET/search-users?email=example@email.com

// Get existing admins
GET /api/admin/GET/existing-admins
```

### Auth Header
```typescript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

## 🎨 Common Patterns

### Pattern 1: Confirmation Dialog
```typescript
const handleAction = async (id: string) => {
  Alert.alert('Confirm', 'Are you sure?', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Confirm',
      onPress: async () => {
        const result = await vm.performAction(id);
        if (!result.success) {
          Alert.alert('Error', result.error);
        }
      }
    }
  ]);
};
```

### Pattern 2: Pull to Refresh
```typescript
<FlatList
  data={items}
  refreshControl={
    <RefreshControl
      refreshing={vm.isRefreshing}
      onRefresh={vm.refresh}
    />
  }
/>
```

### Pattern 3: Infinite Scroll
```typescript
<FlatList
  data={items}
  onEndReached={vm.loadMore}
  onEndReachedThreshold={0.5}
  ListFooterComponent={
    vm.isLoading ? <LoadingSpinner /> : null
  }
/>
```

### Pattern 4: Selection with Checkbox
```typescript
const [selected, setSelected] = useState<string[]>([]);

const toggleSelection = (id: string) => {
  setSelected(prev =>
    prev.includes(id)
      ? prev.filter(i => i !== id)
      : [...prev, id]
  );
};

const selectAll = () => {
  setSelected(prev =>
    prev.length === items.length ? [] : items.map(i => i.id)
  );
};
```

## 🧩 Shared Components

```typescript
// Empty state
<EmptyState
  icon={Users}
  title="No Data"
  description="Nothing to show here"
/>

// Error state
<ErrorState
  error="Something went wrong"
  onRetry={handleRetry}
/>

// Loading state
<LoadingState size="large" />

// Bulk action bar
<BulkActionBar
  selectedCount={3}
  onApprove={handleApprove}
  onDeny={handleDeny}
/>

// User card
<UserCard
  user={user}
  onPress={handlePress}
/>
```

## 🎯 Common Tasks

### Task: Add a new section
1. Create ViewModel: `viewModels/admin/useMyViewModel.ts`
2. Create View: `components/admin/sections/my/MyView.tsx`
3. Add to dashboard: Update `AdminDashboardView.tsx` sections array
4. Test the section

### Task: Add a new API endpoint
1. Add to `utils/admin/adminApi.ts`
2. Use in ViewModel
3. Handle loading/error states
4. Test with real API

### Task: Add shared component
1. Create in `components/admin/shared/`
2. Export from index file
3. Use in section views
4. Test in multiple contexts

## 🐛 Common Issues & Fixes

### Issue: API returns 401
```typescript
// Fix: Check token is valid
const { token } = useAuth();
if (!token) {
  // Redirect to login
}
```

### Issue: Infinite re-renders
```typescript
// Fix: Add dependencies to useCallback/useMemo
const action = useCallback(() => {
  // ...
}, [dependency1, dependency2]); // Add all dependencies!
```

### Issue: List performance slow
```typescript
// Fix: Use keyExtractor and React.memo
<FlatList
  data={items}
  keyExtractor={(item) => item._id}
  renderItem={({ item }) => <MemoizedCard item={item} />}
/>
```

### Issue: State not updating
```typescript
// Fix: Don't mutate state directly
// ❌ Wrong
items.push(newItem);

// ✅ Correct
setItems([...items, newItem]);
```

## 📊 Testing Checklist

- [ ] Loading state shows correctly
- [ ] Error state shows with retry button
- [ ] Empty state shows when no data
- [ ] List loads and displays data
- [ ] Pull to refresh works
- [ ] Infinite scroll loads more
- [ ] Actions complete successfully
- [ ] Confirmations work
- [ ] Network errors handled gracefully

## 🔍 Debugging Tips

```typescript
// 1. Log ViewModel state
console.log('ViewModel state:', { 
  loading, error, data 
});

// 2. Log API calls
console.log('API Request:', endpoint, body);
console.log('API Response:', response);

// 3. Check component renders
console.log('Component rendered:', componentName);

// 4. Monitor effects
useEffect(() => {
  console.log('Effect triggered', dependencies);
}, [dependencies]);
```

## 🎓 Learning Resources

- **Web Implementation**: `apps/web/components/adminDashboard/`
- **Mobile Accordion**: `apps/mobile/src/components/ui/Accordion.tsx`
- **React Query Docs**: https://tanstack.com/query/latest
- **React Native Docs**: https://reactnative.dev/

## ⚡ Speed Commands

```bash
# Quick test section
npm run mobile:ios && npx react-native log-ios

# Type check
npm run type-check:mobile

# Format code
npm run format:mobile

# Run tests
npm run test:mobile -- --watch

# Clear cache
npm start -- --reset-cache
```

## 🎯 Success Criteria

- [ ] All 13 sections implemented
- [ ] No TypeScript errors
- [ ] Test coverage > 80%
- [ ] Performance: < 100ms for interactions
- [ ] Works on iOS and Android
- [ ] Handles offline gracefully

## 📞 Need Help?

1. Check the full docs in this directory
2. Review web implementation
3. Search API_REFERENCE.md
4. Ask team members
5. Create detailed issue with context

---

**Pro Tip**: Start with ONE section, get it perfect, then replicate the pattern!

**Remember**: View = UI, ViewModel = Logic, API = Data

**Version**: 1.0.0
**Last Updated**: 2024-01-01