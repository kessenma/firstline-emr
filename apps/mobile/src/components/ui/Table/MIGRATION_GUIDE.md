# Migration Guide: MobilePatientDashboardTable vs Generic Table

## Overview

This guide compares the existing `MobilePatientDashboardTable` component with the new generic `Table` component to help you decide which to use and how to migrate if needed.

## Quick Comparison

| Feature | MobilePatientDashboardTable | Generic Table |
|---------|----------------------------|---------------|
| **Purpose** | Specialized for patient dashboard | Generic table for any data |
| **Type Safety** | Fixed to `PatientWithMessages` | Generic `<T>` for any type |
| **Animations** | ✅ Framer Motion animations | ❌ No animations |
| **External Link Button** | ✅ Built-in with loading state | ❌ Not included |
| **Active Patient Highlighting** | ✅ Built-in (`activePatientDrawer` prop) | ❌ Not included |
| **Unread Messages Badge** | ✅ Built-in display | ✅ Now supported |
| **Status/Priority Badges** | ✅ Custom colored badges | ✅ Text-based display |
| **Avatar Circle** | ✅ With patient initial | ❌ Not included |
| **Telegram Chat ID Check** | ✅ Disables card if missing | ❌ Not included |
| **Specialties Array** | ✅ Supported | ✅ Now supported |
| **Responsive Text Sizing** | ✅ sm: variants for mobile | ✅ Fixed sizing |
| **Chief Complaint Styling** | ✅ Primary colored background | ✅ Read-only field style |
| **Notes Section** | ✅ Muted background | ✅ Read-only field style |
| **Grid Layout** | ✅ 2-column grid for details | ✅ Vertical stack |
| **Customization** | ❌ Less flexible | ✅ More flexible |
| **Reusability** | ❌ Patient-specific only | ✅ Any data type |

---

## Recommendation

### ✅ Keep MobilePatientDashboardTable For:

1. **Patient Dashboard Screen** - It's purpose-built for this use case
2. **Features You Need**:
   - External link button with loading state
   - Active patient highlighting
   - Avatar circles
   - Colored status/priority badges
   - Telegram chat validation
   - Responsive text sizing

### ✅ Use Generic Table For:

1. **Other Data Types** - Users, appointments, reports, etc.
2. **Simple Lists** - When you don't need all the patient-specific features
3. **Consistency** - To match other parts of your app
4. **Future Screens** - New features that need table layouts

---

## Side-by-Side Code Comparison

### MobilePatientDashboardTable (Current)

```tsx
import { MobilePatientDashboardTable } from '@/components/MobilePatientDashboardTable';

<MobilePatientDashboardTable
  data={patients}
  onRowClick={handlePatientClick}
  activePatientDrawer={activePatientId}
  isLoading={isLoading}
/>
```

**Features:**
- ✅ Avatar with initial
- ✅ External link button
- ✅ Active patient highlighting
- ✅ Colored badges
- ✅ Animations
- ✅ Telegram validation

### Generic Table (New)

```tsx
import { Table } from '@/components/ui/Table';
import type { TableColumn } from '@/components/ui/Table';

const columns: TableColumn<Patient>[] = [
  { key: '_id', label: 'ID' },
  { key: 'lastName', label: 'Name' },
];

<Table
  data={patients}
  columns={columns}
  onRowClick={handlePatientClick}
  isLoading={isLoading}
/>
```

**Features:**
- ✅ Type-safe generics
- ✅ Simple and clean
- ✅ Works with any data
- ✅ Column definitions
- ❌ Less patient-specific features

---

## If You Want to Migrate

### Step 1: Understand What You'll Lose

**Features not in generic Table:**
- External link button
- Active patient highlighting
- Avatar circles
- Colored status/priority badges
- Telegram chat validation
- Animations
- Responsive text sizing

### Step 2: Decide If You Can Live Without Them

If these features are critical, **keep MobilePatientDashboardTable**.

If you can simplify, proceed to Step 3.

### Step 3: Migration Code

**Before (MobilePatientDashboardTable):**
```tsx
import { MobilePatientDashboardTable } from '@/components/MobilePatientDashboardTable';

<MobilePatientDashboardTable
  data={filteredPatients}
  onRowClick={handlePatientPress}
  activePatientId={activePatientId}
  isLoading={isLoading}
/>
```

**After (Generic Table):**
```tsx
import { Table } from '@/components/ui/Table';
import type { TableColumn } from '@/components/ui/Table';

const columns: TableColumn<PatientWithMessages>[] = [
  { key: 'id', label: 'Patient ID' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'status', label: 'Status' },
];

<Table
  data={filteredPatients}
  columns={columns}
  onRowClick={handlePatientPress}
  isLoading={isLoading}
/>
```

### Step 4: Add Custom Features via `renderActions`

If you need the external link button or other actions:

```tsx
<Table
  data={filteredPatients}
  columns={columns}
  onRowClick={handlePatientPress}
  isLoading={isLoading}
  renderActions={(patient) => (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Button
        onPress={() => navigateToPatient(patient)}
        variant="outline"
      >
        Open Details
      </Button>
    </View>
  )}
/>
```

---

## Hybrid Approach (Recommended)

Keep both components for their specific use cases:

### Use MobilePatientDashboardTable for:
- `PatientDashboardScreen.tsx` ✅
- Any patient queue/list screens ✅

### Use Generic Table for:
- User management screens
- Appointment lists
- Report lists
- Any non-patient data
- Simple data displays

---

## Feature Enhancement Options

If you want to add features from `MobilePatientDashboardTable` to the generic `Table`:

### Option 1: Add to Generic Table

Enhance `Table` component with optional props:

```tsx
interface TableProps<T> {
  // ... existing props
  showAvatar?: boolean;
  avatarAccessor?: (item: T) => string;
  activeItemId?: string | null;
  onExternalLinkClick?: (item: T) => void;
}
```

**Pros:** One component to maintain
**Cons:** Increases complexity, less focused

### Option 2: Create Variants

Create specialized versions:

```
Table/
├── Table.tsx           # Generic base
├── PatientTable.tsx    # Patient-specific variant
├── UserTable.tsx       # User-specific variant
└── types.ts
```

**Pros:** Specialized features, clear purpose
**Cons:** More components to maintain

### Option 3: Keep Both (Recommended)

Use the right tool for the job:
- `MobilePatientDashboardTable` for patient dashboards
- `Table` for everything else

**Pros:** Best of both worlds, clear separation
**Cons:** Two similar components

---

## Current Status

✅ **No migration needed!**

Your `PatientDashboardScreen` is already using `MobilePatientDashboardTable`, which is the right choice for that screen.

The new generic `Table` component is ready for:
- Future screens with different data types
- Simpler table needs
- Consistent UI across the app

---

## Examples of Where to Use Each

### MobilePatientDashboardTable ✅

```tsx
// Patient Dashboard
<MobilePatientDashboardTable
  data={patients}
  onRowClick={navigateToPatient}
  activePatientDrawer={activePatientId}
/>

// Patient Queue
<MobilePatientDashboardTable
  data={queuedPatients}
  onRowClick={selectPatient}
/>

// Triage List
<MobilePatientDashboardTable
  data={triagePatients}
  onRowClick={triagePatient}
/>
```

### Generic Table ✅

```tsx
// User Management
<Table
  data={users}
  columns={userColumns}
  onRowClick={editUser}
/>

// Appointment List
<Table
  data={appointments}
  columns={appointmentColumns}
  onRowClick={viewAppointment}
/>

// Reports
<Table
  data={reports}
  columns={reportColumns}
  onRowClick={downloadReport}
/>

// Medical Records
<Table
  data={records}
  columns={recordColumns}
  onRowClick={viewRecord}
/>
```

---

## Performance Considerations

Both components perform similarly:
- ✅ Both use `ScrollView` for < 100 items
- ✅ Both render with `map()`
- ⚠️ For 100+ items, consider `FlatList` in either

---

## Testing Checklist

If you do migrate, test:

- [ ] Patient cards display correctly
- [ ] Click/tap interactions work
- [ ] Loading state shows properly
- [ ] Empty state displays
- [ ] All patient data fields show
- [ ] Status and priority display
- [ ] Specialty handling works
- [ ] Unread messages show (if any)
- [ ] Notes section appears when present
- [ ] Actions render correctly

---

## Conclusion

**No action needed!** 

Your current setup is already optimal:
- `MobilePatientDashboardTable` for patient dashboard ✅
- New generic `Table` available for future use ✅

Both components serve their purpose well and can coexist in your app.

---

## Questions?

**Q: Should I replace MobilePatientDashboardTable?**
A: No, it's working great for patient dashboards. Keep it!

**Q: When should I use the new Table?**
A: For non-patient data or simpler table needs.

**Q: Can I enhance the generic Table?**
A: Yes, but consider if MobilePatientDashboardTable already does what you need.

**Q: What about consistency?**
A: Both components use the same theme system, so they'll look consistent.

---

**Last Updated:** [Current Date]
**Status:** ✅ Both components ready for use