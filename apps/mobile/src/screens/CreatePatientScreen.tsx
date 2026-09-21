import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, FileText, Trash2 } from 'lucide-react-native';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { useThemeColors } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { usePowerSync } from '../hooks/powersync';
import { spacing, borderRadius, typography } from '../utils/theme';
import { SinglePatientForm } from '../components/create-patient/SinglePatientForm';
import { BulkPatientUpload } from '../components/create-patient/BulkPatientUpload';
import { TABLES } from '@/db';

interface DraftRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  chief_complaint: string | null;
  updated_at: string | null;
}

export default function CreatePatientScreen() {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { service, isInitialized } = usePowerSync();
  const [mode, setMode] = useState<'single' | 'bulk' | 'drafts'>('single');
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState<string | undefined>(undefined);

  const userId = user?._id || user?.id || '';

  const loadDrafts = useCallback(async () => {
    if (!service || !isInitialized || !userId) return;
    setLoadingDrafts(true);
    try {
      const rows = await service.query<DraftRow>(
        `SELECT id, first_name, last_name, chief_complaint, updated_at
         FROM ${TABLES.PATIENT_DRAFTS}
         WHERE created_by_id = ?
         ORDER BY updated_at DESC`,
        [userId],
      );
      setDrafts(rows);
    } catch (err) {
      console.error('Failed to load drafts:', err);
    } finally {
      setLoadingDrafts(false);
    }
  }, [service, isInitialized, userId]);

  // Reload drafts when the tab is focused or screen gains focus
  useFocusEffect(
    useCallback(() => {
      if (mode === 'drafts') loadDrafts();
    }, [mode, loadDrafts]),
  );

  const handleTabChange = (v: string) => {
    const newMode = v as 'single' | 'bulk' | 'drafts';
    setMode(newMode);
    if (newMode === 'drafts') loadDrafts();
    if (newMode !== 'single') setEditingDraftId(undefined);
  };

  const handleSuccess = () => {
    navigation.goBack();
  };

  const handleResumeDraft = (draftId: string) => {
    setEditingDraftId(draftId);
    setMode('single');
  };

  const handleDeleteDraft = async (draftId: string) => {
    if (!service) return;
    Alert.alert('Delete Draft', 'Are you sure you want to delete this draft?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await service.execute(
              `DELETE FROM ${TABLES.PATIENT_DRAFTS} WHERE id = ?`,
              [draftId],
            );
            setDrafts((prev) => prev.filter((d) => d.id !== draftId));
          } catch (err) {
            console.error('Failed to delete draft:', err);
          }
        },
      },
    ]);
  };

  const renderDraftItem = (draft: DraftRow) => {
    const name = [draft.first_name, draft.last_name].filter(Boolean).join(' ') || 'Unnamed';
    const subtitle = draft.chief_complaint || 'No chief complaint';
    const date = draft.updated_at
      ? new Date(draft.updated_at).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

    return (
      <TouchableOpacity
        key={draft.id}
        style={[styles.draftItem, { backgroundColor: colors.background, borderColor: colors.border }]}
        onPress={() => handleResumeDraft(draft.id)}
        activeOpacity={0.7}
      >
        <FileText size={20} color={colors.textSecondary} />
        <View style={styles.draftInfo}>
          <Text style={[styles.draftName, { color: colors.text }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.draftSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <Text style={[styles.draftDate, { color: colors.textTertiary }]}>{date}</Text>
        <TouchableOpacity
          onPress={() => handleDeleteDraft(draft.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Trash2 size={18} color={colors.error} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Create Patient</Text>
        <View style={styles.backButton} />
      </View>

      {/* Scrollable content: tabs (sticky) + form */}
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          stickyHeaderIndices={[0]}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Tabs — sticky at top of scroll */}
          <View style={[styles.tabsContainer, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
            <Tabs
              value={mode}
              onValueChange={handleTabChange}
              variant="pills"
            >
              <TabsList>
                <TabsTrigger value="single" label="Single Patient" />
                <TabsTrigger value="bulk" label="Bulk Upload" />
                <TabsTrigger value="drafts" label={`Drafts${drafts.length > 0 ? ` (${drafts.length})` : ''}`} />
              </TabsList>
            </Tabs>
          </View>

          {/* Form content */}
          {mode === 'single' ? (
            <SinglePatientForm
              key={editingDraftId || 'new'}
              onSuccess={handleSuccess}
              draftId={editingDraftId}
            />
          ) : mode === 'bulk' ? (
            <BulkPatientUpload onSuccess={handleSuccess} />
          ) : (
            <View style={styles.draftsContainer}>
              {loadingDrafts ? (
                <ActivityIndicator
                  size="large"
                  color={colors.primary}
                  style={styles.draftsLoading}
                />
              ) : drafts.length === 0 ? (
                <View style={styles.emptyDrafts}>
                  <FileText size={40} color={colors.textTertiary} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No saved drafts
                  </Text>
                  <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                    Start creating a patient and your progress will be saved automatically
                  </Text>
                </View>
              ) : (
                drafts.map(renderDraftItem)
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
  tabsContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  flex1: {
    flex: 1,
  },
  // Drafts tab
  draftsContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  draftsLoading: {
    marginTop: spacing.xl,
  },
  draftItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  draftInfo: {
    flex: 1,
    gap: 2,
  },
  draftName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  draftSubtitle: {
    fontSize: typography.fontSize.sm,
  },
  draftDate: {
    fontSize: typography.fontSize.xs,
  },
  emptyDrafts: {
    alignItems: 'center',
    paddingTop: spacing.xl * 2,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
