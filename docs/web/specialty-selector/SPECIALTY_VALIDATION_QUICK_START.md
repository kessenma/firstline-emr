# Specialty Validation - Quick Start Guide

## What Was Built

A modal that warns users when they try to assign a specialty to a patient, but there are no doctors with that specialty in the system. The modal shows available alternatives.

## Key Files

### 1. API Endpoint
```
apps/web/app/api/doctors/available-specialties/route.ts
```
- GET: Returns all specialties with doctors
- POST: Checks if specific specialty has doctors

### 2. Modal Component
```
apps/web/components/patient-dashboard/modals/NoSpecialtyDoctorsModal.tsx
```
- Warning modal that appears when no doctors available
- Shows selected specialty and available alternatives

### 3. Enhanced Cell Component
```
apps/web/components/patient-dashboard/cells/SpecialtyCell.tsx (modified)
```
- Added validation before assignment
- Shows modal immediately when no doctors found
- Loads available specialties asynchronously
- Allows proceeding anyway or selecting alternative
- Success toast with doctor count

## How It Works

```
User selects specialty
        ↓
System checks if doctors exist
        ↓
    ┌───────┴────────┐
    ↓                ↓
Has Doctors    No Doctors
    ↓                ↓
Assign & Notify  Show Modal Immediately
                     ↓
              Load alternatives async
                     ↓
              User chooses:
              • Proceed anyway
              • Select alternative
              • Cancel
```

## Quick Test

1. **Test Success Path:**
   - Select a specialty with doctors
   - See success toast: "X doctor(s) will be notified"
   - No modal appears

2. **Test Warning Path:**
   - Select a specialty with NO doctors
   - Modal appears immediately
   - Shows loading spinner while fetching alternatives
   - Lists available specialties (clickable)
   - Can proceed anyway, select alternative, or cancel

## API Usage

### Check if specialty has doctors:
```bash
POST /api/doctors/available-specialties
Body: { "specialty": "Cardiology" }
```

Response:
```json
{
  "hasDoctors": true,
  "doctorCount": 3,
  "doctors": [...]
}
```

### Get all available specialties:
```bash
GET /api/doctors/available-specialties
```

Response:
```json
{
  "availableSpecialties": ["Cardiology", "Dermatology", ...],
  "doctorCount": 15
}
```

## Component Props

```tsx
<NoSpecialtyDoctorsModal
  isOpen={boolean}
  onClose={() => void}
  selectedSpecialty="Cardiology"
  onProceedAnyway={() => void}
  onSelectAlternative={(specialty) => void}
  isLoadingAlternatives={boolean}
  availableSpecialties={["Specialty 1", "Specialty 2"]}
/>
```

## User Flow

### Before (Old)
1. Select specialty → Assigned immediately
2. No feedback about doctor availability
3. May fail silently

### After (New)
1. Select specialty → Check for doctors
2. **If no doctors:** 
   - Modal opens immediately
   - Loads alternatives with spinner
   - User can proceed anyway or select alternative
3. **If has doctors:** Assign + show success toast with count

## Database Query

Finds doctors with specific specialty:
```sql
SELECT * FROM users
WHERE accountType = 'Doctor'
  AND authorized = true
  AND doctorSpecialty @> ARRAY['Selected Specialty']
```

## Features

✅ Warns about missing doctors (doesn't block)  
✅ Shows helpful alternatives with click-to-select  
✅ Async loading of alternatives  
✅ Option to proceed anyway  
✅ Success feedback with doctor count  
✅ Accessible modal (keyboard, screen reader)  
✅ Responsive design  
✅ Loading states with spinner  
✅ Error handling  

## Integration Points

- **DashboardView** → PatientTable → Column definitions → SpecialtyCell
- **SpecialtyCell** → NoSpecialtyDoctorsModal
- **API** → Queries users table for doctors
- **Toast** → Success/error notifications

## No New Dependencies

Uses existing packages:
- axios (API calls)
- lucide-react (icons)
- Existing UI components
- Existing hooks

## Troubleshooting

**Modal doesn't show?**
- Check if specialty actually has no doctors
- Verify API endpoint accessible
- Check browser console for errors

**TypeScript errors?**
- Clear `.next` cache
- Restart dev server
- Run `bun install`

**API returns error?**
- Check database connection
- Verify `users` table structure
- Check PostgreSQL version supports array operators

## File Structure

```
apps/web/
├── app/api/doctors/available-specialties/
│   └── route.ts                           ← API endpoint
├── components/patient-dashboard/
│   ├── cells/
│   │   └── SpecialtyCell.tsx             ← Enhanced with validation
│   └── modals/
│       └── NoSpecialtyDoctorsModal.tsx   ← Warning modal
└── db/schema/
    └── users.ts                          ← Doctor data source
```

## Testing Checklist

- [ ] Select specialty with doctors → Assigns successfully
- [ ] Select specialty without doctors → Modal appears immediately
- [ ] Loading spinner shows while fetching alternatives
- [ ] Modal shows correct specialty name
- [ ] Modal lists available alternatives (clickable)
- [ ] Click alternative specialty → Assigns that specialty
- [ ] "Proceed Anyway" button works
- [ ] Cancel button works
- [ ] Success toast shows doctor count
- [ ] Works on mobile
- [ ] Keyboard navigation works
- [ ] Screen reader accessible

## Key Benefits

1. **Informed Choice:** Warns but doesn't block specialty assignment
2. **Better UX:** Clear feedback with click-to-select alternatives
3. **Guided Flow:** Shows alternatives instantly in modal
4. **Flexible:** Can proceed anyway or choose alternative
5. **Transparent:** Users see how many doctors will be notified
6. **Accessible:** Follows WCAG guidelines

## Related Docs

- `SPECIALTY_VALIDATION_IMPLEMENTATION.md` - Full implementation details
- `SPECIALTY_VALIDATION_TESTING.md` - Complete testing guide
- `README_SPECIALTY_VALIDATION.md` - Feature documentation

## Summary

This feature improves the specialty assignment workflow by:
1. Validating doctor availability and warning user
2. Showing modal immediately with async loading
3. Listing clickable available alternatives
4. Allowing user to proceed anyway if desired
5. Providing clear success feedback with doctor count

**Status:** ✅ Complete and ready for testing

**Next Steps:**
1. Run manual tests (see testing guide)
2. Test with real data
3. Monitor user feedback
4. Consider enhancements (see implementation doc)

---

**Quick Start Complete! Start testing in Patient Dashboard → Specialty Column**