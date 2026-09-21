// apps/mobile/src/components/patient-chart/medications/MedicationsView.tsx

import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { Pill, Plus } from 'lucide-react-native';
import { useThemeColors } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { usePatientChart } from '../PatientChartContext';
import { MedicationCard } from './MedicationCard';
import { RxOrderCreationSheet } from './RxOrderCreationSheet';
import { MedOrderCreationSheet } from './MedOrderCreationSheet';
import { RxOrderDetailSheet } from './RxOrderDetailSheet';
import {
  getAllMedicationsSorted,
  isRxOrder,
  type AnyMedication,
} from './medicationUtils';
import type { RxOrderBase } from '@fajr/shared/patient';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  permissionText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
  },
});

export const MedicationsView: React.FC = () => {
  const colors = useThemeColors();
  const { user } = useAuth();
  const {
    rxOrders,
    medOrders,
    loadingMedications,
    medicationsError,
    refreshMedications,
    patientInfo,
  } = usePatientChart();

  const patientId = patientInfo?.id || '';
  const isDoctor = user?.accountType === 'Doctor';
  const isTriage = user?.accountType === 'Triage';

  const [refreshing, setRefreshing] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showRxCreation, setShowRxCreation] = useState(false);
  const [showMedCreation, setShowMedCreation] = useState(false);
  const [detailRxOrder, setDetailRxOrder] = useState<RxOrderBase | null>(null);
  // Survives the close animation: clearing `detailRxOrder` immediately would
  // otherwise blank the sheet's contents while it is still sliding away.
  const lastDetailRxOrder = useRef<RxOrderBase | null>(null);
  if (detailRxOrder) lastDetailRxOrder.current = detailRxOrder;

  const allMedications = useMemo(
    () => getAllMedicationsSorted(rxOrders, medOrders),
    [rxOrders, medOrders],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshMedications();
    setRefreshing(false);
  }, [refreshMedications]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleShare = useCallback(async (item: AnyMedication) => {
    if (!isRxOrder(item)) return;
    setDetailRxOrder(item);
  }, []);

  const handleCreatePress = useCallback(() => {
    Alert.alert(
      'New Medication Order',
      'What type of order would you like to create?',
      [
        {
          text: 'RX Prescription',
          onPress: () => setShowRxCreation(true),
        },
        {
          text: 'Med Request',
          onPress: () => setShowMedCreation(true),
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }, []);

  const renderItem: ListRenderItem<AnyMedication> = useCallback(
    ({ item }) => (
      <MedicationCard
        item={item}
        isExpanded={expandedItems.has(item.id)}
        onToggle={toggleExpanded}
        onShare={handleShare}
      />
    ),
    [expandedItems, toggleExpanded, handleShare],
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Pill size={64} color={colors.textTertiary} />
      <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
        No medications
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
        {isDoctor
          ? 'Tap "Add" to create a medication order'
          : 'No medication orders have been created for this patient'}
      </Text>
    </View>
  );

  if (medicationsError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            {medicationsError}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={handleRefresh}
          >
            <Text style={[styles.retryButtonText, { color: colors.textInverse }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!isDoctor && !isTriage) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.permissionContainer}>
          <Pill size={48} color={colors.textTertiary} />
          <Text style={[styles.permissionText, { color: colors.textSecondary }]}>
            You do not have permission to view or create medication orders.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Medications</Text>
        {isDoctor && (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={handleCreatePress}
          >
            <Plus size={18} color={colors.textInverse} />
            <Text style={[styles.addButtonText, { color: colors.textInverse }]}>Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {loadingMedications ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading medications...
          </Text>
        </View>
      ) : (
        <FlashList
          data={allMedications}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {/* RX Order Creation Sheet */}
      {showRxCreation && (
        <RxOrderCreationSheet
          visible={showRxCreation}
          onClose={() => setShowRxCreation(false)}
          patientId={patientId}
        />
      )}

      {/* Med Order Creation Sheet */}
      {showMedCreation && (
        <MedOrderCreationSheet
          visible={showMedCreation}
          onClose={() => setShowMedCreation(false)}
          patientId={patientId}
        />
      )}

      {/* RX Order Detail/Share Sheet.
          Kept mounted and toggled via `visible` rather than conditionally
          rendered: a BottomSheet that mounts already-visible never presents,
          and does so silently. `rxOrder` still needs a value to render, so the
          last selected order is held until the sheet closes. */}
      <RxOrderDetailSheet
        visible={!!detailRxOrder}
        onClose={() => setDetailRxOrder(null)}
        rxOrder={detailRxOrder ?? lastDetailRxOrder.current}
        patientId={patientId}
        telegramChatId={patientInfo?.telegramChatId}
      />
    </View>
  );
};
