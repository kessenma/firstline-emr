# Component Analysis Quick Start Guide

> **TL;DR:** We analyzed 772 files and found 872 components. Button (128 uses) and Card (55 uses) are your top priorities for mobile.

---

## 🚀 Getting Started

### View the Analysis

1. **Quick Overview:** Read this file
2. **Action Plan:** See [MOBILE_ACTION_PLAN.md](./MOBILE_ACTION_PLAN.md)
3. **Full Report:** See [usage-report.md](./usage-report.md)
4. **CSV Export:** Open [component-usage.csv](./component-usage.csv) in Excel/Sheets

### Run the Analysis Again

```bash
# Generate both reports
npm run analyze:components:all

# Or individually
npm run analyze:components        # Markdown report only
npm run analyze:components:csv    # CSV only
```

---

## 📊 Top 10 Components You Need

| Rank | Component | Uses | Status | Priority |
|------|-----------|------|--------|----------|
| 1 | **Button** | 128 | ❌ Missing | 🔴 Critical |
| 2 | **Card** | 55 | 🟡 Basic exists | 🔴 High |
| 3 | **CardContent** | 48 | ❌ Missing | 🔴 High |
| 4 | **CardHeader** | 37 | ❌ Missing | 🟡 Medium |
| 5 | **CardTitle** | 35 | ❌ Missing | 🟡 Medium |
| 6 | **Input** | 33 | 🟡 TextInputField | 🟡 Medium |
| 7 | **useToast** | 32 | ❌ Missing | 🟡 Medium |
| 8 | **Dialog** | 31 | ❌ Missing | 🟡 Medium |
| 9 | **DialogContent** | 31 | ❌ Missing | 🟡 Medium |
| 10 | **Label** | 31 | ❌ Missing | 🟡 Medium |

---

## 🎯 Your First Sprint (Week 1)

### Day 1-2: Button Component
```typescript
// What you need to build:
<Button variant="primary" size="md" loading={false}>
  Click Me
</Button>
```

**Requirements:**
- Variants: primary, secondary, outline, ghost
- Sizes: sm, md, lg
- Loading state with spinner
- Icon support
- Press animations

### Day 3-4: Card System
```typescript
// What you need to build:
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>
```

**Requirements:**
- Card container (already exists, enhance it)
- CardHeader sub-component
- CardTitle sub-component  
- CardContent sub-component
- Consistent styling

### Day 5: Testing & Documentation
- Write tests for Button and Card
- Document usage examples
- Test in actual screens

---

## 📋 Component Categories

### UI Components (Most Used)
- Button, Card, Input, Label, Badge, ScrollArea
- Dialog/Modal system
- Skeleton loaders

### Form Components
- TextFormField (exists, 19 uses)
- DatePickerFormField (exists, 12 uses)
- CheckboxField (exists, 16 uses)
- SelectField (exists, 11 uses)
- Form helpers (FormItem, FormLabel, FormField, FormControl)

### Admin Components (Lower Priority)
- Most admin components have lower usage
- Focus on general UI first, admin later

---

## 🧹 Components to Clean Up

### Zero Usage in Web (Consider Removing)
- `SwitchField` - 0 uses
- `RadioCardSelector` - 0 uses
- `ConfirmDialog` - 0 uses
- `ErrorState` - 0 uses
- `UserCard` - 0 uses
- `EmptyState` - 0 uses

### Keep (Mobile-Specific)
- `BottomSheet` - Mobile pattern
- `CustomTabBar` - Mobile navigation
- `ErrorBoundary` - Essential
- `ErrorCard` - Useful
- `LoadingState` - Useful

---

## 💡 Pro Tips

### 1. Match Web API Where Possible
```typescript
// Web component
<Button variant="outline" size="lg">Click</Button>

// Mobile component - same API!
<Button variant="outline" size="lg">Click</Button>
```

### 2. Use Composition
```typescript
// Good - composable
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>

// Bad - monolithic
<Card title="Title" content="Content" />
```

### 3. Support Theming
```typescript
// All components should support themes
const { colors } = useTheme();
```

### 4. Add TypeScript Types
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  // ... etc
}
```

---

## 📦 Recommended Libraries

Consider these for implementation:

- **Styling:** NativeWind (Tailwind for React Native)
- **Animations:** react-native-reanimated
- **Toasts:** react-native-toast-message
- **Bottom Sheets:** @gorhom/bottom-sheet (you may already have this)
- **Icons:** react-native-vector-icons or expo-icons

---

## 🎨 Design System

### Color Tokens
Match your web theme:
- Primary, Secondary, Accent colors
- Success, Warning, Error, Info colors
- Text colors (primary, secondary, muted)
- Background colors

### Spacing
Use consistent spacing scale:
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px

### Typography
Match web font sizes and weights

---

## 📈 Progress Tracking

Use this checklist:

### Phase 1: Critical (Week 1-2)
- [ ] Button component
- [ ] Card system (Header, Content, Title)
- [ ] Input component
- [ ] Label component

### Phase 2: Important (Week 3-4)  
- [ ] Dialog/Modal system
- [ ] Badge component
- [ ] ScrollArea wrapper
- [ ] useToast hook + Toast component

### Phase 3: Nice-to-Have (Week 5-6)
- [ ] Form helpers (FormItem, FormField, etc.)
- [ ] Popover component
- [ ] Skeleton loader
- [ ] Avatar component

---

## 🔍 Need More Details?

- **Full breakdown:** See [usage-report.md](./usage-report.md)
- **Sprint plan:** See [MOBILE_ACTION_PLAN.md](./MOBILE_ACTION_PLAN.md)
- **Spreadsheet:** Open [component-usage.csv](./component-usage.csv)

---

## ❓ FAQs

**Q: Should mobile components be exactly the same as web?**  
A: No, adapt for mobile UX (e.g., BottomSheet instead of Dialog in some cases)

**Q: What about components with 0 web usage?**  
A: Review if they're still needed. Some are mobile-specific and should be kept.

**Q: Can I use a UI library like React Native Paper?**  
A: You could, but building custom components gives you more control and better web alignment.

**Q: Should I build all 872 components?**  
A: No! Focus on the top 30-40 most used. Many are one-off components.

**Q: How often should I re-run the analysis?**  
A: Monthly or when adding significant new features to web.

---

## 🚀 Ready to Start?

1. ✅ Read [MOBILE_ACTION_PLAN.md](./MOBILE_ACTION_PLAN.md)
2. ✅ Create a new branch: `git checkout -b mobile/component-parity`
3. ✅ Start with Button component
4. ✅ Test, document, repeat

**Good luck! 🎉**