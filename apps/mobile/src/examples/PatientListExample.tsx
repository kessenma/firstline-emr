import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useDatabase } from '../contexts/DatabaseContext';
// import { MutableDocument } from 'cbl-reactnative';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  diagnosis?: string;
  lastVisit?: string;
}

/**
 * Example component demonstrating Couchbase Lite CRUD operations
 * This shows how to:
 * - Create patient records
 * - Query and display patients
 * - Update patient information
 * - Delete patient records
 */
export default function PatientListExample() {
  const { databaseService, isInitialized } = useDatabase();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [loading, setLoading] = useState(false);

  // Load patients when database is ready
  useEffect(() => {
    if (isInitialized && databaseService) {
      loadPatients();
    }
  }, [isInitialized, databaseService]);

  /**
   * Load all patients from the database
   */
  const loadPatients = async () => {
    try {
      const collection = databaseService?.getDefaultCollection();
      if (!collection) {
        console.warn('Collection not available');
        return;
      }

      // Get all documents from the collection
      const documents = await collection.getDocuments();
      const patientList: Patient[] = [];

      for (const docId of documents) {
        const doc = await collection.document(docId);
        if (doc && doc.getString('type') === 'patient') {
          patientList.push({
            id: docId,
            firstName: doc.getString('firstName') || '',
            lastName: doc.getString('lastName') || '',
            age: doc.getNumber('age') || 0,
            diagnosis: doc.getString('diagnosis'),
            lastVisit: doc.getString('lastVisit'),
          });
        }
      }

      setPatients(patientList);
      console.log(`Loaded ${patientList.length} patients`);
    } catch (error) {
      console.error('Error loading patients:', error);
      Alert.alert('Error', 'Failed to load patients');
    }
  };

  /**
   * Add a new patient to the database
   */
  const addPatient = async () => {
    if (!firstName.trim() || !lastName.trim() || !age.trim()) {
      Alert.alert('Validation Error', 'Please fill in all fields');
      return;
    }

    const patientAge = parseInt(age, 10);
    if (isNaN(patientAge) || patientAge < 0 || patientAge > 150) {
      Alert.alert('Validation Error', 'Please enter a valid age');
      return;
    }

    setLoading(true);
    try {
      const collection = databaseService?.getDefaultCollection();
      if (!collection) {
        throw new Error('Collection not available');
      }

      // Create a new patient document
      const patientId = `patient::${Date.now()}`;
      // Note: MutableDocument from cbl-reactnative is not available
      // const doc = new MutableDocument(patientId)
      const doc = {
        id: patientId,
        type: 'patient',
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        age: patientAge,
        createdAt: new Date().toISOString(),
        lastVisit: new Date().toISOString(),
      };

      // Save to collection
      await collection.save(doc);
      console.log(`Patient ${patientId} saved successfully`);

      // Clear form
      setFirstName('');
      setLastName('');
      setAge('');

      // Reload patients
      await loadPatients();

      Alert.alert('Success', 'Patient added successfully');
    } catch (error) {
      console.error('Error adding patient:', error);
      Alert.alert('Error', 'Failed to add patient');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete a patient from the database
   */
  const deletePatient = async (patientId: string, patientName: string) => {
    Alert.alert('Confirm Delete', `Are you sure you want to delete ${patientName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const collection = databaseService?.getDefaultCollection();
            if (!collection) {
              throw new Error('Collection not available');
            }

            const doc = await collection.document(patientId);
            if (doc) {
              await collection.deleteDocument(doc);
              console.log(`Patient ${patientId} deleted`);
              await loadPatients();
              Alert.alert('Success', 'Patient deleted successfully');
            }
          } catch (error) {
            console.error('Error deleting patient:', error);
            Alert.alert('Error', 'Failed to delete patient');
          }
        },
      },
    ]);
  };

  /**
   * Update a patient's last visit date
   */
  const updateLastVisit = async (patientId: string) => {
    try {
      const collection = databaseService?.getDefaultCollection();
      if (!collection) {
        throw new Error('Collection not available');
      }

      const doc = await collection.document(patientId);
      if (doc) {
        const mutableDoc = doc.toMutable();
        mutableDoc.setString('lastVisit', new Date().toISOString());
        await collection.save(mutableDoc);
        console.log(`Updated last visit for ${patientId}`);
        await loadPatients();
      }
    } catch (error) {
      console.error('Error updating patient:', error);
      Alert.alert('Error', 'Failed to update patient');
    }
  };

  const renderPatient = ({ item }: { item: Patient }) => (
    <View style={styles.patientCard}>
      <View style={styles.patientInfo}>
        <Text style={styles.patientName}>
          {item.firstName} {item.lastName}
        </Text>
        <Text style={styles.patientDetail}>Age: {item.age}</Text>
        {item.lastVisit && (
          <Text style={styles.patientDetail}>
            Last Visit: {new Date(item.lastVisit).toLocaleDateString()}
          </Text>
        )}
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.updateButton} onPress={() => updateLastVisit(item.id)}>
          <Text style={styles.buttonText}>Check-in</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deletePatient(item.id, `${item.firstName} ${item.lastName}`)}
        >
          <Text style={styles.buttonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!isInitialized) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Initializing database...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Patient Management</Text>
      <Text style={styles.subtitle}>Couchbase Lite Example</Text>

      {/* Add Patient Form */}
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="First Name"
          value={firstName}
          onChangeText={setFirstName}
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Last Name"
          value={lastName}
          onChangeText={setLastName}
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Age"
          value={age}
          onChangeText={setAge}
          keyboardType="numeric"
          editable={!loading}
        />
        <TouchableOpacity
          style={[styles.addButton, loading && styles.disabledButton]}
          onPress={addPatient}
          disabled={loading}
        >
          <Text style={styles.addButtonText}>{loading ? 'Adding...' : 'Add Patient'}</Text>
        </TouchableOpacity>
      </View>

      {/* Patient List */}
      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>Patients ({patients.length})</Text>
        <FlatList
          data={patients}
          renderItem={renderPatient}
          keyExtractor={item => item.id}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No patients found. Add your first patient above.</Text>
          }
          refreshing={loading}
          onRefresh={loadPatients}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 40,
  },
  form: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 4,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#999',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  patientCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  patientInfo: {
    marginBottom: 12,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  patientDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  updateButton: {
    flex: 1,
    backgroundColor: '#34C759',
    padding: 10,
    borderRadius: 4,
    alignItems: 'center',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    padding: 10,
    borderRadius: 4,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    marginTop: 40,
  },
});
