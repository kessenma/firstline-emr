# Patient Dashboard - Quick Start Guide

Get up and running with the mobile patient dashboard in 5 minutes!

## 🚀 Quick Setup

### 1. Import the Component

```typescript
// In your navigation or parent component
import PatientDashboardScreen from './screens/PatientDashboardScreen';

// Use it
<PatientDashboardScreen user={currentUser} />
```

That's it! The component is ready to use.

## 📱 What You Get Out of the Box

✅ **Patient List Display** - Card-based layout with all patient info  
✅ **Search & Filters** - Real-time search and archive filtering  
✅ **Quick Stats** - Total, active, and urgent patient counts  
✅ **Pull to Refresh** - Swipe down to reload data  
✅ **Error Handling** - User-friendly error messages with retry  
✅ **Loading States** - Smooth loading indicators  
✅ **Theme Integration** - Uses your app's color scheme  

## 🎨 Visual Overview

```
┌─────────────────────────────┐
│ Patient Dashboard           │ ← Header with title
│ Medical Portal         [☰]  │   and filter button
├─────────────────────────────┤
│ [12]    [8]      [2]        │ ← Quick stats
│ Patients Active  Urgent     │
├─────────────────────────────┤
│ 🔍 Search patients...    ✕  │ ← Search bar
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ [P] Patient Smith   [In │ │ ← Patient card
│ │     25 yrs • Gaza    Pro│ │   with info
│ │                     gres│ │
│ │ Chief Complaint:        │ │
│ │ Headache and fever      │ │
│ │                         │ │
│ │ 🆔 123abc  🩺 Cardio    │ │
│ │ 👤 Dr. Jones 👨‍⚕️ Dr. Lee│ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ [A] Patient Ahmed       │ │ ← More cards...
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

## 🔧 Basic Customization

### Change the User Info

```typescript
const currentUser = {
  id: 'user123',
  _id: 'user123',
  email: 'doctor@example.com',
  accountType: 'Doctor', // or 'Triage' or 'Evac'
  firstName: 'John',
  lastName: 'Doe',
  // ... other fields
};

<PatientDashboardScreen user={currentUser} />
```

### Access the ViewModel Directly

```typescript
import { usePatientDashboardViewModel } from './screens/patient-dashboard';

function MyCustomDashboard() {
  const {
    filteredPatients,
    isLoading,
    refreshPatients,
    setFilters,
  } = usePatientDashboardViewModel();

  return (
    <View>
      <Text>Total: {filteredPatients.length}</Text>
      <Button onPress={refreshPatients} title="Refresh" />
    </View>
  );
}
```

## 🎯 Common Use Cases

### 1. Navigate to Patient Detail

The component handles this automatically. When a patient card is tapped, it calls the `navigateToPatient` function in the ViewModel.

**To customize navigation:**

Edit `usePatientDashboardViewModel.ts`:

```typescript
const navigateToPatient = useCallback(async (patient: PatientWithMessages) => {
  console.log('📍 Navigating to patient:', patient._id);
  
  // Add your navigation logic here
  navigation.navigate('PatientDetail', { 
    patientId: patient._id 
  });
}, [navigation]);
```

### 2. Add Custom Filters

Want to filter by status or priority?

```typescript
const { setFilters } = usePatientDashboardViewModel();

// Filter by status
setFilters({ status: 'In Progress' });

// Filter by priority
setFilters({ priority: 'High' });

// Combine filters
setFilters({ 
  status: 'In Progress', 
  priority: 'High',
  specialty: 'Cardiology'
});

// Clear all
clearFilters();
```

### 3. Update Patient Status

```typescript
const { updatePatientStatus } = usePatientDashboardViewModel();

// Update status
await updatePatientStatus('patient123', 'Completed');
```

## 🎨 Styling

The component uses your centralized theme. Colors are automatically applied from:

- `apps/mobile/src/utils/colors.ts`
- `apps/mobile/src/utils/theme.ts`

**Key colors used:**
- Primary: Eastern Blue (#3a7580)
- Accent: Orange (#c71e07)
- Status badges: Dynamic colors
- Priority badges: Dynamic colors

## 📊 Data Requirements

### Expected Patient Data Structure

```typescript
interface PatientWithMessages {
  _id: string;
  firstName?: string;
  lastName: string;
  dob?: string | Date;
  gender?: 'Male' | 'Female' | 'Other';
  city?: string;
  country?: string;
  language?: string;
  chiefComplaint?: string;
  status?: 'Not Started' | 'In Progress' | 'Completed' | 'Urgent';
  priority?: 'High' | 'Medium' | 'Low' | 'Not Selected';
  specialties?: string[];
  dashboardNotes?: string;
  telegramChatId?: string;
  triagedBy?: User | string;
  doctor?: User | string;
  unreadMessages: number;
}
```

### API Endpoints Required

- `GET /api/patient` - Fetch all patients
- `PATCH /api/patient/:id` - Update patient (optional)

## 🔍 Features Explained

### Search
Type in the search bar to filter by:
- Patient last name
- Patient ID
- Chief complaint

### Archive Filter
Toggle between:
- **Active** - Only active patients (default)
- **Archived** - Only archived patients
- **All** - Both active and archived

### Quick Stats
- **Patients** - Total filtered patients
- **Active** - Patients with "In Progress" status
- **Urgent** - Patients with "High" priority

### Patient Cards
Each card shows:
- Patient initial & name
- Age & location
- Status & priority badges
- Chief complaint (highlighted)
- Patient ID & language
- Specialty & unread messages
- Medical team (triaged by, doctor)
- Dashboard notes (if any)

## 🐛 Troubleshooting

### No patients showing up?

1. **Check API response:**
   ```typescript
   // Look for console logs
   // "📥 Fetching patients..."
   // "✅ Patients fetched successfully: X"
   ```

2. **Verify authentication:**
   ```typescript
   import { storageUtils } from './utils/storage';
   const user = storageUtils.getUser();
   console.log('User:', user);
   console.log('Token:', user?.token);
   ```

3. **Check API endpoint:**
   ```typescript
   import { getApiUrl } from './config';
   console.log('API URL:', getApiUrl('/patient'));
   ```

### Search not working?

- Make sure patient data includes `lastName`, `_id`, or `chiefComplaint`
- Search is case-insensitive
- Clear filters and try again

### Filters not applying?

- Check that filter values match data exactly
- Try clearing all filters first
- Verify data structure matches expected format

## 📚 Next Steps

1. **Add Navigation**  
   Connect patient cards to detail screen

2. **Implement Actions**  
   Add buttons for updating status, priority, etc.

3. **Add More Filters**  
   Extend filtering for specialty, date range, etc.

4. **Enable Offline Mode**  
   Store patients locally for offline access

5. **Real-time Updates**  
   Add WebSocket connection for live updates

## 📖 Full Documentation

For detailed information, see:
- [`README.md`](./README.md) - Complete module documentation
- [`ICON_REFERENCE.md`](../../components/ICON_REFERENCE.md) - Icon usage guide
- [`PATIENT_DASHBOARD_IMPLEMENTATION.md`](../../PATIENT_DASHBOARD_IMPLEMENTATION.md) - Implementation details

## 💡 Pro Tips

1. **Use pull-to-refresh** - Swipe down to reload patients
2. **Search is fast** - No need to wait, it's instant
3. **Cards with faded appearance** - These patients don't have Telegram
4. **Highlighted cards** - Currently selected/active patient
5. **Stats are live** - They update based on your filters

## 🆘 Need Help?

Common issues and solutions:

| Issue | Solution |
|-------|----------|
| Patients not loading | Check network, verify API endpoint |
| Icons not showing | Ensure `lucide-react-native` is installed |
| Colors look wrong | Check theme configuration |
| App crashes | Check console for errors, verify data structure |
| Slow performance | Consider pagination for >100 patients |

## 🎉 You're Ready!

The patient dashboard is now set up and ready to use. Start by:
1. Opening the app
2. Navigating to the dashboard
3. Trying out search and filters
4. Tapping on a patient card

Happy coding! 🚀