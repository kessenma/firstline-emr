# Patient Chart Components

This directory contains the mobile app's patient chart interface, organized into modular components similar to the web app structure.

## Structure

```
patient-chart/
├── README.md                      # This file
├── index.ts                       # Barrel exports
├── PatientChartContext.tsx        # Context provider for patient data
├── PatientChartView.tsx           # Main tabbed interface
├── patient-info/                  # Patient information section
├── notes/                         # Clinical notes section
├── medications/                   # Medications & prescriptions section
├── images/                        # Images & documents section
├── messaging/                     # Patient messaging section
└── video/                         # Video consultations section
```

## Usage

### Basic Setup

The patient chart is accessed via the `PatientChartScreen` which wraps the view with the context provider:

```tsx
import { PatientChartProvider, PatientChartView } from '../components/patient-chart';

<PatientChartProvider patientId={patientId}>
  <PatientChartView onBack={handleBack} />
</PatientChartProvider>
```

### Using the Context

Access patient data and operations from any component within the provider:

```tsx
import { usePatientChart } from '../components/patient-chart';

function MyComponent() {
  const {
    patientInfo,
    notes,
    medications,
    rxOrders,
    medOrders,
    photos,
    fetchPatientData,
    addRxOrder,
    addMedOrder,
  } = usePatientChart();

  // Use the data...
}
```

## Features

### 6 Main Sections

1. **Patient Info** - Demographics, contact info, medical history
2. **Notes** - Clinical notes, SOAP notes, draft notes
3. **Medications** - Rx orders, med orders, prescriptions
4. **Images** - Patient photos, documents, imaging
5. **Messaging** - Communication with patient via Telegram/SMS
6. **Video** - Video consultation interface

### State Management

The context provides:
- Loading states for each section
- Error handling
- Automatic data fetching on mount
- Manual refresh capabilities
- CRUD operations for each data type

### Key Features

- **Tabbed Interface** - Easy navigation between sections
- **Pull to Refresh** - Update data with a simple gesture
- **Offline Support** - (Coming soon) Cache data locally
- **Real-time Updates** - (Coming soon) WebSocket integration

## Development

### Adding a New Section Component

1. Create a new directory for your section (e.g., `new-section/`)
2. Create the component file: `new-section/NewSectionView.tsx`
3. Use the context hook to access data
4. Add the tab to `PatientChartView.tsx`
5. Export from the section's index file

Example:

```tsx
// new-section/NewSectionView.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { usePatientChart } from '../PatientChartContext';

export const NewSectionView = () => {
  const { patientInfo } = usePatientChart();
  
  return (
    <View>
      <Text>New Section for {patientInfo?.patientName}</Text>
    </View>
  );
};
```

### Extending the Context

To add new data or operations to the context:

1. Add the state to `PatientChartContext.tsx`
2. Add the type to `PatientChartContextType` interface
3. Create fetch/update functions
4. Add to the context value object
5. Export any new types

## API Integration

The context uses your mobile app's API configuration:

- `getApiUrl()` - Handles API endpoint URLs
- Standard fetch with error handling
- Existing type definitions from `../../types/`

## Compatibility

This structure maintains compatibility with:
- Existing `PatientViewModelContext.tsx` (can be deprecated)
- Web app's patient chart structure
- Current navigation patterns
- Existing type definitions

## Migration from Old Structure

If you're migrating from the old `patient-detail` screens:

1. The new context replaces `usePatientDetailViewModel`
2. Data structure is similar but organized by section
3. Navigation is now tab-based instead of accordion
4. All components are now properly organized by feature

## Next Steps

- [ ] Implement individual section components
- [ ] Add form components for editing data
- [ ] Implement real-time updates
- [ ] Add offline caching
- [ ] Create unit tests for each section
- [ ] Add accessibility features
- [ ] Implement deep linking to specific sections

## Related Files

- `/screens/PatientChartScreen.tsx` - Screen wrapper
- `/contexts/PatientViewModelContext.tsx` - Legacy context (can be deprecated)
- `/types/patient.ts` - Patient type definitions
- `/types/notes.ts` - Note type definitions
- `/types/medOrders.ts` - Medication order type definitions