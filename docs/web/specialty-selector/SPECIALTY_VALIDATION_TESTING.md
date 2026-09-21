# Specialty Validation Feature - Testing Guide

## Quick Start Testing

### Prerequisites
1. Ensure you have at least one Triage user account
2. Have access to the admin panel to view/manage doctors
3. Have at least one test patient in the system

## Test Scenarios

### Scenario 1: Assigning Specialty with Available Doctors ✅

**Setup:**
- Ensure you have at least one authorized doctor with a specific specialty (e.g., "Cardiology")

**Steps:**
1. Log in as a Triage user
2. Navigate to Patient Dashboard
3. Find a patient and ensure they have:
   - Status: Something other than "Not Started"
   - Priority: Something other than "Not Selected"
4. Click on the Specialty dropdown
5. Select "Cardiology" (or a specialty with doctors)

**Expected Result:**
- ✅ Specialty is assigned to patient
- ✅ Success toast appears: "Specialty Updated - X doctor(s) will be notified about this patient"
- ✅ No modal appears
- ✅ Doctors with that specialty receive notifications

---

### Scenario 2: Assigning Specialty with NO Available Doctors ⚠️

**Setup:**
- Create a situation where a specialty has no authorized doctors
- Option A: Create a new specialty in the enum that no doctors have
- Option B: Temporarily deauthorize all doctors of a certain specialty

**Steps:**
1. Log in as a Triage user
2. Navigate to Patient Dashboard
3. Find a patient and ensure Status and Priority are set
4. Click on the Specialty dropdown
5. Select a specialty that has no doctors

**Expected Result:**
- ⚠️ Modal appears with title "No Doctors Available"
- ⚠️ Modal shows: "There are currently no doctors with the [Selected Specialty] specialty in the system."
- ⚠️ Modal asks: "Would you like to choose a different specialty?"
- ⚠️ Modal lists available specialties with doctors
- ⚠️ Patient specialty is NOT updated
- ⚠️ No notifications are sent

**Modal Actions:**
- Click "Cancel" → Modal closes, no changes
- Click "Choose Different Specialty" → Modal closes, dropdown reopens

---

### Scenario 3: System with NO Doctors at All 🚫

**Setup:**
- Deauthorize all doctors in the system OR test in a fresh system with no doctors

**Steps:**
1. Log in as a Triage user
2. Navigate to Patient Dashboard
3. Try to assign any specialty to a patient

**Expected Result:**
- 🚫 Modal appears
- 🚫 Shows message: "No doctors are currently available in the system with any specialty."
- 🚫 Available specialties list is empty with italic message

---

### Scenario 4: Missing Prerequisites (Status/Priority)

**Setup:**
- Have a patient with either no Status or no Priority set

**Steps:**
1. Log in as a Triage user
2. Navigate to Patient Dashboard
3. Hover over the Specialty dropdown for this patient

**Expected Result:**
- ❌ Specialty dropdown is disabled
- 💡 Tooltip appears: "Select both Status and Priority before choosing a specialty."
- ❌ Cannot open specialty selector

---

### Scenario 5: Non-Triage User Attempt

**Setup:**
- Log in as a Doctor or Evac user (not Triage)

**Steps:**
1. Navigate to Patient Dashboard
2. Hover over any Specialty dropdown

**Expected Result:**
- ❌ Specialty dropdown is disabled
- 💡 Tooltip appears: "Only triage account types can select doctor specialties."

---

### Scenario 6: Loading States

**Setup:**
- Use browser DevTools to throttle network speed (Slow 3G)

**Steps:**
1. Select a specialty for a patient
2. Observe the loading states

**Expected Result:**
- 🔄 Dropdown shows loading spinner during API check
- 🔄 Button text or state indicates loading
- 🔄 User cannot make changes during loading
- ✅ Eventually completes (success or modal)

---

## API Testing

### Test GET Endpoint

```bash
# Get all available specialties
curl -X GET http://localhost:3000/api/doctors/available-specialties \
  -H "Cookie: your-session-cookie"
```

**Expected Response:**
```json
{
  "availableSpecialties": [
    "Cardiology",
    "Dermatology & Wound Care",
    "Emergency Medicine & Trauma"
  ],
  "doctorCount": 15
}
```

### Test POST Endpoint

```bash
# Check specific specialty
curl -X POST http://localhost:3000/api/doctors/available-specialties \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"specialty":"Cardiology"}'
```

**Expected Response (with doctors):**
```json
{
  "specialty": "Cardiology",
  "hasDoctors": true,
  "doctorCount": 3,
  "doctors": [
    {
      "id": "uuid-1",
      "name": "Dr. John Smith"
    }
  ]
}
```

**Expected Response (no doctors):**
```json
{
  "specialty": "Podiatry",
  "hasDoctors": false,
  "doctorCount": 0,
  "doctors": []
}
```

---

## Database Verification

### Check Doctor Specialties

```sql
-- View all authorized doctors and their specialties
SELECT 
  id, 
  email, 
  "firstName", 
  "lastName", 
  "doctorSpecialty",
  authorized
FROM users
WHERE "accountType" = 'Doctor'
  AND authorized = true
  AND "doctorSpecialty" IS NOT NULL;
```

### Check Patients with Specialties

```sql
-- View patients and their assigned specialties
SELECT 
  id,
  "firstName",
  "lastName",
  specialties,
  status,
  priority
FROM patients
WHERE specialties IS NOT NULL;
```

---

## Browser DevTools Testing

### Console Logs to Check

Look for these in the browser console:

```javascript
// When specialty is selected
"Checking specialty availability..."

// When doctors found
"Specialty assigned successfully"
"Sending notifications to X doctors"

// When no doctors found
"No doctors available for specialty: X"
"Showing modal with available alternatives"
```

### Network Tab

Monitor these API calls:
1. `POST /api/doctors/available-specialties` - Check specialty
2. `GET /api/doctors/available-specialties` - Get alternatives (if needed)
3. `PATCH /api/patient/[id]/triage` - Update patient (if doctors found)

---

## Edge Cases to Test

### 1. Rapid Clicks
- Quickly select different specialties in succession
- Verify only the final selection is processed
- No race conditions or duplicate modals

### 2. Network Errors
- Disconnect network during specialty selection
- Should show error toast, not crash

### 3. Large Specialty Lists
- If 30+ specialties have doctors
- Verify modal scrolls properly
- UI remains readable

### 4. Clearing Specialty
- Select a specialty, then clear it
- Should allow clearing without validation

### 5. Special Characters
- Specialties with special characters (e.g., "OB/GYN")
- Should handle properly in API and UI

---

## Accessibility Testing

### Keyboard Navigation
- Tab to specialty dropdown
- Press Enter/Space to open
- Navigate with arrow keys
- Press Escape to close modal

### Screen Reader
- Modal announces when opened
- All text is readable
- Buttons have clear labels
- Lists are properly structured

---

## Performance Testing

### Metrics to Track
- API response time for specialty check: < 500ms
- Modal render time: < 100ms
- No memory leaks after multiple opens/closes
- No excessive re-renders

### Browser Performance Tools
```javascript
// Measure API call time
console.time('specialty-check');
await fetch('/api/doctors/available-specialties', {...});
console.timeEnd('specialty-check');
```

---

## Common Issues & Solutions

### Issue: Modal doesn't appear when expected
**Check:**
- Is the specialty actually missing doctors?
- Check browser console for errors
- Verify API endpoint is accessible

### Issue: "Cannot find module 'lucide-react'"
**Solution:**
```bash
cd apps/web
bun install
# or
npm install
```

### Issue: Specialty dropdown always disabled
**Check:**
- Is user logged in as Triage?
- Does patient have Status and Priority set?
- Check console for errors

### Issue: API returns 500 error
**Check:**
- Database connection is working
- `users` table has `doctorSpecialty` column
- PostgreSQL array operators are supported

---

## Automated Testing Ideas

### Unit Tests
```typescript
describe('SpecialtyCell', () => {
  it('shows modal when no doctors available', async () => {
    // Mock API to return hasDoctors: false
    // Trigger specialty selection
    // Expect modal to be visible
  });

  it('assigns specialty when doctors available', async () => {
    // Mock API to return hasDoctors: true
    // Trigger specialty selection
    // Expect onChange to be called
  });
});
```

### Integration Tests
```typescript
describe('Specialty Assignment Flow', () => {
  it('completes full flow with available doctors', async () => {
    // Create test patient
    // Create test doctor with specialty
    // Assign specialty
    // Verify database updated
    // Verify notification sent
  });
});
```

---

## Rollback Testing

If you need to rollback the feature:

1. Comment out modal import in `SpecialtyCell.tsx`
2. Restore old `handleSpecialtyChange` function
3. Verify system still works
4. API endpoints are harmless if unused

---

## Success Criteria

All tests pass when:
- ✅ Modal appears correctly when no doctors available
- ✅ Specialty assigns correctly when doctors available
- ✅ Success toast shows doctor count
- ✅ Available specialties list is accurate
- ✅ No crashes or errors in console
- ✅ Loading states work properly
- ✅ Keyboard navigation works
- ✅ Works on mobile and desktop
- ✅ Works with screen readers
- ✅ Performance is acceptable

---

## Test Data Setup

### Create Test Doctors

```sql
-- Doctor with Cardiology specialty
INSERT INTO users (email, "firstName", "lastName", "accountType", "doctorSpecialty", authorized)
VALUES ('doctor1@test.com', 'John', 'Smith', 'Doctor', ARRAY['Cardiology'], true);

-- Doctor with multiple specialties
INSERT INTO users (email, "firstName", "lastName", "accountType", "doctorSpecialty", authorized)
VALUES ('doctor2@test.com', 'Jane', 'Doe', 'Doctor', ARRAY['Cardiology', 'Internal Medicine & Hospitalist'], true);

-- Unauthorized doctor (should not appear in available list)
INSERT INTO users (email, "firstName", "lastName", "accountType", "doctorSpecialty", authorized)
VALUES ('doctor3@test.com', 'Bob', 'Johnson', 'Doctor', ARRAY['Dermatology & Wound Care'], false);
```

---

**Happy Testing! 🎉**

For issues or questions, refer to:
- `SPECIALTY_VALIDATION_IMPLEMENTATION.md` - Implementation details
- `README_SPECIALTY_VALIDATION.md` - Feature documentation