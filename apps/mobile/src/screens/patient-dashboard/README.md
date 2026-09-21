# Patient Dashboard Module

This module implements the Patient Dashboard screen for the Fajr Mobile EMR app using a View-ViewModel architecture pattern.

## Architecture

The patient dashboard follows a clean separation of concerns with three main layers:

### 1. View Layer
- **`PatientDashboardScreenView.tsx`**: Presentational component that handles UI rendering
- **`MobilePatientDashboardTable.tsx`**: Reusable table component for displaying patient cards
- Focuses purely on UI/UX with no business logic
- Receives data and callbacks from the ViewModel

### 2. ViewModel Layer
- **`usePatientDashboardViewModel.ts`**: Custom hook that manages state and business logic
- Handles data fetching, filtering, and patient operations
- Provides a clean interface for the View to consume
- Manages loading states, errors, and data transformations

### 3. Data Layer
- **Types**: `../../types/patient.ts`
- **Utilities**: `../../utils/patientUtils.ts`
- **API Integration**: `../../config/index.ts`

## File Structure

```
patient-dashboard/
├── README.md                               # This file
├── index.ts                                # Module exports
├── PatientDashboardScreenView.tsx          # View component
└── usePatientDashboardViewModel.ts         # ViewModel hook
```

## Usage

### Basic Implementation

```tsx
import { PatientDashboardScreen } from './screens/patient-dashboard';

// In your navigation or parent component
<PatientDashboardScreen user={currentUser} />
```

### Using the ViewModel Directly

```tsx
import { usePatientDashboardViewModel } from './screens/patient-dashboard';

function CustomPatientDashboard() {
  const {
    filteredPatients,
    isLoading,
    error,
    refreshPatients,
    setFilters,
  } = usePatientDashboardViewModel();

  // Use the data and methods in your custom UI
}
```

## Features

### Patient Display
- ✅ Card-based layout optimized for mobile
- ✅ Patient information with status and priority badges
- ✅ Chief complaint display
- ✅ Medical team information (triaged by, doctor)
- ✅ Specialty and language indicators
- ✅ Unread message count
- ✅ Dashboard notes
- ✅ Visual indicators for patients without Telegram

### Filtering & Search
- ✅ Real-time search (by name, ID, chief complaint)
- ✅ Archive filter (active/archived/both)
- ✅ Status filter
- ✅ Priority filter
- ✅ Specialty filter
- ✅ Clear all filters functionality

### Interactions
- ✅ Pull-to-refresh
- ✅ Tap to navigate to patient detail
- ✅ Active patient highlighting
- ✅ Loading states with spinners
- ✅ Error handling with retry

### Statistics
- ✅ Total patients count
- ✅ Active patients count
- ✅ Urgent patients count

## ViewModel API

### State

```typescript
{
  patients: PatientWithMessages[];           // All patients from API
  filteredPatients: PatientWithMessages[];   // Filtered/searched patients
  isLoading: boolean;                        // Initial load state
  isRefreshing: boolean;                     // Pull-to-refresh state
  error: string | null;                      // Error message if any
  filters: PatientFilters;                   // Current filter settings
  archiveFilter: ArchiveFilterType;          // Archive filter state
}
```

### Actions

```typescript
{
  refreshPatients: () => Promise<void>;              // Refresh patient list
  setFilters: (filters: Partial<PatientFilters>) => void;  // Update filters
  setArchiveFilter: (filter: ArchiveFilterType) => void;   // Update archive filter
  clearFilters: () => void;                          // Reset all filters
  navigateToPatient: (patient) => Promise<void>;     // Navigate to patient detail
  updatePatientStatus: (id, status) => Promise<void>;      // Update status
  updatePatientPriority: (id, priority) => Promise<void>;  // Update priority
}
```

## Data Types

### PatientWithMessages
```typescript
interface PatientWithMessages extends Patient {
  unreadMessages: number;
}
```

### PatientFilters
```typescript
interface PatientFilters {
  status?: PatientStatus;
  priority?: PatientPriority;
  specialty?: string;
  search?: string;
  archiveFilter?: ArchiveFilterType;
}
```

## Styling

The module uses the centralized theme system from `../../utils/theme.ts`:

- **Colors**: Uses `lightTheme.colors` and `palette` from `colors.ts`
- **Spacing**: Consistent spacing from `spacing` scale
- **Typography**: Typography scale for font sizes and weights
- **Shadows**: Predefined shadow presets
- **Border Radius**: Consistent border radius values

## Component Composition

```
PatientDashboardScreen (Entry Point)
└── PatientDashboardScreenView (View)
    ├── usePatientDashboardViewModel (ViewModel)
    └── MobilePatientDashboardTable (Component)
        └── PatientCard (Individual cards)
```

## Icons

The module uses Lucide React Native icons throughout:

- `IdCard` - Patient ID
- `Globe` - Language
- `Stethoscope` - Specialty/Doctor
- `MessageSquare` - Unread messages
- `User` - Triaged by user
- `UserPlus` - Assigned doctor
- `StickyNote` - Notes
- `Clipboard` - Empty state
- `Search` - Search functionality
- `X` - Close/clear actions
- `Menu` - Filter menu
- `AlertCircle` - Error states
- `RotateCcw` - Retry action

## Utility Functions

The module uses several utility functions from `patientUtils.ts`:

- `dobToAge()`: Calculate age from date of birth
- `formatLocation()`: Format city and country
- `getStatusColor()`: Get color scheme for status
- `getPriorityColor()`: Get color scheme for priority
- `formatSpecialties()`: Format specialty list for display

## API Integration

The ViewModel integrates with the following API endpoints:

- `GET /api/patient` - Fetch all patients
- `PATCH /api/patient/:id` - Update patient (status, priority, etc.)

Authentication is handled via JWT tokens stored in secure storage.

## Future Enhancements

### TODO
- [ ] Implement actual unread message count from API
- [ ] Add patient detail navigation integration
- [ ] Implement pull-to-refresh with haptic feedback
- [ ] Add pagination for large patient lists
- [ ] Implement real-time updates via WebSocket
- [ ] Add advanced filters (date range, location, etc.)
- [ ] Implement offline mode with local caching
- [ ] Add sorting options
- [ ] Export patient list functionality

## Testing

### Unit Tests
```typescript
// Test the ViewModel
describe('usePatientDashboardViewModel', () => {
  it('should fetch patients on mount', async () => {
    // Test implementation
  });

  it('should filter patients by search term', () => {
    // Test implementation
  });
});
```

### Integration Tests
```typescript
// Test the View
describe('PatientDashboardScreenView', () => {
  it('should render patient cards', () => {
    // Test implementation
  });

  it('should handle patient navigation', () => {
    // Test implementation
  });
});
```

## Performance Considerations

1. **Filtering**: All filtering is done client-side for instant results
2. **Memoization**: Consider using `useMemo` for expensive computations
3. **Virtual Lists**: Consider implementing for >100 patients
4. **Image Optimization**: Avatar images should be optimized/cached

## Accessibility

- All touchable elements have appropriate hit areas (min 44x44)
- Semantic labels for screen readers
- Color contrast meets WCAG AA standards
- Keyboard navigation support (when applicable)

## Troubleshooting

### Common Issues

**Patients not loading:**
- Check network connectivity
- Verify authentication token is valid
- Check API endpoint configuration

**Filters not working:**
- Ensure filter values match patient data exactly
- Check case sensitivity for string comparisons

**Performance issues:**
- Reduce number of simultaneous filters
- Consider implementing pagination
- Check for unnecessary re-renders

## Contributing

When extending this module:

1. Keep View and ViewModel separated
2. Use existing utility functions when possible
3. Follow the established type definitions
4. Maintain consistent styling with theme system
5. Add appropriate error handling
6. Update this README with new features

## Related Documentation

- [Theme System](../../utils/theme.ts)
- [Color Palette](../../utils/colors.ts)
- [Patient Types](../../types/patient.ts)
- [API Configuration](../../config/index.ts)