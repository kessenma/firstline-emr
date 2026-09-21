# Notification Architecture - Complete Guide

## Overview

The system uses **two separate notification systems** with different purposes and architectures.

## 🎨 Visual Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NOTIFICATION SYSTEMS                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────┐  ┌────────────────────────────────────┐
│   ADMIN BROADCAST NOTIFICATIONS   │  │   TARGETED USER NOTIFICATIONS      │
│         (adminNotifications)      │  │  (notifications + userNotifications)│
└───────────────────────────────────┘  └────────────────────────────────────┘

        BROADCAST STYLE                        TARGETED STYLE
              ↓                                       ↓
                                                      
   ┌─────────────────────┐              ┌─────────────────────────┐
   │  adminNotifications │              │     notifications        │
   ├─────────────────────┤              │  (central record)        │
   │ • id                │              ├─────────────────────────┤
   │ • senderId          │              │ • id                    │
   │ • message           │              │ • message               │
   │ • type              │              │ • type                  │
   │ • emailSent         │              │ • subject               │
   │ • createdAt         │              │ • sourceId              │
   └─────────────────────┘              │ • patientId             │
            ↓                           │ • redirectTo            │
   Sent to ALL users                    │ • createdAt             │
   (no per-user tracking)               └─────────────────────────┘
                                                    ↓
                                        ┌─────────────────────────┐
                                        │   userNotifications      │
                                        │  (per-user delivery)     │
                                        ├─────────────────────────┤
                                        │ • id                    │
                                        │ • userId ────→ User     │
                                        │ • notificationId ───┐   │
                                        │ • read              │   │
                                        │ • readAt            │   │
                                        │ • dismissed         │   │
                                        │ • methods[]         │   │
                                        │ • emailAddress      │   │
                                        └─────────────────────┘   │
                                                    ↓             │
                                        ┌─────────────────────────┘
                                        │
                                        ↓
                                ┌─────────────────────────┐
                                │ notificationRecipients   │
                                │  (intended recipients)   │
                                ├─────────────────────────┤
                                │ • id                    │
                                │ • notificationId        │
                                │ • userId                │
                                └─────────────────────────┘


EXAMPLE FLOWS:

Admin Broadcast:
┌──────────┐         ┌─────────────────┐         ┌──────────────┐
│  Admin   │ ─────→  │ adminNotification│ ─────→  │ All Doctors/ │
│  Sends   │         │     Record       │         │   Triage     │
└──────────┘         └─────────────────┘         └──────────────┘
                            (1 record)            (email to all)


Targeted Notification:
┌──────────┐    ┌────────────┐    ┌──────────────┐    ┌──────────┐
│ Profile  │───→│notification│───→│userNotification│──→│Each Admin│
│ Request  │    │  (1 record)│    │  (N records)   │   │ Sees It  │
└──────────┘    └────────────┘    └──────────────┘    └──────────┘
```

## 🎯 Two Notification Systems

### 1. Admin Broadcast Notifications (adminNotifications)
**Purpose**: System-wide announcements from admins to all users

**Use Cases**:
- System maintenance announcements
- General alerts to all doctors/triage
- Policy updates
- Emergency notifications

**Architecture**: Single table, broadcast style
```
adminNotifications
├── id
├── senderId (admin who sent it)
├── message
├── type (announcement, alert, reminder)
├── emailSent (boolean)
└── createdAt
```

**Characteristics**:
- ✅ One record for all recipients
- ✅ No per-user read tracking
- ✅ Email sent to doctors/triage groups
- ✅ Appears in admin notifications section
- ❌ No individual user read status
- ❌ Not shown in user notification center

**Example**: "System maintenance scheduled for Friday 10 PM"

---

### 2. Targeted User Notifications (notifications + userNotifications)
**Purpose**: Individual, actionable notifications with per-user tracking

**Use Cases**:
- Profile update request notifications
- Profile update approved/denied notifications
- Patient assignment notifications
- Medical order notifications
- Task assignments
- Personal alerts

**Architecture**: Central + Junction tables
```
notifications (central record)
├── id
├── message
├── type
├── subject
├── sourceId
├── patientId
├── redirectTo
└── createdAt

userNotifications (per-user delivery)
├── id
├── userId (who receives it)
├── notificationId (links to notifications)
├── read (boolean)
├── readAt
├── dismissed
├── dismissedAt
├── methods (array: ['in-app', 'email'])
├── emailAddress
└── createdAt

notificationRecipients (intended recipients)
├── id
├── notificationId
├── userId
└── createdAt
```

**Characteristics**:
- ✅ One central notification record
- ✅ Individual userNotification records per recipient
- ✅ Per-user read/dismiss tracking
- ✅ Targeted delivery (specific users)
- ✅ Actionable (has redirectTo URL)
- ✅ Shows in user notification center
- ✅ Email address per user
- ✅ Delivery method tracking

**Example**: "Your request to update Doctor Specialty has been approved by Admin User"

---

## 📊 Comparison Table

| Feature | Admin Notifications | Targeted Notifications |
|---------|-------------------|----------------------|
| **Table(s)** | `adminNotifications` | `notifications` + `userNotifications` + `notificationRecipients` |
| **Recipients** | Broadcast (all doctors/triage) | Specific users |
| **Read Tracking** | No | Yes, per user |
| **Actionable** | No | Yes (redirectTo URL) |
| **User Notification Center** | No | Yes |
| **Email Delivery** | Group email | Individual emails |
| **Dismiss** | No | Yes |
| **Use Case** | Announcements | Actions & Updates |

---

## 🎨 Notification Types

### Admin Broadcast Types (adminNotificationTypeEnum)
```typescript
- "announcement" // General announcements
- "alert"        // Important alerts
- "reminder"     // System reminders
```

### Targeted Notification Types (notificationTypeEnum)
```typescript
- "message"                    // General message
- "alert"                      // Important alert
- "profile_update_request"     // User requested profile change
- "profile_update_approved"    // Admin approved profile change
- "profile_update_denied"      // Admin denied profile change
- "patient_update"             // Patient-related update
- "system_notification"        // System-generated notification
```

---

## 🔄 Data Flow

### Admin Broadcast Flow
```
Admin creates notification
    ↓
Saved to adminNotifications table
    ↓
Email sent to all doctors/triage
    ↓
Visible in admin notifications history
    ↓
No user-specific tracking
```

### Targeted Notification Flow
```
Event triggers notification (e.g., profile update request)
    ↓
Create central notification record
    ↓
Create userNotification for each recipient
    ↓
Create notificationRecipients records
    ↓
User sees in notification center
    ↓
User clicks → marks as read
    ↓
User can dismiss
```

---

## 📁 File Locations

### Admin Broadcast Notifications
**Schema**: `apps/web/db/schema/adminNotifications.ts`
**View**: `apps/web/components/adminDashboard/sections/notifications/AdminNotificationsView.tsx`
**ViewModel**: `apps/web/components/adminDashboard/sections/notifications/AdminNotificationsViewModel.tsx`
**API**: `apps/web/app/api/notifications/admin/route.ts`

### Targeted User Notifications
**Schema**: `apps/web/db/schema/notifications.ts`
**Service**: `apps/web/lib/notifications/profileUpdateNotifications.ts`
**API**: Various endpoints that trigger notifications

---

## 🔧 When to Use Each System

### Use Admin Broadcast Notifications When:
- ✅ Message applies to ALL doctors/triage
- ✅ No individual action needed
- ✅ No need to track who read it
- ✅ General announcement or alert
- ✅ System-wide communication

**Examples**:
- "System will be down for maintenance Friday 10 PM"
- "New protocol for patient intake effective immediately"
- "Reminder: Submit monthly reports by end of day"

### Use Targeted Notifications When:
- ✅ Message is for specific users
- ✅ Action required (click to view, approve, etc.)
- ✅ Need to track read status
- ✅ Need to link to specific resource
- ✅ Part of a workflow (requests, approvals, etc.)
- ✅ Want per-user delivery tracking

**Examples**:
- "John Doe requested to change their specialty"
- "Your profile update request has been approved"
- "New patient assigned to you"
- "Medical order requires your attention"

---

## 💻 Implementation Examples

### Sending Admin Broadcast Notification
```typescript
// Via AdminNotificationsView
await fetch('/api/notifications/admin', {
  method: 'POST',
  body: JSON.stringify({
    message: 'System maintenance tonight',
    type: 'announcement',
    notifyDoctors: true,
    notifyTriage: true,
  })
});

// Result: One adminNotifications record
// Emails sent to all doctors/triage
```

### Sending Targeted Notification
```typescript
// Via notification service
import { notifyAdminsOfProfileUpdateRequest } from '@/lib/notifications/profileUpdateNotifications';

await notifyAdminsOfProfileUpdateRequest({
  userId: 'user-123',
  userEmail: 'user@example.com',
  userName: 'John Doe',
  fieldName: 'doctorSpecialty',
  requestedValue: ['Neurology'],
  requestId: 'request-456'
});

// Result:
// - One notifications record
// - Multiple userNotifications (one per admin)
// - Multiple notificationRecipients records
// - Each admin sees in their notification center
```

---

## 🗄️ Database Relationships

### Admin Broadcast (Simple)
```
adminNotifications
    ↓
senderId → users.id
```

### Targeted Notifications (Complex)
```
notifications (1)
    ↓
    ├─→ userNotifications (many)
    │       ↓
    │   userId → users.id
    │
    └─→ notificationRecipients (many)
            ↓
        userId → users.id
```

---

## 🎯 Profile Update Notifications (Your Current Use Case)

The profile update request system uses **Targeted Notifications** because:

1. **Specific Recipients**: Only admins receive request notifications
2. **Actionable**: Clicking navigates to specific request
3. **Two-Way**: User gets notified of admin's decision
4. **Tracked**: Know if admin has seen the request
5. **Personal**: User's approval/denial is individual

**Flow**:
```
User requests profile update
    ↓
Targeted notification to ALL admins
    ├─> notifications: 1 record
    └─> userNotifications: N records (one per admin)
    
Admin approves/denies
    ↓
Targeted notification to requesting user
    ├─> notifications: 1 record
    └─> userNotifications: 1 record (for user)
```

---

## 🚀 Migration Impact

When you run the migration for profile update notifications:

**adminNotifications table**: No changes
**notifications table**: No changes (already exists)
**userNotifications table**: 
- ✅ Add `methods` column (text array)
- ✅ Add `emailAddress` column (varchar)
**notificationTypeEnum**:
- ✅ Add `profile_update_request`
- ✅ Add `profile_update_approved`
- ✅ Add `profile_update_denied`

Your admin broadcast system remains untouched and continues working!

---

## 📚 Best Practices

### For Admin Broadcasts
```typescript
// ✅ Good
"System maintenance scheduled for Friday 10 PM"
"New policy: All prescriptions must be reviewed within 24h"

// ❌ Bad (use targeted instead)
"Dr. Smith, please review patient #123"
"Your profile update request was approved"
```

### For Targeted Notifications
```typescript
// ✅ Good
"Your request to update Doctor Specialty has been approved"
"New patient assigned: John Doe (#12345)"
"Admin Jane reviewed your profile change request"

// ❌ Bad (use admin broadcast instead)
"System maintenance tonight"
"Reminder to all doctors: Submit reports"
```

---

## 🔮 Future Enhancements

### Admin Broadcasts
- [ ] Schedule notifications for future delivery
- [ ] Templates for common announcements
- [ ] Rich text formatting
- [ ] Attachments
- [ ] Read receipts (if needed)

### Targeted Notifications
- [x] Profile update notifications ✅
- [ ] Patient assignment notifications
- [ ] Medical order notifications
- [ ] Task assignment notifications
- [ ] Email delivery service
- [ ] Push notifications
- [ ] SMS notifications
- [ ] Notification preferences per user

---

## 🎓 Summary

- **adminNotifications**: Broadcast, simple, no tracking, for announcements
- **notifications + userNotifications**: Targeted, tracked, actionable, for workflows

Both systems coexist perfectly and serve different purposes. Your current implementation is **correct** and follows good database design patterns!

The profile update notification system I created uses the **targeted** approach, which is appropriate for this use case.

---

**Questions?** See:
- [PROFILE_UPDATE_NOTIFICATIONS.md](./PROFILE_UPDATE_NOTIFICATIONS.md) - Profile update notification details
- [SYSTEM_SUMMARY.md](./SYSTEM_SUMMARY.md) - Complete system overview