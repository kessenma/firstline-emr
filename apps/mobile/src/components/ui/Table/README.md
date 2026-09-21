# Table Component Documentation

## Overview

The Table component provides a card-based layout for displaying tabular data in React Native applications. It's optimized for mobile screens with touch interactions and clear visual hierarchy.

## Installation

The Table component is already part of the UI component library:

```typescript
import { Table } from '@/components/ui/Table';
import type { TableColumn, TableProps } from '@/components/ui/Table';
```

## Basic Usage

```typescript
import { Table } from '@/components/ui/Table';
import type { TableColumn } from '@/components/ui/Table';

interface Patient {
  id: string;
  lastName: string;
  dob: string;
  city: string;
  country: string;
  status: string;
}

const columns: TableColumn<Patient>[] = [
  { key: 'id', label: 'ID' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'status', label: 'Status' },
];

const MyComponent = () => {
  const patients = [/* your data */];

  return (
    <Table
      data={patients}
      columns={columns}
      onRowClick={(patient) => console.log('Clicked:', patient)}
    />
  );
};
```

## Props

### `TableProps<T>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `T[]` | **Required** | Array of data items to display |
| `columns` | `TableColumn<T>[]` | **Required** | Column definitions |
| `onRowClick` | `(item: T) => void` | - | Callback when a row is clicked |
| `backgroundColor` | `string` | `'background'` | Background color CSS class |
| `textColor` | `string` | `'foreground'` | Text color CSS class |
| `borderColor` | `string` | `'border'` | Border color CSS class |
| `hoverBackgroundColor` | `string` | `'muted/50'` | Hover background CSS class |
| `hoverTextColor` | `string` | `'foreground'` | Hover text color CSS class |
| `renderActions` | `(item: T) => ReactNode` | - | Function to render action buttons |
| `isLoading` | `boolean` | `false` | Show loading state |
| `emptyMessage` | `string` | `'No data available'` | Message when no data |

### `TableColumn<T>`

| Property | Type | Description |
|----------|------|-------------|
| `key` | `string` | Unique key for the column |
| `label` | `string` | Display label for the column header |
| `render` | `(item: T) => ReactNode` | Optional custom render function |
| `accessor` | `(item: T) => any` | Optional accessor function |
| `sortable` | `boolean` | Whether column is sortable (not implemented yet) |
| `width` | `number \| string` | Optional column width |
| `align` | `'left' \| 'center' \| 'right'` | Column alignment |

## Features

### 1. Card-Based Layout
Each row is rendered as a card with all relevant information displayed in a mobile-friendly format.

### 2. Icon Support
Automatic icons for common field types:
- `status` → Activity icon
- `priority` → AlertTriangle icon
- `specialty` → Stethoscope icon
- `notes`/`dashboardNotes` → StickyNote icon
- `telegramChatId` → MessageSquare icon
- `user`/`triagedBy` → User icon
- `doctor` → Stethoscope icon
- `id`/`_id` → IdCard icon
- `language` → Languages icon

### 3. Patient Data Formatting
Built-in formatters for common patient data:
- `dobToAge()` - Converts date of birth to age
- `formatLocation()` - Formats city and country
- Complex object handling for nested data (e.g., `doctor.firstName`)

### 4. Loading & Empty States
- Loading spinner with message
- Customizable empty state message

### 5. Action Buttons
Optional render function for action buttons per row.

## Advanced Usage

### With Custom Actions

```typescript
<Table
  data={patients}
  columns={columns}
  renderActions={(patient) => (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Button onPress={() => editPatient(patient)}>
        Edit
      </Button>
      <Button onPress={() => deletePatient(patient)} variant="destructive">
        Delete
      </Button>
    </View>
  )}
/>
```

### With Loading State

```typescript
<Table
  data={patients}
  columns={columns}
  isLoading={isLoadingPatients}
/>
```

### With Custom Empty Message

```typescript
<Table
  data={patients}
  columns={columns}
  emptyMessage="No patients found. Try adjusting your filters."
/>
```

### With Custom Row Click Handler

```typescript
<Table
  data={patients}
  columns={columns}
  onRowClick={(patient) => {
    navigation.navigate('PatientDetail', { patientId: patient.id });
  }}
/>
```

## Data Requirements

The MobileTable component expects patient data with the following structure:

```typescript
interface PatientData {
  _id?: string;           // Patient ID
  id?: string;            // Alternative ID field
  lastName?: string;      // Last name/initial
  dob?: string | Date;    // Date of birth
  city?: string;          // City
  country?: string;       // Country
  language?: string;      // Language
  chiefComplaint?: string; // Chief complaint
  status?: string;        // Status
  priority?: string;      // Priority level
  specialty?: string;     // Medical specialty
  dashboardNotes?: string; // Notes
  triagedBy?: {           // Triaged by (can be object or string)
    firstName?: string;
    lastName?: string;
  } | string;
  doctor?: {              // Doctor (can be object or string)
    firstName?: string;
    lastName?: string;
  } | string;
}
```

## Styling

The component uses the theme system from `@/utils/theme` and `@/utils/colors`:

```typescript
import { lightTheme, spacing, borderRadius, typography } from '@/utils/theme';
import { palette } from '@/utils/colors';
```

### Customization

You can customize colors by passing CSS class names:

```typescript
<Table
  data={patients}
  columns={columns}
  backgroundColor="surface"
  textColor="text"
  borderColor="border"
/>
```

## Card Layout Structure

Each card contains:

1. **Top Section** (Patient Basic Info)
   - Row 1: Last Initial | Age
   - Row 2: Location | Language
   - Chief Complaint (if present)

2. **Divider**

3. **Bottom Section** (Medical Info)
   - Patient ID
   - Status
   - Priority
   - Specialty
   - Additional Notes (if present)
   - Triaged By | Doctor (side by side)

4. **Actions Section** (if provided)

## Mobile Features

- Touch-optimized card layout
- ScrollView for vertical scrolling
- ActivityIndicator for loading states
- TouchableOpacity for row interactions
- Automatic icons for common fields
- Built-in patient data formatting

## Performance Tips

1. **Memoization**: Consider memoizing your data and columns:
```typescript
const columns = useMemo(() => [...], []);
const data = useMemo(() => patients, [patients]);
```

2. **Virtual Lists**: For very large datasets (100+ items), consider using `FlatList` instead:
```typescript
// See MobilePatientDashboardTable.tsx for FlatList implementation example
```

3. **Avoid Inline Functions**: Define `renderActions` and `onRowClick` outside render:
```typescript
const handleRowClick = useCallback((patient) => {
  // handle click
}, []);
```

## Related Components

- `Card` - Used for card container
- `CardContent` - Used for card content
- `Button` - Common for action buttons
- `Badge` - Can be used in `renderActions`

## Examples

See `USAGE_EXAMPLES.md` for comprehensive examples, and `MobilePatientDashboardTable.tsx` for a complete real-world implementation with patient data.

## Troubleshooting

### Icons not showing
Ensure `lucide-react-native` is installed:
```bash
npm install lucide-react-native
```

### Styling issues
Check that theme utilities are properly set up:
- `@/utils/theme`
- `@/utils/colors`

### Data not displaying
Verify your data structure matches the expected format (see Data Requirements section).

## Future Enhancements

- [ ] Sorting functionality
- [ ] Filtering support
- [ ] Pagination
- [ ] Pull-to-refresh
- [ ] Swipe actions
- [ ] Collapsible sections
- [ ] Custom card layouts
- [ ] Virtual scrolling for large datasets