# Admin Accordion Usage Guide

This guide explains how to use the AdminAccordion component in the mobile admin dashboard.

## Overview

The `AdminAccordion` component is an enhanced version of the base Accordion component with admin-specific features:
- Icon support with Lucide icons
- Search term highlighting
- Loading states
- Badges for counts/notifications
- Subtitles for additional context
- Disabled states
- Single or multiple section expansion

## Basic Usage

```tsx
import { AdminAccordion, AdminAccordionItem } from '../components/admin/AdminAccordion';
import { Users, Settings } from 'lucide-react-native';

function AdminDashboard() {
  return (
    <AdminAccordion>
      <AdminAccordionItem
        id="users"
        title="User Management"
        icon={Users}
      >
        <Text>User management content here</Text>
      </AdminAccordionItem>
      
      <AdminAccordionItem
        id="settings"
        title="Settings"
        icon={Settings}
      >
        <Text>Settings content here</Text>
      </AdminAccordionItem>
    </AdminAccordion>
  );
}
```

## Features

### 1. Icons

Add Lucide icons to accordion headers:

```tsx
import { Users, ShieldCheck, Bell } from 'lucide-react-native';

<AdminAccordionItem
  id="users"
  title="User Management"
  icon={Users}
>
  {/* Content */}
</AdminAccordionItem>
```

### 2. Badges

Display counts or notifications:

```tsx
<AdminAccordionItem
  id="newSignups"
  title="New Signups"
  icon={Users}
  badge={12}
>
  {/* Content */}
</AdminAccordionItem>
```

### 3. Subtitles

Add additional context below the title:

```tsx
<AdminAccordionItem
  id="users"
  title="User Management"
  subtitle="Manage doctors, triage, and evac users"
  icon={Users}
>
  {/* Content */}
</AdminAccordionItem>
```

### 4. Search Highlighting

Highlight search terms in titles:

```tsx
const [searchTerm, setSearchTerm] = useState('');

<AdminAccordionItem
  id="users"
  title="User Management"
  searchTerm={searchTerm}
>
  {/* Content */}
</AdminAccordionItem>
```

### 5. Loading States

Show loading indicator instead of chevron:

```tsx
<AdminAccordionItem
  id="users"
  title="User Management"
  loading={isLoading}
>
  {/* Content */}
</AdminAccordionItem>
```

### 6. Disabled State

Prevent interaction:

```tsx
<AdminAccordionItem
  id="users"
  title="User Management"
  disabled={!hasPermission}
>
  {/* Content */}
</AdminAccordionItem>
```

## Advanced Usage

### Multiple Sections Open

Allow multiple sections to be open simultaneously:

```tsx
<AdminAccordion allowMultiple>
  <AdminAccordionItem id="section1" title="Section 1">
    {/* Content */}
  </AdminAccordionItem>
  <AdminAccordionItem id="section2" title="Section 2">
    {/* Content */}
  </AdminAccordionItem>
</AdminAccordion>
```

### Default Open Section

Open a specific section by default:

```tsx
<AdminAccordion defaultOpenId="newSignups">
  <AdminAccordionItem id="newSignups" title="New Signups">
    {/* Content */}
  </AdminAccordionItem>
  <AdminAccordionItem id="existing" title="Existing Users">
    {/* Content */}
  </AdminAccordionItem>
</AdminAccordion>
```

### Section Change Callback

Track which section is open:

```tsx
const handleSectionChange = (openId: string | null) => {
  console.log('Open section:', openId);
  // Update analytics, scroll to section, etc.
};

<AdminAccordion onSectionChange={handleSectionChange}>
  {/* Items */}
</AdminAccordion>
```

### Custom Styling

Apply custom styles to header and content:

```tsx
<AdminAccordionItem
  id="users"
  title="User Management"
  headerStyle={{
    backgroundColor: '#f0f0f0',
    paddingVertical: 20,
  }}
  contentStyle={{
    paddingHorizontal: 24,
  }}
  titleStyle={{
    fontSize: 18,
    fontWeight: 'bold',
  }}
>
  {/* Content */}
</AdminAccordionItem>
```

## Complete Example

```tsx
import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView } from 'react-native';
import { AdminAccordion, AdminAccordionItem } from '../components/admin/AdminAccordion';
import {
  Users,
  UserCheck,
  UserX,
  ShieldCheck,
  RotateCcw,
  Bell,
} from 'lucide-react-native';

function AdminDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingSections, setLoadingSections] = useState<string[]>([]);

  const sections = [
    {
      id: 'newSignups',
      title: 'New Signups',
      subtitle: 'Approve or deny new user registrations',
      icon: Users,
      badge: 12,
    },
    {
      id: 'existing',
      title: 'Existing Users',
      subtitle: 'Manage active users',
      icon: UserCheck,
      badge: 156,
    },
    {
      id: 'denied',
      title: 'Denied Users',
      subtitle: 'Review denied registrations',
      icon: UserX,
      badge: 3,
    },
    {
      id: 'admins',
      title: 'Admin Management',
      subtitle: 'Add or remove admin privileges',
      icon: ShieldCheck,
    },
    {
      id: 'password',
      title: 'Password Reset',
      subtitle: 'Generate password reset links',
      icon: RotateCcw,
    },
    {
      id: 'notifications',
      title: 'Notifications',
      subtitle: 'Send notifications to users',
      icon: Bell,
    },
  ];

  const filteredSections = sections.filter(section =>
    section.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ScrollView>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
          Admin Dashboard
        </Text>

        <TextInput
          placeholder="Search sections..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          style={{
            padding: 12,
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 8,
            marginBottom: 16,
          }}
        />

        <AdminAccordion defaultOpenId="newSignups">
          {filteredSections.map(section => (
            <AdminAccordionItem
              key={section.id}
              id={section.id}
              title={section.title}
              subtitle={section.subtitle}
              icon={section.icon}
              badge={section.badge}
              searchTerm={searchTerm}
              loading={loadingSections.includes(section.id)}
            >
              <Text>Content for {section.title}</Text>
            </AdminAccordionItem>
          ))}
        </AdminAccordion>

        {filteredSections.length === 0 && (
          <Text style={{ textAlign: 'center', marginTop: 32, color: '#666' }}>
            No sections match your search
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
```

## Props Reference

### AdminAccordionItem Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | Required | Unique identifier for the section |
| `title` | `string` | Required | Section title |
| `children` | `ReactNode` | Required | Section content |
| `isOpen` | `boolean` | `false` | Controlled open state |
| `onToggle` | `() => void` | - | Callback when toggled |
| `icon` | `LucideIcon` | - | Icon component from lucide-react-native |
| `headerStyle` | `ViewStyle` | - | Custom header styles |
| `contentStyle` | `ViewStyle` | - | Custom content styles |
| `titleStyle` | `TextStyle` | - | Custom title text styles |
| `disabled` | `boolean` | `false` | Disable interaction |
| `loading` | `boolean` | `false` | Show loading indicator |
| `badge` | `string \| number` | - | Badge content (count, notification) |
| `searchTerm` | `string` | - | Term to highlight in title |
| `subtitle` | `string` | - | Additional text below title |

### AdminAccordion Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | Required | AdminAccordionItem components |
| `allowMultiple` | `boolean` | `false` | Allow multiple sections open |
| `style` | `ViewStyle` | - | Custom container styles |
| `defaultOpenId` | `string` | - | ID of section to open by default |
| `onSectionChange` | `(id: string \| null) => void` | - | Callback when open section changes |

## Best Practices

1. **Use meaningful IDs**: Section IDs should be descriptive and unique
2. **Provide icons**: Icons help users quickly identify sections
3. **Use badges for counts**: Show pending items or notifications
4. **Add subtitles for clarity**: Help users understand what each section contains
5. **Implement search**: Filter sections based on user input
6. **Handle loading states**: Show loading indicators during data fetches
7. **Disable when appropriate**: Disable sections based on permissions
8. **Single expansion by default**: Only allow multiple open sections when it makes sense

## Accessibility

The component includes:
- Proper touch targets (minimum 44x44)
- Smooth animations
- Clear visual feedback
- Support for theme colors
- Disabled state styling

## Performance

- Uses `LayoutAnimation` for smooth transitions
- Implements `useNativeDriver` for animations
- Efficiently handles search highlighting
- Minimal re-renders with proper memoization
