# Mobile Component Development Action Plan

> Based on component usage analysis from web application  
> **Generated:** January 2, 2026  
> **Status:** 🟡 In Progress

---

## 📊 Analysis Summary

- **Files Analyzed:** 772
- **Unique Components Found:** 872
- **High Priority Components:** 2 (50+ uses)
- **Medium Priority Components:** 12 (20-49 uses)
- **Lower Priority Components:** 26 (10-19 uses)

---

## 🎯 Implementation Roadmap

### Phase 1: Critical UI Components (Week 1-2)

#### 1.1 Button Component ⚠️ CRITICAL
**Status:** ❌ Missing  
**Web Usage:** 128 times  
**Priority:** 🔴 Highest

**Implementation Requirements:**
- [ ] Base Button component with variants (primary, secondary, outline, ghost)
- [ ] Size variants (sm, md, lg)
- [ ] Loading state with spinner
- [ ] Disabled state
- [ ] Icon support (left/right)
- [ ] Press feedback animation
- [ ] Accessibility (screen reader support)

**Used In:**
- Admin dashboard (6 files)
- Med-evac forms (6 files)
- User profile (6 files)
- Messages (5 files)
- Patient charts (5 files)

---

#### 1.2 Card Component System ✅ DONE (Basic)
**Status:** 🟡 Needs Enhancement  
**Web Usage:** Card (55), CardContent (48), CardHeader (37), CardTitle (35)  
**Priority:** 🔴 High

**Current State:** Basic Card exists in mobile
**Enhancements Needed:**
- [ ] CardHeader sub-component
- [ ] CardContent sub-component
- [ ] CardTitle sub-component
- [ ] CardDescription sub-component
- [ ] CardFooter sub-component
- [ ] Consistent styling with web
- [ ] Shadow/elevation variants
- [ ] Press states for interactive cards

---

### Phase 2: Dialog/Modal System (Week 2-3)

#### 2.1 Dialog/Modal Components
**Status:** ❌ Missing  
**Web Usage:** Dialog (31), DialogContent (31), DialogTitle (29), DialogHeader (28), DialogDescription (19)  
**Priority:** 🟡 Medium-High

**Implementation Requirements:**
- [ ] Base Dialog/Modal container
- [ ] DialogContent wrapper
- [ ] DialogHeader component
- [ ] DialogTitle component
- [ ] DialogDescription component
- [ ] DialogFooter component
- [ ] DialogTrigger component
- [ ] Backdrop/overlay with tap-to-dismiss
- [ ] Slide-up animation (mobile-appropriate)
- [ ] Close button/gesture
- [ ] Keyboard avoidance
- [ ] Portal/overlay support

**Alternative:** Consider using React Native's `Modal` or `BottomSheet` (already exists) as base

---

### Phase 3: Form Components (Week 3-4)

#### 3.1 Input Component
**Status:** ❌ Missing (TextInputField exists but may need alignment)  
**Web Usage:** 33 times  
**Priority:** 🟡 Medium

**Implementation Requirements:**
- [ ] Base Input component
- [ ] Label integration
- [ ] Error state styling
- [ ] Helper text support
- [ ] Prefix/suffix icons
- [ ] Clear button
- [ ] Focus states
- [ ] Different keyboard types

---

#### 3.2 Label Component
**Status:** ❌ Missing  
**Web Usage:** 31 times  
**Priority:** 🟡 Medium

**Implementation Requirements:**
- [ ] Standalone Label component
- [ ] Required indicator (*)
- [ ] Optional indicator
- [ ] Associated with form fields
- [ ] Proper accessibility linking

---

#### 3.3 Form Helper Components
**Status:** 🟡 Partial (some exist)  
**Web Usage:** FormItem (15), FormLabel (15), FormField (14), FormControl (12), FormMessage (11)  
**Priority:** 🟢 Lower-Medium

**Implementation Requirements:**
- [ ] FormItem wrapper
- [ ] FormLabel (if different from Label)
- [ ] FormField wrapper with validation
- [ ] FormControl wrapper
- [ ] FormMessage for errors
- [ ] Integration with react-hook-form or similar

**Note:** May want to create a unified form system similar to shadcn/ui

---

#### 3.4 Checkbox Component
**Status:** ✅ CheckboxField exists  
**Web Usage:** 16 times  
**Enhancement:** Verify alignment with web patterns

---

#### 3.5 DatePicker Component
**Status:** ✅ DatePickerField exists  
**Web Usage:** 12 times  
**Enhancement:** Verify alignment with web patterns

---

### Phase 4: Layout & Navigation (Week 4-5)

#### 4.1 ScrollArea Component
**Status:** ❌ Missing (use ScrollView?)  
**Web Usage:** 24 times  
**Priority:** 🟡 Medium

**Implementation Requirements:**
- [ ] Custom scrollable container
- [ ] Consistent with web scroll behavior
- [ ] Pull-to-refresh support
- [ ] Scroll indicators
- [ ] Performance optimization for long lists

**Alternative:** May just use React Native's `ScrollView` with styling

---

#### 4.2 Badge Component
**Status:** ❌ Missing  
**Web Usage:** 21 times  
**Priority:** 🟡 Medium

**Implementation Requirements:**
- [ ] Small badge for status indicators
- [ ] Color variants (success, warning, error, info)
- [ ] Size variants
- [ ] Dot variant
- [ ] Number variant
- [ ] Positioning utilities (for notification badges)

---

### Phase 5: Advanced Components (Week 5-6)

#### 5.1 Accordion Component
**Status:** ✅ Exists  
**Web Usage:** 13 times each (Accordion, AccordionItem, AccordionTrigger, AccordionContent)  
**Enhancement:** Verify API matches web

---

#### 5.2 Select/Dropdown Component
**Status:** ✅ SelectField exists  
**Web Usage:** 11 times (Select, SelectContent, SelectItem, SelectTrigger, SelectValue)  
**Enhancement:** May need sub-components for consistency

---

#### 5.3 Popover Component
**Status:** ❌ Missing  
**Web Usage:** Popover (14), PopoverTrigger (15), PopoverContent (15)  
**Priority:** 🟢 Lower

**Implementation Requirements:**
- [ ] Floating popover container
- [ ] Positioning logic (with react-native-popper or similar)
- [ ] PopoverTrigger wrapper
- [ ] PopoverContent container
- [ ] Arrow/pointer
- [ ] Auto-dismiss on outside tap

---

#### 5.4 Skeleton Loader
**Status:** ❌ Missing  
**Web Usage:** 13 times  
**Priority:** 🟢 Lower

**Implementation Requirements:**
- [ ] Animated skeleton placeholder
- [ ] Shape variants (text, circle, rectangle)
- [ ] Pulse/shimmer animation
- [ ] Composable for complex layouts

---

#### 5.5 Table Component
**Status:** 🟡 MobilePatientDashboardTable exists  
**Web Usage:** 15 times  
**Priority:** 🟢 Lower

**Note:** Mobile tables often need different patterns (cards, lists)

---

### Phase 6: Utility Components & Hooks (Week 6)

#### 6.1 useToast Hook & Toast Component
**Status:** ❌ Missing  
**Web Usage:** 32 times  
**Priority:** 🟡 Medium

**Implementation Requirements:**
- [ ] useToast hook
- [ ] Toast container/manager
- [ ] Toast variants (success, error, info, warning)
- [ ] Auto-dismiss with timer
- [ ] Swipe-to-dismiss
- [ ] Action buttons in toast
- [ ] Toast queue management
- [ ] Portal/overlay support

**Recommendation:** Use `react-native-toast-message` or similar

---

#### 6.2 Avatar Component
**Status:** ❌ Missing  
**Web Usage:** 8 times  
**Priority:** 🟢 Lower

---

#### 6.3 Tabs Component
**Status:** ❌ Missing  
**Web Usage:** 4 times each  
**Priority:** 🟢 Optional

---

#### 6.4 Drawer Component
**Status:** ❌ Missing  
**Web Usage:** 7 times  
**Priority:** 🟢 Optional

**Note:** Consider using React Navigation drawer instead

---

## 🧹 Cleanup: Low-Usage Mobile Components

These components exist in mobile but have 0-1 uses in web. Consider if they're needed:

### Keep (Mobile-Specific Needs)
- ✅ **BottomSheet** - Mobile pattern, keep
- ✅ **CustomTabBar** - Mobile navigation, keep
- ✅ **ErrorBoundary** - Essential for stability, keep
- ✅ **ErrorCard** - Useful for error states, keep
- ✅ **LoadingState** - Useful for loading states, keep

### Review/Consolidate
- ⚠️ **AdminAccordion** - Duplicate of Accordion?
- ⚠️ **AdminDashboardHeader** - Only 1 web use
- ⚠️ **MobilePatientDashboardTable** - Only 1 web use, but needed
- ⚠️ **SwitchField** - 0 uses, consider removing or promoting
- ⚠️ **RadioCardSelector** - 0 uses, verify if needed
- ⚠️ **ConfirmDialog** - 0 uses, but generally useful
- ⚠️ **EmptyState** - 0 uses, but generally useful
- ⚠️ **BulkActionBar** - 0 uses, mobile pattern

### Rename to Match Web
Consider renaming mobile form fields to match web conventions:
- `TextInputField` → Consider adding plain `Input` as well
- `SwitchField` → Consider `Switch`
- `CheckboxField` → Keep, but also export as `Checkbox`
- `SelectField` → Keep, but also export as `Select`
- `DatePickerField` → Keep, but also export as `DatePicker`

---

## 📋 Week-by-Week Sprint Plan

### Week 1: Critical Foundations
- [ ] Implement Button component (all variants)
- [ ] Enhance Card component system (add sub-components)
- [ ] Start Dialog/Modal system
- [ ] Set up component testing framework

### Week 2: Dialogs & Basic Forms
- [ ] Complete Dialog/Modal system
- [ ] Implement Label component
- [ ] Implement basic Input component
- [ ] Implement Badge component

### Week 3: Form System
- [ ] Create Form helper components (FormItem, FormField, etc.)
- [ ] Integrate form components with validation
- [ ] Test form flows in actual screens

### Week 4: Layout & Advanced Forms
- [ ] Implement ScrollArea wrapper
- [ ] Verify Select/Dropdown alignment
- [ ] Review and enhance Accordion
- [ ] Implement Skeleton loader

### Week 5: Utilities & Polish
- [ ] Implement useToast hook and Toast component
- [ ] Implement Popover component
- [ ] Add Avatar component
- [ ] Review all components for consistency

### Week 6: Documentation & Cleanup
- [ ] Remove/consolidate low-usage components
- [ ] Write component documentation
- [ ] Create component showcase/storybook
- [ ] Final testing and bug fixes

---

## 🎨 Design System Alignment

### Considerations
1. **Naming Convention:** Match web component names where possible
2. **API Consistency:** Props should match web components when applicable
3. **Styling System:** Consider using NativeWind or similar for Tailwind-like styling
4. **Theme Support:** Ensure all components support light/dark themes
5. **Accessibility:** All components should be accessible (screen readers, keyboard navigation)

### Component Export Strategy
Consider a dual export strategy:
```typescript
// Mobile-specific suffix
export { Button as ButtonMobile } from './Button';

// Web-compatible name
export { Button } from './Button';
```

---

## 📚 Resources

### Generated Files
- `usage-report.md` - Full detailed analysis
- `component-usage.csv` - Spreadsheet-friendly format
- `README.md` - Quick reference guide

### Scripts
Run analysis anytime:
```bash
npm run analyze:components       # Generate markdown report
npm run analyze:components:csv   # Generate CSV export
npm run analyze:components:all   # Generate both
```

---

## ✅ Success Metrics

- [ ] All High Priority components implemented (Button, Card system)
- [ ] All Medium Priority components implemented (Dialog, Input, Label, ScrollArea, Badge, useToast)
- [ ] Form components work with validation libraries
- [ ] Components match web API where possible
- [ ] 100% TypeScript coverage
- [ ] Component tests written
- [ ] Documentation complete
- [ ] Mobile app feels consistent with web app

---

## 🚀 Next Steps

1. **Review this plan** with team
2. **Prioritize any mobile-specific requirements** not captured
3. **Start with Week 1 sprint** (Button + Card enhancements)
4. **Set up component development environment** (testing, storybook/showcase)
5. **Create component templates** for consistency

---

## 📝 Notes

- Some "unknown" category components are from the `/ui` directory - these are shadcn/ui-style components
- Consider creating a shared component library in the future for truly universal components
- Mobile components may need different UX patterns (e.g., BottomSheet instead of Dialog)
- Keep mobile-first mindset - not everything needs to match web exactly

---

**Last Updated:** January 2, 2026  
**Maintained By:** Development Team