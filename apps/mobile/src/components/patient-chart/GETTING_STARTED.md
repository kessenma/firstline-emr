# Getting Started with Patient Chart Development

## 🎯 Quick Overview

You now have a fully functional patient chart with:
- ✅ Context-based state management
- ✅ Tabbed navigation interface
- ✅ Patient info section (working)
- ✅ Notes section (working example)
- 🚧 4 more sections ready to build

## 📁 Current Structure

```
components/patient-chart/
├── PatientChartContext.tsx      # State management
├── PatientChartView.tsx          # Main tabbed UI
├── index.ts                      # Exports
│
├── patient-info/                 # ✅ Basic implementation
├── notes/                        # ✅ Full example (NotesView.tsx)
├── medications/                  # 🚧 Ready for development
├── images/                       # 🚧 Ready for development
├── messaging/                    # 🚧 Ready for development
└── video/                        # 🚧 Ready for development
```

## 🚀 How to Add a New Section

### Step 1: Create the Component File

Create `[section]/[Section]View.tsx`:

```tsx
// Example: medications/MedicationsView.tsx
import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { usePatientChart } from '../PatientChartContext';

export const MedicationsView = () => {
  const { rxOrders, medOrders, loadingMedications } = usePatientChart();
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Medications</Text>
      <FlatList
        data={rxOrders}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>{item.prescribingDr}</Text>
            {/* Add more details */}
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 16 },
  card: { backgroundColor: '#fff', padding: 16, marginBottom: 12, borderRadius: 8 },
});
```

### Step 2: Create Index File

Create `[section]/index.ts`:

```tsx
// medications/index.ts
export { MedicationsView } from './MedicationsView';
```

### Step 3: Import and Use in PatientChartView

In `PatientChartView.tsx`:

```tsx
import { MedicationsView } from './medications/MedicationsView';

// In renderTabContent():
case 'medications':
  return <MedicationsView />;
```

### Step 4: Test!

Navigate to a patient and click the "Meds" tab.

## 📊 Available Data from Context

```tsx
const {
  // Patient Info
  patientInfo,           // Full patient details
  patientViewModel,      // PatientInfoViewModel instance
  loadingPatientInfo,    // boolean
  patientError,          // string | null
  
  // Notes
  notes,                 // Note[] - published notes
  draftNotes,            // Note[] - draft notes
  loadingNotes,          // boolean
  notesError,            // string | null
  
  // Medications
  rxOrders,              // RxOrder[] - prescriptions
  medOrders,             // MedOrder[] - medical orders
  loadingMedications,    // boolean
  medicationsError,      // string | null
  
  // Media
  photos,                // MediaItem[] - patient images
  loadingMedia,          // boolean
  mediaError,            // string | null
  
  // UI State
  activeTab,             // string - current tab ID
  setActiveTab,          // (tab: string) => void
  isExpanded,            // boolean
  toggleExpand,          // () => void
  
  // Actions
  fetchPatientData,      // () => Promise<void>
  refreshPatientInfo,    // () => Promise<void>
  refreshNotes,          // () => Promise<void>
  refreshMedications,    // () => Promise<void>
  refreshMedia,          // () => Promise<void>
  
  // Operations
  setPatientInfo,        // (info: PatientInfo | null) => void
  addRxOrder,            // (order: RxOrder) => void
  addMedOrder,           // (order: MedOrder) => void
  setPatientPhotos,      // Dispatch<SetStateAction<MediaItem[]>>
} = usePatientChart();
```

## 🎨 Design Patterns to Follow

### 1. Look at NotesView for Reference

The `notes/NotesView.tsx` is a complete example showing:
- ✅ Pull-to-refresh
- ✅ Loading states
- ✅ Error handling
- ✅ Empty states
- ✅ Tab switching (Published/Drafts)
- ✅ Action buttons
- ✅ Proper styling

### 2. Common Layout Structure

```tsx
<View style={styles.container}>
  {/* Header with Title + Action Button */}
  <View style={styles.header}>
    <Text style={styles.title}>Section Title</Text>
    <TouchableOpacity style={styles.addButton}>
      <Plus size={20} color="#fff" />
      <Text>Add</Text>
    </TouchableOpacity>
  </View>
  
  {/* Content Area */}
  {loading ? (
    <LoadingView />
  ) : error ? (
    <ErrorView />
  ) : (
    <FlatList
      data={items}
      renderItem={renderItem}
      ListEmptyComponent={<EmptyState />}
      refreshControl={<RefreshControl />}
    />
  )}
</View>
```

### 3. Standard Card Component

```tsx
const ItemCard = ({ item }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Icon size={18} color="#476cc9" />
      <Text style={styles.cardTitle}>{item.title}</Text>
    </View>
    <Text style={styles.cardContent}>{item.content}</Text>
    <View style={styles.cardFooter}>
      <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
    </View>
    <View style={styles.cardActions}>
      <ActionButton icon={Edit2} label="Edit" />
      <ActionButton icon={Trash2} label="Delete" color="#e63946" />
    </View>
  </View>
);
```

## 🎯 Next Section Priorities

### 1. Medications Section (High Priority)
**Files to create:**
- `medications/MedicationsView.tsx`
- `medications/RxOrderCard.tsx`
- `medications/MedOrderCard.tsx`
- `medications/index.ts`

**Data available:**
- `rxOrders` - Prescription orders
- `medOrders` - Medical orders
- `loadingMedications`

**Features to include:**
- List of active medications
- Prescription history
- Med order tracking
- Add new prescription button

### 2. Images Section (Medium Priority)
**Files to create:**
- `images/ImagesView.tsx`
- `images/ImageGallery.tsx`
- `images/ImageUpload.tsx`
- `images/index.ts`

**Data available:**
- `photos` - MediaItem[]
- `setPatientPhotos`

**Features to include:**
- Grid gallery view
- Full-screen image viewer
- Upload button
- Delete capability

### 3. Messaging Section (Medium Priority)
**Files to create:**
- `messaging/MessagingView.tsx`
- `messaging/MessageBubble.tsx`
- `messaging/MessageComposer.tsx`
- `messaging/index.ts`

**Integration needed:**
- Connect to Telegram API
- Display message history
- Send/receive messages
- Show online status

### 4. Video Section (Low Priority)
**Files to create:**
- `video/VideoView.tsx`
- `video/VideoCallControls.tsx`
- `video/index.ts`

**Features to include:**
- Schedule consultation
- Join video call
- Call history
- Recording access

## 🛠️ Development Tips

### Styling

Use consistent colors:
```tsx
const colors = {
  primary: '#476cc9',
  secondary: '#2a3867',
  background: '#fff9f4',
  surface: '#fff',
  text: '#040f32',
  textSecondary: '#666',
  border: '#e0e0e0',
  success: '#2a9d8f',
  error: '#e63946',
  warning: '#ffeaa7',
};
```

### Icons

Use lucide-react-native consistently:
```tsx
import { 
  FileText,    // Notes
  Pill,        // Medications
  Image,       // Images
  MessageSquare, // Messaging
  Video,       // Video
  Plus,        // Add
  Edit2,       // Edit
  Trash2,      // Delete
  Save,        // Save
  X,           // Close
  ChevronLeft, // Back
  RefreshCw,   // Refresh
} from 'lucide-react-native';
```

### Date Formatting

```tsx
const formatDate = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDateTime = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
```

### Loading States

```tsx
if (loading && !refreshing) {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#476cc9" />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
}
```

### Error States

```tsx
if (error) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity 
        style={styles.retryButton} 
        onPress={handleRefresh}
      >
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### Empty States

```tsx
const EmptyState = () => (
  <View style={styles.emptyContainer}>
    <Icon size={64} color="#ccc" />
    <Text style={styles.emptyTitle}>No items found</Text>
    <Text style={styles.emptySubtitle}>
      Items will appear here once added
    </Text>
  </View>
);
```

## 🧪 Testing Your Section

1. **Navigate to Patient Chart**
   ```
   Dashboard → Click Patient → Should open Patient Chart
   ```

2. **Click Your Tab**
   - Should show your component
   - Loading state should appear first
   - Data should populate when loaded

3. **Test Pull-to-Refresh**
   - Pull down on the list
   - Should show refresh spinner
   - Data should reload

4. **Test Empty State**
   - When no data exists
   - Should show friendly empty message

5. **Test Error State**
   - Simulate API failure
   - Should show error with retry button

## 📚 Additional Resources

- **Context API**: `PatientChartContext.tsx`
- **Example Component**: `notes/NotesView.tsx`
- **Type Definitions**: All types exported from context
- **Web Reference**: `apps/web/components/patient-chart/`

## 🐛 Common Issues

### "Cannot find module"
Make sure you're importing from the correct path:
```tsx
import { usePatientChart } from '../PatientChartContext';
```

### "Property does not exist on type"
Check that you're using the correct type from context:
```tsx
import type { Note, RxOrder, MedOrder } from '../PatientChartContext';
```

### Data not loading
Check the console logs - the context includes extensive logging:
```
PatientChartContext - fetchPatientData called for: [patientId]
```

## ✅ Checklist for Each Section

- [ ] Create section component file
- [ ] Import and use context hook
- [ ] Implement loading state
- [ ] Implement error state
- [ ] Implement empty state
- [ ] Add pull-to-refresh
- [ ] Style consistently
- [ ] Add action buttons (Add, Edit, Delete)
- [ ] Create index.ts export
- [ ] Import in PatientChartView.tsx
- [ ] Test navigation
- [ ] Test data loading
- [ ] Test refresh functionality

## 🎉 You're Ready!

Start with the section that's most important for your workflow. The notes section is a complete reference implementation - copy its patterns and adapt to your needs.

Happy coding! 🚀