// apps/mobile/src/components/admin/sections/missions/MissionsView.tsx
// Mobile admin missions management — offline-first reads, API writes

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  Zap,
  ZapOff,
  X,
  UserPlus,
  UserMinus,
  MapPin,
  Calendar,
  FileText,
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  Check,
  Hospital,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Eye,
  EyeOff,
} from 'lucide-react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { pick, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../../utils/theme';
import { LoadingState, EmptyState, ConfirmDialog } from '../../shared';
import {
  useMissionsManagementViewModel,
  type MissionWithCount,
  type MissionMember,
  type MissionUrl,
  type MissionAttachment,
  type MissionHospital,
} from '../../../../viewModels/admin/useMissionsManagementViewModel';

// ─── Main Component ─────────────────────────────────────────────────────────

export function MissionsView() {
  const colors = useThemeColors();
  const vm = useMissionsManagementViewModel();

  // Modal visibility
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  // Add-members lives INSIDE the Members modal as a mode toggle — iOS silently
  // refuses to present a second pageSheet Modal while one is already up.
  const [memberModalMode, setMemberModalMode] = useState<'list' | 'add'>('list');
  const [deletingMission, setDeletingMission] = useState<MissionWithCount | null>(null);
  const [archiveChat, setArchiveChat] = useState(true);

  // Editing mission reference
  const [editingMission, setEditingMission] = useState<MissionWithCount | null>(null);

  // Create form state
  const [createForm, setCreateForm] = useState({
    name: '',
    country: '',
    city: '',
    description: '',
    startDate: '',
    endDate: '',
  });
  const [createHospitals, setCreateHospitals] = useState<MissionHospital[]>([]);
  const [createHospitalInput, setCreateHospitalInput] = useState('');
  const [createUrls, setCreateUrls] = useState<MissionUrl[]>([]);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    country: '',
    city: '',
    description: '',
    status: 'planned',
    startDate: '',
    endDate: '',
  });
  const [editHospitals, setEditHospitals] = useState<MissionHospital[]>([]);
  const [editHospitalInput, setEditHospitalInput] = useState('');
  const [editUrls, setEditUrls] = useState<MissionUrl[]>([]);

  // Expandable hospital state
  const [createHospitalExpanded, setCreateHospitalExpanded] = useState<number | null>(null);
  const [editHospitalExpanded, setEditHospitalExpanded] = useState<number | null>(null);

  // Edit confirmation dialog
  const [editConfirmChanges, setEditConfirmChanges] = useState<string[] | null>(null);

  // Add member state
  const [selectedUsersToAdd, setSelectedUsersToAdd] = useState<MissionMember[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  // ─── Handlers ───────────────────────────────────────────────────────────

  const resetCreateForm = useCallback(() => {
    setCreateForm({ name: '', country: '', city: '', description: '', startDate: '', endDate: '' });
    setCreateHospitals([]);
    setCreateHospitalInput('');
    setCreateHospitalExpanded(null);
    setCreateUrls([]);
  }, []);

  const handleCreate = useCallback(async () => {
    if (!createForm.name || !createForm.country) return;
    try {
      await vm.handleCreateMission({
        ...createForm,
        hospitals: createHospitals.length > 0 ? createHospitals : undefined,
        urls: createUrls.length > 0 ? createUrls : undefined,
      });
      resetCreateForm();
      setShowCreate(false);
      Alert.alert('Success', 'Mission created successfully');
    } catch {
      Alert.alert('Error', vm.error || 'Failed to create mission');
    }
  }, [createForm, createHospitals, createUrls, vm, resetCreateForm]);

  const openEdit = useCallback((mission: MissionWithCount) => {
    setEditingMission(mission);
    setEditForm({
      name: mission.name,
      country: mission.country,
      city: mission.city || '',
      description: mission.description || '',
      status: mission.status,
      startDate: mission.startDate || '',
      endDate: mission.endDate || '',
    });
    setEditHospitals(mission.hospitals || []);
    setEditHospitalInput('');
    setEditHospitalExpanded(null);
    setEditUrls(mission.urls || []);
    vm.fetchMissionAttachments(mission.id);
    setShowEdit(true);
  }, [vm]);

  const handleEditClick = useCallback(() => {
    if (!editingMission) return;
    const changes = vm.computeChangeSummary(editingMission, {
      ...editForm,
      hospitals: editHospitals,
      urls: editUrls,
    });
    if (changes.length === 0) {
      setShowEdit(false);
      setEditingMission(null);
      return;
    }
    setEditConfirmChanges(changes);
  }, [editingMission, editForm, editHospitals, editUrls, vm]);

  const handleEditConfirmed = useCallback(async () => {
    if (!editingMission) return;
    setEditConfirmChanges(null);
    try {
      await vm.handleUpdateMission(editingMission.id, {
        ...editForm,
        hospitals: editHospitals,
        urls: editUrls,
      });
      setShowEdit(false);
      setEditingMission(null);
      setEditHospitalExpanded(null);
      Alert.alert('Success', 'Mission updated');
    } catch {
      Alert.alert('Error', vm.error || 'Failed to update mission');
    }
  }, [editingMission, editForm, editHospitals, editUrls, vm]);

  const handleDelete = useCallback(async () => {
    if (!deletingMission) return;
    try {
      await vm.handleDeleteMission(deletingMission.id, archiveChat);
      setDeletingMission(null);
      setArchiveChat(true);
    } catch {
      Alert.alert('Error', vm.error || 'Failed to delete mission');
    }
  }, [deletingMission, archiveChat, vm]);

  const handleToggleActiveIntake = useCallback(async (mission: MissionWithCount) => {
    try {
      await vm.handleSetActiveIntake(mission.isActiveIntake ? null : mission.id);
    } catch {
      Alert.alert('Error', vm.error || 'Failed to update active intake');
    }
  }, [vm]);

  const openMembers = useCallback((missionId: string) => {
    vm.fetchMissionMembers(missionId);
    setMemberModalMode('list');
    setShowMembers(true);
  }, [vm]);

  const openAddMember = useCallback(() => {
    setSelectedUsersToAdd([]);
    setMemberSearchQuery('');
    setMemberModalMode('add');
  }, []);

  const closeMembersModal = useCallback(() => {
    setShowMembers(false);
    setMemberModalMode('list');
    setSelectedUsersToAdd([]);
    setMemberSearchQuery('');
  }, []);

  const toggleUserSelection = useCallback((user: MissionMember) => {
    setSelectedUsersToAdd(prev => {
      const exists = prev.some(u => u.id === user.id);
      if (exists) return prev.filter(u => u.id !== user.id);
      return [...prev, user];
    });
  }, []);

  const handleBulkAddMembers = useCallback(async () => {
    if (!vm.selectedMissionId || selectedUsersToAdd.length === 0) return;
    try {
      await vm.handleAssignMembers(
        vm.selectedMissionId,
        selectedUsersToAdd.map(u => u.id),
      );
      setSelectedUsersToAdd([]);
      setMemberModalMode('list');
      Alert.alert('Success', `Added ${selectedUsersToAdd.length} member(s)`);
    } catch {
      Alert.alert('Error', vm.error || 'Failed to add members');
    }
  }, [vm, selectedUsersToAdd]);

  const handleRemoveMember = useCallback(async (member: MissionMember) => {
    if (!vm.selectedMissionId) return;
    Alert.alert(
      'Remove Member',
      `Remove ${member.firstName} ${member.lastName} from this mission?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await vm.handleRemoveMember(vm.selectedMissionId!, member.id);
            } catch {
              Alert.alert('Error', 'Failed to remove member');
            }
          },
        },
      ],
    );
  }, [vm]);

  const handlePickAttachment = useCallback(async () => {
    if (!editingMission) return;
    try {
      const [file] = await pick({
        type: ['application/pdf', 'image/*'],
      });
      if (!file) return;

      const displayName = file.name || 'Attachment';
      await vm.handleUploadAttachment(
        editingMission.id,
        file.uri,
        file.name || 'file',
        file.type || 'application/octet-stream',
        displayName,
      );
      Alert.alert('Success', 'Attachment uploaded');
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) return;
      Alert.alert('Error', 'Failed to upload attachment');
    }
  }, [editingMission, vm]);

  const handleDeleteAttachment = useCallback(async (att: MissionAttachment) => {
    if (!editingMission) return;
    Alert.alert('Delete Attachment', `Delete "${att.displayName || att.fileName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => vm.handleDeleteAttachment(editingMission.id, att.id),
      },
    ]);
  }, [editingMission, vm]);

  const handlePickHospitalImage = useCallback(async (hospitalIndex: number) => {
    if (!editingMission) return;
    const hospital = editHospitals[hospitalIndex];
    if (!hospital || (hospital.images?.length ?? 0) >= 5) return;

    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
    });

    if (result.assets && result.assets[0]) {
      const asset = result.assets[0];
      const image = await vm.handleUploadHospitalImage(
        editingMission.id,
        hospital.name,
        asset.uri || '',
        asset.fileName || `hospital_${Date.now()}.jpg`,
        asset.type || 'image/jpeg',
      );
      if (image) {
        setEditHospitals(prev => {
          const updated = [...prev];
          updated[hospitalIndex] = {
            ...updated[hospitalIndex],
            images: [...(updated[hospitalIndex].images || []), image],
          };
          return updated;
        });
      }
    }
  }, [editingMission, editHospitals, vm]);

  const handleDeleteHospitalImagePress = useCallback((hospitalIndex: number, imageIndex: number) => {
    if (!editingMission) return;
    const hospital = editHospitals[hospitalIndex];
    const img = hospital?.images?.[imageIndex];
    if (!img) return;

    Alert.alert('Delete Image', `Delete "${img.fileName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const deleted = await vm.handleDeleteHospitalImage(editingMission.id, img.filePath);
          if (deleted) {
            setEditHospitals(prev => {
              const updated = [...prev];
              updated[hospitalIndex] = {
                ...updated[hospitalIndex],
                images: (updated[hospitalIndex].images || []).filter((_, idx) => idx !== imageIndex),
              };
              return updated;
            });
          }
        },
      },
    ]);
  }, [editingMission, editHospitals, vm]);

  const handleSetDefaultIntakeHospital = useCallback(async (mission: MissionWithCount, hospitalName: string | null) => {
    try {
      await vm.handleUpdateMission(mission.id, {
        name: mission.name,
        country: mission.country,
        defaultIntakeHospital: hospitalName,
      });
    } catch {
      Alert.alert('Error', vm.error || 'Failed to update default hospital');
    }
  }, [vm]);

  // Full roster filtered client-side — empty query shows everyone;
  // current mission members are excluded
  const addableUsers = useMemo(() => {
    const memberIds = new Set(vm.selectedMissionMembers.map(m => m.id));
    const q = memberSearchQuery.trim().toLowerCase();
    return vm.allUsersDirectory.filter(u => {
      if (memberIds.has(u.id)) return false;
      if (!q) return true;
      const name = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
      return (
        name.includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.accountType || '').toLowerCase().includes(q)
      );
    });
  }, [vm.allUsersDirectory, vm.selectedMissionMembers, memberSearchQuery]);

  // ─── Status Badge ─────────────────────────────────────────────────────

  const statusBadge = (status: string) => {
    const colorMap: Record<string, { bg: string; text: string }> = {
      planned: { bg: colors.primary + '20', text: colors.primary },
      active: { bg: colors.success + '20', text: colors.success },
      completed: { bg: colors.textSecondary + '20', text: colors.textSecondary },
    };
    const c = colorMap[status] || colorMap.planned;
    return (
      <View style={[styles.badge, { backgroundColor: c.bg }]}>
        <Text style={[styles.badgeText, { color: c.text }]}>{status}</Text>
      </View>
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  if (vm.isLoading) return <LoadingState message="Loading missions..." />;

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={[styles.createButton, { backgroundColor: colors.primary }]}
        onPress={() => { resetCreateForm(); setShowCreate(true); }}
      >
        <Plus size={18} color={colors.textInverse} />
        <Text style={[styles.createButtonText, { color: colors.textInverse }]}>Create Mission</Text>
      </TouchableOpacity>

      {/* Mission List */}
      {vm.missionsData.length === 0 ? (
        <EmptyState title="No missions" message="Create your first mission to get started." />
      ) : (
        vm.missionsData.map((mission) => (
          <View key={mission.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.missionName, { color: colors.text }]}>{mission.name}</Text>
                <View style={styles.locationRow}>
                  <MapPin size={14} color={colors.textSecondary} />
                  <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                    {mission.country}{mission.city ? `, ${mission.city}` : ''}
                  </Text>
                </View>
              </View>
              {statusBadge(mission.status)}
            </View>

            {/* Dates */}
            {(mission.startDate || mission.endDate) && (
              <View style={styles.dateRow}>
                <Calendar size={14} color={colors.textSecondary} />
                <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                  {mission.startDate ? new Date(mission.startDate).toLocaleDateString() : '?'}
                  {' — '}
                  {mission.endDate ? new Date(mission.endDate).toLocaleDateString() : '?'}
                </Text>
              </View>
            )}

            {/* Hospitals */}
            {mission.hospitals.length > 0 && (
              <View style={styles.hospitalRow}>
                {mission.hospitals.map((h, i) => {
                  const name = typeof h === 'string' ? h : h.name;
                  const isPrivate = typeof h !== 'string' && h.visibility === 'private';
                  return (
                    <View key={i} style={[styles.hospitalChip, { backgroundColor: colors.primary + '15' }]}>
                      <Text style={[styles.hospitalChipText, { color: colors.primary }]}>{name}</Text>
                      {isPrivate && (
                        <View style={[styles.visibilityBadge, { backgroundColor: colors.warning + '20' }]}>
                          <Text style={[styles.visibilityBadgeText, { color: colors.warning }]}>Private</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* Default Intake Hospital */}
            {mission.isActiveIntake && mission.hospitals.length > 0 && (
              <View style={styles.defaultHospitalRow}>
                <Text style={[styles.defaultHospitalChipText, { color: colors.textSecondary, alignSelf: 'center' }]}>
                  Default:
                </Text>
                <TouchableOpacity
                  style={[
                    styles.defaultHospitalChip,
                    {
                      borderColor: !mission.defaultIntakeHospital ? colors.primary : colors.border,
                      backgroundColor: !mission.defaultIntakeHospital ? colors.primary + '10' : 'transparent',
                    },
                  ]}
                  onPress={() => handleSetDefaultIntakeHospital(mission, null)}
                >
                  <Text style={[styles.defaultHospitalChipText, { color: !mission.defaultIntakeHospital ? colors.primary : colors.textSecondary }]}>
                    None
                  </Text>
                </TouchableOpacity>
                {mission.hospitals.map((h, i) => {
                  const name = typeof h === 'string' ? h : h.name;
                  const isSelected = mission.defaultIntakeHospital === name;
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.defaultHospitalChip,
                        {
                          borderColor: isSelected ? colors.primary : colors.border,
                          backgroundColor: isSelected ? colors.primary + '10' : 'transparent',
                        },
                      ]}
                      onPress={() => handleSetDefaultIntakeHospital(mission, name)}
                    >
                      <Text style={[styles.defaultHospitalChipText, { color: isSelected ? colors.primary : colors.textSecondary }]}>
                        {name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Actions Row */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: colors.border }]}
                onPress={() => openMembers(mission.id)}
              >
                <Users size={16} color={colors.textSecondary} />
                <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>{mission.memberCount}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  mission.isActiveIntake
                    ? { backgroundColor: colors.success + '20', borderColor: colors.success }
                    : { borderColor: colors.border },
                ]}
                onPress={() => handleToggleActiveIntake(mission)}
              >
                {mission.isActiveIntake
                  ? <Zap size={16} color={colors.success} />
                  : <ZapOff size={16} color={colors.textSecondary} />}
                <Text style={[styles.actionBtnText, { color: mission.isActiveIntake ? colors.success : colors.textSecondary }]}>
                  {mission.isActiveIntake ? 'Active' : 'Set Intake'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: colors.border }]}
                onPress={() => openEdit(mission)}
              >
                <Pencil size={16} color={colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: colors.error + '40' }]}
                onPress={() => { setDeletingMission(mission); setArchiveChat(true); }}
              >
                <Trash2 size={16} color={colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {/* ─── Create Mission Modal ──────────────────────────────────────── */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCreate(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Create Mission</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)}><X size={24} color={colors.text} /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <FormField label="Name *" colors={colors}>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={createForm.name}
                  onChangeText={v => setCreateForm(f => ({ ...f, name: v }))}
                  placeholder="e.g. Jordan Mission 2025"
                  placeholderTextColor={colors.textSecondary}
                />
              </FormField>
              <View style={styles.row}>
                <FormField label="Country *" colors={colors} style={{ flex: 1 }}>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                    value={createForm.country}
                    onChangeText={v => setCreateForm(f => ({ ...f, country: v }))}
                    placeholder="e.g. Jordan"
                    placeholderTextColor={colors.textSecondary}
                  />
                </FormField>
                <FormField label="City" colors={colors} style={{ flex: 1 }}>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                    value={createForm.city}
                    onChangeText={v => setCreateForm(f => ({ ...f, city: v }))}
                    placeholder="e.g. Amman"
                    placeholderTextColor={colors.textSecondary}
                  />
                </FormField>
              </View>

              <HospitalSection
                hospitals={createHospitals}
                setHospitals={setCreateHospitals}
                inputValue={createHospitalInput}
                setInputValue={setCreateHospitalInput}
                expandedIndex={createHospitalExpanded}
                setExpandedIndex={setCreateHospitalExpanded}
                colors={colors}
                isEditMode={false}
              />

              <FormField label="Description" colors={colors}>
                <TextInput
                  style={[styles.input, styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={createForm.description}
                  onChangeText={v => setCreateForm(f => ({ ...f, description: v }))}
                  placeholder="Mission description"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </FormField>

              <View style={styles.row}>
                <FormField label="Start Date" colors={colors} style={{ flex: 1 }}>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                    value={createForm.startDate}
                    onChangeText={v => setCreateForm(f => ({ ...f, startDate: v }))}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textSecondary}
                  />
                </FormField>
                <FormField label="End Date" colors={colors} style={{ flex: 1 }}>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                    value={createForm.endDate}
                    onChangeText={v => setCreateForm(f => ({ ...f, endDate: v }))}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textSecondary}
                  />
                </FormField>
              </View>

              <UrlsEditor urls={createUrls} setUrls={setCreateUrls} colors={colors} />

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { backgroundColor: (!createForm.name || !createForm.country || vm.isMutating) ? colors.textSecondary : colors.primary },
                ]}
                disabled={!createForm.name || !createForm.country || vm.isMutating}
                onPress={handleCreate}
              >
                {vm.isMutating
                  ? <ActivityIndicator size="small" color={colors.textInverse} />
                  : <Text style={[styles.submitButtonText, { color: colors.textInverse }]}>Create Mission</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Edit Mission Modal ────────────────────────────────────────── */}
      <Modal visible={showEdit} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowEdit(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Mission</Text>
              <TouchableOpacity onPress={() => setShowEdit(false)}><X size={24} color={colors.text} /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <FormField label="Name" colors={colors}>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={editForm.name}
                  onChangeText={v => setEditForm(f => ({ ...f, name: v }))}
                />
              </FormField>
              <View style={styles.row}>
                <FormField label="Country" colors={colors} style={{ flex: 1 }}>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                    value={editForm.country}
                    onChangeText={v => setEditForm(f => ({ ...f, country: v }))}
                  />
                </FormField>
                <FormField label="City" colors={colors} style={{ flex: 1 }}>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                    value={editForm.city}
                    onChangeText={v => setEditForm(f => ({ ...f, city: v }))}
                  />
                </FormField>
              </View>

              <HospitalSection
                hospitals={editHospitals}
                setHospitals={setEditHospitals}
                inputValue={editHospitalInput}
                setInputValue={setEditHospitalInput}
                expandedIndex={editHospitalExpanded}
                setExpandedIndex={setEditHospitalExpanded}
                colors={colors}
                isEditMode={true}
                onPickImage={handlePickHospitalImage}
                onDeleteImage={handleDeleteHospitalImagePress}
              />

              <FormField label="Description" colors={colors}>
                <TextInput
                  style={[styles.input, styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={editForm.description}
                  onChangeText={v => setEditForm(f => ({ ...f, description: v }))}
                  multiline
                  numberOfLines={3}
                />
              </FormField>

              <FormField label="Status" colors={colors}>
                <View style={styles.statusPicker}>
                  {['planned', 'active', 'completed'].map(s => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.statusOption,
                        {
                          backgroundColor: editForm.status === s ? colors.primary : colors.surface,
                          borderColor: editForm.status === s ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setEditForm(f => ({ ...f, status: s }))}
                    >
                      <Text style={{ color: editForm.status === s ? colors.textInverse : colors.text, fontSize: typography.fontSize.sm }}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </FormField>

              <View style={styles.row}>
                <FormField label="Start Date" colors={colors} style={{ flex: 1 }}>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                    value={editForm.startDate}
                    onChangeText={v => setEditForm(f => ({ ...f, startDate: v }))}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textSecondary}
                  />
                </FormField>
                <FormField label="End Date" colors={colors} style={{ flex: 1 }}>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                    value={editForm.endDate}
                    onChangeText={v => setEditForm(f => ({ ...f, endDate: v }))}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textSecondary}
                  />
                </FormField>
              </View>

              <UrlsEditor urls={editUrls} setUrls={setEditUrls} colors={colors} />

              {/* Attachments */}
              <FormField label="Attachments" colors={colors}>
                <View style={{ gap: spacing.sm }}>
                  {vm.selectedAttachments.map(att => (
                    <View key={att.id} style={[styles.attachmentRow, { borderColor: colors.border }]}>
                      {att.contentType?.startsWith('image/')
                        ? <ImageIcon size={16} color={colors.textSecondary} />
                        : <FileText size={16} color={colors.textSecondary} />}
                      <View style={{ flex: 1, marginHorizontal: spacing.sm }}>
                        <Text style={[styles.attachmentName, { color: colors.text }]} numberOfLines={1}>
                          {att.displayName || att.fileName}
                        </Text>
                        {att.fileSize != null && (
                          <Text style={[styles.attachmentSize, { color: colors.textSecondary }]}>
                            {Math.round(att.fileSize / 1024)}KB
                          </Text>
                        )}
                      </View>
                      <TouchableOpacity onPress={() => handleDeleteAttachment(att)}>
                        <Trash2 size={16} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity
                    style={[styles.outlineButton, { borderColor: colors.border }]}
                    onPress={handlePickAttachment}
                  >
                    <Upload size={16} color={colors.primary} />
                    <Text style={[styles.outlineButtonText, { color: colors.primary }]}>Upload Attachment</Text>
                  </TouchableOpacity>
                </View>
              </FormField>

              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: vm.isMutating ? colors.textSecondary : colors.primary }]}
                disabled={vm.isMutating}
                onPress={handleEditClick}
              >
                {vm.isMutating
                  ? <ActivityIndicator size="small" color={colors.textInverse} />
                  : <Text style={[styles.submitButtonText, { color: colors.textInverse }]}>Save Changes</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Members Modal (list + add modes — single modal for iOS) ────── */}
      <Modal visible={showMembers} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeMembersModal}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            {memberModalMode === 'add' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <TouchableOpacity
                  onPress={() => setMemberModalMode('list')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <ChevronLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Add Members</Text>
              </View>
            ) : (
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Members ({vm.selectedMissionMembers.length})
              </Text>
            )}
            <TouchableOpacity onPress={closeMembersModal}><X size={24} color={colors.text} /></TouchableOpacity>
          </View>

          {memberModalMode === 'list' ? (
            <>
              <View style={{ paddingHorizontal: spacing.base }}>
                <TouchableOpacity
                  style={[styles.outlineButton, { borderColor: colors.primary, marginBottom: spacing.md }]}
                  onPress={openAddMember}
                >
                  <UserPlus size={16} color={colors.primary} />
                  <Text style={[styles.outlineButtonText, { color: colors.primary }]}>Add Member</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalBody}>
                {vm.selectedMissionMembers.length === 0 ? (
                  <EmptyState title="No members" message="Add members to this mission." />
                ) : (
                  vm.selectedMissionMembers.map(member => (
                    <View key={member.id} style={[styles.memberRow, { borderColor: colors.border }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.memberName, { color: colors.text }]}>
                          {member.firstName} {member.lastName}
                        </Text>
                        <Text style={[styles.memberEmail, { color: colors.textSecondary }]}>{member.email}</Text>
                        {member.accountType && (
                          <Text style={[styles.memberType, { color: colors.textSecondary }]}>{member.accountType}</Text>
                        )}
                      </View>
                      <TouchableOpacity
                        style={[styles.removeBtn, { backgroundColor: colors.error + '15' }]}
                        onPress={() => handleRemoveMember(member)}
                      >
                        <UserMinus size={16} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </ScrollView>
            </>
          ) : (
            <>
              <View style={{ paddingHorizontal: spacing.base }}>
                {/* Selected chips */}
                {selectedUsersToAdd.length > 0 && (
                  <View style={styles.chipContainer}>
                    {selectedUsersToAdd.map(u => (
                      <View key={u.id} style={[styles.chip, { backgroundColor: colors.primary + '15' }]}>
                        <Text style={[styles.chipText, { color: colors.primary }]}>
                          {u.firstName} {u.lastName}
                        </Text>
                        <TouchableOpacity onPress={() => toggleUserSelection(u)}>
                          <X size={12} color={colors.primary} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                  placeholder="Filter by name, email, or role"
                  placeholderTextColor={colors.textSecondary}
                  value={memberSearchQuery}
                  onChangeText={setMemberSearchQuery}
                />
              </View>
              <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
                {addableUsers.length === 0 ? (
                  <EmptyState
                    title="No matching users"
                    message={memberSearchQuery ? 'Try a different search.' : 'All users are already members.'}
                  />
                ) : (
                  addableUsers.map(user => {
                    const isSelected = selectedUsersToAdd.some(u => u.id === user.id);
                    return (
                      <TouchableOpacity
                        key={user.id}
                        style={[styles.searchResultRow, { backgroundColor: isSelected ? colors.primary + '08' : 'transparent' }]}
                        onPress={() => toggleUserSelection(user)}
                      >
                        <View style={[styles.checkbox, { borderColor: isSelected ? colors.primary : colors.border, backgroundColor: isSelected ? colors.primary : 'transparent' }]}>
                          {isSelected && <Check size={12} color={colors.textInverse} />}
                        </View>
                        <View style={{ flex: 1, marginLeft: spacing.sm }}>
                          <Text style={[styles.memberName, { color: colors.text }]}>
                            {user.firstName} {user.lastName}
                          </Text>
                          <Text style={[styles.memberEmail, { color: colors.textSecondary }]}>
                            {user.email}{user.accountType ? ` · ${user.accountType}` : ''}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
              {selectedUsersToAdd.length > 0 && (
                <View style={{ padding: spacing.base }}>
                  <TouchableOpacity
                    style={[styles.submitButton, { backgroundColor: vm.isMutating ? colors.textSecondary : colors.primary }]}
                    disabled={vm.isMutating}
                    onPress={handleBulkAddMembers}
                  >
                    {vm.isMutating
                      ? <ActivityIndicator size="small" color={colors.textInverse} />
                      : (
                        <>
                          <UserPlus size={16} color={colors.textInverse} />
                          <Text style={[styles.submitButtonText, { color: colors.textInverse }]}> Add {selectedUsersToAdd.length} Member(s)</Text>
                        </>
                      )}
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </Modal>

      {/* ─── Delete Confirmation ───────────────────────────────────────── */}
      <ConfirmDialog
        visible={!!deletingMission}
        title="Delete Mission"
        message={
          `Delete "${deletingMission?.name}"?` +
          (deletingMission?.memberCount
            ? `\n\nThis will remove the mission from ${deletingMission.memberCount} user(s) and untag associated patients.`
            : '') +
          (deletingMission?.groupChatThreadId
            ? `\n\n${archiveChat ? 'The group chat will be archived (read-only).' : 'The group chat will be permanently deleted.'}`
            : '')
        }
        variant="danger"
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => { setDeletingMission(null); setArchiveChat(true); }}
        loading={vm.isMutating}
      />

      {/* ─── Edit Confirmation ────────────────────────────────────────── */}
      <ConfirmDialog
        visible={!!editConfirmChanges}
        title="Confirm Mission Update"
        message={
          'The following changes will be saved:\n\n' +
          (editConfirmChanges || []).map(c => `  \u2022 ${c}`).join('\n') +
          (editingMission && (editingMission.memberCount ?? 0) > 0
            ? `\n\nA notification will be sent to ${editingMission.memberCount} mission member(s).`
            : '')
        }
        variant="warning"
        confirmLabel="Save & Notify"
        onConfirm={handleEditConfirmed}
        onCancel={() => setEditConfirmChanges(null)}
        loading={vm.isMutating}
      />
    </View>
  );
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function FormField({ label, colors, style, children }: { label: string; colors: any; style?: any; children: React.ReactNode }) {
  return (
    <View style={[{ marginBottom: spacing.md }, style]}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
      {children}
    </View>
  );
}

function HospitalSection({
  hospitals,
  setHospitals,
  inputValue,
  setInputValue,
  expandedIndex,
  setExpandedIndex,
  colors,
  isEditMode,
  onPickImage,
  onDeleteImage,
}: {
  hospitals: MissionHospital[];
  setHospitals: React.Dispatch<React.SetStateAction<MissionHospital[]>>;
  inputValue: string;
  setInputValue: (v: string) => void;
  expandedIndex: number | null;
  setExpandedIndex: (idx: number | null) => void;
  colors: any;
  isEditMode?: boolean;
  onPickImage?: (hospitalIndex: number) => void;
  onDeleteImage?: (hospitalIndex: number, imageIndex: number) => void;
}) {
  const addHospital = () => {
    if (inputValue.trim()) {
      const newIdx = hospitals.length;
      setHospitals(prev => [...prev, { name: inputValue.trim() }]);
      setInputValue('');
      setExpandedIndex(newIdx);
    }
  };

  const updateHospital = (index: number, updates: Partial<MissionHospital>) => {
    setHospitals(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...updates };
      return updated;
    });
  };

  return (
    <View style={[styles.hospitalSection, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
      <View style={styles.hospitalSectionHeader}>
        <Hospital size={16} color={colors.textSecondary} />
        <Text style={[styles.fieldLabel, { color: colors.text, marginBottom: 0 }]}>Hospitals</Text>
      </View>

      {/* Hospital Cards */}
      {hospitals.map((hospital, i) => (
        <View key={i} style={[styles.hospitalCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          {/* Header */}
          <TouchableOpacity
            style={styles.hospitalCardHeader}
            onPress={() => setExpandedIndex(expandedIndex === i ? null : i)}
            activeOpacity={0.7}
          >
            <View style={styles.hospitalCardHeaderLeft}>
              <Hospital size={14} color={colors.textSecondary} />
              <Text style={[styles.hospitalCardName, { color: colors.text }]} numberOfLines={1}>
                {hospital.name || 'Unnamed Hospital'}
              </Text>
              {hospital.visibility === 'private' && (
                <View style={[styles.visibilityBadge, { backgroundColor: colors.warning + '20' }]}>
                  <Text style={[styles.visibilityBadgeText, { color: colors.warning }]}>Private</Text>
                </View>
              )}
              {isEditMode && (hospital.images?.length ?? 0) > 0 && (
                <View style={[styles.visibilityBadge, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.visibilityBadgeText, { color: colors.primary }]}>
                    {hospital.images!.length} img
                  </Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <TouchableOpacity
                onPress={() => setHospitals(prev => prev.filter((_, idx) => idx !== i))}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Trash2 size={14} color={colors.error} />
              </TouchableOpacity>
              {expandedIndex === i
                ? <ChevronUp size={16} color={colors.textSecondary} />
                : <ChevronDown size={16} color={colors.textSecondary} />}
            </View>
          </TouchableOpacity>

          {/* Expanded Details */}
          {expandedIndex === i && (
            <View style={[styles.hospitalCardBody, { borderTopColor: colors.border }]}>
              <View style={{ marginBottom: spacing.sm }}>
                <Text style={[styles.hospitalFieldLabel, { color: colors.textSecondary }]}>Name *</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={hospital.name}
                  onChangeText={v => updateHospital(i, { name: v })}
                  placeholder="Hospital name"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {/* Visibility Toggle */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
                <Text style={[styles.hospitalFieldLabel, { color: colors.textSecondary, marginBottom: 0 }]}>Visibility:</Text>
                <TouchableOpacity
                  style={[
                    styles.visibilityToggle,
                    {
                      backgroundColor: hospital.visibility === 'private'
                        ? colors.warning + '20'
                        : colors.success + '20',
                    },
                  ]}
                  onPress={() => updateHospital(i, {
                    visibility: hospital.visibility === 'private' ? 'public' : 'private',
                  })}
                >
                  {hospital.visibility === 'private'
                    ? <EyeOff size={12} color={colors.warning} />
                    : <Eye size={12} color={colors.success} />}
                  <Text style={{
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.medium,
                    color: hospital.visibility === 'private' ? colors.warning : colors.success,
                  }}>
                    {hospital.visibility === 'private' ? 'Private' : 'Public'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ marginBottom: spacing.sm }}>
                <Text style={[styles.hospitalFieldLabel, { color: colors.textSecondary }]}>URL</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={hospital.url || ''}
                  onChangeText={v => updateHospital(i, { url: v || undefined })}
                  placeholder="https://hospital-website.com"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>

              <View style={{ marginBottom: spacing.sm }}>
                <Text style={[styles.hospitalFieldLabel, { color: colors.textSecondary }]}>Map Link</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={hospital.mapLink || ''}
                  onChangeText={v => updateHospital(i, { mapLink: v || undefined })}
                  placeholder="https://maps.google.com/..."
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>

              <View style={{ marginBottom: spacing.sm }}>
                <Text style={[styles.hospitalFieldLabel, { color: colors.textSecondary }]}>Website</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={hospital.website || ''}
                  onChangeText={v => updateHospital(i, { website: v || undefined })}
                  placeholder="https://..."
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>

              <View style={{ marginBottom: spacing.sm }}>
                <Text style={[styles.hospitalFieldLabel, { color: colors.textSecondary }]}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={hospital.description || ''}
                  onChangeText={v => updateHospital(i, { description: v || undefined })}
                  placeholder="Brief description of this hospital"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={2}
                />
              </View>

              {/* Images — Edit mode only */}
              {isEditMode ? (
                <View>
                  <Text style={[styles.hospitalFieldLabel, { color: colors.textSecondary }]}>Images (max 5)</Text>
                  <View style={styles.hospitalImagesRow}>
                    {(hospital.images || []).map((img, imgIdx) => (
                      <View key={imgIdx} style={[styles.hospitalImagePlaceholder, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                        <ImageIcon size={20} color={colors.textSecondary} />
                        <Text style={[styles.hospitalImageFileName, { color: colors.textSecondary }]} numberOfLines={1}>
                          {img.fileName}
                        </Text>
                        <TouchableOpacity
                          style={[styles.hospitalImageDeleteBtn, { backgroundColor: colors.error }]}
                          onPress={() => onDeleteImage?.(i, imgIdx)}
                        >
                          <X size={10} color={colors.textInverse} />
                        </TouchableOpacity>
                      </View>
                    ))}
                    {(hospital.images?.length ?? 0) < 5 && (
                      <TouchableOpacity
                        style={[styles.hospitalImageAddBtn, { borderColor: colors.border }]}
                        onPress={() => onPickImage?.(i)}
                      >
                        <Plus size={18} color={colors.textSecondary} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <ImageIcon size={12} color={colors.textSecondary} />
                  <Text style={{ fontSize: typography.fontSize.xs, color: colors.textSecondary }}>
                    Images can be added after mission is created (via Edit).
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      ))}

      {/* Add Hospital Input */}
      <View style={[styles.row, { gap: spacing.sm }]}>
        <TextInput
          style={[styles.input, { flex: 1, color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
          value={inputValue}
          onChangeText={setInputValue}
          placeholder="e.g. Al-Bashir Hospital"
          placeholderTextColor={colors.textSecondary}
          onSubmitEditing={addHospital}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[styles.iconButton, { borderColor: colors.border, opacity: inputValue.trim() ? 1 : 0.4 }]}
          onPress={addHospital}
          disabled={!inputValue.trim()}
        >
          <Plus size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function UrlsEditor({
  urls,
  setUrls,
  colors,
}: {
  urls: MissionUrl[];
  setUrls: React.Dispatch<React.SetStateAction<MissionUrl[]>>;
  colors: any;
}) {
  return (
    <FormField label="Links" colors={colors}>
      {urls.map((urlItem, i) => (
        <View key={i} style={[styles.urlRow, { borderColor: colors.border }]}>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              value={urlItem.displayName}
              onChangeText={v => {
                const updated = [...urls];
                updated[i] = { ...updated[i], displayName: v };
                setUrls(updated);
              }}
              placeholder="Display name"
              placeholderTextColor={colors.textSecondary}
            />
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              value={urlItem.url}
              onChangeText={v => {
                const updated = [...urls];
                updated[i] = { ...updated[i], url: v };
                setUrls(updated);
              }}
              placeholder="https://..."
              placeholderTextColor={colors.textSecondary}
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>
          <TouchableOpacity onPress={() => setUrls(prev => prev.filter((_, idx) => idx !== i))} style={{ padding: spacing.sm }}>
            <X size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity
        style={[styles.outlineButton, { borderColor: colors.border }]}
        onPress={() => setUrls(prev => [...prev, { url: '', displayName: '' }])}
      >
        <LinkIcon size={16} color={colors.primary} />
        <Text style={[styles.outlineButtonText, { color: colors.primary }]}>Add Link</Text>
      </TouchableOpacity>
    </FormField>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    padding: spacing.sm,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  createButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },

  // Card
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  missionName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    marginBottom: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: typography.fontSize.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.sm,
  },
  dateText: {
    fontSize: typography.fontSize.sm,
  },
  hospitalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  hospitalChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  hospitalChipText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },

  // Badge
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'capitalize',
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },

  // Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
  },
  modalBody: {
    flex: 1,
    padding: spacing.base,
  },

  // Form
  fieldLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSize.base,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  submitButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },

  // Status picker
  statusPicker: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statusOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },

  // Chips
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  chipText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },

  // Icon button
  iconButton: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Hospital section
  hospitalSection: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  hospitalSectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },

  // URL editor
  urlRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },

  // Outline button
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  outlineButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },

  // Members
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  memberName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  memberEmail: {
    fontSize: typography.fontSize.sm,
  },
  memberType: {
    fontSize: typography.fontSize.xs,
  },
  removeBtn: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },

  // Search results
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Attachments
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.md,
  },
  attachmentName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  attachmentSize: {
    fontSize: typography.fontSize.xs,
  },

  // Hospital expandable cards
  hospitalCard: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden' as const,
  },
  hospitalCardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: spacing.md,
  },
  hospitalCardHeaderLeft: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
  },
  hospitalCardName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    flexShrink: 1,
  },
  hospitalCardBody: {
    padding: spacing.md,
    borderTopWidth: 1,
  },
  hospitalFieldLabel: {
    fontSize: typography.fontSize.xs,
    marginBottom: spacing.xs,
  },

  // Visibility
  visibilityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  visibilityBadgeText: {
    fontSize: 9,
    fontWeight: typography.fontWeight.semibold,
  },
  visibilityToggle: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },

  // Hospital images
  hospitalImagesRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  hospitalImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    overflow: 'hidden' as const,
  },
  hospitalImageFileName: {
    fontSize: 7,
    textAlign: 'center' as const,
    paddingHorizontal: 2,
    marginTop: 2,
  },
  hospitalImageDeleteBtn: {
    position: 'absolute' as const,
    top: 0,
    right: 0,
    padding: 3,
    borderBottomLeftRadius: borderRadius.sm,
  },
  hospitalImageAddBtn: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderStyle: 'dashed' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },

  // Default intake hospital
  defaultHospitalRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  defaultHospitalChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  defaultHospitalChipText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
});
