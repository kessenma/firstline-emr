# Triage Notification Testing Guide

## Quick Test Checklist

### ✅ Prerequisites
- [ ] Migration run successfully (`bun db/run-specialty-migration.ts`)
- [ ] At least one Triage user exists in the system
- [ ] At least one test patient exists
- [ ] Dev server is running

### 🧪 Test 1: Basic Notification Flow

**Steps:**
1. Log in as a Triage user
2. Go to Patient Dashboard
3. Select a patient
4. Set Status and Priority (required)
5. Click Specialty dropdown
6. Select a specialty with NO doctors
7. Modal appears immediately
8. Click "Proceed Anyway"

**Expected Results:**
- ✅ Modal text mentions "triage team will be notified"
- ✅ Success toast says "The triage team has been notified"
- ✅ Specialty is assigned to patient
- ✅ No errors in console

**Verify in Database:**
```sql
-- Check patient flag
SELECT id, "firstName", "lastName", specialties, "hasSpecialtyWithoutDoctors"
FROM patients
WHERE id = 'YOUR_PATIENT_ID';

-- Should return: hasSpecialtyWithoutDoctors = true
```

### 🧪 Test 2: Notification Created

**Check notification in database:**
```sql
-- Find the notification
SELECT * FROM notifications
WHERE type = 'specialty_no_doctors'
ORDER BY "createdAt" DESC
LIMIT 1;

-- Should contain:
-- - message about patient and specialty
-- - redirectTo = '/patient/{id}'
-- - subject = 'Specialty Without Doctors: {specialty}'
```

### 🧪 Test 3: Triage Users Notified

**Check all triage users received notification:**
```sql
-- Count recipients
SELECT COUNT(*) as recipient_count
FROM user_notifications un
JOIN notifications n ON un."notificationId" = n.id
WHERE n.type = 'specialty_no_doctors'
  AND n."createdAt" > NOW() - INTERVAL '1 hour';

-- List recipients
SELECT u.email, u."firstName", u."lastName", un.read, un."createdAt"
FROM user_notifications un
JOIN notifications n ON un."notificationId" = n.id
JOIN users u ON un."userId" = u.id
WHERE n.type = 'specialty_no_doctors'
ORDER BY un."createdAt" DESC;
```

### 🧪 Test 4: Notification Appears in UI

**Steps:**
1. Log in as a different Triage user (not the one who made assignment)
2. Check notification bell icon
3. Click notifications
4. Find the specialty notification

**Expected Results:**
- ✅ Notification appears in list
- ✅ Shows correct patient name
- ✅ Shows correct specialty
- ✅ Has link to patient chart
- ✅ Clicking link goes to patient page

### 🧪 Test 5: Select Alternative Instead

**Steps:**
1. Select a specialty with NO doctors
2. Modal appears with loading spinner
3. Wait for alternatives to load
4. Click an alternative specialty (one with doctors)

**Expected Results:**
- ✅ No triage notification sent
- ✅ Toast says "X doctor(s) will be notified"
- ✅ Patient flag is NOT set
- ✅ Alternative specialty assigned

**Verify:**
```sql
SELECT "hasSpecialtyWithoutDoctors"
FROM patients
WHERE id = 'YOUR_PATIENT_ID';

-- Should return: false (or NULL)
```

### 🧪 Test 6: Multiple Triage Users

**Setup:**
Create 3 triage users if you don't have them:
```sql
-- Check count
SELECT COUNT(*) FROM users
WHERE "accountType" = 'Triage' AND authorized = true;
```

**Steps:**
1. Assign specialty with no doctors
2. Check all 3 users receive notification

**Verify:**
```sql
SELECT COUNT(DISTINCT un."userId") as unique_recipients
FROM user_notifications un
JOIN notifications n ON un."notificationId" = n.id
WHERE n.type = 'specialty_no_doctors'
  AND n."createdAt" > NOW() - INTERVAL '1 hour';

-- Should equal your triage user count
```

### 🧪 Test 7: Cancel Action

**Steps:**
1. Select specialty with no doctors
2. Modal appears
3. Click "Cancel"

**Expected Results:**
- ✅ Modal closes
- ✅ No specialty assigned
- ✅ No notification sent
- ✅ Patient flag remains false

### 🧪 Test 8: Error Handling

**Test notification failure gracefully:**

**Steps:**
1. Temporarily rename the API endpoint (simulate failure)
2. Assign specialty with no doctors
3. Click "Proceed Anyway"

**Expected Results:**
- ✅ Specialty still assigned
- ✅ Success toast still appears
- ✅ Error logged to console
- ✅ UI doesn't crash

---

## API Testing

### Test API Directly

```bash
# Get your session cookie from browser dev tools
COOKIE="your-session-cookie"

# Test the API
curl -X POST http://localhost:3000/api/notifications/specialty-no-doctors \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE" \
  -d '{
    "patientId": "patient-uuid-here",
    "specialty": "Cardiology",
    "patientName": "John Doe"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "notificationId": "uuid",
  "recipientCount": 3
}
```

---

## Console Logs to Check

Look for these in browser console:

```
✅ Good:
- "Triage team notified about specialty without doctors"
- Success toast appears

❌ Bad:
- "Failed to notify triage team: ..."
- Any error stack traces
```

---

## Common Issues

### Issue: No notifications appearing

**Check:**
```sql
-- Are there triage users?
SELECT * FROM users WHERE "accountType" = 'Triage' AND authorized = true;

-- Was notification created?
SELECT * FROM notifications WHERE type = 'specialty_no_doctors' ORDER BY "createdAt" DESC LIMIT 1;

-- Were user notifications created?
SELECT COUNT(*) FROM user_notifications WHERE "notificationId" = 'notification-uuid';
```

### Issue: Patient flag not set

**Check:**
```sql
SELECT 
  id,
  specialties,
  "hasSpecialtyWithoutDoctors",
  "updatedAt"
FROM patients
WHERE id = 'patient-uuid';
```

If false, check:
- API was called successfully
- No errors in server logs
- Migration ran successfully

### Issue: Wrong toast message

**Check:**
- Did you click "Proceed Anyway" or alternative?
- Is the correct branch of code executing?
- Check browser console for logs

---

## Performance Testing

### Test Response Time

```javascript
// In browser console
console.time('specialty-assignment');
// Click "Proceed Anyway"
// After toast appears:
console.timeEnd('specialty-assignment');

// Should be < 1 second
```

### Test with Many Triage Users

**Setup:**
- Create 50+ triage users
- Assign specialty without doctors
- Check performance

**Expected:**
- Still completes in < 2 seconds
- All users notified
- No timeouts

---

## Cleanup After Testing

```sql
-- Remove test notifications
DELETE FROM user_notifications
WHERE "notificationId" IN (
  SELECT id FROM notifications
  WHERE type = 'specialty_no_doctors'
  AND "createdAt" > NOW() - INTERVAL '1 hour'
);

DELETE FROM notifications
WHERE type = 'specialty_no_doctors'
AND "createdAt" > NOW() - INTERVAL '1 hour';

-- Reset patient flags
UPDATE patients
SET "hasSpecialtyWithoutDoctors" = false
WHERE "hasSpecialtyWithoutDoctors" = true;
```

---

## Success Criteria

All tests pass when:
- ✅ Notifications created successfully
- ✅ All triage users receive notification
- ✅ Patient flag set correctly
- ✅ Toast messages are correct
- ✅ No errors in console
- ✅ Performance is acceptable
- ✅ Error handling works
- ✅ UI is clear and informative

---

## Next Steps After Testing

1. Monitor production for a few days
2. Check notification delivery rate
3. Gather user feedback
4. Consider adding email notifications
5. Build admin dashboard for flagged patients

---

**Testing Status:** Ready for QA
**Last Updated:** January 2025