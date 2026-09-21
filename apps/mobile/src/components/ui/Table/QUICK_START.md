# Table Component Quick Start Guide

## 🚀 Get Started in 2 Minutes

### 1. Import the Component

```typescript
import { Table } from '@/components/ui/Table';
import type { TableColumn } from '@/components/ui/Table';
```

### 2. Define Your Data Type

```typescript
interface Patient {
  _id: string;
  lastName: string;
  dob: string;
  city: string;
  country: string;
  status: string;
  // ... other fields
}
```

### 3. Define Columns

```typescript
const columns: TableColumn<Patient>[] = [
  { key: '_id', label: 'Patient ID' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'status', label: 'Status' },
];
```

### 4. Use the Table

```typescript
const MyScreen = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load your data
    fetchPatients().then(data => {
      setPatients(data);
      setLoading(false);
    });
  }, []);

  return (
    <Table
      data={patients}
      columns={columns}
      isLoading={loading}
    />
  );
};
```

## ✨ That's It!

You now have a fully functional table with:
- ✅ Card-based layout optimized for mobile
- ✅ Loading state
- ✅ Empty state
- ✅ Touch interactions
- ✅ Automatic formatting

---

## 🎯 Common Use Cases

### Add Row Click Handler

```typescript
<Table
  data={patients}
  columns={columns}
  onRowClick={(patient) => {
    navigation.navigate('PatientDetail', { id: patient._id });
  }}
/>
```

### Add Action Buttons

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

### Custom Empty Message

```typescript
<Table
  data={patients}
  columns={columns}
  emptyMessage="No patients found. Try adjusting your filters."
/>
```

---

## 📊 Patient Data Format

The Table automatically formats patient data if your items have these fields:

```typescript
{
  _id: string,              // Patient ID
  lastName: string,         // Last name/initial
  dob: string,              // Date of birth (converted to age)
  city: string,             // City
  country: string,          // Country (formatted with city)
  language: string,         // Language (with icon)
  chiefComplaint: string,   // Chief complaint (highlighted)
  status: string,           // Status (with icon)
  priority: string,         // Priority (with icon)
  specialty: string,        // Specialty (with icon)
  dashboardNotes: string,   // Notes (collapsible)
  triagedBy: {...},         // Triaged by user
  doctor: {...}             // Assigned doctor
}
```

---

## 🎨 Automatic Features

### Icons
The Table automatically shows icons for:
- 🆔 Patient ID
- 📊 Status
- ⚠️ Priority
- 🩺 Specialty/Doctor
- 🌐 Language
- 👤 User/Triaged By
- 📝 Notes

### Formatting
- Age calculated from DOB
- Location formatted as "City, Country"
- Nested objects handled (e.g., `doctor.firstName`)

### States
- Loading spinner
- Empty state message
- Touch feedback on cards

---

## 📱 Example Screens

### Patient Dashboard

```typescript
import { Table } from '@/components/ui/Table';
import type { TableColumn } from '@/components/ui/Table';

const PatientDashboard = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  const columns: TableColumn<Patient>[] = [
    { key: '_id', label: 'ID' },
    { key: 'lastName', label: 'Name' },
    { key: 'status', label: 'Status' },
  ];

  return (
    <View style={{ flex: 1 }}>
      <Table
        data={patients}
        columns={columns}
        onRowClick={(patient) => 
          navigation.navigate('PatientDetail', { id: patient._id })
        }
        isLoading={loading}
      />
    </View>
  );
};
```

---

## 🔧 Troubleshooting

### Table not showing?
- Check if `data` array has items
- Verify `columns` are defined
- Check console for errors

### Icons not appearing?
- Ensure `lucide-react-native` is installed
- Check import paths

### Styling looks wrong?
- Verify theme utils are set up: `@/utils/theme`
- Check color utils: `@/utils/colors`

---

## 📚 Learn More

- **Full Documentation**: See `README.md`
- **More Examples**: See `USAGE_EXAMPLES.md`
- **Testing Guide**: See `CHECKLIST.md`

---

## 🎉 You're Ready!

Start using the Table component in your screens. It's that simple!

```typescript
<Table data={myData} columns={myColumns} />
```

For more advanced features, check out the full documentation.