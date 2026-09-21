# Profile Update Requests System

A comprehensive system for managing user profile changes that require administrator approval.

## 📋 Overview

This system allows users to request changes to admin-restricted profile fields (currently `doctorSpecialty` and `accountType`). When users attempt to modify these fields:

1. **User Side**: A warning modal appears explaining admin approval is required
2. **User Confirms**: Request is submitted and tracked
3. **Pending Status**: User sees their current value with a `ShieldAlert` icon indicating pending change
4. **Admin Review**: Admins view, approve, or deny requests in the admin dashboard
5. **Auto-Update**: Upon approval, the user's profile updates automatically with change logging

## 🏗️ Architecture

### Database Schema

**Table**: `userProfileUpdateRequests`

```typescript
{
  id: uuid (primary key)
  userId: uuid (references users)
  fieldName: enum ('doctorSpecialty', 'accountType')
  currentValue: json
  requestedValue: json
  status: enum ('pending', 'approved', 'denied')
  userEmail: string
  userName: string
  reviewedBy: uuid (nullable, references users)
  reviewedByEmail: string (nullable)
  reviewedByName: string (nullable)
  reviewedAt: timestamp (nullable)
  reviewNotes: text (nullable)
  requestedAt: timestamp
  createdAt: timestamp
  updatedAt: timestamp
}
```

### API Endpoints

#### User Endpoints
- `POST /api/profile-update-requests` - Create a new profile update request
- `GET /api/profile-update-requests?status=pending` - Get user's requests

#### Admin Endpoints
- `GET /api/admin/profile-update-requests?status=pending` - Get all requests
- `PATCH /api/admin/profile-update-requests/[requestId]` - Approve/deny request
- `DELETE /api/admin/profile-update-requests/[requestId]` - Delete request

### Components

#### User-Facing Components
1. **`useProfileUpdateRequests.ts`** - Hook for managing requests
2. **`AdminApprovalWarningModal.tsx`** - Warning modal for restricted field changes
3. **`PendingChangeIndicator.tsx`** - Visual indicator showing pending changes with `ShieldAlert` icon
4. **`PendingChangeIndicatorInline.tsx`** - Compact version for inline use

#### Admin Components
1. **`ProfileUpdateRequestsViewModel.ts`** - Admin logic for managing requests
2. **`ProfileUpdateRequestsView.tsx`** - Admin UI for reviewing requests
3. Integrated into `AdminDashboardView.tsx` as a new section

## 🚀 Quick Start

### Step 1: Run Database Migration

```bash
# Generate migration
npm run db:generate

# Apply migration
npm run db:migrate
```

Or with Drizzle Kit:

```bash
npx drizzle-kit generate
npx drizzle-kit push
```

### Step 2: Import Components in Your Profile Form

```tsx
import { useState } from 'react';
import { useProfileUpdateRequests } from '@/components/user-profile/useProfileUpdateRequests';
import { AdminApprovalWarningModal } from '@/components/user-profile/AdminApprovalWarningModal';
import { PendingChangeIndicator, PendingChangeIndicatorInline } from '@/components/user-profile/PendingChangeIndicator';
```

### Step 3: Setup Hook and State

```tsx
function UserProfileForm() {
  const {
    hasPendingRequest,
    getPendingRequestByField,
    createRequest,
    isCreating,
  } = useProfileUpdateRequests();

  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [pendingFieldChange, setPendingFieldChange] = useState(null);
  
  // ... rest of component
}
```

### Step 4: Handle Field Changes

```tsx
const handleFieldChange = (fieldName: string, value: any) => {
  const adminGatedFields = ['doctorSpecialty', 'accountType'];
  
  if (adminGatedFields.includes(fieldName)) {
    if (hasPendingRequest(fieldName)) {
      // Already has pending request
      showToast('You already have a pending request for this field');
      return;
    }

    // Show approval modal
    setPendingFieldChange({
      fieldName,
      currentValue: currentFieldValue,
      requestedValue: value,
    });
    setShowApprovalModal(true);
  } else {
    // Normal field update
    updateField(fieldName, value);
  }
};
```

### Step 5: Render with Indicators

```tsx
return (
  <div>
    <label className="flex items-center gap-2">
      Doctor Specialty
      {hasPendingRequest('doctorSpecialty') && (
        <PendingChangeIndicatorInline
          requestedValue={pendingRequest?.requestedValue}
        />
      )}
    </label>
    
    <select onChange={(e) => handleFieldChange('doctorSpecialty', e.target.value)}>
      {/* options */}
    </select>

    {hasPendingRequest('doctorSpecialty') && (
      <PendingChangeIndicator
        requestedValue={pendingRequest?.requestedValue}
        requestedAt={pendingRequest?.requestedAt}
        fieldDisplayName="Doctor Specialty"
      />
    )}

    <AdminApprovalWarningModal
      isOpen={showApprovalModal}
      onClose={() => setShowApprovalModal(false)}
      onConfirm={handleConfirmRequest}
      fieldName={pendingFieldChange?.fieldName}
      currentValue={pendingFieldChange?.currentValue}
      requestedValue={pendingFieldChange?.requestedValue}
      isLoading={isCreating}
    />
  </div>
);
```

## 🎨 UI Components

### AdminApprovalWarningModal
Shows a clear warning when users try to change admin-restricted fields.

**Features:**
- Shows current vs. requested value
- Clear explanation of approval process
- Loading state during submission
- Error handling

### PendingChangeIndicator
Displays pending status with animated `ShieldAlert` icon.

**Features:**
- Animated pulsing icon
- Tooltip with detailed information
- Shows requested value and timestamp
- Two variants: full and inline

### Admin Dashboard View
Comprehensive management interface for admins.

**Features:**
- Statistics cards (pending, approved, denied counts)
- Filter by status
- Search by user name/email
- Approve/deny with optional notes
- Delete processed requests
- Detailed review dialog

## 📝 Usage Examples

### Example 1: Simple Field with Pending Indicator

```tsx
const pendingRequest = getPendingRequestByField('doctorSpecialty');

<div className="space-y-2">
  <label>
    Doctor Specialty
    {hasPendingRequest('doctorSpecialty') && (
      <PendingChangeIndicatorInline requestedValue={pendingRequest?.requestedValue} />
    )}
  </label>
  
  <Select onValueChange={(value) => handleFieldChange('doctorSpecialty', value)}>
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="Cardiology">Cardiology</SelectItem>
      <SelectItem value="Neurology">Neurology</SelectItem>
    </SelectContent>
  </Select>

  {hasPendingRequest('doctorSpecialty') && (
    <PendingChangeIndicator
      requestedValue={pendingRequest?.requestedValue}
      requestedAt={pendingRequest?.requestedAt}
      fieldDisplayName="Doctor Specialty"
    />
  )}
</div>
```

### Example 2: Handling Request Submission

```tsx
const handleConfirmRequest = async () => {
  if (!pendingFieldChange) return;

  const result = await createRequest({
    fieldName: pendingFieldChange.fieldName,
    currentValue: pendingFieldChange.currentValue,
    requestedValue: pendingFieldChange.requestedValue,
  });

  if (result.success) {
    setToast({
      title: 'Request Submitted',
      description: 'Your change request has been submitted for admin approval.',
      variant: 'default',
    });
    setShowApprovalModal(false);
  } else {
    setToast({
      title: 'Error',
      description: result.error,
      variant: 'destructive',
    });
  }
};
```

### Example 3: Admin Approving a Request

Admins simply click the approve button in the admin dashboard, optionally add review notes, and the system:
1. Updates the request status to 'approved'
2. Updates the user's profile field
3. Creates a profile log entry
4. Invalidates relevant queries to refresh data

## 📬 Notifications

The system includes automated notifications to keep everyone informed:

### Notification Types

**1. Profile Update Request (to Admins)**
- Triggered when a user submits a profile update request
- Sent to all admin users
- Includes user details and requested change
- Links directly to the request in admin dashboard

**2. Profile Update Approved (to User)**
- Triggered when an admin approves a request
- Sent to the requesting user
- Includes admin name and optional review notes
- Links to user's profile page

**3. Profile Update Denied (to User)**
- Triggered when an admin denies a request
- Sent to the requesting user
- Includes admin name and denial reason
- Links to user's profile page

### Notification Features
- **In-App Notifications**: Always enabled
- **Email Notifications**: Configured for future email service integration
- **Error Resilience**: Notification failures don't break the request flow
- **User Isolation**: Users only see their own notifications
- **Admin Broadcast**: All admins receive request notifications

### Database Updates
The `userNotifications` table includes:
- `methods` - Array of delivery methods (`['in-app', 'email']`)
- `emailAddress` - User's email for email notifications

See [PROFILE_UPDATE_NOTIFICATIONS.md](./PROFILE_UPDATE_NOTIFICATIONS.md) for complete notification documentation.

## 🔧 Configuration

### Adding New Admin-Gated Fields

1. **Update Schema Enum** (`userProfileUpdateRequests.ts`):
```typescript
export const adminApprovalFieldEnum = pgEnum("admin_approval_field", [
  "doctorSpecialty",
  "accountType",
  "yourNewField", // Add here
]);
```

2. **Update ViewModel** (`ProfileUpdateRequestsViewModel.ts`):
```typescript
const displayNames: Record<string, string> = {
  doctorSpecialty: 'Doctor Specialty',
  accountType: 'Account Type',
  yourNewField: 'Your New Field Display Name',
};
```

3. **Update API Validation** (in route handlers):
```typescript
const validFields = ['doctorSpecialty', 'accountType', 'yourNewField'];
```

4. **Update Your Form Logic** to include the new field in admin-gated checks

5. **Run Migration**:
```bash
npm run db:generate
npm run db:migrate
```

## 🔒 Security

- All endpoints verify user authentication via NextAuth session
- Admin endpoints verify admin status via `admins` table lookup
- Requests are tied to specific users - users can only see their own requests
- Admins can see all requests but actions are logged with admin details
- All profile updates create audit log entries in `userProfileLogs` table

## 📊 Data Flow

```
User attempts change
       ↓
Check if admin-gated field
       ↓
Show warning modal
       ↓
User confirms
       ↓
Create request (POST /api/profile-update-requests)
       ↓
Request saved with status: 'pending'
       ↓
User sees pending indicator
       ↓
Admin reviews in dashboard
       ↓
Admin approves/denies (PATCH /api/admin/profile-update-requests/[id])
       ↓
If approved: Update user profile + Create log entry
       ↓
Request status updated
       ↓
User's profile reflects change automatically
```

## 🧪 Testing

### Test User Flow
1. Login as regular user
2. Navigate to profile page
3. Attempt to change doctor specialty or account type
4. Verify warning modal appears
5. Submit request
6. Verify pending indicator appears
7. Verify current value still shows

### Test Admin Flow
1. Login as admin
2. Navigate to Admin Dashboard > Profile Update Requests
3. Verify pending request appears
4. Click approve/deny
5. Add review notes
6. Confirm action
7. Verify request status updates
8. Verify user's profile updates (if approved)

## 📚 Additional Resources

- **Integration Guide**: See `PROFILE_UPDATE_REQUESTS_INTEGRATION.md` for detailed integration examples
- **Notifications Guide**: See `PROFILE_UPDATE_NOTIFICATIONS.md` for notification system documentation
- **Database Schema**: See `apps/web/db/schema/userProfileUpdateRequests.ts` and `apps/web/db/schema/notifications.ts`
- **API Routes**: See `apps/web/app/api/profile-update-requests/` and `apps/web/app/api/admin/profile-update-requests/`
- **Components**: See `apps/web/components/user-profile/` and `apps/web/components/adminDashboard/sections/profile-update-requests/`
- **Notification Service**: See `apps/web/lib/notifications/profileUpdateNotifications.ts`

## 🐛 Troubleshooting

### Request not appearing as pending
- Check browser console for errors
- Verify request was created in database
- Ensure QueryClient is invalidating queries after creation

### Modal not showing
- Verify field is in admin-gated fields list
- Check state management (showApprovalModal should be true)
- Ensure modal component is rendered

### Approval not updating profile
- Check admin permissions in database
- Verify transaction completes successfully
- Check server logs for errors

### Icons not displaying
- Ensure lucide-react is installed
- Import `ShieldAlert` from 'lucide-react'
- Check Tailwind CSS is processing the classes

## 📄 License

This is part of the Fajr Mission EMR system.

## 🤝 Contributing

When extending this system:
1. Follow existing patterns for consistency
2. Add new fields to the enum and update all relevant files
3. Test both user and admin flows
4. Update documentation
5. Create database migrations