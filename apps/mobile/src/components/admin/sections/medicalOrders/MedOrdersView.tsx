import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { FileText, X, Download, Filter } from 'lucide-react-native';
import {
  useThemeColors,
  useIsDarkMode,
} from '../../../../contexts/ThemeContext';
import {
  useMedOrdersViewModel,
  MedOrderStatus,
} from '../../../../viewModels/admin/useMedOrdersViewModel';
import { EmptyState, ErrorState, LoadingState } from '../../shared';
import { OrderDetailsModal } from './OrderDetailsModal';

// Status badge colors
const getStatusColor = (status: MedOrderStatus, isDark: boolean) => {
  const colors = {
    pending: { bg: isDark ? '#FEF3C7' : '#FEF3C7', text: '#92400E' },
    processing: { bg: isDark ? '#DBEAFE' : '#DBEAFE', text: '#1E40AF' },
    completed: { bg: isDark ? '#D1FAE5' : '#D1FAE5', text: '#065F46' },
    cancelled: { bg: isDark ? '#FEE2E2' : '#FEE2E2', text: '#991B1B' },
  };
  return colors[status];
};

// Priority badge colors
const getPriorityColor = (priority: string, isDark: boolean) => {
  const colors = {
    routine: { bg: isDark ? '#E5E7EB' : '#E5E7EB', text: '#374151' },
    urgent: { bg: isDark ? '#FED7AA' : '#FED7AA', text: '#9A3412' },
    stat: { bg: isDark ? '#FECACA' : '#FECACA', text: '#991B1B' },
  };
  return colors[priority as keyof typeof colors] || colors.routine;
};

export const MedOrdersView: React.FC = () => {
  const colors = useThemeColors();
  const isDark = useIsDarkMode();
  const viewModel = useMedOrdersViewModel();

  const {
    filteredOrders,
    isLoading,
    isRefreshing,
    error,
    searchQuery,
    filterOptions,
    selectedOrder,
    totalCount,
    pendingCount,
    processingCount,
    completedCount,
    cancelledCount,
    refreshOrders,
    setSearchQuery,
    setFilter,
    clearFilters,
    selectOrder,
    exportOrders,
  } = viewModel;

  // Filter tabs
  const filterTabs = [
    { label: 'All', value: 'all', count: totalCount },
    { label: 'Pending', value: 'pending', count: pendingCount },
    { label: 'Processing', value: 'processing', count: processingCount },
    { label: 'Completed', value: 'completed', count: completedCount },
    { label: 'Cancelled', value: 'cancelled', count: cancelledCount },
  ];

  // Render filter tabs
  const renderFilterTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterTabsContainer}
      contentContainerStyle={styles.filterTabsContent}
    >
      {filterTabs.map(tab => {
        const isActive = filterOptions.status === tab.value;
        return (
          <TouchableOpacity
            key={tab.value}
            style={[
              styles.filterTab,
              { backgroundColor: isDark ? colors.surface : colors.surface },
              isActive && {
                backgroundColor: colors.primary,
                borderColor: colors.primary,
              },
            ]}
            onPress={() => setFilter('status', tab.value)}
          >
            <Text
              style={[
                styles.filterTabText,
                { color: colors.text },
                isActive && { color: colors.textInverse },
              ]}
            >
              {tab.label}
            </Text>
            <View
              style={[
                styles.filterTabBadge,
                {
                  backgroundColor: isActive
                    ? 'rgba(255,255,255,0.3)'
                    : colors.primary,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterTabBadgeText,
                  { color: isActive ? colors.textInverse : colors.background },
                ]}
              >
                {tab.count}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  // Render search bar
  const renderSearchBar = () => (
    <View
      style={[
        styles.searchContainer,
        { backgroundColor: isDark ? colors.surface : colors.surface },
      ]}
    >
      <TextInput
        style={[styles.searchInput, { color: colors.text }]}
        placeholder="Search by patient, doctor, type..."
        placeholderTextColor={colors.textSecondary}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      {searchQuery ? (
        <TouchableOpacity
          onPress={() => setSearchQuery('')}
          style={styles.clearButton}
        >
          <X size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );

  // Render action bar
  const renderActionBar = () => {
    const hasActiveFilters =
      filterOptions.status !== 'all' ||
      filterOptions.orderType !== 'all' ||
      filterOptions.priority !== 'all' ||
      searchQuery.trim() !== '';

    return (
      <View style={styles.actionBar}>
        {hasActiveFilters && (
          <TouchableOpacity
            style={[
              styles.clearFiltersButton,
              { backgroundColor: colors.surface },
            ]}
            onPress={clearFilters}
          >
            <Filter size={16} color={colors.text} />
            <Text style={[styles.clearFiltersText, { color: colors.text }]}>
              Clear Filters
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.exportButton, { backgroundColor: colors.primary }]}
          onPress={exportOrders}
        >
          <Download size={16} color={colors.textInverse} />
          <Text style={[styles.exportButtonText, { color: colors.textInverse }]}>Export</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Render order card
  const renderOrderCard = (order: (typeof filteredOrders)[0]) => {
    const statusColors = getStatusColor(order.status, isDark);
    const priorityColors = getPriorityColor(order.priority, isDark);
    const orderDate = new Date(order.orderedAt).toLocaleDateString();
    const orderTime = new Date(order.orderedAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <TouchableOpacity
        key={order.id}
        style={[
          styles.orderCard,
          { backgroundColor: isDark ? colors.surface : colors.surface },
        ]}
        onPress={() => selectOrder(order)}
      >
        {/* Header */}
        <View style={styles.orderCardHeader}>
          <View style={styles.orderCardHeaderLeft}>
            <FileText size={20} color={colors.primary} />
            <Text style={[styles.orderType, { color: colors.text }]}>
              {order.orderType.charAt(0).toUpperCase() +
                order.orderType.slice(1)}
            </Text>
          </View>
          <View style={styles.orderCardHeaderRight}>
            <View
              style={[
                styles.priorityBadge,
                { backgroundColor: priorityColors.bg },
              ]}
            >
              <Text
                style={[
                  styles.priorityBadgeText,
                  { color: priorityColors.text },
                ]}
              >
                {order.priority.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Patient Info */}
        <View style={styles.orderCardSection}>
          <Text style={[styles.orderCardLabel, { color: colors.textSecondary }]}>
            Patient
          </Text>
          <Text style={[styles.orderCardValue, { color: colors.text }]}>
            {order.patientName}
          </Text>
        </View>

        {/* Doctor Info */}
        <View style={styles.orderCardSection}>
          <Text style={[styles.orderCardLabel, { color: colors.textSecondary }]}>
            Ordered by
          </Text>
          <Text style={[styles.orderCardValue, { color: colors.text }]}>
            {order.doctorName}
          </Text>
        </View>

        {/* Order Details */}
        <View style={styles.orderCardSection}>
          <Text style={[styles.orderCardLabel, { color: colors.textSecondary }]}>
            Details
          </Text>
          <Text
            style={[styles.orderCardValue, { color: colors.text }]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {order.orderDetails}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.orderCardFooter}>
          <Text style={[styles.orderCardDate, { color: colors.textSecondary }]}>
            {orderDate} at {orderTime}
          </Text>
          <View
            style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}
          >
            <Text
              style={[styles.statusBadgeText, { color: statusColors.text }]}
            >
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Loading state
  if (isLoading && !isRefreshing) {
    return <LoadingState message="Loading medical orders..." />;
  }

  // Error state
  if (error) {
    return (
      <ErrorState
        title="Failed to Load Orders"
        message={error}
        onRetry={() => viewModel.fetchOrders()}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      {renderFilterTabs()}

      {/* Search Bar */}
      {renderSearchBar()}

      {/* Action Bar */}
      {renderActionBar()}

      {/* Orders List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshOrders}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {filteredOrders.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No Orders Found"
            message={
              searchQuery || filterOptions.status !== 'all'
                ? 'Try adjusting your filters or search query'
                : 'No medical orders to display'
            }
            action={
              searchQuery || filterOptions.status !== 'all'
                ? { label: 'Clear Filters', onPress: clearFilters }
                : undefined
            }
          />
        ) : (
          filteredOrders.map(renderOrderCard)
        )}
      </ScrollView>

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          visible={!!selectedOrder}
          onClose={() => selectOrder(null)}
          onExport={viewModel.exportOrder}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterTabsContainer: {
    maxHeight: 50,
  },
  filterTabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 8,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterTabBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  filterTabBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  clearButton: {
    padding: 4,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '600',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
    gap: 12,
  },
  orderCard: {
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderType: {
    fontSize: 16,
    fontWeight: '700',
  },
  orderCardHeaderRight: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  orderCardSection: {
    gap: 4,
  },
  orderCardLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderCardValue: {
    fontSize: 14,
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  orderCardDate: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
