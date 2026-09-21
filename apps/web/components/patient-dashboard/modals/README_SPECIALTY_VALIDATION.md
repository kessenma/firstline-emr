# Specialty Validation Modal Feature

## Overview

This feature adds a validation check when assigning a specialty to a patient. If the selected specialty has no doctors available in the system, a modal will appear warning the user and suggesting available alternatives.

## Files Created/Modified

### New Files

1. **`/app/api/doctors/available-specialties/route.ts`**
   - API endpoint to check which specialties have doctors
   - GET: Returns all available specialties with doctor counts
   - POST: Checks if a specific specialty has doctors

2. **`/components/patient-dashboard/modals/NoSpecialtyDoctorsModal.tsx`**
   - Modal component that displays when no doctors are available for selected specialty
   - Shows the selected specialty that has no doctors
   - Lists all available specialties with doctors
   - Provides options to cancel or choose a different specialty

### Modified Files

1. **`/components/patient-dashboard/cells/SpecialtyCell.tsx`**
   - Added validation logic before updating patient specialty
   - Calls API to check if doctors exist for selected specialty
   - Triggers modal if no doctors are found
   - Shows success toast with doctor count when specialty is assigned

## How It Works

### User Flow

1. User selects a specialty from the dropdown in the patient dashboard
2. System checks if doctors with that specialty exist (via API call)
3. **If doctors exist:**
   - Specialty is assigned to patient
   - Doctors are notified
   - Success toast shows number of doctors notified
4. **If no doctors exist:**
   - Modal appears with warning message
   - Shows the selected specialty that has no doctors
   - Lists all available specialties that DO have doctors
   - User can cancel or choose to select a different specialty

### API Endpoints

#### GET `/api/doctors/available-specialties`

Returns all specialties that have at least one authorized doctor.

**Response:**
```json
{
  "availableSpecialties": [
    "Cardiology",
    "Dermatology & Wound Care",
    "Emergency Medicine & Trauma"
  ],
  "doctorCount": 15
}
```

#### POST `/api/doctors/available-specialties`

Check if a specific specialty has doctors.

**Request:**
```json
{
  "specialty": "Cardiology"
}
```

**Response:**
```json
{
  "specialty": "Cardiology",
  "hasDoctors": true,
  "doctorCount": 3,
  "doctors": [
    {
      "id": "uuid-1",
      "name": "Dr. John Smith"
    }
  ]
}
```

## Database Query

The API queries the `users` table for doctors with the following criteria:
- `accountType` = "Doctor"
- `authorized` = true
- `doctorSpecialty` is not null
- `doctorSpecialty` array contains the selected specialty

## Component Usage

### NoSpecialtyDoctorsModal

```tsx
<NoSpecialtyDoctorsModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  selectedSpecialty="Cardiology"
  availableSpecialties={["Dermatology", "Emergency Medicine"]}
  onSelectDifferentSpecialty={() => {
    // Handle re-opening specialty selector
  }}
/>
```

### Props

- **`isOpen`**: Controls modal visibility
- **`onClose`**: Callback when modal is closed
- **`selectedSpecialty`**: The specialty that was selected but has no doctors
- **`availableSpecialties`**: Array of specialties that DO have doctors
- **`onSelectDifferentSpecialty`**: Callback when user chooses to select a different specialty

## UX Features

### Visual Feedback

1. **Warning Icon**: Yellow AlertCircle icon to indicate this is important but not critical
2. **Clear Messaging**: Explains exactly what the issue is
3. **Helpful Information**: Shows what specialties ARE available
4. **Scrollable List**: If many specialties available, list is scrollable
5. **Empty State**: Shows appropriate message if NO doctors exist in system

### Button Actions

- **Cancel**: Closes modal without making changes
- **Choose Different Specialty**: Closes modal and allows user to select again

## Technical Details

### State Management

The `SpecialtyCell` component manages:
- `showModal`: Boolean to control modal visibility
- `selectedSpecialtyForModal`: The specialty that triggered the modal
- `availableSpecialties`: Array fetched from API
- `isNotifying`: Loading state during API calls

### Loading States

The component shows loading indicators during:
1. Initial specialty validation check
2. Fetching available specialties
3. Updating patient record
4. Sending notifications to doctors

### Error Handling

If API calls fail:
- Shows error toast to user
- Prevents specialty from being assigned
- Allows user to retry

## Testing Scenarios

### Scenario 1: Successful Assignment
1. Select a specialty that has doctors
2. Verify API checks for doctors
3. Verify specialty is assigned
4. Verify success toast appears with doctor count

### Scenario 2: No Doctors Available
1. Select a specialty with no doctors
2. Verify modal appears
3. Verify correct specialty name is shown
4. Verify available specialties list is populated
5. Click "Cancel" - modal closes, no changes
6. Re-open and click "Choose Different Specialty" - modal closes, can select again

### Scenario 3: No Doctors in System
1. In a system with no authorized doctors
2. Select any specialty
3. Verify modal appears with empty state message

## Future Enhancements

Potential improvements to consider:
1. Show doctor names in the modal for available specialties
2. Add quick-select buttons for available specialties in modal
3. Add analytics to track which specialties are frequently selected when unavailable
4. Auto-suggest most similar specialty with doctors
5. Allow admins to be notified when specialties are requested but unavailable

## Security Considerations

- API endpoints should validate session/authentication
- Only authorized users (Triage) can assign specialties
- Patient data is not exposed in specialty check API
- Doctor lists only show minimal information (id, name)

## Performance Notes

- API calls are made asynchronously to avoid blocking UI
- Specialty list is fetched only when needed (lazy loading)
- Modal renders conditionally to reduce initial bundle size
- Uses optimistic UI patterns where appropriate