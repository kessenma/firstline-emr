# Shared Admin Components Usage Guide

This guide explains how to use the shared components in the admin dashboard.

## Overview

The shared components provide consistent UI patterns across all admin sections:
- **EmptyState**: Display when no data is available
- **ErrorState**: Display when an error occurs
- **LoadingState**: Display while data is loading
- **BulkActionBar**: Perform actions on multiple selected items
- **UserCard**: Display user information consistently
- **ConfirmDialog**: Confirm destructive or important actions

## EmptyState

Display when there's no data to show.

### Basic Usage

```tsx
import { EmptyState } from '../components/admin/shared';
import { Users } from 'lucide-react-native';

<EmptyState
  icon={Users}
  title="No Users Found"
  message="There are no users matching your criteria"
/>
```

### With Action Button

```tsx
<EmptyState
  icon={Users}
  title="No New Signups"
  message="There are no pending user registrations"
  action={
    <Button
      title="Refresh"
      onPress={handleRefresh}
    />
  }
/>
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `title` | `string` | Yes | Main heading |
| `message` | `string` | No | Additional description |
| `icon` | `LucideIcon` | No | Icon to display |
| `action` | `ReactNode` | No | Action button or component |
| `style` | `ViewStyle` | No | Custom container styles |

## ErrorState

Display when an error occurs.

### Basic Usage

```tsx
import { ErrorState } from '../components/admin/shared';

<ErrorState
  message="Failed to load users. Please try again."
  onRetry={handleRetry}
/>
```

### With Custom Title

```tsx
<ErrorState
  title="Network Error"
  message="Unable to connect to the server"
  onRetry={handleRetry}
  retryLabel="Retry Connection"
/>
```

### With Error Details

```tsx
<ErrorState
  message="An error occurred"
  error={error}
  showDetails={__DEV__}  // Only show in development
  onRetry={handleRetry}
/>
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `message` | `string` | Yes | Error message |
| `title` | `string` | No | Error title (default: "Something went wrong") |
| `error` | `Error` | No | Error object for details |
| `showDetails` | `boolean` | No | Show error details (default: false) |
| `onRetry` | `() => void` | No | Retry callback |
| `retryLabel` | `string` | No | Retry button label (default: "Try Again") |
| `style` | `ViewStyle` | No | Custom container styles |

## LoadingState

Display while data is loading.

### Basic Usage

```tsx
import { LoadingState } from '../components/admin/shared';

<LoadingState />
```

### With Custom Message

```tsx
<LoadingState message="Loading users..." />
```

### Full Screen

```tsx
<LoadingState
  message="Initializing..."
  fullScreen
  size="large"
/>
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `message` | `string` | No | Loading message (default: "Loading...") |
| `size` | `'small' \| 'large'` | No | Spinner size (default: 'large') |
| `fullScreen` | `boolean` | No | Full screen mode (default: false) |
| `style` | `ViewStyle` | No | Custom container styles |

## BulkActionBar

Perform actions on multiple selected items.

### Basic Usage

```tsx
import { BulkActionBar } from '../components/admin/shared';

const [selectedIds, setSelectedIds] = useState<string[]>([]);

<BulkActionBar
  selectedCount={selectedIds.length}
  totalCount={users.length}
  actions={[
    {
      label: 'Approve',
      onPress: handleApprove,
      variant: 'primary',
    },
    {
      label: 'Deny',
      onPress: handleDeny,
      variant: 'danger',
    },
  ]}
  onClear={() => setSelectedIds([])}
/>
```

### With Disabled Actions

```tsx
<BulkActionBar
  selectedCount={selectedIds.length}
  actions={[
    {
      label: 'Approve',
      onPress: handleApprove,
      variant: 'primary',
      disabled: !hasPermission,
    },
  ]}
  onClear={() => setSelectedIds([])}
/>
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `selectedCount` | `number` | Yes | Number of selected items |
| `totalCount` | `number` | No | Total number of items |
| `actions` | `BulkAction[]` | Yes | Array of actions |
| `onClear` | `() => void` | Yes | Clear selection callback |
| `style` | `ViewStyle` | No | Custom container styles |

### BulkAction Type

```typescript
interface BulkAction {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}
```

## UserCard

Display user information consistently.

### Basic Usage

```tsx
import { UserCard } from '../components/admin/shared';

<UserCard
  user={user}
  onPress={() => handleViewUser(user.id)}
/>
```

### With Selection

```tsx
const [selectedIds, setSelectedIds] = useState<string[]>([]);

<UserCard
  user={user}
  showCheckbox
  selected={selectedIds.includes(user.id)}
  onSelect={(selected) => {
    if (selected) {
      setSelectedIds([...selectedIds, user.id]);
    } else {
      setSelectedIds(selectedIds.filter(id => id !== user.id));
    }
  }}
/>
```

### With Actions

```tsx
<UserCard
  user={user}
  actions={
    <>
      <Button
        title="Approve"
        onPress={() => handleApprove(user.id)}
      />
      <Button
        title="Deny"
        onPress={() => handleDeny(user.id)}
        variant="danger"
      />
    </>
  }
/>
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `user` | `User` | Yes | User object |
| `onPress` | `() => void` | No | Card press callback |
| `selected` | `boolean` | No | Selection state |
| `onSelect` | `(selected: boolean) => void` | No | Selection callback |
| `showCheckbox` | `boolean` | No | Show selection checkbox |
| `actions` | `ReactNode` | No | Action buttons |
| `style` | `ViewStyle` | No | Custom container styles |

### User Type

```typescript
interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  accountType?: string;
  city?: string;
  countries?: string[];
  doctorSpecialty?: string[];
  approvalDate?: string | Date;
  authorized?: boolean;
}
```

## ConfirmDialog

Confirm destructive or important actions.

### Basic Usage

```tsx
import { ConfirmDialog } from '../components/admin/shared';

const [showDialog, setShowDialog] = useState(false);

<ConfirmDialog
  visible={showDialog}
  title="Confirm Deletion"
  message="Are you sure you want to delete this user? This action cannot be undone."
  variant="danger"
  onConfirm={() => {
    handleDelete();
    setShowDialog(false);
  }}
  onCancel={() => setShowDialog(false)}
/>
```

### With Custom Labels

```tsx
<ConfirmDialog
  visible={showDialog}
  title="Approve User"
  message="Approve this user registration?"
  variant="success"
  confirmLabel="Approve"
  cancelLabel="Cancel"
  onConfirm={handleApprove}
  onCancel={() => setShowDialog(false)}
/>
```

### With Loading State

```tsx
const [loading, setLoading] = useState(false);

<ConfirmDialog
  visible={showDialog}
  title="Delete User"
  message="This will permanently delete the user"
  variant="danger"
  loading={loading}
  onConfirm={async () => {
    setLoading(true);
    await handleDelete();
    setLoading(false);
    setShowDialog(false);
  }}
  onCancel={() => setShowDialog(false)}
/>
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `visible` | `boolean` | Yes | Dialog visibility |
| `title` | `string` | Yes | Dialog title |
| `message` | `string` | Yes | Dialog message |
| `variant` | `'danger' \| 'warning' \| 'info' \| 'success'` | No | Visual variant (default: 'warning') |
| `confirmLabel` | `string` | No | Confirm button label (default: 'Confirm') |
| `cancelLabel` | `string` | No | Cancel button label (default: 'Cancel') |
| `onConfirm` | `() => void` | Yes | Confirm callback |
| `onCancel` | `() => void` | Yes | Cancel callback |
| `loading` | `boolean` | No | Loading state (default: false) |

## Complete Example

Here's a complete example using multiple shared components:

```tsx
import React, { useState, useEffect } from 'react';
import { View, FlatList, Button } from 'react-native';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  BulkActionBar,
  UserCard,
  ConfirmDialog,
} from '../components/admin/shared';
import { Users } from 'lucide-react-native';

function NewSignupsView() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showDenyDialog, setShowDenyDialog] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchNewSignups();
      setUsers(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    await approveUsers(selectedIds);
    setSelectedIds([]);
    setShowApproveDialog(false);
    loadUsers();
  };

  const handleDeny = async () => {
    await denyUsers(selectedIds);
    setSelectedIds([]);
    setShowDenyDialog(false);
    loadUsers();
  };

  if (loading) {
    return <LoadingState message="Loading new signups..." />;
  }

  if (error) {
    return (
      <ErrorState
        message="Failed to load new signups"
        error={error}
        onRetry={loadUsers}
      />
    );
  }

  if (users.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No New Signups"
        message="There are no pending user registrations"
        action={
          <Button title="Refresh" onPress={loadUsers} />
        }
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <UserCard
            user={item}
            showCheckbox
            selected={selectedIds.includes(item.id)}
            onSelect={(selected) => {
              if (selected) {
                setSelectedIds([...selectedIds, item.id]);
              } else {
                setSelectedIds(selectedIds.filter(id => id !== item.id));
              }
            }}
          />
        )}
      />

      <BulkActionBar
        selectedCount={selectedIds.length}
        totalCount={users.length}
        actions={[
          {
            label: 'Approve',
            onPress: () => setShowApproveDialog(true),
            variant: 'primary',
          },
          {
            label: 'Deny',
            onPress: () => setShowDenyDialog(true),
            variant: 'danger',
          },
        ]}
        onClear={() => setSelectedIds([])}
      />

      <ConfirmDialog
        visible={showApproveDialog}
        title="Approve Users"
        message={`Approve ${selectedIds.length} user(s)?`}
        variant="success"
        confirmLabel="Approve"
        onConfirm={handleApprove}
        onCancel={() => setShowApproveDialog(false)}
      />

      <ConfirmDialog
        visible={showDenyDialog}
        title="Deny Users"
        message={`Deny ${selectedIds.length} user(s)? They will need to re-register.`}
        variant="danger"
        confirmLabel="Deny"
        onConfirm={handleDeny}
        onCancel={() => setShowDenyDialog(false)}
      />
    </View>
  );
}
```

## Best Practices

1. **Use EmptyState for all empty data scenarios** - Provides consistent UX
2. **Always provide retry for ErrorState** - Let users recover from errors
3. **Show LoadingState during async operations** - Prevent user confusion
4. **Use BulkActionBar for multi-select** - Consistent bulk action UX
5. **Use UserCard for all user displays** - Maintains visual consistency
6. **Always confirm destructive actions** - Use ConfirmDialog with 'danger' variant
7. **Provide clear messages** - Help users understand what's happening
8. **Use appropriate variants** - Match visual style to action severity

## Accessibility

All components include:
- Proper touch targets (minimum 44x44)
- Clear visual feedback
- Theme color support
- Readable text sizes
- Appropriate contrast ratios
