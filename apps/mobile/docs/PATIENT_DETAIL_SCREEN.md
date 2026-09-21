# Patient Detail Screen

This screen displays detailed patient information including demographics, medical history, medications, clinical notes, and media files.

## Architecture

This screen follows the **View/ViewModel** pattern:

- `PatientDetailScreen.tsx` - Main entry point
- `PatientDetailScreenView.tsx` - UI presentation layer
- `usePatientDetailViewModel.ts` - Business logic and state management

## Features

### Patient Information
- Demographics (name, DOB, contact info)
- Priority and status badges
- Chief complaint and diagnosis
- Allergies (highlighted)
- Hospital and care team info

### Medical History
- Collapsible accordion sections:
  - Past Medical History (PMHx)
  - Past Surgical History (PSHx)
  - Family History (FamHx)
  - Social History (smoking, alcohol, drugs)

### Medications
- Active and historical medications
- Dosage, frequency, and route information
- Status indicators (active, completed, discontinued)
- Add/edit/delete functionality

### Clinical Notes
- Chronological list of clinical notes
- Note type and timestamp
- Add/edit/delete functionality
- Full text search capability

### Media & Documents
- Image gallery
- Document uploads
- Video files
- Upload/delete functionality

## Usage

```tsx
import PatientDetailScreen from './screens/PatientDetailScreen';

// Basic usage
<PatientDetailScreen 
  patientId="123456" 
  onBack={() => navigation.goBack()}
/>
```

## Navigation Integration

### React Navigation Example

```tsx
import { useNavigation } from '@react-navigation/native';
import PatientDetailScreen from './screens/PatientDetailScreen';

function MyComponent() {
  const navigation = useNavigation();
  
  return (
    <PatientDetailScreen 
      patientId={route.params.patientId}
      onBack={() => navigation.goBack()}
    />
  );
}
```

## State Management

The ViewModel manages the following state:

```typescript
{
  // Patient Info
  patientInfo: PatientInfo | null;
  loadingPatientInfo: boolean;
  patientError: string | null;

  // Medications
  medications: Medication[];
  loadingMedications: boolean;
  medicationsError: string | null;

  // Notes
  notes: Note[];
  loadingNotes: boolean;
  notesError: string | null;

  // Media
  media: MediaItem[];
  loadingMedia: boolean;
  mediaError: string | null;
}
```

## API Integration

The ViewModel automatically fetches data from the following endpoints:

- `GET /patient/:id` - Patient information
- `GET /patient/:id/medications` - Medications list
- `GET /patient/:id/notes` - Clinical notes
- `GET /patient/:id/media` - Media files

### Update Operations

```typescript
// Update patient info
await updatePatientInfo({ priority: 'High', status: 'Active' });

// Add medication
await addMedication({
  name: 'Aspirin',
  dosage: '81mg',
  frequency: 'Daily',
  route: 'Oral'
});

// Add note
await addNote('Patient reported improvement', 'Progress Note');

// Upload media
await uploadMedia(imageUri, 'image');
```

## Customization

### Styling

All styles are defined in the component's StyleSheet and use the app's theme system:

```typescript
import { lightTheme, spacing, borderRadius, typography } from '../../utils/theme';
import { palette } from '../../utils/colors';
```

### Extending Functionality

To add new sections, follow this pattern:

```tsx
<Card style={styles.card} variant="elevated">
  <CardHeader>
    <View style={styles.cardHeaderRow}>
      <View style={styles.iconBadge}>
        <YourIcon size={20} color={palette.easternBlue[600]} />
      </View>
      <Text style={styles.cardTitle}>Your Section</Text>
    </View>
  </CardHeader>

  <CardContent>
    {/* Your content here */}
  </CardContent>
</Card>
```

## Components Used

### UI Components
- `Card`, `CardHeader`, `CardContent` - Layout containers
- `Accordion`, `AccordionItem` - Collapsible sections

### Form Components (for future forms)
- `TextInputField` - Text input
- `DatePickerField` - Date selection
- `SwitchField` - Toggle switch
- `CheckboxField` - Checkbox input
- `RadioCardSelector` - Radio button cards
- `SingleSelectField` - Dropdown select
- `MultiSelectField` - Multi-select dropdown

## Performance Considerations

- Uses `React.memo` for list item optimization
- Implements pull-to-refresh for data updates
- Lazy loads media thumbnails
- Caches patient data locally (TODO)

## Error Handling

The screen handles various error states:

- Network errors
- Patient not found
- Individual section failures (medications, notes, etc.)
- Loading states for each data section

## Accessibility

- Semantic labels for all interactive elements
- Touch target sizes meet minimum requirements
- Color contrast ratios meet WCAG AA standards
- Screen reader support (iOS VoiceOver, Android TalkBack)

## Future Enhancements

- [ ] Offline support with local caching
- [ ] Real-time updates via WebSocket
- [ ] Edit mode for patient information
- [ ] In-line note editing
- [ ] Media preview/lightbox
- [ ] Export patient chart functionality
- [ ] Print/PDF generation
- [ ] Advanced search and filtering
- [ ] Vitals tracking section
- [ ] Lab results integration
- [ ] Appointment history