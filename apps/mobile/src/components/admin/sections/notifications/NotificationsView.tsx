// apps/mobile/src/components/admin/sections/notifications/NotificationsView.tsx
// View component for admin notifications section

import React, { useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  StyleSheet,
} from 'react-native';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { useNotificationsViewModel } from '../../../../viewModels/admin/useNotificationsViewModel';
import { EmptyState, ErrorState, LoadingState, ConfirmDialog } from '../../shared';
import { Bell, Send, CheckCircle2, AlertCircle, Info } from 'lucide-react-native';
import { Card, CardContent, Button } from '../../../ui';

export function NotificationsView() {
  const colors = useThemeColors();
  const {
    message,
    setMessage,
    type,
    setType,
    notifyDoctors,
    setNotifyDoctors,
    notifyTriage,
    setNotifyTriage,
    notifications,
    isSending,
    isLoadingHistory,
    isRefreshing,
    error,
    sendNotification,
    fetchNotificationHistory,
    refreshHistory,
    canSend,
  } = useNotificationsViewModel();

  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);

  // Fetch notification history on mount
  useEffect(() => {
    fetchNotificationHistory();
  }, []);

  // Handle send notification
  const handleSendNotification = async () => {
    try {
      await sendNotification();
      Alert.alert('Success', 'Notification sent successfully!');
    } catch {
      Alert.alert('Error', 'Failed to send notification. Please try again.');
    }
  };

  // Confirm send
  const confirmSend = () => {
    setShowConfirmDialog(true);
  };

  // Get type icon
  const getTypeIcon = (notifType: string) => {
    switch (notifType) {
      case 'alert':
        return <AlertCircle size={16} color={colors.error} />;
      case 'reminder':
        return <Info size={16} color={colors.info} />;
      case 'announcement':
      default:
        return <Bell size={16} color={colors.primary} />;
    }
  };

  // Get type color
  const getTypeColor = (notifType: string) => {
    switch (notifType) {
      case 'alert':
        return colors.error;
      case 'reminder':
        return colors.info;
      case 'announcement':
      default:
        return colors.primary;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get recipients text
  const getRecipientsText = (notif: { notifyDoctors: boolean; notifyTriage: boolean }) => {
    const recipients = [];
    if (notif.notifyDoctors) recipients.push('Doctors');
    if (notif.notifyTriage) recipients.push('Triage');
    return recipients.join(', ') || 'None';
  };

  if (isLoadingHistory) {
    return <LoadingState message="Loading notifications..." />;
  }

  if (error && notifications.length === 0) {
    return (
      <ErrorState
        message="Failed to load notifications"
        error={error}
        onRetry={fetchNotificationHistory}
      />
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={refreshHistory}
          tintColor={colors.primary}
        />
      }
    >
      {/* Send Notification Form */}
      <Card style={styles.section}>
        <CardContent>
          <View style={styles.sectionHeader}>
            <Send size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Send Notification
            </Text>
          </View>

          {/* Message Input */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Message *
            </Text>
            <TextInput
              style={[
                styles.textarea,
                {
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={message}
              onChangeText={setMessage}
              placeholder="Enter notification message..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Type Selector */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Notification Type
            </Text>
            <View style={styles.typeSelector}>
              {(['announcement', 'alert', 'reminder'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeButton,
                    {
                      backgroundColor: type === t ? getTypeColor(t) : colors.background,
                      borderColor: getTypeColor(t),
                    },
                  ]}
                  onPress={() => setType(t)}
                >
                  {getTypeIcon(t)}
                  <Text
                    style={[
                      styles.typeButtonText,
                      {
                        color: type === t ? colors.textInverse : colors.text,
                      },
                    ]}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Recipients */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Recipients *
            </Text>

            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setNotifyDoctors(!notifyDoctors)}
            >
              <View
                style={[
                  styles.checkboxBox,
                  {
                    backgroundColor: notifyDoctors ? colors.primary : 'transparent',
                    borderColor: colors.border,
                  },
                ]}
              >
                {notifyDoctors && <CheckCircle2 size={16} color={colors.textInverse} />}
              </View>
              <Text style={[styles.checkboxLabel, { color: colors.text }]}>
                Notify Doctors
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setNotifyTriage(!notifyTriage)}
            >
              <View
                style={[
                  styles.checkboxBox,
                  {
                    backgroundColor: notifyTriage ? colors.primary : 'transparent',
                    borderColor: colors.border,
                  },
                ]}
              >
                {notifyTriage && <CheckCircle2 size={16} color={colors.textInverse} />}
              </View>
              <Text style={[styles.checkboxLabel, { color: colors.text }]}>
                Notify Triage Specialists
              </Text>
            </TouchableOpacity>
          </View>

          {/* Send Button */}
          <Button
            onPress={confirmSend}
            disabled={!canSend || isSending}
            style={styles.sendButton}
          >
            <Send size={18} color={colors.textInverse} />
            <Text style={[styles.sendButtonText, { color: colors.textInverse }]}>
              {isSending ? 'Sending...' : 'Send Notification'}
            </Text>
          </Button>

          {error && (
            <View style={[styles.errorBanner, { backgroundColor: colors.errorLight }]}>
              <AlertCircle size={16} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>
                {error.message}
              </Text>
            </View>
          )}
        </CardContent>
      </Card>

      {/* Notification History */}
      <Card style={styles.section}>
        <CardContent>
          <View style={styles.sectionHeader}>
            <Bell size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Notification History
            </Text>
          </View>

        {notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No notifications sent yet"
          />
        ) : (
          <View style={styles.notificationList}>
            {notifications.map((notif) => (
              <View
                key={notif.id}
                style={[
                  styles.notificationCard,
                  {
                    backgroundColor: colors.background,
                    borderLeftColor: getTypeColor(notif.type),
                  },
                ]}
              >
                <View style={styles.notificationHeader}>
                  <View style={styles.notificationTypeRow}>
                    {getTypeIcon(notif.type)}
                    <Text
                      style={[
                        styles.notificationType,
                        { color: getTypeColor(notif.type) },
                      ]}
                    >
                      {notif.type.charAt(0).toUpperCase() + notif.type.slice(1)}
                    </Text>
                  </View>
                  <Text style={[styles.notificationDate, { color: colors.textSecondary }]}>
                    {formatDate(notif.createdAt)}
                  </Text>
                </View>

                <Text style={[styles.notificationMessage, { color: colors.text }]}>
                  {notif.message}
                </Text>

                <View style={styles.notificationFooter}>
                  <Text style={[styles.notificationRecipients, { color: colors.textSecondary }]}>
                    Recipients: {getRecipientsText(notif)}
                  </Text>
                  {notif.senderName && (
                    <Text style={[styles.notificationSender, { color: colors.textSecondary }]}>
                      By: {notif.senderName}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <ConfirmDialog
        visible={showConfirmDialog}
        title="Send Notification"
        message={`Send ${type} to ${getRecipientsText({ notifyDoctors, notifyTriage })}?`}
        confirmLabel="Send"
        cancelLabel="Cancel"
        variant="info"
        onConfirm={() => {
          setShowConfirmDialog(false);
          handleSendNotification();
        }}
        onCancel={() => setShowConfirmDialog(false)}
        loading={isSending}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: {
    fontSize: 14,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    flex: 1,
  },
  notificationList: {
    gap: 12,
  },
  notificationCard: {
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  notificationType: {
    fontSize: 14,
    fontWeight: '600',
  },
  notificationDate: {
    fontSize: 12,
  },
  notificationMessage: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationRecipients: {
    fontSize: 12,
  },
  notificationSender: {
    fontSize: 12,
  },
});
