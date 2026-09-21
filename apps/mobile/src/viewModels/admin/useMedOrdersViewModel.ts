import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { powerSyncService } from '../../services/powersync/PowerSyncService';

// Medical Order Status
export type MedOrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

// Medical Order Interface
export interface MedicalOrder {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  orderType: string; // e.g., 'medication', 'lab', 'imaging', 'procedure'
  orderDetails: string;
  status: MedOrderStatus;
  priority: 'routine' | 'urgent' | 'stat';
  orderedAt: string;
  completedAt?: string;
  notes?: string;
  results?: string;
  metadata?: Record<string, any>;
}

// Filter Options
export interface FilterOptions {
  status: MedOrderStatus | 'all';
  orderType: string | 'all';
  priority: string | 'all';
}

// ViewModel Interface
export interface UseMedOrdersViewModel {
  // State
  orders: MedicalOrder[];
  filteredOrders: MedicalOrder[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  searchQuery: string;
  filterOptions: FilterOptions;
  selectedOrder: MedicalOrder | null;
  
  // Counts
  totalCount: number;
  pendingCount: number;
  processingCount: number;
  completedCount: number;
  cancelledCount: number;
  
  // Actions
  fetchOrders: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setFilter: (key: keyof FilterOptions, value: string) => void;
  clearFilters: () => void;
  selectOrder: (order: MedicalOrder | null) => void;
  exportOrders: () => Promise<void>;
  exportOrder: (orderId: string) => Promise<void>;
}

export const useMedOrdersViewModel = (): UseMedOrdersViewModel => {
  const [orders, setOrders] = useState<MedicalOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<MedicalOrder | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    status: 'all',
    orderType: 'all',
    priority: 'all',
  });

  // Fetch medical orders from PowerSync
  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Query medical orders from PowerSync database
      const sql = `
        SELECT 
          mo.*,
          p.first_name || ' ' || p.last_name as patient_name,
          u.first_name || ' ' || u.last_name as doctor_name
        FROM medical_orders mo
        LEFT JOIN patients p ON mo.patient_id = p.id
        LEFT JOIN users u ON mo.doctor_id = u.id
        ORDER BY mo.ordered_at DESC
      `;

      const results = await powerSyncService.query<any>(sql);

      // Map results to MedicalOrder type
      const formattedOrders: MedicalOrder[] = results.map(row => ({
        id: row.id,
        patientId: row.patient_id,
        patientName: row.patient_name || 'Unknown Patient',
        doctorId: row.doctor_id,
        doctorName: row.doctor_name || 'Unknown Doctor',
        orderType: row.order_type,
        orderDetails: row.order_details,
        status: row.status as MedOrderStatus,
        priority: row.priority,
        orderedAt: row.ordered_at,
        completedAt: row.completed_at,
        notes: row.notes,
        results: row.results,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      }));

      setOrders(formattedOrders);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch medical orders';
      setError(errorMessage);
      console.error('Fetch orders error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh orders (pull-to-refresh)
  const refreshOrders = useCallback(async () => {
    setIsRefreshing(true);
    await fetchOrders();
    setIsRefreshing(false);
  }, [fetchOrders]);

  // Filter orders based on filters and search
  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    // Apply status filter
    if (filterOptions.status !== 'all') {
      filtered = filtered.filter(order => order.status === filterOptions.status);
    }

    // Apply order type filter
    if (filterOptions.orderType !== 'all') {
      filtered = filtered.filter(order => order.orderType === filterOptions.orderType);
    }

    // Apply priority filter
    if (filterOptions.priority !== 'all') {
      filtered = filtered.filter(order => order.priority === filterOptions.priority);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        order =>
          order.patientName.toLowerCase().includes(query) ||
          order.doctorName.toLowerCase().includes(query) ||
          order.orderType.toLowerCase().includes(query) ||
          order.orderDetails.toLowerCase().includes(query) ||
          order.id.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [orders, filterOptions, searchQuery]);

  // Calculate counts
  const totalCount = orders.length;
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const processingCount = orders.filter(o => o.status === 'processing').length;
  const completedCount = orders.filter(o => o.status === 'completed').length;
  const cancelledCount = orders.filter(o => o.status === 'cancelled').length;

  // Set filter
  const setFilter = useCallback((key: keyof FilterOptions, value: string) => {
    setFilterOptions(prev => ({ ...prev, [key]: value }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilterOptions({
      status: 'all',
      orderType: 'all',
      priority: 'all',
    });
    setSearchQuery('');
  }, []);

  // Select order for details view
  const selectOrder = useCallback((order: MedicalOrder | null) => {
    setSelectedOrder(order);
  }, []);

  // Export all filtered orders
  const exportOrders = useCallback(async () => {
    try {
      // TODO: Implement actual export functionality
      // This would generate a CSV/PDF file with the filtered orders
      
      Alert.alert(
        'Export Orders',
        `Exporting ${filteredOrders.length} orders...`,
        [
          {
            text: 'CSV',
            onPress: () => {
              // Generate CSV
              console.log('Exporting to CSV:', filteredOrders);
              Alert.alert('Success', 'Orders exported to CSV');
            },
          },
          {
            text: 'PDF',
            onPress: () => {
              // Generate PDF
              console.log('Exporting to PDF:', filteredOrders);
              Alert.alert('Success', 'Orders exported to PDF');
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to export orders');
      console.error('Export error:', err);
    }
  }, [filteredOrders]);

  // Export single order
  const exportOrder = useCallback(async (orderId: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) {
        Alert.alert('Error', 'Order not found');
        return;
      }

      // TODO: Implement actual export functionality
      Alert.alert(
        'Export Order',
        `Export order ${order.id}?`,
        [
          {
            text: 'CSV',
            onPress: () => {
              console.log('Exporting order to CSV:', order);
              Alert.alert('Success', 'Order exported to CSV');
            },
          },
          {
            text: 'PDF',
            onPress: () => {
              console.log('Exporting order to PDF:', order);
              Alert.alert('Success', 'Order exported to PDF');
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to export order');
      console.error('Export error:', err);
    }
  }, [orders]);

  // Fetch orders on mount
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
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
    fetchOrders,
    refreshOrders,
    setSearchQuery,
    setFilter,
    clearFilters,
    selectOrder,
    exportOrders,
    exportOrder,
  };
};
