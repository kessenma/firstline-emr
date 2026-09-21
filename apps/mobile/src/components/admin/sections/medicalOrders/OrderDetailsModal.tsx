import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  X,
  Download,
  Calendar,
  User,
  FileText,
  AlertCircle,
} from 'lucide-react-native';
import { useTheme, useThemeColors } from '../../../../contexts/ThemeContext';
import { MedicalOrder } from '../../../../viewModels/admin/useMedOrdersViewModel';

interface OrderDetailsModalProps {
  order: MedicalOrder;
  visible: boolean;
  onClose: () => void;
  onExport: (orderId: string) => Promise<void>;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  order,
  visible,
  onClose,
  onExport,
}) => {
  const { theme, themeMode } = useTheme();
  const colors = useThemeColors();
  const isDark = themeMode === 'dark';

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = () => {
    switch (order.status) {
      case 'pending':
        return { bg: '#FEF3C7', text: '#92400E' };
      case 'processing':
        return { bg: '#DBEAFE', text: '#1E40AF' };
      case 'completed':
        return { bg: '#D1FAE5', text: '#065F46' };
      case 'cancelled':
        return { bg: '#FEE2E2', text: '#991B1B' };
      default:
        return { bg: '#E5E7EB', text: '#374151' };
    }
  };

  const getPriorityColor = () => {
    switch (order.priority) {
      case 'stat':
        return { bg: '#FECACA', text: '#991B1B' };
      case 'urgent':
        return { bg: '#FED7AA', text: '#9A3412' };
      case 'routine':
      default:
        return { bg: '#E5E7EB', text: '#374151' };
    }
  };

  const statusColors = getStatusColor();
  const priorityColors = getPriorityColor();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: isDark ? theme.colors.surface : theme.colors.background },
          ]}
        >
          {/* Header */}
          <View
            style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Order Details
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
          >
            {/* Order ID and Status */}
            <View style={styles.section}>
              <Text
                style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}
              >
                Order ID
              </Text>
              <Text style={[styles.sectionValue, { color: theme.colors.text }]}>
                {order.id}
              </Text>
            </View>

            <View style={styles.statusSection}>
              <View
                style={[styles.badge, { backgroundColor: statusColors.bg }]}
              >
                <Text style={[styles.badgeText, { color: statusColors.text }]}>
                  {order.status.toUpperCase()}
                </Text>
              </View>
              <View
                style={[styles.badge, { backgroundColor: priorityColors.bg }]}
              >
                <Text
                  style={[styles.badgeText, { color: priorityColors.text }]}
                >
                  {order.priority.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Patient Information */}
            <View
              style={[
                styles.infoCard,
                { backgroundColor: isDark ? theme.colors.background : theme.colors.surface },
              ]}
            >
              <View style={styles.infoCardHeader}>
                <User size={20} color={theme.colors.primary} />
                <Text style={[styles.infoCardTitle, { color: theme.colors.text }]}>
                  Patient Information
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text
                  style={[styles.infoLabel, { color: theme.colors.textSecondary }]}
                >
                  Name:
                </Text>
                <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                  {order.patientName}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text
                  style={[styles.infoLabel, { color: theme.colors.textSecondary }]}
                >
                  ID:
                </Text>
                <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                  {order.patientId}
                </Text>
              </View>
            </View>

            {/* Doctor Information */}
            <View
              style={[
                styles.infoCard,
                { backgroundColor: isDark ? theme.colors.background : theme.colors.surface },
              ]}
            >
              <View style={styles.infoCardHeader}>
                <User size={20} color={theme.colors.primary} />
                <Text style={[styles.infoCardTitle, { color: theme.colors.text }]}>
                  Ordering Physician
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text
                  style={[styles.infoLabel, { color: theme.colors.textSecondary }]}
                >
                  Name:
                </Text>
                <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                  {order.doctorName}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text
                  style={[styles.infoLabel, { color: theme.colors.textSecondary }]}
                >
                  ID:
                </Text>
                <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                  {order.doctorId}
                </Text>
              </View>
            </View>

            {/* Order Information */}
            <View
              style={[
                styles.infoCard,
                { backgroundColor: isDark ? theme.colors.background : theme.colors.surface },
              ]}
            >
              <View style={styles.infoCardHeader}>
                <FileText size={20} color={theme.colors.primary} />
                <Text style={[styles.infoCardTitle, { color: theme.colors.text }]}>
                  Order Information
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text
                  style={[styles.infoLabel, { color: theme.colors.textSecondary }]}
                >
                  Type:
                </Text>
                <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                  {order.orderType.charAt(0).toUpperCase() +
                    order.orderType.slice(1)}
                </Text>
              </View>
              <View style={styles.section}>
                <Text
                  style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}
                >
                  Details
                </Text>
                <Text style={[styles.sectionValue, { color: theme.colors.text }]}>
                  {order.orderDetails}
                </Text>
              </View>
            </View>

            {/* Timeline */}
            <View
              style={[
                styles.infoCard,
                { backgroundColor: isDark ? theme.colors.background : theme.colors.surface },
              ]}
            >
              <View style={styles.infoCardHeader}>
                <Calendar size={20} color={theme.colors.primary} />
                <Text style={[styles.infoCardTitle, { color: theme.colors.text }]}>
                  Timeline
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text
                  style={[styles.infoLabel, { color: theme.colors.textSecondary }]}
                >
                  Ordered:
                </Text>
                <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                  {formatDate(order.orderedAt)}
                </Text>
              </View>
              {order.completedAt && (
                <View style={styles.infoRow}>
                  <Text
                    style={[styles.infoLabel, { color: theme.colors.textSecondary }]}
                  >
                    Completed:
                  </Text>
                  <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                    {formatDate(order.completedAt)}
                  </Text>
                </View>
              )}
            </View>

            {/* Notes */}
            {order.notes && (
              <View
                style={[
                  styles.infoCard,
                  {
                    backgroundColor: isDark ? theme.colors.background : theme.colors.surface,
                  },
                ]}
              >
                <View style={styles.infoCardHeader}>
                  <AlertCircle size={20} color={theme.colors.primary} />
                  <Text style={[styles.infoCardTitle, { color: theme.colors.text }]}>
                    Notes
                  </Text>
                </View>
                <Text style={[styles.sectionValue, { color: theme.colors.text }]}>
                  {order.notes}
                </Text>
              </View>
            )}

            {/* Results */}
            {order.results && (
              <View
                style={[
                  styles.infoCard,
                  {
                    backgroundColor: isDark ? theme.colors.background : theme.colors.surface,
                  },
                ]}
              >
                <View style={styles.infoCardHeader}>
                  <FileText size={20} color={theme.colors.primary} />
                  <Text style={[styles.infoCardTitle, { color: theme.colors.text }]}>
                    Results
                  </Text>
                </View>
                <Text style={[styles.sectionValue, { color: theme.colors.text }]}>
                  {order.results}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.modalFooter, { borderTopColor: theme.colors.border }]}>
            <TouchableOpacity
              style={[styles.exportButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => onExport(order.id)}
            >
              <Download size={20} color={colors.textInverse} />
              <Text style={[styles.exportButtonText, { color: colors.textInverse }]}>Export Order</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: SCREEN_HEIGHT * 0.9,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 20,
    gap: 16,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  sectionValue: {
    fontSize: 16,
    lineHeight: 24,
  },
  statusSection: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
