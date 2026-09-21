// apps/mobile/src/components/admin/sections/profileUpdateRequests/ProfileUpdateRequestsView.tsx
// View for managing profile update requests

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import {
  ShieldAlert,
  CheckCircle,
  XCircle,
  Trash2,
  Search,
  X,
  ArrowRight,
  Loader2,
  AlertCircle,
} from 'lucide-react-native';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../../utils/theme';
import { useProfileUpdateRequestsViewModel } from '../../../../viewModels/admin/useProfileUpdateRequestsViewModel';
import type { ProfileUpdateRequest } from '../../../../types/admin';

export default function ProfileUpdateRequestsView() {
  const colors = useThemeColors();
  const {
    requests,
    requestsByStatus,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    selectedRequest,
    setSelectedRequest,
    isLoading,
    isRefreshing,
    isProcessing,
    error,
    refreshRequests,
    handleApprove,
    handleDeny,
    handleDelete,
    formatValue,
    getFieldDisplayName,
  } = useProfileUpdateRequestsViewModel();

  const [_showFilterModal, _setShowFilterModal] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Status badge colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return colors.warning;
      case 'approved':
        return colors.success;
      case 'denied':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  // Handle approve action
  const onApprove = async (requestId: string) => {
    Alert.alert(
      'Approve Request',
      'Are you sure you want to approve this profile update request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            try {
              await handleApprove(requestId, reviewNotes);
              setReviewNotes('');
              setShowDetailsModal(false);
              Alert.alert('Success', 'Request approved successfully.');
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to approve request');
            }
          },
        },
      ],
    );
  };

  // Handle deny action
  const onDeny = async (requestId: string) => {
    Alert.alert(
      'Deny Request',
      'Are you sure you want to deny this profile update request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deny',
          style: 'destructive',
          onPress: async () => {
            try {
              await handleDeny(requestId, reviewNotes);
              setReviewNotes('');
              setShowDetailsModal(false);
              Alert.alert('Success', 'Request denied successfully.');
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to deny request');
            }
          },
        },
      ],
    );
  };

  // Handle delete action
  const onDelete = async (requestId: string) => {
    Alert.alert(
      'Delete Request',
      'Are you sure you want to delete this request? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await handleDelete(requestId);
              setShowDetailsModal(false);
              Alert.alert('Success', 'Request deleted successfully.');
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete request');
            }
          },
        },
      ],
    );
  };

  // Render request card
  const renderRequestCard = ({ item }: { item: ProfileUpdateRequest }) => (
    <TouchableOpacity
      style={[styles.requestCard, { backgroundColor: colors.surface }]}
      onPress={() => {
        setSelectedRequest(item);
        setShowDetailsModal(true);
      }}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Text style={[styles.userName, { color: colors.text }]}>
            {item.userName}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>
        <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
          {item.userEmail}
        </Text>
      </View>

      <View style={styles.cardBody}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
          {getFieldDisplayName(item.fieldName)}
        </Text>
        <View style={styles.valueChange}>
          <Text style={[styles.currentValue, { color: colors.textSecondary }]} numberOfLines={1}>
            {formatValue(item.currentValue)}
          </Text>
          <ArrowRight size={16} color={colors.textSecondary} />
          <Text style={[styles.requestedValue, { color: colors.primary }]} numberOfLines={1}>
            {formatValue(item.requestedValue)}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={[styles.dateText, { color: colors.textSecondary }]}>
          Requested: {new Date(item.requestedAt).toLocaleDateString()}
        </Text>
        {item.status === 'pending' && (
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: colors.success }]}
              onPress={() => onApprove(item.id)}
              disabled={isProcessing}
            >
              <CheckCircle size={18} color={colors.textInverse} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: colors.error }]}
              onPress={() => onDeny(item.id)}
              disabled={isProcessing}
            >
              <XCircle size={18} color={colors.textInverse} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  // Render search and filter header
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statBadge, { backgroundColor: colors.warning + '20' }]}>
          <Text style={[styles.statNumber, { color: colors.warning }]}>
            {requestsByStatus.pending.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.warning }]}>Pending</Text>
        </View>
        <View style={[styles.statBadge, { backgroundColor: colors.success + '20' }]}>
          <Text style={[styles.statNumber, { color: colors.success }]}>
            {requestsByStatus.approved.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.success }]}>Approved</Text>
        </View>
        <View style={[styles.statBadge, { backgroundColor: colors.error + '20' }]}>
          <Text style={[styles.statNumber, { color: colors.error }]}>
            {requestsByStatus.denied.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.error }]}>Denied</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <Search size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search by name or email..."
          placeholderTextColor={colors.textSecondary}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity onPress={() => setSearchTerm('')}>
            <X size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
        {(['all', 'pending', 'approved', 'denied'] as const).map(status => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterChip,
              filterStatus === status && { backgroundColor: colors.primary },
              filterStatus !== status && { backgroundColor: colors.surface },
            ]}
            onPress={() => setFilterStatus(status)}
          >
            <Text
              style={[
                styles.filterChipText,
                filterStatus === status ? { color: colors.textInverse } : { color: colors.text },
              ]}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // Render empty state
  const renderEmptyState = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyState}>
        <ShieldAlert size={64} color={colors.textSecondary} />
        <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
          No Requests Found
        </Text>
        <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
          {searchTerm
            ? 'No requests match your search criteria.'
            : 'There are no profile update requests at this time.'}
        </Text>
      </View>
    );
  };

  // Render details modal
  const renderDetailsModal = () => {
    if (!selectedRequest) return null;

    return (
      <Modal
        visible={showDetailsModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowDetailsModal(false);
          setSelectedRequest(null);
          setReviewNotes('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Request Details
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowDetailsModal(false);
                  setSelectedRequest(null);
                  setReviewNotes('');
                }}
              >
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* User Info */}
              <View style={styles.detailSection}>
                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>
                  User Information
                </Text>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                  Name
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {selectedRequest.userName}
                </Text>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                  Email
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {selectedRequest.userEmail}
                </Text>
              </View>

              {/* Request Info */}
              <View style={styles.detailSection}>
                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>
                  Requested Change
                </Text>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                  Field
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {getFieldDisplayName(selectedRequest.fieldName)}
                </Text>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                  Current Value
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {formatValue(selectedRequest.currentValue)}
                </Text>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                  Requested Value
                </Text>
                <Text style={[styles.detailValue, { color: colors.primary }]}>
                  {formatValue(selectedRequest.requestedValue)}
                </Text>
              </View>

              {/* Status */}
              <View style={styles.detailSection}>
                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>
                  Status
                </Text>
                <View style={[styles.statusBadgeLarge, { backgroundColor: getStatusColor(selectedRequest.status) + '20' }]}>
                  <Text style={[styles.statusTextLarge, { color: getStatusColor(selectedRequest.status) }]}>
                    {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
                  </Text>
                </View>
                {selectedRequest.reviewedAt && (
                  <>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                      Reviewed By
                    </Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {selectedRequest.reviewedByName || selectedRequest.reviewedByEmail || 'Unknown'}
                    </Text>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                      Review Notes
                    </Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {selectedRequest.reviewNotes || 'No notes'}
                    </Text>
                  </>
                )}
              </View>

              {/* Review Notes Input (for pending requests) */}
              {selectedRequest.status === 'pending' && (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: colors.text }]}>
                    Review Notes (Optional)
                  </Text>
                  <TextInput
                    style={[styles.notesInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    placeholder="Add notes for this review..."
                    placeholderTextColor={colors.textSecondary}
                    value={reviewNotes}
                    onChangeText={setReviewNotes}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              )}
            </ScrollView>

            {/* Actions */}
            <View style={styles.modalFooter}>
              {selectedRequest.status === 'pending' ? (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.approveActionButton, { backgroundColor: colors.success }]}
                    onPress={() => onApprove(selectedRequest.id)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color={colors.textInverse} />
                    ) : (
                      <>
                        <CheckCircle size={20} color={colors.textInverse} />
                        <Text style={[styles.actionButtonText, { color: colors.textInverse }]}>Approve</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.denyActionButton, { backgroundColor: colors.error }]}
                    onPress={() => onDeny(selectedRequest.id)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color={colors.textInverse} />
                    ) : (
                      <>
                        <XCircle size={20} color={colors.textInverse} />
                        <Text style={[styles.actionButtonText, { color: colors.textInverse }]}>Deny</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteActionButton, { backgroundColor: colors.textSecondary }]}
                  onPress={() => onDelete(selectedRequest.id)}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color={colors.textInverse} />
                  ) : (
                    <>
                      <Trash2 size={20} color={colors.textInverse} />
                      <Text style={[styles.actionButtonText, { color: colors.textInverse }]}>Delete</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Render error state
  if (error && !isLoading && requests.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorState}>
          <AlertCircle size={64} color={colors.error} />
          <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
            Error Loading Requests
          </Text>
          <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={refreshRequests}
          >
            <Text style={[styles.retryButtonText, { color: colors.textInverse }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Render loading state (initial)
  if (isLoading && requests.length === 0) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Loader2 size={48} color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading profile update requests...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={requests}
        renderItem={renderRequestCard}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={[
          styles.listContent,
          requests.length === 0 && styles.listContentEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshRequests}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />
      {renderDetailsModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: typography.fontSize.base,
    marginTop: spacing.base,
  },
  listContent: {
    padding: spacing.base,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  headerContainer: {
    marginBottom: spacing.base,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.base,
    gap: spacing.sm,
  },
  statBadge: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    marginTop: spacing.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    paddingVertical: spacing.sm,
  },
  filterChips: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
  },
  filterChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  requestCard: {
    padding: spacing.base,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  cardHeader: {
    marginBottom: spacing.md,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  userName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    flex: 1,
  },
  userEmail: {
    fontSize: typography.fontSize.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  cardBody: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.xs,
  },
  valueChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  currentValue: {
    fontSize: typography.fontSize.sm,
    flex: 1,
  },
  requestedValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: typography.fontSize.xs,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickActionButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveButton: {},
  denyButton: {},
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
  },
  emptyStateTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    marginTop: spacing.base,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    lineHeight: typography.fontSize.base * 1.5,
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
  },
  retryButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    marginTop: spacing.lg,
  },
  retryButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '90%',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  modalBody: {
    padding: spacing.base,
  },
  detailSection: {
    marginBottom: spacing.lg,
  },
  detailSectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.md,
  },
  detailLabel: {
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.xs,
  },
  detailValue: {
    fontSize: typography.fontSize.base,
    marginBottom: spacing.md,
  },
  statusBadgeLarge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  statusTextLarge: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: spacing.base,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  approveActionButton: {},
  denyActionButton: {},
  deleteActionButton: {},
  actionButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
});
