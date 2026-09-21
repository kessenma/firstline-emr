# Component Usage Analysis

This directory contains analysis of component usage across the web application to help prioritize mobile component development.

## Files

- **usage-report.md** - Full detailed analysis report with component usage statistics
- **README.md** - This file (quick reference guide)

## Quick Summary

The analysis scanned **772 files** and found **872 unique components** across the web application.

## Top Priority Components for Mobile

Based on usage frequency, these are the **most critical components** to implement in your mobile app:

### 🔴 High Priority (50+ uses)
1. **Button** - 128 uses
2. **Card** - 55 uses

### 🟡 Medium Priority (20-49 uses)
1. **CardContent** - 48 uses
2. **CardHeader** - 37 uses
3. **CardTitle** - 35 uses
4. **Input** - 33 uses
5. **useToast** (hook) - 32 uses
6. **Dialog** - 31 uses
7. **DialogContent** - 31 uses
8. **Label** - 31 uses
9. **DialogTitle** - 29 uses
10. **DialogHeader** - 28 uses
11. **ScrollArea** - 24 uses
12. **Badge** - 21 uses

### 🟢 Lower Priority (10-19 uses)
- DialogDescription, TextFormField, Checkbox, Table, Popover components
- Form components (FormItem, FormLabel, FormField, FormControl, FormMessage)
- Accordion components (Accordion, AccordionItem, AccordionTrigger, AccordionContent)
- Select components (Select, SelectContent, SelectItem, SelectTrigger, SelectValue)
- RadioCard, Skeleton, DatePickerFormField

## Key Insights

### Critical UI Components Missing in Mobile
- **Button** - The most used component (128 times) - needs immediate implementation
- **Dialog/Modal system** - Used 31 times with multiple sub-components
- **Card system** - Core layout component (55 uses for Card, 48 for CardContent)

### Form Components Needed
- **Input** - 33 uses
- **Label** - 31 uses
- **Checkbox** - 16 uses
- **TextFormField** - 19 uses
- **DatePickerFormField** - 12 uses
- **Select/Dropdown** - 11 uses

### Mobile Components with Low Web Usage
These exist in mobile but have 0-1 uses in web - consider if they're still needed:
- SwitchField, RadioCardSelector, SelectField (0 uses)
- CheckboxField, DatePickerField, TextInputField (0 uses)
- BottomSheet, AudioPlayer, ErrorCard (0 uses)
- AdminAccordion, ConfirmDialog, ErrorState (0 uses)

## How to Use This Analysis

1. **Review the full report** in `usage-report.md` for detailed usage locations
2. **Prioritize implementation** starting with High Priority components
3. **Check component categories** - the report breaks down usage by category (ui, form, admin, etc.)
4. **Consider mobile-specific needs** - some web components may need mobile adaptations

## Running the Analysis

To regenerate the analysis:

```bash
node scripts/analyze-component-usage.js
```

This will:
- Scan all TypeScript/JavaScript files in `apps/web`
- Track component imports and usage
- Generate a new `usage-report.md` with updated statistics
- Show top 5 most used components in console output

## Component Categories

The analysis tracks these component categories:
- **ui** - Base UI components (buttons, cards, inputs, etc.)
- **form** - Form-specific components
- **admin/adminDashboard** - Admin panel components
- **patient-chart** - Patient chart/medical record components
- **patient-dashboard** - Patient dashboard/table components
- **messages** - Messaging/chat components
- **notifications** - Notification system components
- **auth** - Authentication components
- **nav** - Navigation components
- **user-profile** - User profile components
- **medEvac-form** - Medical evacuation form components
- **hooks** - Custom React hooks
- **other** - Uncategorized components

## Next Steps

1. ✅ **Implement Button component** - Highest priority (128 uses)
2. ✅ **Implement Card components** - Second priority (Card, CardContent, CardHeader, CardTitle)
3. ⬜ **Implement Dialog/Modal system** - Third priority (Dialog + sub-components)
4. ⬜ **Implement Form components** - Input, Label, and form helpers
5. ⬜ **Implement ScrollArea** - Used in many list views (24 uses)
6. ⬜ **Implement Badge** - Status indicators (21 uses)
7. ⬜ **Review mobile-specific components** - Determine which to keep/remove

## Notes

- Many components show as "unknown" category - these are typically from the ui directory
- The script tracks both explicit imports and JSX usage
- Test files are excluded from the analysis
- Component usage count includes every import/usage, not unique files