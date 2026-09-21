# Profile View Model - Mobile App

## Overview

The ProfileScreen has been refactored to follow the **View Model pattern**, matching the architecture used in the web application. This separates business logic from UI presentation and makes the code more maintainable and testable.

## Architecture

### View Model Pattern

```
┌─────────────────────────────────────────┐
│         ProfileScreen (View)            │
│  - Renders UI                           │
│  - Handles user interactions            │
│  - Displays data                        │
└────────────────┬────────────────────────┘
                 │
                 │ uses
                 ▼
┌─────────────────────────────────────────┐
│   useProfileViewModel (View Model)      │
│  - Manages state                        │
│  - Business logic                       │
│  - API calls                            │
│  - Data transformations                 │
└────────────────┬────────────────────────┘
                 │
                 │ calls
                 ▼
┌─────────────────────────────────────────┐
│          API Endpoints                   │
│  - GET /api/user/:id                    │
│  - PATCH /api/user/:id                  │
└─────────────────────────────────────────┘
```

## Files Structure

```
apps/mobile/src/
├── screens/
│   └── ProfileScreen.tsx          # UI Component (View)
└── viewmodels/
    └── useProfileViewModel.ts     # Business Logic (View Model)
```

## View Model (`useProfileViewModel.ts`)

### Interface

```typescript
export interface UseProfileViewModelReturn {
  // State
  profile: ProfileFormValues | null;
  formData: ProfileFormValues | null;
  isLoading: boolean;
  isEditing: boolean;
  isSaving: boolean;
  error: string | null;

  // Actions
  setIsEditing: (editing: boolean) => void;
  updateFormData: (field: keyof ProfileFormValues, value: any) => void;
  handleSave: () => Promise<void>;
  handleCancel: () => void;
  refreshProfile: () => Promise<void>;

  // Collection Management
  addSpecialty: (specialty: string) => void;
  removeSpecialty: (specialty: string) => void;
  addLanguage: (language: string) => void;
  removeLanguage: (language: string) => void;
  addCountry: (country: string) => void;
  removeCountry: (country: string) => void;
}
```

### Key Features

#### 1. **State Management**
- `profile` - Original profile data from server
- `formData` - Editable copy for form fields
- `isLoading` - Initial profile fetch
- `isEditing` - Edit mode toggle
- `isSaving` - Save operation in progress
- `error` - Error messages

#### 2. **CRUD Operations**
- **Fetch** - `fetchProfile()` - GET user data
- **Update** - `handleSave()` - PATCH user data
- **Cancel** - `handleCancel()` - Reset form data

#### 3. **Collection Management**
Arrays like languages, countries, and specialties can be:
- Added: `addLanguage()`, `addCountry()`, `addSpecialty()`
- Removed: `removeLanguage()`, `removeCountry()`, `removeSpecialty()`

## ProfileScreen Component

### Features

#### 1. **View Mode** (Default)
```
┌─────────────────────────────────────────┐
│  Profile                          Edit   │
├─────────────────────────────────────────┤
│              👤                          │
│         Dr. Kyle Essenmacher            │
│       dev@example.com                  │
│            Admin                         │
│                                          │
│  Personal Information                    │
│  ├─ Name: Kyle Essenmacher              │
│  ├─ Gender: Male                         │
│  ├─ Date of Birth: July 2, 2025         │
│  └─ City: Ann Arbor                      │
│                                          │
│  Professional Details                    │
│  ├─ Account Type: Doctor                 │
│  ├─ Languages: [English] [Arabic]       │
│  ├─ Countries: [Egypt] [Palestine]      │
│  └─ Specialties: [Cardiology]           │
│                                          │
│  [Settings]                              │
│  [Logout]                                │
└─────────────────────────────────────────┘
```

#### 2. **Edit Mode**
```
┌─────────────────────────────────────────┐
│  Profile                                 │
├─────────────────────────────────────────┤
│              👤                          │
│         Dr. Kyle Essenmacher            │
│       dev@example.com                  │
│            Admin                         │
│                                          │
│  Personal Information                    │
│  ├─ First Name: [Kyle          ]        │
│  ├─ Last Name:  [Essenmacher   ]        │
│  ├─ Gender: [Male✓] [Female]            │
│  ├─ Date of Birth: July 2, 2025         │
│  └─ City: [Ann Arbor           ]        │
│                                          │
│  Professional Details                    │
│  ├─ Account Type: [Doctor✓] [Triage]    │
│  ├─ Languages: [English ×] [Arabic ×]   │
│  ├─ Countries: [Egypt ×] [Palestine ×]  │
│  └─ Specialties: [Cardiology ×]         │
│                                          │
│  [💾 Save Changes]                       │
│  [Cancel]                                │
└─────────────────────────────────────────┘
```

### Editable Fields

| Field | Edit Mode | Notes |
|-------|-----------|-------|
| First Name | ✅ Text Input | Required |
| Last Name | ✅ Text Input | Required |
| Gender | ✅ Toggle Buttons | Male/Female |
| City | ✅ Text Input | Optional |
| Account Type | ✅ Admin Only | Doctor/Triage/Evac |
| Date of Birth | ❌ Read-only | Set once |
| Email | ❌ Read-only | Cannot change |
| Languages | ✅ Remove chips | Add coming soon |
| Countries | ✅ Remove chips | Add coming soon |
| Specialties | ✅ Remove chips | Add coming soon |

## Usage Example

### In ProfileScreen

```typescript
import { useProfileViewModel } from '../viewmodels/useProfileViewModel';

export default function ProfileScreen({ user }: ProfileScreenProps) {
  const {
    profile,
    formData,
    isLoading,
    isEditing,
    isSaving,
    error,
    setIsEditing,
    updateFormData,
    handleSave,
    handleCancel,
    removeSpecialty,
    removeLanguage,
    removeCountry,
  } = useProfileViewModel(user._id);

  // Render UI based on state
  if (isLoading) return <LoadingView />;
  if (error) return <ErrorView error={error} />;
  if (!formData) return null;

  // Edit mode example
  const handleEditPress = () => setIsEditing(true);
  const handleSavePress = async () => await handleSave();
  const handleCancelPress = () => handleCancel();

  // Field update example
  <TextInput
    value={formData.firstName}
    onChangeText={(value) => updateFormData('firstName', value)}
  />

  // Chip removal example
  <TouchableOpacity onPress={() => removeLanguage('English')}>
    <Text>×</Text>
  </TouchableOpacity>
}
```

## API Integration

### Endpoints Used

#### 1. GET /api/user/:id
Fetches user profile data.

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <token>"
}
```

**Response:**
```json
{
  "_id": "686c53889a049f76f4dfcc8d",
  "firstName": "Kyle",
  "lastName": "Essenmacher",
  "email": "dev@example.com",
  "accountType": "Doctor",
  "gender": "Male",
  "dob": "2025-07-02T04:00:00.000Z",
  "city": "Ann Arbor",
  "countries": ["Egypt", "Palestine"],
  "languages": ["English", "Arabic"],
  "doctorSpecialty": ["Cardiology"],
  "isAdmin": true
}
```

#### 2. PATCH /api/user/:id
Updates user profile data.

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <token>"
}
```

**Body:**
```json
{
  "firstName": "Kyle",
  "lastName": "Essenmacher",
  "gender": "Male",
  "dob": "2025-07-02T04:00:00.000Z",
  "city": "Ann Arbor",
  "countries": ["Egypt", "Palestine"],
  "languages": ["English", "Arabic"],
  "doctorSpecialty": ["Cardiology"],
  "accountType": "Doctor"
}
```

## State Flow

### Edit Flow

```
1. User taps "Edit"
   ↓
2. setIsEditing(true)
   ↓
3. FormData becomes editable
   ↓
4. User makes changes
   ↓
5. updateFormData() called for each change
   ↓
6. User taps "Save"
   ↓
7. handleSave() → API PATCH request
   ↓
8. Success: Update profile & formData, setIsEditing(false)
   Failure: Show error, keep editing
```

### Cancel Flow

```
1. User taps "Cancel"
   ↓
2. handleCancel()
   ↓
3. formData = profile (reset to original)
   ↓
4. setIsEditing(false)
   ↓
5. All changes discarded
```

## Console Logs

### Successful Load
```
📥 Fetching profile for user: 686c53889a049f76f4dfcc8d
✅ Profile fetched successfully
```

### Successful Save
```
💾 Saving profile changes...
✅ Profile saved successfully
✅ Local storage updated
```

### Error Handling
```
❌ Failed to fetch profile: 401 Unauthorized
❌ Error fetching profile: No authentication token found
```

## Storage Synchronization

When profile is updated, the local MMKV storage is also updated:

```typescript
storageUtils.setUser({
  ...storedUser,
  firstName: updatedProfile.firstName,
  lastName: updatedProfile.lastName,
  // ... other fields
});
```

This ensures:
- ✅ App data stays in sync
- ✅ Profile persists across app restarts
- ✅ Offline mode works with latest data

## Validation Rules

### Frontend Validation

| Field | Rule | Message |
|-------|------|---------|
| First Name | Required, min 1 char | "First name is required" |
| Last Name | Required, min 1 char | "Last name is required" |
| Languages | At least 1 selected | Can't remove last language |
| Countries | At least 1 selected | Can't remove last country |
| Gender | Male or Female | - |
| Account Type | Doctor/Triage/Evac | - |

### Backend Validation

The backend validates using Zod schema (from web):
- Date of birth must be in the past
- Email format validation
- Required fields enforcement

## Differences from Web Version

| Feature | Web | Mobile |
|---------|-----|--------|
| Form Library | react-hook-form + Zod | Custom state management |
| Date Picker | Custom component | Read-only for now |
| Multi-select | Dropdowns | Chip removal only |
| Google Account | Link/Unlink | Not implemented |
| Medical License | Upload/View | Not implemented |
| Image Upload | ✅ | ❌ (Future) |
| Real-time Validation | ✅ | ❌ (Future) |

## Future Enhancements

### Phase 1 (Next Sprint)
- [ ] Add language selector
- [ ] Add country selector  
- [ ] Add specialty selector
- [ ] Date picker for DOB
- [ ] Form validation feedback

### Phase 2
- [ ] Profile image upload
- [ ] Medical license management
- [ ] Google account integration
- [ ] Settings screen integration

### Phase 3
- [ ] Real-time validation
- [ ] Optimistic updates
- [ ] Offline editing queue
- [ ] Conflict resolution

## Testing

### Unit Tests (Future)
```typescript
describe('useProfileViewModel', () => {
  it('should fetch profile on mount', async () => {
    const { result } = renderHook(() => useProfileViewModel('user123'));
    await waitFor(() => expect(result.current.profile).toBeTruthy());
  });

  it('should update form data', () => {
    const { result } = renderHook(() => useProfileViewModel('user123'));
    act(() => {
      result.current.updateFormData('firstName', 'John');
    });
    expect(result.current.formData?.firstName).toBe('John');
  });

  it('should reset on cancel', () => {
    const { result } = renderHook(() => useProfileViewModel('user123'));
    act(() => {
      result.current.updateFormData('firstName', 'John');
      result.current.handleCancel();
    });
    expect(result.current.formData?.firstName).toBe(result.current.profile?.firstName);
  });
});
```

### Manual Testing Checklist

- [ ] Profile loads successfully
- [ ] Edit mode activates
- [ ] Text inputs work
- [ ] Gender picker works
- [ ] Account type picker (admin only)
- [ ] Language chips removable
- [ ] Country chips removable
- [ ] Specialty chips removable
- [ ] Save updates profile
- [ ] Cancel discards changes
- [ ] Loading states show correctly
- [ ] Error states show correctly
- [ ] Logout works

## Troubleshooting

### Profile Not Loading
```
❌ Failed to fetch profile: 401 Unauthorized
```
**Solution:** Token expired. Log out and log back in.

### Changes Not Saving
```
❌ Failed to save profile: 422 Unprocessable Entity
```
**Solution:** Check validation - ensure required fields are filled.

### Storage Out of Sync
**Symptoms:** Profile shows old data after update
**Solution:** Call `refreshProfile()` or restart app.

### Can't Remove Last Language/Country
**Expected:** At least one must remain
**Solution:** Add another before removing the last one.

## Related Files

- `apps/mobile/src/screens/ProfileScreen.tsx` - UI component
- `apps/mobile/src/viewmodels/useProfileViewModel.ts` - View model
- `apps/mobile/src/utils/storage.ts` - MMKV storage
- `apps/web/components/user-profile/UserProfileViewModel.ts` - Web version (reference)

## Summary

✅ **View Model Pattern** - Separates concerns
✅ **Editable Fields** - First name, last name, gender, city
✅ **Chip Management** - Remove languages, countries, specialties
✅ **API Integration** - Fetch and update profile
✅ **Storage Sync** - Updates local MMKV storage
✅ **Error Handling** - Loading and error states
✅ **Similar to Web** - Consistent architecture

The ProfileScreen now follows best practices with clean separation between UI and business logic, making it easier to maintain and extend! 🎉