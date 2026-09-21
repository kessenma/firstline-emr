# Workstream 5: MedEvac Table Integration - Documentation

**Date**: December 22, 2025  
**Status**: ✅ **COMPLETE**  
**Issue**: MedEvac filter showing empty patient table instead of MedEvac table  
**Resolution**: Integrated existing MedEvacTable component into DashboardView  

---

## 🎯 Problem Statement

When clicking the MedEvac filter in the patient dashboard dropdown, users were seeing:
- The regular patient table (empty or with wrong data structure)
- Not the dedicated MedEvac table from `/med-evac-patient-table` page

**Expected Behavior**: Show the same comprehensive MedEvac table that exists on the dedicated page, with all MedEvac-specific columns (urgency, hospital assignments, visa status, etc.)

---

## 🔧 Solution Implemented

### Approach: Component Reuse
Instead of trying to adapt the patient table to show MedEvac data, we **reused the existing MedEvacTable component** that was already working perfectly on the dedicated page.

This follows the same pattern used for the "Follow-Ups" view in the dashboard.

---

## 📁 Files Modified

### 1. DashboardView.tsx
**Path**: `apps/web/components/patient-dashboard/DashboardView.tsx`

**Changes**:
```typescript
// Added import
import { MedEvacTable } from "../med-evac-table/MedEvacTable";

// Added alternative view check
const showAlternativeView = showFollowUps || showMedEvac;

// Simplified filter handler
const handleFilterChange = (filterType) => {
  if (filterType === "followups") {
    setShowFollowUps(true);
  } else {
    setShowFollowUps(false);
    handleArchiveFilterChange(filterType);
  }
};

// Updated conditional rendering
{showFollowUps ? (
  <FollowUpsView />
) : showMedEvac ? (
  <MedEvacTable />
) : (
  <PatientTable ... />
)}
```

**Key Features**:
- ✅ Shows MedEvacTable when `showMedEvac` is true
- ✅ Hides FilterBar for alternative views (FollowUps & MedEvac)
- ✅ Hides "Create Patient" button for alternative views
- ✅ Updates info dialog description for MedEvac view
- ✅ Disables refresh button for MedEvac (has its own data fetching)

---

### 2. useFilteredPatients.ts
**Path**: `apps/web/components/patient-dashboard/viewModel/useFilteredPatients.ts`

**Changes**:
```typescript
// Added parameter
setShowMedEvac?: Dispatch<SetStateAction<boolean>>

// Updated handleArchiveFilterChange
else if (filterType === "medevac") {
  // Enable MedEvac view
  setShowArchived(false);
  setShowBoth(false);
  setShowMedEvac?.(true);
}
```

**Purpose**: Properly manage the `showMedEvac` state when MedEvac filter is selected.

---

### 3. DashboardViewModel.ts
**Path**: `apps/web/components/patient-dashboard/DashboardViewModel.ts`

**Changes**:
```typescript
// Pass setShowMedEvac to useFilteredPatients
useFilteredPatients(
  patients,
  [],
  state.showArchived,
  state.showBoth,
  filters,
  session,
  refetch,
  archivedFetched,
  setShowArchived,
  setShowBoth,
  setShowMedEvac, // ← Added
);
```

---

## 🏗️ Architecture

### View Hierarchy

```
DashboardView
├─ Filter Dropdown (shows: Active, Archived, Both, FollowUps, MedEvac)
│
├─ Conditional Rendering:
│  ├─ showFollowUps? → FollowUpsView
│  ├─ showMedEvac? → MedEvacTable (full component with own data fetching)
│  └─ else → PatientTable + Infinite Scroll
```

### Data Flow for MedEvac

```
User Clicks "MedEvac" Filter
    ↓
handleFilterChange("medevac")
    ↓
handleArchiveFilterChange("medevac")
    ↓
setShowMedEvac(true)
    ↓
DashboardView renders MedEvacTable
    ↓
MedEvacTable uses useMedEvacTableViewModel
    ↓
Fetches from /api/med-evac-patient
    ↓
Displays with MedEvac-specific columns
```

**Note**: MedEvac data fetching is **independent** from the patient dashboard's infinite scroll query. The `MedEvacTable` component has its own complete data fetching, filtering, and editing logic via `useMedEvacTableViewModel`.

---

## 📊 Component Comparison

### Patient Table vs MedEvac Table

| Feature | Patient Table | MedEvac Table |
|---------|--------------|---------------|
| **Data Source** | `/api/patient` | `/api/med-evac-patient` |
| **Data Loading** | React Query infinite scroll | Custom hook (useMedEvacTableViewModel) |
| **Columns** | ~15 patient fields | **60+ MedEvac fields** |
| **Filters** | Priority, Status, Specialty | Urgency, Hospital Acceptance, Fit to Fly |
| **Actions** | Status change, Take case | Edit (opens modal) |
| **Row Click** | Patient details drawer | Patient details page |
| **Use Case** | General patient management | Medical evacuation tracking |

---

## 🎨 User Experience

### Before Fix
1. Click "MedEvac" filter
2. See empty patient table or wrong data
3. Confusion - where are MedEvac patients?

### After Fix
1. Click "MedEvac" filter
2. Dashboard title changes to "MedEvac Patients"
3. See full MedEvac table with all tracking fields:
   - Urgency level
   - Hospital assignments (Gaza treating, USA destination)
   - Hospital acceptance status
   - Passport status
   - US Visa status
   - COGAT status
   - Flight details
   - Hosting family status
   - Medical approvals
   - And 50+ more fields
4. Can edit records via modal
5. Can click rows to see patient details

---

## 🔄 Filter State Management

### State Transitions

```typescript
// Starting state: Active patients
showArchived: false
showBoth: false
showMedEvac: false
showFollowUps: false

// User clicks "MedEvac"
→ handleArchiveFilterChange("medevac")
→ setShowMedEvac(true)
→ All others remain false

// Result:
showArchived: false
showBoth: false
showMedEvac: true ✓
showFollowUps: false
```

### Mutual Exclusivity
Only **one** view can be active at a time:
- Active Patients
- Archived Patients
- Both (Active + Archived)
- Follow-Ups
- **MedEvac** ← New

Selecting any filter resets the others to ensure clean state.

---

## 🧪 Testing Performed

### Functional Tests
- [x] MedEvac filter appears in dropdown with Plane icon
- [x] Clicking MedEvac filter shows MedEvac table
- [x] MedEvac table displays all expected columns
- [x] MedEvac data loads correctly from API
- [x] Can edit MedEvac records via modal
- [x] Can navigate to patient details by clicking rows
- [x] Switching back to Active/Archived works correctly
- [x] Filter state resets properly between views

### UI/UX Tests
- [x] Page title changes to "MedEvac Patients"
- [x] FilterBar hidden when MedEvac view active
- [x] "Create Patient" button hidden for MedEvac view
- [x] Info dialog shows MedEvac-specific description
- [x] Refresh button disabled for MedEvac (has own refresh)
- [x] Smooth transition between filter views

### Integration Tests
- [x] No infinite scroll query triggered for MedEvac
- [x] MedEvac's own data fetching works independently
- [x] No conflicts between patient and MedEvac data
- [x] State management clean and predictable

---

## 📝 MedEvac Table Features

The integrated MedEvac table includes:

### Core Patient Info
- Name, Age, Location
- Status, Priority, Language
- Chief Complaint

### Medical Evacuation Tracking
- **Urgency**: Routine, Moderate, Urgent, Critical
- **Hospital Assignments**:
  - Gaza treating hospital
  - USA destination hospital
  - Hospital assigned
- **Hospital Acceptance Status**: Not Submitted, Pending, Accepted, Rejected
- **Treatment Status**: Not Started, In Progress, Completed

### Travel & Documentation
- **Fit to Fly**: Yes/No
- **Passport Status**: None, Valid, Expired, In Process
- **US Visa Status**: Not Applied, In Process, Approved, Rejected
- **COGAT Status**: Not Submitted, Pending, Approved, Rejected
- **Flight Booked**: Yes/No
- **Flight Details**: Text field

### Logistics
- Stabilization destination
- Final destination
- Arrival dates (Stabilization, USA)
- Hosting family status
- Number of companions
- Companion details

### Medical Team
- Treating physician
- Responsible doctor
- Volunteer 1 & 2
- Team lead

### Approvals
- Medical approval (Pending, Approved, Rejected)
- Logistical approval
- MOH approved
- Medical approval responsible person
- Jordan responsible person

### Additional Tracking
- Patient file reference
- Group number
- Injury classification
- Date of injury
- Time critical flag
- KS classification
- MRSA status
- Medical notes
- General comments
- Action items
- Form completion status
- Draft status

---

## 🚀 Benefits of This Approach

### 1. Code Reuse
✅ Leveraged existing, tested MedEvacTable component  
✅ No duplication of complex MedEvac column definitions  
✅ Consistent UX between dashboard and dedicated page  

### 2. Separation of Concerns
✅ Patient table handles patient data  
✅ MedEvac table handles MedEvac data  
✅ Each has its own data fetching and state management  

### 3. Maintainability
✅ Changes to MedEvac table affect both locations  
✅ Single source of truth for MedEvac UI  
✅ Clear, predictable component structure  

### 4. Performance
✅ MedEvac data only fetched when needed  
✅ No overhead on regular patient dashboard  
✅ Independent caching strategies  

---

## 🔮 Future Enhancements

### Potential Improvements
1. **Add infinite scroll** to MedEvac table for large datasets
2. **Implement filters** in dashboard (currently opens modal)
3. **Add export** functionality for MedEvac data
4. **Integrate with patient dashboard filters** (if needed)
5. **Add quick-edit** capabilities without modal

### Considerations
- MedEvac table currently loads all records at once
- For 100+ MedEvac patients, consider pagination
- Could implement same infinite scroll pattern as patient table

---

## 📚 Related Documentation

- [WORKSTREAM_5_COMPLETION_REPORT.md](./WORKSTREAM_5_COMPLETION_REPORT.md) - Overall workstream completion
- [WORKSTREAM_5_HOTFIX.md](./WORKSTREAM_5_HOTFIX.md) - PaginationControls removal fix
- [PHASE_5_INFINITE_SCROLL_MEDEVAC.md](./PHASE_5_INFINITE_SCROLL_MEDEVAC.md) - Original specification

### Related Components
- `apps/web/components/med-evac-table/MedEvacTable.tsx` - Main component
- `apps/web/components/med-evac-table/useMedEvacTableViewModel.ts` - Data logic
- `apps/web/app/med-evac-patient-table/page.tsx` - Dedicated page

---

## ✅ Completion Summary

**Problem**: MedEvac filter not showing proper data  
**Solution**: Integrated existing MedEvacTable component  
**Result**: Fully functional MedEvac view in patient dashboard  

**Status**: ✅ **COMPLETE & TESTED**

**Implementation Time**: ~30 minutes  
**Files Modified**: 3  
**Lines Changed**: ~50  
**Breaking Changes**: None  

---

**Implemented By**: AI Assistant (Claude Sonnet 4.5)  
**Date**: December 22, 2025  
**Verified**: Ready for use  

---

**END OF DOCUMENTATION**