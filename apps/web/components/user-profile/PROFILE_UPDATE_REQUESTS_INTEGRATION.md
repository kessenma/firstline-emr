# Profile Update Requests Integration Guide

This guide explains how to integrate the profile update request system into your user profile components.

## Overview

The profile update request system allows users to request changes to admin-restricted fields (like `doctorSpecialty` and `accountType`). When users attempt to change these fields:

1. A warning modal appears explaining admin approval is required
2. User confirms the request
3. The request is submitted to admins
4. A `ShieldAlert` icon appears next to the field showing it's pending
5. Admins review and approve/deny in the admin dashboard
6. User's profile updates automatically when approved

## Components

### 1. `useProfileUpdateRequests` Hook
Manages fetching and creating profile update requests.

```tsx
import { useProfileUpdateRequests } from '@/components/user-profile/useProfileUpdateRequests';

const {
  requests,
  hasPendingRequest,
  getPendingRequestByField,
  createRequest,
  isCreating,
} = useProfileUpdateRequests();
```

### 2. `AdminApprovalWarningModal`
Shows warning when user tries to change admin-gated field.

```tsx
import { AdminApprovalWarningModal } from '@/components/user-profile/AdminApprovalWarningModal';

<AdminApprovalWarningModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  onConfirm={handleConfirmRequest}
  fieldName="doctorSpecialty"
  currentValue={currentSpecialty}
  requestedValue={newSpecialty}
  isLoading={isCreating}
/>
```

### 3. `PendingChangeIndicator`
Displays the pending status with ShieldAlert icon.

```tsx
import { PendingChangeIndicator } from '@/components/user-profile/PendingChangeIndicator';

{hasPendingRequest('doctorSpecialty') && (
  <PendingChangeIndicator
    requestedValue={pendingRequest.requestedValue}
    requestedAt={pendingRequest.requestedAt}
    fieldDisplayName="Doctor Specialty"
  />
)}
```

## Integration Example

### Step 1: Import Required Components

```tsx
import { useState } from 'react';
import { useProfileUpdateRequests } from '@/components/user-profile/useProfileUpdateRequests';
import { AdminApprovalWarningModal } from '@/components/user-profile/AdminApprovalWarningModal';
import { PendingChangeIndicator, PendingChangeIndicatorInline } from '@/components/user-profile/PendingChangeIndicator';
import { useToast } from '@/components/hooks/useToast';
```

### Step 2: Setup State and Hooks

```tsx
function UserProfileForm() {
  const { setToast } = useToast();
  const {
    hasPendingRequest,
    getPendingRequestByField,
    createRequest,
    isCreating,
  } = useProfileUpdateRequests();

  // Modal state
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [pendingFieldChange, setPendingFieldChange] = useState<{
    fieldName: 'doctorSpecialty' | 'accountType';
    currentValue: any;
    requestedValue: any;
  } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    doctorSpecialty: ['Cardiology'],
    accountType: 'Doctor',
    // ... other fields
  });
```

### Step 3: Handle Field Changes

```tsx
  const handleFieldChange = (fieldName: string, value: any) => {
    const adminGatedFields = ['doctorSpecialty', 'accountType'];
    
    if (adminGatedFields.includes(fieldName)) {
      // Check if there's already a pending request
      if (hasPendingRequest(fieldName as any)) {
        setToast({
          title: 'Pending Request Exists',
          description: 'You already have a pending request for this field.',
          variant: 'destructive',
        });
        return;
      }

      // Show approval modal
      setPendingFieldChange({
        fieldName: fieldName as any,
        currentValue: formData[fieldName as keyof typeof formData],
        requestedValue: value,
      });
      setShowApprovalModal(true);
    } else {
      // Regular field - update immediately
      setFormData(prev => ({ ...prev, [fieldName]: value }));
      // ... save to backend
    }
  };
```

### Step 4: Handle Request Confirmation

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
        description: 'Your profile update request has been submitted for admin approval.',
        variant: 'default',
      });
      setShowApprovalModal(false);
      setPendingFieldChange(null);
    } else {
      setToast({
        title: 'Error',
        description: result.error || 'Failed to submit request',
        variant: 'destructive',
      });
    }
  };
```

### Step 5: Render Form with Indicators

```tsx
  const specialtyPendingRequest = getPendingRequestByField('doctorSpecialty');
  const accountTypePendingRequest = getPendingRequestByField('accountType');

  return (
    <div>
      {/* Doctor Specialty Field */}
      <div className="space-y-2">
        <label className="flex items-center gap-2">
          Doctor Specialty
          {hasPendingRequest('doctorSpecialty') && (
            <PendingChangeIndicatorInline
              requestedValue={specialtyPendingRequest?.requestedValue}
            />
          )}
        </label>
        
        <select
          value={formData.doctorSpecialty[0]}
          onChange={(e) => handleFieldChange('doctorSpecialty', [e.target.value])}
        >
          <option value="Cardiology">Cardiology</option>
          <option value="Neurology">Neurology</option>
          {/* ... more options */}
        </select>

        {/* Show pending change banner */}
        {hasPendingRequest('doctorSpecialty') && (
          <PendingChangeIndicator
            requestedValue={specialtyPendingRequest?.requestedValue}
            requestedAt={specialtyPendingRequest?.requestedAt}
            fieldDisplayName="Doctor Specialty"
          />
        )}
      </div>

      {/* Account Type Field */}
      <div className="space-y-2">
        <label className="flex items-center gap-2">
          Account Type
          {hasPendingRequest('accountType') && (
            <PendingChangeIndicatorInline
              requestedValue={accountTypePendingRequest?.requestedValue}
            />
          )}
        </label>
        
        <select
          value={formData.accountType}
          onChange={(e) => handleFieldChange('accountType', e.target.value)}
        >
          <option value="Doctor">Doctor</option>
          <option value="Triage">Triage</option>
          <option value="Evac">Evac</option>
        </select>

        {hasPendingRequest('accountType') && (
          <PendingChangeIndicator
            requestedValue={accountTypePendingRequest?.requestedValue}
            requestedAt={accountTypePendingRequest?.requestedAt}
            fieldDisplayName="Account Type"
          />
        )}
      </div>

      {/* Warning Modal */}
      {pendingFieldChange && (
        <AdminApprovalWarningModal
          isOpen={showApprovalModal}
          onClose={() => {
            setShowApprovalModal(false);
            setPendingFieldChange(null);
          }}
          onConfirm={handleConfirmRequest}
          fieldName={pendingFieldChange.fieldName}
          currentValue={pendingFieldChange.currentValue}
          requestedValue={pendingFieldChange.requestedValue}
          isLoading={isCreating}
        />
      )}
    </div>
  );
}
```

## Admin Dashboard Integration

The admin dashboard section is already integrated in `AdminDashboardView.tsx` as the "Profile Update Requests" section with the `ShieldAlert` icon.

Admins can:
- View all pending/approved/denied requests
- Filter and search requests
- Approve or deny with optional notes
- See change history

## API Endpoints

### User Endpoints

- `POST /api/profile-update-requests` - Create new request
- `GET /api/profile-update-requests` - Get user's requests (with optional `?status=pending` filter)

### Admin Endpoints

- `GET /api/admin/profile-update-requests` - Get all requests (with optional `?status=pending` filter)
- `PATCH /api/admin/profile-update-requests/[requestId]` - Approve/deny request
  ```json
  {
    "action": "approve" | "deny",
    "reviewNotes": "Optional notes"
  }
  ```
- `DELETE /api/admin/profile-update-requests/[requestId]` - Delete request

## Database Schema

The `userProfileUpdateRequests` table tracks all requests with:
- User information
- Field being changed
- Current and requested values
- Status (pending/approved/denied)
- Review information (who, when, notes)
- Timestamps

## Best Practices

1. **Always check for pending requests** before showing the modal again
2. **Display pending indicators prominently** so users know their request is in progress
3. **Provide clear feedback** when requests are submitted, approved, or denied
4. **Use the inline indicator** in form labels for minimal UI impact
5. **Use the full indicator** below fields for detailed information

## Adding New Admin-Gated Fields

To add a new field that requires admin approval:

1. Update the schema enum in `userProfileUpdateRequests.ts`:
   ```ts
   export const adminApprovalFieldEnum = pgEnum("admin_approval_field", [
     "doctorSpecialty",
     "accountType",
     "newFieldName", // Add here
   ]);
   ```

2. Add to the validation in API endpoints

3. Add field display name in `ProfileUpdateRequestsViewModel.ts`:
   ```ts
   const displayNames: Record<string, string> = {
     doctorSpecialty: 'Doctor Specialty',
     accountType: 'Account Type',
     newFieldName: 'New Field Display Name',
   };
   ```

4. Update your form to use the approval modal for the new field

## Troubleshooting

### Request not showing as pending
- Ensure you're calling `refetch()` after creating a request
- Check that the request was successfully created in the database
- Verify the QueryClient is properly invalidating queries

### Modal not appearing
- Verify the field name is in the admin-gated fields list
- Check that `showApprovalModal` state is being set to `true`
- Ensure `pendingFieldChange` has the correct structure

### Indicator not showing
- Confirm `hasPendingRequest()` returns `true`
- Check that the pending request has the correct field name
- Verify the component is receiving the correct props

## Database Migration

After creating the schema, run migrations:

```bash
npm run db:generate
npm run db:migrate
```

Or if using Drizzle Kit directly:

```bash
npx drizzle-kit generate
npx drizzle-kit push
```
