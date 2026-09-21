# Messaging Helpers Quick Reference

A comprehensive guide to the messaging helper functions for PostgreSQL-based messaging.

---

## 📚 Table of Contents

- [Internal Messages Helpers](#internal-messages-helpers)
- [Patient Messages Helpers](#patient-messages-helpers)
- [Common Patterns](#common-patterns)
- [Examples](#examples)

---

## Internal Messages Helpers

**Import:**
```typescript
import {
  slugify,
  titleFromSlug,
  getOrCreateInternalThreadByTitle,
  getInternalThreadsForUser,
  getInternalThreadById,
  getInternalThreadBySlug,
  addMessageToInternalThread,
  markInternalThreadAsRead,
  getThreadParticipantsWithUserData,
  getUserIdsByAccountTypeAndSpecialty,
  ensureDefaultInternalGroupsForUser,
  getFormattedInternalThreadsForUser,
} from "@/lib/internal-messages-helpers";
```

### Utility Functions

#### `slugify(title: string): string`
Convert a title to a URL-friendly slug.

```typescript
slugify("All Doctors") // "all-doctors"
slugify("Specialty: Cardiology") // "specialty-cardiology"
```

#### `titleFromSlug(slug: string): string | null`
Convert a slug back to its original title.

```typescript
titleFromSlug("all-doctors") // "All Doctors"
titleFromSlug("specialty-cardiology") // "Specialty: Cardiology"
```

### Thread Management

#### `getOrCreateInternalThreadByTitle()`
Get an existing thread or create a new one.

```typescript
const thread = await getOrCreateInternalThreadByTitle(
  "All Doctors",           // title
  ["user-id-1", "user-id-2"], // participant IDs
  "creator-user-id",       // created by
  true                     // is group chat
);
```

#### `getInternalThreadsForUser()`
Fetch all internal threads for a user.

```typescript
const threads = await getInternalThreadsForUser(
  "user-id",  // user ID
  50          // limit (default: 50)
);
```

#### `getInternalThreadById()`
Get a specific thread with automatic auth check.

```typescript
const thread = await getInternalThreadById(
  "thread-id",  // thread ID
  "user-id"     // user ID (for auth check)
);
// Returns null if thread not found or user not a participant
```

#### `getInternalThreadBySlug()`
Get a thread by its slug with auth check.

```typescript
const thread = await getInternalThreadBySlug(
  "all-doctors",  // slug
  "user-id"       // user ID (for auth check)
);
```

### Messaging

#### `addMessageToInternalThread()`
Post a new message to a thread.

```typescript
const message = await addMessageToInternalThread(
  "thread-id",
  {
    text: "Hello everyone!",
    sender: "Dr. John Doe",
    senderId: "user-id",
    type: "text",           // optional: 'text' | 'image' | 'audio' | etc.
    mediaUrl: "",           // optional
    replyTo: "message-id",  // optional
    forwardedFrom: "",      // optional
  }
);
```

**Returns:** `InternalMessage` object with generated ID and timestamp.

#### `markInternalThreadAsRead()`
Mark a thread as read for a user.

```typescript
const result = await markInternalThreadAsRead(
  "thread-id",
  "user-id"
);
// Returns: { success: true, previousUnread: 5 }
```

**Throws:**
- `"Thread not found"` if thread doesn't exist
- `"Unauthorized: Not a participant in this thread"` if user not in thread

### Participants

#### `getThreadParticipantsWithUserData()`
Fetch detailed user data for participants.

```typescript
const participants = await getThreadParticipantsWithUserData(
  ["user-id-1", "user-id-2", "user-id-3"]
);

// Returns array of:
// {
//   id: string,
//   firstName: string,
//   lastName: string,
//   email: string,
//   image: string,
//   accountType: "Doctor" | "Triage" | "Evac",
//   doctorSpecialty: string[]
// }
```

#### `getUserIdsByAccountTypeAndSpecialty()`
Filter users by account type and optional specialty.

```typescript
// Get all doctors
const doctorIds = await getUserIdsByAccountTypeAndSpecialty(
  ["Doctor"]
);

// Get all cardiology doctors
const cardiologyIds = await getUserIdsByAccountTypeAndSpecialty(
  ["Doctor"],
  "Cardiology"
);

// Get all doctors and triage staff
const allStaffIds = await getUserIdsByAccountTypeAndSpecialty(
  ["Doctor", "Triage"]
);
```

### Group Management

#### `ensureDefaultInternalGroupsForUser()`
Auto-create default group chats for a user based on their role.

```typescript
await ensureDefaultInternalGroupsForUser(
  "user-id",
  "Doctor",                    // account type
  ["Cardiology", "Neurology"]  // specialties
);

// Creates/updates:
// - "All Triage and Doctors"
// - "All Doctors" (if Doctor)
// - "Specialty: Cardiology"
// - "Specialty: Neurology"
```

#### `getFormattedInternalThreadsForUser()`
Get threads formatted for API response.

```typescript
const threads = await getFormattedInternalThreadsForUser(
  "user-id",
  50  // limit
);

// Returns formatted array with:
// - _id (for compatibility)
// - participants
// - unreadCount
// - messages (last message only)
// - title
// - slug
// - type ("internal")
// - isGroupChat
// - lastActivity
```

---

## Patient Messages Helpers

**Import:**
```typescript
import {
  getTelegramThreadsForUser,
  getTelegramThreadById,
  getTelegramThreadByChatId,
  createOrUpdateTelegramThread,
  addMessageToTelegramThread,
  markTelegramThreadAsRead,
  getOrCreateUserMessages,
  getTotalUnreadCountForUser,
  incrementUserUnreadCount,
  decrementUserUnreadCount,
  addParticipantToTelegramThread,
  removeParticipantFromTelegramThread,
  archiveTelegramThread,
  unarchiveTelegramThread,
} from "@/lib/patient-messages-helpers";
```

### Thread Management

#### `getTelegramThreadsForUser()`
Fetch all active telegram threads for a user.

```typescript
const threads = await getTelegramThreadsForUser(
  "user-id",
  20  // limit (default: 20)
);
```

#### `getTelegramThreadById()`
Get a specific thread with auth check.

```typescript
const thread = await getTelegramThreadById(
  "thread-id",
  "user-id"  // for auth check
);
// Returns null if not found or unauthorized
```

#### `getTelegramThreadByChatId()`
Look up a thread by Telegram chat ID.

```typescript
const thread = await getTelegramThreadByChatId(
  "123456789"  // Telegram chat ID
);
```

#### `createOrUpdateTelegramThread()`
Create a new thread or update existing one.

```typescript
const thread = await createOrUpdateTelegramThread(
  "123456789",  // chat ID
  {
    patientId: "patient-uuid",           // optional
    participants: ["user-id-1"],         // optional
    status: "active"                     // optional: "active" | "archived"
  }
);
```

### Messaging

#### `addMessageToTelegramThread()`
Post a new message to a telegram thread.

```typescript
const message = await addMessageToTelegramThread(
  "thread-id",
  {
    text: "Hello patient",
    sender: "Dr. Smith",
    senderId: "user-id",    // or null for patient messages
    type: "text",           // optional
    mediaUrl: "",           // optional
    replyTo: "",            // optional
    forwardedFrom: ""       // optional
  }
);
```

#### `markTelegramThreadAsRead()`
Mark a telegram thread as read (updates both thread and user totals).

```typescript
const result = await markTelegramThreadAsRead(
  "thread-id",
  "user-id"
);
// Returns: { success: true, previousUnread: 3 }
// Also decrements user's total unread count
```

### Unread Count Management

#### `getOrCreateUserMessages()`
Get or create a user messages tracking record.

```typescript
const userMessages = await getOrCreateUserMessages("user-id");
// Returns: { id, userId, lastReadAt, unreadCount, createdAt, updatedAt }
```

#### `getTotalUnreadCountForUser()`
Get total unread count across all threads.

```typescript
const count = await getTotalUnreadCountForUser("user-id");
// Returns: number
```

#### `incrementUserUnreadCount()`
Increase user's total unread count.

```typescript
await incrementUserUnreadCount(
  "user-id",
  5  // increment by (default: 1)
);
```

#### `decrementUserUnreadCount()`
Decrease user's total unread count.

```typescript
await decrementUserUnreadCount(
  "user-id",
  5  // decrement by (default: 1)
);
```

### Participant Management

#### `addParticipantToTelegramThread()`
Add a user to a thread.

```typescript
await addParticipantToTelegramThread(
  "thread-id",
  "user-id"
);
```

#### `removeParticipantFromTelegramThread()`
Remove a user from a thread.

```typescript
await removeParticipantFromTelegramThread(
  "thread-id",
  "user-id"
);
```

### Archive Management

#### `archiveTelegramThread()`
Archive a thread.

```typescript
await archiveTelegramThread("thread-id");
```

#### `unarchiveTelegramThread()`
Unarchive a thread.

```typescript
await unarchiveTelegramThread("thread-id");
```

---

## Common Patterns

### Pattern 1: List User's Threads

**Internal Messages:**
```typescript
// Ensure groups exist first
await ensureDefaultInternalGroupsForUser(userId, accountType, specialties);

// Get formatted threads
const threads = await getFormattedInternalThreadsForUser(userId, 50);
```

**Patient Messages:**
```typescript
const threads = await getTelegramThreadsForUser(userId, 20);
```

### Pattern 2: Get Thread Details with Participants

```typescript
// Get thread
const thread = await getInternalThreadById(threadId, userId);
if (!thread) {
  throw new Error("Thread not found");
}

// Get participant details
const participants = await getThreadParticipantsWithUserData(
  thread.participants || []
);

// Return combined data
return { thread, participants };
```

### Pattern 3: Post Message and Update Counts

**Internal Messages:**
```typescript
const message = await addMessageToInternalThread(threadId, {
  text: "New message",
  sender: "Dr. Smith",
  senderId: userId,
  type: "text"
});
// Unread count auto-incremented
```

**Patient Messages:**
```typescript
const message = await addMessageToTelegramThread(threadId, {
  text: "Patient reply",
  sender: "Patient Name",
  senderId: null,  // null for patient messages
  type: "text"
});
// Thread unread count auto-incremented
// User unread count should be incremented separately if needed
```

### Pattern 4: Mark as Read

**Internal Messages:**
```typescript
try {
  const result = await markInternalThreadAsRead(threadId, userId);
  console.log(`Marked ${result.previousUnread} messages as read`);
} catch (error) {
  if (error.message === "Thread not found") {
    // Handle not found
  } else if (error.message.includes("Unauthorized")) {
    // Handle unauthorized
  }
}
```

**Patient Messages:**
```typescript
const result = await markTelegramThreadAsRead(threadId, userId);
// Both thread and user total unread counts updated
```

### Pattern 5: Create Specialty Group

```typescript
// Get all doctors in specialty
const memberIds = await getUserIdsByAccountTypeAndSpecialty(
  ["Doctor"],
  "Cardiology"
);

// Create/update thread
const thread = await getOrCreateInternalThreadByTitle(
  "Specialty: Cardiology",
  memberIds,
  creatorId,
  true
);
```

---

## Examples

### Example 1: Internal Messaging Endpoint

```typescript
// GET /api/internal-messages
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const accountType = session.user.accountType || "";
  const specialties = session.user.doctorSpecialty || [];

  try {
    // Ensure default groups exist
    await ensureDefaultInternalGroupsForUser(userId, accountType, specialties);

    // Get formatted threads
    const threads = await getFormattedInternalThreadsForUser(userId, 50);

    return NextResponse.json({ threads });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
```

### Example 2: Post Message Endpoint

```typescript
// POST /api/internal-messages/[id]
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await props.params;
  const { text, type, mediaUrl } = await request.json();

  // Validate
  if (type === "text" && !text?.trim()) {
    return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
  }

  try {
    // Verify access
    const thread = await getInternalThreadById(id, session.user.id);
    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Post message
    const sender = `${session.user.firstName} ${session.user.lastName}`.trim();
    const message = await addMessageToInternalThread(id, {
      text: text || "",
      sender,
      senderId: session.user.id,
      type: type || "text",
      mediaUrl: mediaUrl || "",
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
```

### Example 3: Patient Message Handler

```typescript
// Telegram bot receives message
async function handlePatientMessage(chatId: string, text: string) {
  // Get or create thread
  const thread = await createOrUpdateTelegramThread(chatId, {
    status: "active"
  });

  // Add message
  const message = await addMessageToTelegramThread(thread.id, {
    text,
    sender: "Patient",
    senderId: null,  // Patient message
    type: "text"
  });

  // Increment unread for all participants
  for (const userId of thread.participants || []) {
    await incrementUserUnreadCount(userId, 1);
  }

  return message;
}
```

### Example 4: Unread Count Badge

```typescript
// Get total unread count for navbar badge
async function getUnreadBadgeCount(userId: string) {
  const count = await getTotalUnreadCountForUser(userId);
  return count;
}
```

### Example 5: Auto-create Groups on Login

```typescript
// After successful login
async function onUserLogin(user: any) {
  await ensureDefaultInternalGroupsForUser(
    user.id,
    user.accountType,
    user.doctorSpecialty || []
  );
}
```

---

## Error Handling

All helper functions throw standard errors that should be caught and handled:

```typescript
try {
  const thread = await getInternalThreadById(threadId, userId);
} catch (error: any) {
  if (error.message === "Thread not found") {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }
  if (error.message === "Unauthorized: Not a participant in this thread") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // Generic error
  return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}
```

---

## Performance Tips

1. **Batch participant lookups:**
   ```typescript
   // Instead of fetching one by one
   const participants = await getThreadParticipantsWithUserData(
     thread.participants || []
   );
   ```

2. **Use limits for large lists:**
   ```typescript
   // Don't fetch unlimited threads
   const threads = await getInternalThreadsForUser(userId, 50);
   ```

3. **Cache frequently accessed data:**
   ```typescript
   // Cache user's unread count
   const cachedCount = cache.get(`unread:${userId}`);
   if (!cachedCount) {
     const count = await getTotalUnreadCountForUser(userId);
     cache.set(`unread:${userId}`, count, 60); // 60 seconds
   }
   ```

4. **Avoid unnecessary group recreation:**
   ```typescript
   // ensureDefaultInternalGroupsForUser is idempotent
   // Safe to call on every request, but consider caching check
   ```

---

## Type Definitions

### InternalMessage
```typescript
{
  id: string;
  text: string;
  sender: string;
  senderId: string;
  timestamp: Date;
  type: 'text' | 'image' | 'video' | 'file' | 'reply' | 'forward' | 'audio';
  mediaUrl?: string;
  replyTo?: string;
  forwardedFrom?: string;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
  read: boolean;
  readAt?: Date | null;
}
```

### TelegramMessage
```typescript
{
  id: string;
  text: string;
  sender: string;
  senderId: string | null;
  timestamp: Date;
  type: 'text' | 'image' | 'video' | 'file' | 'reply' | 'forward' | 'audio';
  mediaUrl?: string;
  replyTo?: string;
  forwardedFrom?: string;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
}
```

---

**Last Updated:** 2024-11-30  
**Version:** 1.0.0