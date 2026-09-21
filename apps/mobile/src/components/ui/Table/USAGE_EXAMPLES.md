# Table Component Usage Examples

## Table of Contents
- [Basic Usage](#basic-usage)
- [With Patient Data](#with-patient-data)
- [With Actions](#with-actions)
- [With Loading State](#with-loading-state)
- [With Custom Columns](#with-custom-columns)
- [Real-World Example](#real-world-example)
- [Integration Patterns](#integration-patterns)

---

## Basic Usage

### Simple Table

```typescript
import { Table } from '@/components/ui/Table';
import type { TableColumn } from '@/components/ui/Table';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

const UserList = () => {
  const users: User[] = [
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'Admin' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'User' },
  ];

  const columns: TableColumn<User>[] = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
  ];

  return (
    <Table
      data={users}
      columns={columns}
    />
  );
};
```

---

## With Patient Data

### Patient Dashboard Table

```typescript
import { Table } from '@/components/ui/Table';
import type { TableColumn } from '@/components/ui/Table';
import { useNavigation } from '@react-navigation/native';

interface Patient {
  _id: string;
  lastName: string;
  dob: string;
  city: string;
  country: string;
  language: string;
  chiefComplaint: string;
  status: string;
  priority: string;
  specialty: string;
  dashboardNotes?: string;
  triagedBy?: {
    firstName: string;
    lastName: string;
  };
  doctor?: {
    firstName: string;
    lastName: string;
  };
}

const PatientDashboard = () => {
  const navigation = useNavigation();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const data = await fetchPatients();
      setPatients(data);
    } catch (error) {
      console.error('Failed to load patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePatientClick = (patient: Patient) => {
    navigation.navigate('PatientDetail', { patientId: patient._id });
  };

  const columns: TableColumn<Patient>[] = [
    { key: '_id', label: 'Patient ID' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'status', label: 'Status' },
    { key: 'priority', label: 'Priority' },
  ];

  return (
    <Table
      data={patients}
      columns={columns}
      onRowClick={handlePatientClick}
      isLoading={loading}
      emptyMessage="No patients found"
    />
  );
};
```

---

## With Actions

### Table with Edit and Delete Actions

```typescript
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { View, StyleSheet, Alert } from 'react-native';

const PatientsWithActions = () => {
  const [patients, setPatients] = useState<Patient[]>([]);

  const handleEdit = (patient: Patient) => {
    navigation.navigate('EditPatient', { patientId: patient._id });
  };

  const handleDelete = (patient: Patient) => {
    Alert.alert(
      'Delete Patient',
      `Are you sure you want to delete patient ${patient.lastName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deletePatient(patient._id),
        },
      ]
    );
  };

  const deletePatient = async (patientId: string) => {
    try {
      await apiDeletePatient(patientId);
      setPatients(prev => prev.filter(p => p._id !== patientId));
    } catch (error) {
      Alert.alert('Error', 'Failed to delete patient');
    }
  };

  const columns: TableColumn<Patient>[] = [
    { key: '_id', label: 'ID' },
    { key: 'lastName', label: 'Name' },
    { key: 'status', label: 'Status' },
  ];

  return (
    <Table
      data={patients}
      columns={columns}
      renderActions={(patient) => (
        <View style={styles.actions}>
          <Button
            onPress={() => handleEdit(patient)}
            variant="outline"
            style={styles.actionButton}
          >
            Edit
          </Button>
          <Button
            onPress={() => handleDelete(patient)}
            variant="destructive"
            style={styles.actionButton}
          >
            Delete
          </Button>
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
  },
});
```

---

## With Loading State

### Table with Loading and Error States

```typescript
import { Table } from '@/components/ui/Table';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from '@/components/ui/Button';

const PatientsWithStates = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPatients = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchPatients();
      setPatients(data);
    } catch (err) {
      setError('Failed to load patients. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  const columns: TableColumn<Patient>[] = [
    { key: '_id', label: 'ID' },
    { key: 'lastName', label: 'Name' },
    { key: 'status', label: 'Status' },
  ];

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button onPress={loadPatients}>Retry</Button>
      </View>
    );
  }

  return (
    <Table
      data={patients}
      columns={columns}
      isLoading={loading}
      emptyMessage="No patients found. Try adjusting your filters."
    />
  );
};

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    marginBottom: 16,
    textAlign: 'center',
  },
});
```

---

## With Custom Columns

### Custom Rendering and Formatting

```typescript
import { Table } from '@/components/ui/Table';
import type { TableColumn } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { View, Text } from 'react-native';

const PatientsWithCustomColumns = () => {
  const [patients, setPatients] = useState<Patient[]>([]);

  const columns: TableColumn<Patient>[] = [
    {
      key: '_id',
      label: 'Patient ID',
      render: (patient) => (
        <Text style={{ fontWeight: 'bold' }}>
          #{patient._id.slice(-6).toUpperCase()}
        </Text>
      ),
    },
    {
      key: 'lastName',
      label: 'Patient Name',
      render: (patient) => (
        <Text>Patient {patient.lastName}</Text>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (patient) => {
        const variant = 
          patient.status === 'Completed' ? 'success' :
          patient.status === 'In Progress' ? 'warning' :
          'default';
        
        return (
          <Badge variant={variant}>
            {patient.status}
          </Badge>
        );
      },
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (patient) => {
        const variant =
          patient.priority === 'High' ? 'destructive' :
          patient.priority === 'Medium' ? 'warning' :
          'default';
        
        return (
          <Badge variant={variant}>
            {patient.priority}
          </Badge>
        );
      },
    },
  ];

  return (
    <Table
      data={patients}
      columns={columns}
    />
  );
};
```

---

## Real-World Example

### Complete Patient Dashboard Implementation

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, RefreshControl } from 'react-native';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { TableColumn } from '@/components/ui/Table';
import { useNavigation } from '@react-navigation/native';
import { useToast } from '@/hooks/useToast';
import type { Patient } from '@/types/patient';

const PatientDashboardScreen = () => {
  const navigation = useNavigation();
  const { toast } = useToast();
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);

  // Load patients on mount
  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/patients');
      const data = await response.json();
      setPatients(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load patients',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPatients();
  }, []);

  const handlePatientClick = useCallback((patient: Patient) => {
    setSelectedPatient(patient._id);
    navigation.navigate('PatientDetail', { 
      patientId: patient._id,
      patientName: patient.lastName,
    });
  }, [navigation]);

  const handleAssignDoctor = useCallback(async (patient: Patient) => {
    try {
      navigation.navigate('AssignDoctor', { patientId: patient._id });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to assign doctor',
        variant: 'destructive',
      });
    }
  }, [navigation, toast]);

  const handleUpdateStatus = useCallback(async (patient: Patient, newStatus: string) => {
    try {
      await fetch(`/api/patients/${patient._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      
      setPatients(prev =>
        prev.map(p => p._id === patient._id ? { ...p, status: newStatus } : p)
      );
      
      toast({
        title: 'Success',
        description: 'Patient status updated',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const columns: TableColumn<Patient>[] = [
    { key: '_id', label: 'ID' },
    { key: 'lastName', label: 'Name' },
    { key: 'status', label: 'Status' },
    { key: 'priority', label: 'Priority' },
    { key: 'specialty', label: 'Specialty' },
  ];

  return (
    <View style={styles.container}>
      <Table
        data={patients}
        columns={columns}
        onRowClick={handlePatientClick}
        isLoading={loading}
        emptyMessage="No patients in the queue"
        renderActions={(patient) => (
          <View style={styles.actions}>
            <Button
              onPress={() => handleAssignDoctor(patient)}
              variant="outline"
              size="sm"
              style={styles.actionButton}
              disabled={!!patient.doctor}
            >
              {patient.doctor ? 'Doctor Assigned' : 'Assign Doctor'}
            </Button>
            <Button
              onPress={() => handleUpdateStatus(patient, 'In Progress')}
              variant="default"
              size="sm"
              style={styles.actionButton}
              disabled={patient.status === 'Completed'}
            >
              Start Consultation
            </Button>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
  },
});

export default PatientDashboardScreen;
```

---

## Integration Patterns

### With React Query

```typescript
import { Table } from '@/components/ui/Table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const PatientsWithReactQuery = () => {
  const queryClient = useQueryClient();
  
  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: fetchPatients,
  });

  const deleteMutation = useMutation({
    mutationFn: deletePatient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      toast({ title: 'Patient deleted successfully' });
    },
  });

  const columns: TableColumn<Patient>[] = [
    { key: '_id', label: 'ID' },
    { key: 'lastName', label: 'Name' },
  ];

  return (
    <Table
      data={patients}
      columns={columns}
      isLoading={isLoading}
      renderActions={(patient) => (
        <Button
          onPress={() => deleteMutation.mutate(patient._id)}
          variant="destructive"
        >
          Delete
        </Button>
      )}
    />
  );
};
```

### With Context

```typescript
import { Table } from '@/components/ui/Table';
import { usePatients } from '@/contexts/PatientsContext';

const PatientsWithContext = () => {
  const {
    patients,
    loading,
    selectPatient,
    updatePatientStatus,
  } = usePatients();

  const columns: TableColumn<Patient>[] = [
    { key: '_id', label: 'ID' },
    { key: 'lastName', label: 'Name' },
  ];

  return (
    <Table
      data={patients}
      columns={columns}
      isLoading={loading}
      onRowClick={selectPatient}
      renderActions={(patient) => (
        <Button
          onPress={() => updatePatientStatus(patient._id, 'In Progress')}
        >
          Start Consultation
        </Button>
      )}
    />
  );
};
```

### With Filters

```typescript
import { Table } from '@/components/ui/Table';
import { useState, useMemo } from 'react';

const PatientsWithFilters = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const filteredPatients = useMemo(() => {
    return patients.filter(patient => {
      const matchesStatus = 
        statusFilter === 'all' || patient.status === statusFilter;
      const matchesPriority = 
        priorityFilter === 'all' || patient.priority === priorityFilter;
      
      return matchesStatus && matchesPriority;
    });
  }, [patients, statusFilter, priorityFilter]);

  const columns: TableColumn<Patient>[] = [
    { key: '_id', label: 'ID' },
    { key: 'lastName', label: 'Name' },
  ];

  return (
    <View>
      {/* Filter UI */}
      <View style={styles.filters}>
        {/* Status filter */}
        {/* Priority filter */}
      </View>
      
      <Table
        data={filteredPatients}
        columns={columns}
        emptyMessage="No patients match your filters"
      />
    </View>
  );
};
```

---

## Tips & Best Practices

1. **Performance**: Use `useMemo` for columns and filtered data
2. **Callbacks**: Use `useCallback` for event handlers
3. **Types**: Always define proper TypeScript interfaces
4. **Error Handling**: Always handle loading and error states
5. **Accessibility**: Ensure buttons and interactive elements are accessible
6. **Loading States**: Show loading indicators for better UX
7. **Empty States**: Provide helpful empty state messages
8. **Actions**: Keep action buttons consistent and clear

---

## Common Patterns

### Pull to Refresh
```typescript
<ScrollView
  refreshControl={
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  }
>
  <Table data={patients} columns={columns} />
</ScrollView>
```

### Search Integration
```typescript
const [searchQuery, setSearchQuery] = useState('');
const filteredData = useMemo(() => 
  patients.filter(p => 
    p.lastName.toLowerCase().includes(searchQuery.toLowerCase())
  ),
  [patients, searchQuery]
);
```

### Pagination (Future)
```typescript
const [page, setPage] = useState(1);
const pageSize = 20;
const paginatedData = useMemo(() => 
  patients.slice((page - 1) * pageSize, page * pageSize),
  [patients, page]
);
```
