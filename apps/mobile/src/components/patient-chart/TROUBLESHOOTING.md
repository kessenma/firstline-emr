# Patient Chart Troubleshooting Guide

## Common Issues and Solutions

### 1. 401 Unauthorized Error ✅ FIXED

**Error Message:**
```
PatientChartContext - API response status: 401
Error: HTTP error! status: 401
```

**Cause:** 
API requests were not including authentication headers.

**Solution:**
Updated `PatientChartContext.tsx` to include `Authorization: Bearer ${token}` header in all fetch requests. The context now:
1. Gets the auth token using `getStoredToken()` from storage
2. Includes the token in all API requests
3. Returns an error if no token is found

**Status:** ✅ Fixed in latest version

---

### 2. Patient Data Not Loading

**Symptoms:**
- Loading spinner shows indefinitely
- No error message displayed
- Console shows API calls but no data

**Debugging Steps:**

1. **Check if user is authenticated:**
   ```
   Look for: "[AuthContext] Session restored for: [email]"
   ```

2. **Check if token exists:**
   ```
   Look for: "🎫 PowerSync token found" or check storage
   ```

3. **Verify API endpoint:**
   ```
   Look for: "🔗 [Config] getApiUrl called with endpoint: /patient/..."
   Should show: http://localhost:3000/api/patient/[id]
   ```

4. **Check API response:**
   ```
   Look for: "PatientChartContext - API response status: [code]"
   - 200: Success
   - 401: Not authenticated (token missing/invalid)
   - 403: Not authorized (insufficient permissions)
   - 404: Patient not found
   - 500: Server error
   ```

**Common Solutions:**

- **No token:** Log out and log back in
- **Invalid token:** Clear app storage and log in again
- **Wrong patient ID:** Verify the patient exists in database
- **Server error:** Check backend logs

---

### 3. Notes/Medications Not Showing

**Symptoms:**
- Patient info loads but notes/medications are empty
- Tab shows "No items" when data should exist

**Possible Causes:**

1. **Data doesn't exist in database**
   - Check backend database directly
   - Verify patient has associated notes/medications

2. **API response format mismatch**
   - Check console for: "PatientChartContext - Notes formatted: X"
   - If X = 0 but data exists, response format may have changed

3. **Draft/Published filter**
   - Notes are filtered by `draft` status
   - Check both "Published" and "Drafts" tabs

**Solution:**
```javascript
// Check what's in the API response
console.log('Raw notes data:', data.patient.notes);
console.log('Formatted notes:', notes);
```

---

### 4. Context Hook Error

**Error Message:**
```
Error: usePatientChart must be used within PatientChartProvider
```

**Cause:**
Trying to use `usePatientChart()` outside of the provider.

**Solution:**
Make sure your component is wrapped:
```tsx
<PatientChartProvider patientId={patientId}>
  <YourComponent />
</PatientChartProvider>
```

---

### 5. Type Errors

**Error:** Properties don't exist on Patient/Note types

**Solution:**
The context uses actual types from `../../types/`. If you need additional fields:

1. Add them to the source type in `src/types/`
2. Update the PatientInfo interface in context
3. Update the formatting function

---

### 6. Navigation Issues

**Symptoms:**
- Clicking patient doesn't open chart
- Wrong patient data shown
- Chart opens but with no patient ID

**Debugging:**
```javascript
// Check navigation parameters
console.log('Navigation params:', route.params);
// Should show: { patientId: 'some-uuid' }
```

**Solution:**
Verify navigation call:
```tsx
navigation.navigate('PatientChart', { patientId: patient.id });
```

---

### 7. Refresh Not Working

**Symptoms:**
- Pull-to-refresh doesn't reload data
- Refresh button does nothing

**Check:**
1. Is `refreshing` state being set?
2. Is `fetchPatientData()` being called?
3. Are there console errors?

**Debug:**
```javascript
const handleRefresh = async () => {
  console.log('Refresh started');
  setRefreshing(true);
  await fetchPatientData();
  console.log('Refresh completed');
  setRefreshing(false);
};
```

---

## Diagnostic Checklist

When something isn't working, check these in order:

- [ ] Is the user authenticated? (Check AuthContext logs)
- [ ] Does the auth token exist? (Check storage)
- [ ] Is the API endpoint correct? (Check getApiUrl logs)
- [ ] What's the API response status? (Check fetch response)
- [ ] Is the data being formatted correctly? (Check formatPatient logs)
- [ ] Is the component wrapped in provider? (Check render tree)
- [ ] Are there any console errors? (Check full console)

---

## Useful Console Log Patterns

### Authentication Check
```
[AuthContext] Checking auth - Token exists: true
[AuthContext] Session restored for: user@example.com
```

### Patient Data Loading
```
PatientChartContext - Initial fetch for patientId: [uuid]
PatientChartContext - fetchPatientInfo called for: [uuid]
🔗 [Config] getApiUrl called with endpoint: /patient/[uuid]
PatientChartContext - API response status: 200
PatientChartContext - Patient info formatted successfully
```

### Medications Loading
```
PatientChartContext - fetchMedications called
PatientChartContext - RxOrders set: X
PatientChartContext - MedOrders set: Y
```

---

## Common Console Errors

### Network Error
```
Error: Network request failed
```
**Solution:** Check if backend is running on port 3000

### JSON Parse Error
```
Error: Unexpected token < in JSON
```
**Solution:** API returned HTML (probably an error page), check backend logs

### CORS Error (Web only)
```
Error: CORS policy blocked
```
**Solution:** Not applicable to React Native (no CORS in mobile)

---

## Testing Checklist

Before reporting an issue, verify:

1. **Backend is running**
   ```bash
   # Should respond
   curl http://localhost:3000/api/health
   ```

2. **Authentication works**
   ```bash
   # Get token from storage
   # Make manual API call
   curl -H "Authorization: Bearer [token]" \
        http://localhost:3000/api/patient/[id]
   ```

3. **Patient exists**
   ```sql
   SELECT * FROM patients WHERE id = '[uuid]';
   ```

4. **Context is properly set up**
   - Provider wraps the view
   - PatientId is passed correctly
   - Hook is called inside provider

---

## Getting Help

If you've gone through this guide and still have issues:

1. **Collect these logs:**
   - Full console output from app start to error
   - Network tab (if using React Native Debugger)
   - Backend logs from the same timeframe

2. **Note these details:**
   - What you were trying to do
   - What you expected to happen
   - What actually happened
   - Steps to reproduce

3. **Check these files:**
   - `PatientChartContext.tsx` - Main context
   - `PatientChartView.tsx` - Main UI
   - `PatientChartScreen.tsx` - Screen wrapper
   - Backend API route for `/patient/:id`

4. **Verify versions:**
   - React Native version
   - Backend API version
   - Database schema version

---

## Quick Fixes

### Clear App Storage
```javascript
// Add this to a debug button
import { storage } from '../utils/storage';
storage.clearAll();
```

### Force Refresh
```javascript
// Add to context
const hardRefresh = async () => {
  setPatientInfo(null);
  setNotes([]);
  setMedications([]);
  await fetchPatientData();
};
```

### Enable Debug Mode
```javascript
// In PatientChartContext, add more logging
const DEBUG = true;
if (DEBUG) console.log('Debug info:', data);
```

---

## Status Indicators

✅ **Working:** Feature is implemented and tested
🚧 **In Progress:** Feature is partially implemented
⚠️ **Known Issue:** Issue exists with workaround
❌ **Not Working:** Issue exists without solution

### Current Status

- ✅ Authentication with Bearer token
- ✅ Patient info loading
- ✅ Notes loading (published & drafts)
- ✅ Medications loading (Rx & Med orders)
- ✅ Photos/media loading
- ✅ Pull to refresh
- ✅ Error handling
- ✅ Loading states
- 🚧 Add new prescription
- 🚧 Edit patient info
- 🚧 Upload images
- 🚧 Messaging integration
- 🚧 Video calls

---

**Last Updated:** January 2025
**Version:** 1.0.0