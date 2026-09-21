# Profile Update Requests - Quick Start Guide

A complete system for managing admin-approval-required profile changes.

## 🚀 What You Need to Know

### The Problem
Users need to change sensitive profile fields (doctor specialty, account type) but these require admin approval for security and compliance.

### The Solution
1. User tries to change restricted field → Modal warns about admin approval
2. User confirms → Request is created and tracked
3. User sees current value + `ShieldAlert` icon showing pending change
4. Admin reviews and approves/denies in dashboard
5. Profile auto-updates on approval with full audit logging

## 📦 What Was Added

### Database
- New table: `user_profile_update_requests`
- Tracks: field, current/requested values, status, review info
- Enums: `request_status` (pending/approved/denied), `admin_approval_field`

### API Endpoints
**User:**
- `POST /api/profile-update-requests` - Create request
- `GET /api/profile-update-requests` - View my requests

**Admin:**
- `GET /api/admin/profile-update-requests` - View all requests
- `PATCH /api/admin/profile-update-requests/[id]` - Approve/deny
- `DELETE /api/admin/profile-update-requests/[id]` - Delete

### UI Components
**User Side:**
- `useProfileUpdateRequests` - Hook for managing requests
- `AdminApprovalWarningModal` - Warning when changing restricted fields
- `PendingChangeIndicator` - Shows ShieldAlert icon with pending status

**Admin Side:**
- `ProfileUpdateRequestsView` - Full management interface
- `ProfileUpdateRequestsViewModel` - Business logic
- Integrated into Admin Dashboard with ShieldAlert icon

### Utilities
- `profileUpdateHelpers.ts` - Helper functions for field validation, formatting, etc.

## 🎯 Quick Integration

### Step 1: Run Migration
```bash
npm run db:generate
npm run db:migrate
```

### Step 2: Add to Your Profile Form
```tsx
import { useProfileUpdateRequests } from '@/components/user-profile/useProfileUpdateRequests';
import { AdminApprovalWarningModal } from '@/components/user-profile/AdminApprovalWarningModal';
import { PendingChangeIndicator } from '@/components/user-profile/PendingChangeIndicator';

function ProfileForm() {
  const { hasPendingRequest, getPendingRequestByField, createRequest } = useProfileUpdateRequests();
  const [showModal, setShowModal] = useState(false);
  const [pendingChange, setPendingChange] = useState(null);

  const handleFieldChange = (field, value) => {
    if (['doctorSpecialty', 'accountType'].includes(field)) {
      if (hasPendingRequest(field)) {
        alert('Request already pending!');
        return;
      }
      setPendingChange({ field, current: currentValue, requested: value });
      setShowModal(true);
    } else {
      // Normal update
      updateField(field, value);
    }
  };

  const handleConfirm = async () => {
    await createRequest({
      fieldName: pendingChange.field,
      currentValue: pendingChange.current,
      requestedValue: pendingChange.requested,
    });
    setShowModal(false);
  };

  const pending = getPendingRequestByField('doctorSpecialty');

  return (
    <div>
      <label>
        Doctor Specialty
        {hasPendingRequest('doctorSpecialty') && <ShieldAlert />}
      </label>
      <select onChange={(e) => handleFieldChange('doctorSpecialty', e.target.value)}>
        {/* options */}
      </select>
      {pending && (
        <PendingChangeIndicator
          requestedValue={pending.requestedValue}
          requestedAt={pending.requestedAt}
          fieldDisplayName="Doctor Specialty"
        />
      )}
      <AdminApprovalWarningModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleConfirm}
        fieldName={pendingChange?.field}
        currentValue={pendingChange?.current}
        requestedValue={pendingChange?.requested}
      />
    </div>
  );
}
```

## 🔧 Admin Dashboard

Already integrated! Look for "Profile Update Requests" section with ShieldAlert icon.

Features:
- Stats cards (pending/approved/denied counts)
- Search and filter
- Approve/deny with notes
- Auto-updates user profile
- Creates audit logs

## 📝 Common Tasks

### Check if Field Requires Approval
```tsx
import { isAdminGatedField } from '@/lib/profileUpdateHelpers';

if (isAdminGatedField('doctorSpecialty')) {
  // Show modal
}
```

### Format Values for Display
```tsx
import { formatFieldValue } from '@/lib/profileUpdateHelpers';

const display = formatFieldValue(['Cardiology', 'Neurology']);
// "Cardiology, Neurology"
```

### Add New Restricted Field

1. Update enum in `userProfileUpdateRequests.ts`:
```ts
export const adminApprovalFieldEnum = pgEnum("admin_approval_field", [
  "doctorSpecialty",
  "accountType",
  "newField", // Add here
]);
```

2. Update helpers:
```ts
// In profileUpdateHelpers.ts
export const ADMIN_GATED_FIELDS = [
  'doctorSpecialty',
  'accountType',
  'newField',
] as const;

export const FIELD_DISPLAY_NAMES = {
  // ...
  newField: 'New Field Display Name',
};
```

3. Run migration:
```bash
npm run db:generate
npm run db:migrate
```

## ✅ Testing Checklist

**User Flow:**
- [ ] Warning modal appears when changing restricted field
- [ ] Can submit request successfully
- [ ] Pending indicator shows with ShieldAlert icon
- [ ] Current value still displays
- [ ] Can't submit duplicate request

**Admin Flow:**
- [ ] Requests appear in dashboard
- [ ] Can filter by status
- [ ] Can approve with/without notes
- [ ] User profile updates on approval
- [ ] Audit log created
- [ ] Can deny request

## 🐛 Troubleshooting

**Modal not showing?**
- Check field is in `ADMIN_GATED_FIELDS`
- Verify `showModal` state is true

**Pending indicator not visible?**
- Run `refetch()` after creating request
- Check `hasPendingRequest()` returns true

**API errors?**
- Verify migration ran successfully
- Check authentication token
- Review server logs

**Admin can't see requests?**
- Verify user has admin role in `admins` table
- Check API endpoint permissions

## 📚 Full Documentation

- **Complete Guide**: `PROFILE_UPDATE_REQUESTS_README.md`
- **Integration Examples**: `PROFILE_UPDATE_REQUESTS_INTEGRATION.md`
- **Migration Guide**: `MIGRATION_GUIDE.md`

## 🎨 UI Preview

**User Modal:**
```
┌─────────────────────────────────────┐
│ ⚠️  Admin Approval Required          │
├─────────────────────────────────────┤
│ Changes to Doctor Specialty require │
│ administrator approval.              │
│                                     │
│ Current:   Cardiology               │
│ Requested: Neurology                │
│                                     │
│ [Cancel]  [Submit Request]          │
└─────────────────────────────────────┘
```

**Pending Indicator:**
```
Doctor Specialty: Cardiology
🛡️ Pending Approval (Requested: Neurology)
```

**Admin Dashboard:**
```
Profile Update Requests
┌────────────────────────────────────┐
│ Pending: 5 | Approved: 12 | Denied: 2 │
├────────────────────────────────────┤
│ User         Field      Change     │
│ John Doe     Specialty  Card→Neuro │
│ [✓ Approve] [✗ Deny]               │
└────────────────────────────────────┘
```

## 🔒 Security

✅ All endpoints verify authentication
✅ Admin endpoints verify admin status
✅ Users can only see their own requests
✅ All approvals logged with admin details
✅ Foreign keys ensure data integrity
✅ Input validation on all fields

## 📊 Key Features

- ✨ User-friendly modal warnings
- 🛡️ Animated ShieldAlert pending indicators
- 📝 Full audit trail in profile logs
- 🔍 Admin search and filtering
- 💬 Optional review notes
- 🔄 Auto-refresh on changes
- 📱 Responsive design
- 🌙 Dark mode support

---

**Need Help?** Check the full documentation in the other markdown files!