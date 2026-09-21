// apps/mobile/src/screens/patient-detail/usePatientDetailViewModel.ts
// View model hook for patient detail screen - handles data fetching and state management

import { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '../../config';
import { storageUtils } from '../../utils/storage';

export interface PatientInfo {
  id: string;
  name?: string;
  lastName?: string;
  firstName?: string;
  dob?: string | Date;
  phone?: string;
  email?: string;
  city?: string;
  country?: string;
  language?: string;
  hospital?: string;
  priority?: string;
  status?: string;
  chiefComplaint?: string;
  diagnosis?: string;
  icd10?: string;
  allergies?: string;
  genderPreference?: string;
  previouslyRegistered?: boolean;
  baselineAmbu?: string;
  occupation?: string;
  pmhx?: string; // Past Medical History
  pshx?: string; // Past Surgical History
  famhx?: string; // Family History
  smokeCount?: string;
  drinkCount?: string;
  otherDrugs?: string;
  prevMeds?: string;
  currentMeds?: string;
  coordinatorId?: string;
  triagedBy?: string;
  doctor?: string;
  specialty?: string;
  specialties?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  startDate?: string;
  endDate?: string;
  prescribedBy?: string;
  notes?: string;
  status?: 'active' | 'completed' | 'discontinued';
}

export interface Note {
  id: string;
  content: string;
  type?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video' | 'document';
  filename?: string;
  uploadedAt?: string;
  uploadedBy?: string;
}

export interface UsePatientDetailViewModelReturn {
  // Patient Info State
  patientInfo: PatientInfo | null;
  loadingPatientInfo: boolean;
  patientError: string | null;

  // Medications State
  medications: Medication[];
  loadingMedications: boolean;
  medicationsError: string | null;

  // Notes State
  notes: Note[];
  loadingNotes: boolean;
  notesError: string | null;

  // Media State
  media: MediaItem[];
  loadingMedia: boolean;
  mediaError: string | null;

  // Actions
  fetchPatientData: () => Promise<void>;
  updatePatientInfo: (updates: Partial<PatientInfo>) => Promise<void>;
  addNote: (content: string, type?: string) => Promise<void>;
  updateNote: (noteId: string, content: string) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  addMedication: (medication: Omit<Medication, '_id'>) => Promise<void>;
  updateMedication: (medicationId: string, updates: Partial<Medication>) => Promise<void>;
  deleteMedication: (medicationId: string) => Promise<void>;
  uploadMedia: (uri: string, type: 'image' | 'video' | 'document') => Promise<void>;
  deleteMedia: (mediaId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function usePatientDetailViewModel(
  patientId: string
): UsePatientDetailViewModelReturn {
  // Patient Info State
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [loadingPatientInfo, setLoadingPatientInfo] = useState(true);
  const [patientError, setPatientError] = useState<string | null>(null);

  // Medications State
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loadingMedications, setLoadingMedications] = useState(false);
  const [medicationsError, setMedicationsError] = useState<string | null>(null);

  // Notes State
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);

  // Media State
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  // Get auth token
  const getAuthToken = useCallback(() => {
    const userData = storageUtils.getUser();
    const token = userData?.token;
    if (!token) {
      throw new Error('No authentication token found');
    }
    return token;
  }, []);

  // Fetch patient info
  const fetchPatientInfo = useCallback(async () => {
    try {
      setLoadingPatientInfo(true);
      setPatientError(null);

      const token = getAuthToken();

      console.log('📥 Fetching patient info:', patientId);

      const response = await fetch(getApiUrl(`/patient/${patientId}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to fetch patient:', response.status, errorText);
        throw new Error(`Failed to fetch patient: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Patient info fetched successfully');
      setPatientInfo(data);
    } catch (err) {
      console.error('❌ Error fetching patient info:', err);
      setPatientError(err instanceof Error ? err.message : 'Failed to load patient');
    } finally {
      setLoadingPatientInfo(false);
    }
  }, [patientId, getAuthToken]);

  // Fetch medications
  const fetchMedications = useCallback(async () => {
    try {
      setLoadingMedications(true);
      setMedicationsError(null);

      const token = getAuthToken();

      console.log('📥 Fetching medications for patient:', patientId);

      const response = await fetch(
        getApiUrl(`/patient/${patientId}/medications`),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch medications: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Medications fetched successfully');
      setMedications(data);
    } catch (err) {
      console.error('❌ Error fetching medications:', err);
      setMedicationsError(
        err instanceof Error ? err.message : 'Failed to load medications'
      );
    } finally {
      setLoadingMedications(false);
    }
  }, [patientId, getAuthToken]);

  // Fetch notes
  const fetchNotes = useCallback(async () => {
    try {
      setLoadingNotes(true);
      setNotesError(null);

      const token = getAuthToken();

      console.log('📥 Fetching notes for patient:', patientId);

      const response = await fetch(getApiUrl(`/patient/${patientId}/notes`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch notes: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Notes fetched successfully');
      setNotes(data);
    } catch (err) {
      console.error('❌ Error fetching notes:', err);
      setNotesError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setLoadingNotes(false);
    }
  }, [patientId, getAuthToken]);

  // Fetch media
  const fetchMedia = useCallback(async () => {
    try {
      setLoadingMedia(true);
      setMediaError(null);

      const token = getAuthToken();

      console.log('📥 Fetching media for patient:', patientId);

      const response = await fetch(getApiUrl(`/patient/${patientId}/media`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch media: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Media fetched successfully');
      setMedia(data);
    } catch (err) {
      console.error('❌ Error fetching media:', err);
      setMediaError(err instanceof Error ? err.message : 'Failed to load media');
    } finally {
      setLoadingMedia(false);
    }
  }, [patientId, getAuthToken]);

  // Fetch all patient data
  const fetchPatientData = useCallback(async () => {
    await Promise.all([
      fetchPatientInfo(),
      fetchMedications(),
      fetchNotes(),
      fetchMedia(),
    ]);
  }, [fetchPatientInfo, fetchMedications, fetchNotes, fetchMedia]);

  // Update patient info
  const updatePatientInfo = useCallback(
    async (updates: Partial<PatientInfo>) => {
      try {
        const token = getAuthToken();

        console.log('💾 Updating patient info:', patientId);

        const response = await fetch(getApiUrl(`/patient/${patientId}`), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Failed to update patient:', response.status, errorText);
          throw new Error(`Failed to update patient: ${response.statusText}`);
        }

        const updatedPatient = await response.json();
        console.log('✅ Patient info updated successfully');
        setPatientInfo(updatedPatient);
      } catch (err) {
        console.error('❌ Error updating patient info:', err);
        throw err;
      }
    },
    [patientId, getAuthToken]
  );

  // Add note
  const addNote = useCallback(
    async (content: string, type?: string) => {
      try {
        const token = getAuthToken();

        console.log('💾 Adding note for patient:', patientId);

        const response = await fetch(getApiUrl(`/patient/${patientId}/notes`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content, type }),
        });

        if (!response.ok) {
          throw new Error(`Failed to add note: ${response.statusText}`);
        }

        const newNote = await response.json();
        console.log('✅ Note added successfully');
        setNotes((prev) => [newNote, ...prev]);
      } catch (err) {
        console.error('❌ Error adding note:', err);
        throw err;
      }
    },
    [patientId, getAuthToken]
  );

  // Update note
  const updateNote = useCallback(
    async (noteId: string, content: string) => {
      try {
        const token = getAuthToken();

        console.log('💾 Updating note:', noteId);

        const response = await fetch(
          getApiUrl(`/patient/${patientId}/notes/${noteId}`),
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ content }),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to update note: ${response.statusText}`);
        }

        const updatedNote = await response.json();
        console.log('✅ Note updated successfully');
        setNotes((prev) =>
          prev.map((note) => (note.id === noteId ? updatedNote : note))
        );
      } catch (err) {
        console.error('❌ Error updating note:', err);
        throw err;
      }
    },
    [patientId, getAuthToken]
  );

  // Delete note
  const deleteNote = useCallback(
    async (noteId: string) => {
      try {
        const token = getAuthToken();

        console.log('🗑️ Deleting note:', noteId);

        const response = await fetch(
          getApiUrl(`/patient/${patientId}/notes/${noteId}`),
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to delete note: ${response.statusText}`);
        }

        console.log('✅ Note deleted successfully');
        setNotes((prev) => prev.filter((note) => note.id !== noteId));
      } catch (err) {
        console.error('❌ Error deleting note:', err);
        throw err;
      }
    },
    [patientId, getAuthToken]
  );

  // Add medication
  const addMedication = useCallback(
    async (medication: Omit<Medication, '_id'>) => {
      try {
        const token = getAuthToken();

        console.log('💾 Adding medication for patient:', patientId);

        const response = await fetch(
          getApiUrl(`/patient/${patientId}/medications`),
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(medication),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to add medication: ${response.statusText}`);
        }

        const newMedication = await response.json();
        console.log('✅ Medication added successfully');
        setMedications((prev) => [newMedication, ...prev]);
      } catch (err) {
        console.error('❌ Error adding medication:', err);
        throw err;
      }
    },
    [patientId, getAuthToken]
  );

  // Update medication
  const updateMedication = useCallback(
    async (medicationId: string, updates: Partial<Medication>) => {
      try {
        const token = getAuthToken();

        console.log('💾 Updating medication:', medicationId);

        const response = await fetch(
          getApiUrl(`/patient/${patientId}/medications/${medicationId}`),
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(updates),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to update medication: ${response.statusText}`);
        }

        const updatedMedication = await response.json();
        console.log('✅ Medication updated successfully');
        setMedications((prev) =>
          prev.map((med) => (med.id === medicationId ? updatedMedication : med))
        );
      } catch (err) {
        console.error('❌ Error updating medication:', err);
        throw err;
      }
    },
    [patientId, getAuthToken]
  );

  // Delete medication
  const deleteMedication = useCallback(
    async (medicationId: string) => {
      try {
        const token = getAuthToken();

        console.log('🗑️ Deleting medication:', medicationId);

        const response = await fetch(
          getApiUrl(`/patient/${patientId}/medications/${medicationId}`),
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to delete medication: ${response.statusText}`);
        }

        console.log('✅ Medication deleted successfully');
        setMedications((prev) =>
          prev.filter((med) => med.id !== medicationId)
        );
      } catch (err) {
        console.error('❌ Error deleting medication:', err);
        throw err;
      }
    },
    [patientId, getAuthToken]
  );

  // Upload media
  const uploadMedia = useCallback(
    async (uri: string, type: 'image' | 'video' | 'document') => {
      try {
        const token = getAuthToken();

        console.log('📤 Uploading media for patient:', patientId);

        // Create FormData for file upload
        const formData = new FormData();
        formData.append('file', {
          uri,
          type: type === 'image' ? 'image/jpeg' : 'video/mp4',
          name: `upload_${Date.now()}.${type === 'image' ? 'jpg' : 'mp4'}`,
        } as any);
        formData.append('type', type);

        const response = await fetch(getApiUrl(`/patient/${patientId}/media`), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload media: ${response.statusText}`);
        }

        const newMedia = await response.json();
        console.log('✅ Media uploaded successfully');
        setMedia((prev) => [newMedia, ...prev]);
      } catch (err) {
        console.error('❌ Error uploading media:', err);
        throw err;
      }
    },
    [patientId, getAuthToken]
  );

  // Delete media
  const deleteMedia = useCallback(
    async (mediaId: string) => {
      try {
        const token = getAuthToken();

        console.log('🗑️ Deleting media:', mediaId);

        const response = await fetch(
          getApiUrl(`/patient/${patientId}/media/${mediaId}`),
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to delete media: ${response.statusText}`);
        }

        console.log('✅ Media deleted successfully');
        setMedia((prev) => prev.filter((item) => item.id !== mediaId));
      } catch (err) {
        console.error('❌ Error deleting media:', err);
        throw err;
      }
    },
    [patientId, getAuthToken]
  );

  // Refresh all data
  const refresh = useCallback(async () => {
    await fetchPatientData();
  }, [fetchPatientData]);

  // Initial load
  useEffect(() => {
    if (patientId) {
      fetchPatientData();
    }
  }, [patientId, fetchPatientData]);

  return {
    // Patient Info State
    patientInfo,
    loadingPatientInfo,
    patientError,

    // Medications State
    medications,
    loadingMedications,
    medicationsError,

    // Notes State
    notes,
    loadingNotes,
    notesError,

    // Media State
    media,
    loadingMedia,
    mediaError,

    // Actions
    fetchPatientData,
    updatePatientInfo,
    addNote,
    updateNote,
    deleteNote,
    addMedication,
    updateMedication,
    deleteMedication,
    uploadMedia,
    deleteMedia,
    refresh,
  };
}
