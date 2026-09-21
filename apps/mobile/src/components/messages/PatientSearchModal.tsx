// apps/mobile/src/components/messages/PatientSearchModal.tsx
// Patient search modal for message threads — queries local PowerSync SQLite

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Dimensions,
} from 'react-native';
import { Search, X, Filter, MessageSquare, UserPlus } from 'lucide-react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { getAnonymizedName } from '@fajr/shared/patient-utils';
import { spacing, borderRadius, typography } from '../../utils/theme';
import { Badge } from '../ui/Badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/Dialog';
import {
  useMessagePatientSearch,
  MessagePatientSearchFilters,
} from '../../hooks/useMessagePatientSearch';
import { DoctorSpecialties } from '../../data/doctorSpecialty';
import { CountriesList } from '../../data/countries';
import { PATIENT_STATUS_VALUES, PATIENT_PRIORITY_VALUES } from '../../types/enums';
import type { Patient } from '../../types/patient';
import { PatientChartProvider } from '../patient-chart/PatientChartContext';
import { PatientChartView } from '../patient-chart/PatientChartView';
import { usePowerSyncQuery } from '../../hooks/powersync';
import { TABLES } from '../../db';

interface PatientSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectPatient: (patient: Patient) => void;
}

export const PatientSearchModal: React.FC<PatientSearchModalProps> = ({
  visible,
  onClose,
  onSelectPatient,
}) => {
  type ModalMode = 'search' | 'inspect';

  const colors = useThemeColors();
  const inspectDialogHeight = Math.max(
    560,
    Math.floor(Dimensions.get('window').height * 0.86),
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<MessagePatientSearchFilters>({});
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [mode, setMode] = useState<ModalMode>('search');
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentLimit, setCurrentLimit] = useState<number>(50);
  const lastLoadMoreAtRef = useRef<number>(0);

  const {
    patients,
    loading,
    searching,
    error,
    total,
    hasMore,
    refresh,
  } = useMessagePatientSearch(searchQuery, filters, { limit: currentLimit });
  const cityQuery = usePowerSyncQuery<{ city: string }>(
    filters.country
      ? `SELECT DISTINCT city
         FROM ${TABLES.PATIENTS}
         WHERE city IS NOT NULL
           AND TRIM(city) != ''
           AND country = ?
         ORDER BY city ASC`
      : `SELECT DISTINCT city
         FROM ${TABLES.PATIENTS}
         WHERE city IS NOT NULL
           AND TRIM(city) != ''
         ORDER BY city ASC`,
    filters.country ? [filters.country] : [],
    { enabled: showFilters, retry: false },
  );
  const cityOptions = cityQuery.data?.map((r) => r.city).filter(Boolean) || [];

  const hasActiveFilters = !!(
    filters.source ||
    filters.specialty ||
    filters.status ||
    filters.priority ||
    filters.city ||
    filters.country ||
    (filters.telegramMessage && filters.telegramMessage.trim().length >= 2) ||
    filters.dateFrom ||
    filters.dateTo
  );
  const resultsMinHeight = showFilters ? 180 : 260;

  const clearFilters = useCallback(() => {
    setFilters({});
    setCurrentLimit(pageSize);
  }, [pageSize]);

  const handleSelect = useCallback((patient: Patient) => {
    Keyboard.dismiss();
    setSelectedPatient(patient);
  }, []);

  const handleClose = useCallback(() => {
    onClose();
    setSearchQuery('');
    setFilters({});
    setShowFilters(false);
    setSelectedPatient(null);
    setMode('search');
    setCurrentLimit(pageSize);
  }, [onClose, pageSize]);

  const handleRunSearch = useCallback(() => {
    void refresh();
  }, [refresh]);

  const handleLoadMore = useCallback(() => {
    if (loading || searching || !hasMore) return;
    setCurrentLimit((prev) => prev + pageSize);
  }, [hasMore, loading, pageSize, searching]);

  const handleModalScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const distanceFromBottom =
        contentSize.height - (contentOffset.y + layoutMeasurement.height);

      if (distanceFromBottom > 200) return;

      const now = Date.now();
      if (now - lastLoadMoreAtRef.current < 400) return;
      lastLoadMoreAtRef.current = now;
      handleLoadMore();
    },
    [handleLoadMore],
  );

  useEffect(() => {
    setCurrentLimit(pageSize);
  }, [
    searchQuery,
    filters.source,
    filters.specialty,
    filters.status,
    filters.priority,
    filters.city,
    filters.country,
    filters.telegramMessage,
    filters.dateFrom,
    filters.dateTo,
    pageSize,
  ]);

  // Ensure modal always opens in search mode with visible content.
  useEffect(() => {
    if (!visible) return;
    setMode("search");
    setSelectedPatient(null);
  }, [visible]);

  useEffect(() => {
    if (!filters.city) return;
    if (!cityOptions.includes(filters.city)) {
      setFilters((prev) => ({ ...prev, city: undefined }));
    }
  }, [cityOptions, filters.city]);

  const handleInspect = useCallback(() => {
    if (!selectedPatient) return;
    setMode('inspect');
  }, [selectedPatient]);

  const handleConfirmSend = useCallback(() => {
    if (!selectedPatient) return;
    onSelectPatient(selectedPatient);
    handleClose();
  }, [handleClose, onSelectPatient, selectedPatient]);

  const getStatusVariant = (status: string | undefined) => {
    if (!status) return 'secondary';
    if (status.includes('Not Cleared')) return 'destructive';
    if (status.includes('Discharged')) return 'secondary';
    return 'default';
  };

  const getPriorityVariant = (priority: string | undefined) => {
    if (!priority || priority === 'Not Selected') return 'secondary';
    if (priority === 'Emergency' || priority === 'Urgent') return 'destructive';
    if (priority === 'Moderate') return 'warning';
    return 'success';
  };

  const renderPatientItem = ({ item }: { item: Patient }) => {
    // Some Telegram-origin patients may have null names; keep row visible with a fallback label.
    const displayName = getAnonymizedName(item.firstName, item.lastName);
    const isSelected = selectedPatient?.id === item.id;

    return (
    <TouchableOpacity
      style={[
        styles.patientRow,
        isSelected && { backgroundColor: colors.primary + '12' },
        { borderBottomColor: colors.divider },
      ]}
      onPress={() => handleSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.patientInfo}>
        <Text style={[styles.patientName, { color: colors.text }]}>
          {displayName}
        </Text>
        {item.chiefComplaint ? (
          <Text
            style={[styles.chiefComplaint, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {item.chiefComplaint}
          </Text>
        ) : null}
        <View style={styles.badgeRow}>
          {item.status ? (
            <Badge variant={getStatusVariant(item.status)}>
              {item.status}
            </Badge>
          ) : null}
          {item.priority && item.priority !== 'Not Selected' ? (
            <Badge variant={getPriorityVariant(item.priority)}>
              {item.priority}
            </Badge>
          ) : null}
          {item.telegramChatId ? (
            <Badge variant="outline">TG</Badge>
          ) : null}
        </View>
        {item.specialties && item.specialties.length > 0 ? (
          <View style={styles.specialtyRow}>
            {item.specialties.map((s) => (
              <View
                key={s}
                style={[
                  styles.specialtyTag,
                  { backgroundColor: colors.backgroundSecondary },
                ]}
              >
                <Text style={[styles.specialtyText, { color: colors.textSecondary }]}>
                  {s}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
      <Text style={[styles.dateText, { color: colors.textSecondary }]}>
        {item.createdAt
          ? new Date(item.createdAt).toLocaleDateString()
          : ''}
      </Text>
    </TouchableOpacity>
    );
  };

  const renderFilterPill = (
    label: string,
    value: string | undefined,
    options: readonly string[],
    onSelect: (val: string) => void,
  ) => (
    <View style={styles.filterGroup}>
      <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <FlatList
        horizontal
        data={options as string[]}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item: opt }) => (
          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor:
                  value === opt ? colors.primary : colors.backgroundSecondary,
                borderColor: value === opt ? colors.primary : colors.border,
              },
            ]}
            onPress={() => onSelect(value === opt ? '' : opt)}
          >
            <Text
              style={[
                styles.filterChipText,
                {
                  color: value === opt ? '#FFFFFF' : colors.text,
                },
              ]}
              numberOfLines={1}
            >
              {opt}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );

  return (
    <Dialog open={visible} onOpenChange={(open) => !open && handleClose()}>
      {mode === 'inspect' && selectedPatient ? (
        <DialogContent
          size="lg"
          scrollable={false}
          noPadding
          style={[styles.inspectDialogContent, { height: inspectDialogHeight }]}
        >
          <View style={styles.inspectContainer}>
            <PatientChartProvider patientId={selectedPatient.id}>
              <PatientChartView
                onBack={() => setMode('search')}
                onGoToChatAfterSend={() => handleClose()}
                showHeaderActions={false}
              />
            </PatientChartProvider>
          </View>
        </DialogContent>
      ) : (
      <DialogContent size="lg" scrollable={false} noPadding style={styles.searchDialogContent}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoiding}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={16}
        >
        <ScrollView
          style={styles.modalScrollView}
          contentContainerStyle={styles.modalScrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          onScroll={handleModalScroll}
          scrollEventThrottle={120}
        >
          <DialogHeader>
            <DialogTitle>Search Patients</DialogTitle>
          </DialogHeader>

          {/* Search Input */}
          <View style={styles.searchRow}>
            <View
              style={[
                styles.searchInputContainer,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Search size={16} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search by name, email, or Telegram chat ID..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleRunSearch}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[
                styles.filterButton,
                {
                  backgroundColor: showFilters
                    ? colors.primary
                    : colors.backgroundSecondary,
                  borderColor: showFilters ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Filter
                size={18}
                color={showFilters ? '#FFFFFF' : colors.text}
              />
              {hasActiveFilters && (
                <View
                  style={[
                    styles.filterDot,
                    { backgroundColor: showFilters ? '#FFFFFF' : colors.primary },
                  ]}
                />
              )}
            </TouchableOpacity>
          </View>

          {/* Filters */}
          {showFilters && (
            <View
              style={[
                styles.filtersContainer,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.filterHeader}>
                <Text style={[styles.filterHeaderText, { color: colors.text }]}>
                  Filters
                </Text>
                {hasActiveFilters && (
                  <TouchableOpacity onPress={clearFilters}>
                    <Text style={[styles.clearText, { color: colors.primary }]}>
                      Clear
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Source filter */}
              <View style={styles.filterGroup}>
                <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
                  Source
                </Text>
                <View style={styles.sourceRow}>
                  <TouchableOpacity
                    style={[
                      styles.sourceButton,
                      {
                        backgroundColor:
                          filters.source === 'telegram'
                            ? colors.primary
                            : colors.surface,
                        borderColor:
                          filters.source === 'telegram'
                            ? colors.primary
                            : colors.border,
                      },
                    ]}
                    onPress={() =>
                      setFilters((f) => ({
                        ...f,
                        source: f.source === 'telegram' ? undefined : 'telegram',
                      }))
                    }
                  >
                    <MessageSquare
                      size={14}
                      color={
                        filters.source === 'telegram' ? '#FFFFFF' : colors.text
                      }
                    />
                    <Text
                      style={[
                        styles.sourceButtonText,
                        {
                          color:
                            filters.source === 'telegram'
                              ? '#FFFFFF'
                              : colors.text,
                        },
                      ]}
                    >
                      Telegram
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.sourceButton,
                      {
                        backgroundColor:
                          filters.source === 'manual'
                            ? colors.primary
                            : colors.surface,
                        borderColor:
                          filters.source === 'manual'
                            ? colors.primary
                            : colors.border,
                      },
                    ]}
                    onPress={() =>
                      setFilters((f) => ({
                        ...f,
                        source: f.source === 'manual' ? undefined : 'manual',
                      }))
                    }
                  >
                    <UserPlus
                      size={14}
                      color={
                        filters.source === 'manual' ? '#FFFFFF' : colors.text
                      }
                    />
                    <Text
                      style={[
                        styles.sourceButtonText,
                        {
                          color:
                            filters.source === 'manual'
                              ? '#FFFFFF'
                              : colors.text,
                        },
                      ]}
                    >
                      Manual
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Status */}
              {renderFilterPill(
                'Status',
                filters.status,
                PATIENT_STATUS_VALUES,
                (val) => setFilters((f) => ({ ...f, status: val || undefined })),
              )}

              {/* Priority */}
              {renderFilterPill(
                'Priority',
                filters.priority,
                PATIENT_PRIORITY_VALUES.filter((p) => p !== 'Not Selected'),
                (val) => setFilters((f) => ({ ...f, priority: val || undefined })),
              )}

              {/* Specialty */}
              {renderFilterPill(
                'Specialty',
                filters.specialty,
                DoctorSpecialties,
                (val) => setFilters((f) => ({ ...f, specialty: val || undefined })),
              )}

              {renderFilterPill(
                'Country',
                filters.country,
                CountriesList,
                (val) => setFilters((f) => ({ ...f, country: val || undefined })),
              )}

              {cityOptions.length > 0 && renderFilterPill(
                'City',
                filters.city,
                cityOptions,
                (val) => setFilters((f) => ({ ...f, city: val || undefined })),
              )}

              {/* Telegram Message Search */}
              <View style={styles.filterGroup}>
                <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
                  Telegram Message Contains
                </Text>
                <View
                  style={[
                    styles.telegramMessageInputContainer,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.telegramMessageInput, { color: colors.text }]}
                    placeholder="Search text inside Telegram thread messages..."
                    placeholderTextColor={colors.textSecondary}
                    value={filters.telegramMessage || ''}
                    onChangeText={(val) =>
                      setFilters((f) => ({
                        ...f,
                        telegramMessage: val || undefined,
                      }))
                    }
                  />
                </View>
              </View>
            </View>
          )}
          {/* Results */}
          <View
            style={[
              styles.resultsContainer,
              { minHeight: resultsMinHeight },
            ]}
          >
          <View style={[styles.resultsHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.resultsTitle, { color: colors.text }]}>
              Search Results
            </Text>
            {loading || searching ? (
              <View style={styles.resultsHeaderRight}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.resultsMeta, { color: colors.primary }]}>
                  Searching...
                </Text>
              </View>
            ) : (
              <TouchableOpacity onPress={handleRunSearch}>
                <Text style={[styles.resultsMeta, { color: colors.primary }]}>
                  Search
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {loading || searching ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : patients.length === 0 ? (
            <View style={styles.centerContainer}>
              {error ? (
                <Text style={[styles.emptyText, { color: '#DC2626' }]}>
                  Search failed. Please try again.
                  {error?.message ? ` (${error.message})` : ''}
                </Text>
              ) : (
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {searchQuery.length >= 2 || hasActiveFilters
                    ? 'No patients found'
                    : 'Type a name or apply filters to search'}
                </Text>
              )}
            </View>
          ) : (
            <>
              <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
                Showing {patients.length} of {total} patient{total === 1 ? '' : 's'}
              </Text>
              <View style={styles.pageSizeRow}>
                <Text style={[styles.pageSizeLabel, { color: colors.textSecondary }]}>
                  Per load:
                </Text>
                {[30, 50, 100].map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.pageSizeChip,
                      {
                        backgroundColor:
                          pageSize === size ? colors.primary : colors.backgroundSecondary,
                        borderColor: pageSize === size ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => {
                      setPageSize(size);
                      setCurrentLimit(size);
                    }}
                  >
                    <Text
                      style={[
                        styles.pageSizeChipText,
                        { color: pageSize === size ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {size}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.resultsList}>
                {patients.map((patient) => (
                  <View key={patient.id}>
                    {renderPatientItem({ item: patient })}
                  </View>
                ))}
                {searching && (
                  <View style={styles.loadMoreLoading}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                )}
                {hasMore && !searching && (
                  <TouchableOpacity
                    style={[styles.loadMoreButton, { borderColor: colors.border }]}
                    onPress={handleLoadMore}
                  >
                    <Text style={[styles.loadMoreText, { color: colors.textSecondary }]}>
                      Load more
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
          </View>
          <View
            style={[
              styles.selectionBar,
              { borderTopColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            {selectedPatient ? (
              <>
                <Text style={[styles.selectionLabel, { color: colors.textSecondary }]}>
                  Selected: {getAnonymizedName(selectedPatient.firstName, selectedPatient.lastName)}
                </Text>
                <View style={styles.selectionActions}>
                  <TouchableOpacity
                    style={[
                      styles.selectionButton,
                      { borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
                    ]}
                    onPress={handleInspect}
                  >
                    <Text style={[styles.selectionButtonText, { color: colors.text }]}>
                      Inspect Chart
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.selectionButton,
                      styles.sendButton,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={handleConfirmSend}
                  >
                    <Text style={[styles.sendButtonText, { color: '#FFFFFF' }]}>
                      Send Patient Card
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <Text style={[styles.selectionHint, { color: colors.textSecondary }]}>
                Select a patient to inspect, then send.
              </Text>
            )}
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </DialogContent>
      )}
    </Dialog>
  );
};

const styles = StyleSheet.create({
  keyboardAvoiding: {
    minHeight: 380,
  },
  modalScrollView: {
    width: '100%',
  },
  modalScrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  inspectDialogContent: {
    width: '95%',
  },
  searchDialogContent: {
    width: "95%",
    maxHeight: "88%",
    minHeight: 380,
  },
  inspectContainer: {
    flex: 1,
    height: '100%',
  },
  searchRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    height: 40,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    paddingVertical: 0,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filtersContainer: {
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterHeaderText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  clearText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  filterGroup: {
    gap: spacing.xs,
  },
  filterLabel: {
    fontSize: typography.fontSize.xs,
  },
  sourceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sourceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  sourceButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginRight: spacing.xs,
  },
  filterChipText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  resultsContainer: {
    marginTop: spacing.md,
    minHeight: 180,
    borderRadius: borderRadius.md,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultsTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  resultsHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  resultsMeta: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  resultsCount: {
    fontSize: typography.fontSize.xs,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  pageSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  pageSizeLabel: {
    fontSize: typography.fontSize.xs,
  },
  pageSizeChip: {
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  pageSizeChipText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  resultsList: {
    marginTop: spacing.xs,
  },
  loadMoreLoading: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  loadMoreButton: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  telegramMessageInputContainer: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    height: 40,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
  },
  telegramMessageInput: {
    fontSize: typography.fontSize.sm,
    paddingVertical: 0,
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 120,
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
  patientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  patientInfo: {
    flex: 1,
    marginRight: spacing.md,
    gap: spacing.xs,
  },
  patientName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  chiefComplaint: {
    fontSize: typography.fontSize.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  specialtyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  specialtyTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  specialtyText: {
    fontSize: typography.fontSize.xs,
  },
  dateText: {
    fontSize: typography.fontSize.xs,
  },
  selectionBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  selectionLabel: {
    fontSize: typography.fontSize.xs,
  },
  selectionHint: {
    fontSize: typography.fontSize.xs,
  },
  selectionActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  selectionButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  sendButton: {
    borderWidth: 0,
  },
  sendButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
});

export default PatientSearchModal;
