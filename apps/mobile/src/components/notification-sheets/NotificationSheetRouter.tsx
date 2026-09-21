// apps/mobile/src/components/notification-sheets/NotificationSheetRouter.tsx
// Central dispatcher that renders the correct sheet based on notification type

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import type { Notification } from '../../viewModels/NotificationsViewModel';
import type { NotificationRoute } from '../../utils/notificationRouting';
import { BottomSheet } from '../BottomSheet';
import { palette } from '../../utils/colors';
import { useThemeColors } from '../../contexts/ThemeContext';
import {
  isMissionNotification,
  getMissionIdFromNotification,
  getMissionNameFromNotification,
} from '../../utils/notificationRouting';
import { NewSignupsSheet } from './NewSignupsSheet';
import { UnassignedPatientSheet } from './UnassignedPatientSheet';
import { FeedbackAlertSheet } from './FeedbackAlertSheet';
import { OnboardingSheet } from './OnboardingSheet';
import { MissionUpdateSheet } from './MissionUpdateSheet';
import { AdminNotificationSheet } from './AdminNotificationSheet';

interface NotificationSheetRouterProps {
  notification: Notification | null;
  onClose: () => void;
  onNavigate: (route: NotificationRoute) => void;
  isAdmin: boolean;
}

export function NotificationSheetRouter({
  notification,
  onClose,
  onNavigate,
  isAdmin,
}: NotificationSheetRouterProps) {
  const colors = useThemeColors();

  if (!notification) return null;

  switch (notification.type) {
    case 'new_user_signup':
      if (!isAdmin) return null;
      return (
        <NewSignupsSheet
          visible
          onClose={onClose}
          onOpenFull={() =>
            onNavigate({
              tab: 'Admin',
              screen: 'AdminDashboard',
              params: { initialSection: 'newSignups' },
            })
          }
        />
      );

    case 'specialty_no_doctors':
      if (!notification.patientId) return null;
      return (
        <UnassignedPatientSheet
          visible
          patientId={notification.patientId}
          onClose={onClose}
          onOpenFull={() => {
            if (notification.patientId) {
              onNavigate({
                tab: 'Dashboard',
                screen: 'PatientChart',
                params: { patientId: notification.patientId, returnTo: 'Notifications' },
              });
            }
          }}
        />
      );

    case 'profile_update_approved':
      return <OnboardingSheet visible onClose={onClose} />;

    case 'alert': {
      // Admin notification alerts — show the same rich sheet as announcement/reminder
      if (notification.isAdminNotification) {
        return (
          <AdminNotificationSheet
            visible
            notification={notification}
            onClose={onClose}
            onNavigate={(route) => {
              onClose();
              if (route) onNavigate(route);
            }}
          />
        );
      }
      // Mission update alerts — by redirectTo or message pattern
      if (isMissionNotification(notification)) {
        const missionId = getMissionIdFromNotification(notification);
        const missionName = getMissionNameFromNotification(notification);
        return (
          <MissionUpdateSheet
            visible
            missionId={missionId}
            missionName={missionName}
            onClose={onClose}
          />
        );
      }
      // Feedback alerts: no patientId, no mission — admin only
      if (isAdmin && !notification.patientId) {
        return (
          <FeedbackAlertSheet
            visible
            onClose={onClose}
            onOpenFull={() =>
              onNavigate({
                tab: 'Admin',
                screen: 'AdminDashboard',
                params: { initialSection: 'userFeedback' },
              })
            }
          />
        );
      }
      return null;
    }

    case 'announcement':
    case 'reminder':
      return (
        <AdminNotificationSheet
          visible
          notification={notification}
          onClose={onClose}
          onNavigate={(route) => {
            onClose();
            if (route) onNavigate(route);
          }}
        />
      );

    case 'system_notification':
      return (
        <BottomSheet
          visible={!!notification}
          onClose={onClose}
          title="System Notification"
          snapPoint={45}
          showHandle
          showCloseButton
        >
          <View style={sysStyles.container}>
            <ShieldCheck size={32} color={palette.teal[400]} />
            <Text style={sysStyles.message}>{notification.message}</Text>
            {notification.redirectTo && (
              <TouchableOpacity
                style={sysStyles.button}
                onPress={() => {
                  onNavigate({ screen: 'Profile', params: { section: 'security' } } as any);
                  onClose();
                }}
              >
                <Text style={[sysStyles.buttonText, { color: colors.textInverse }]}>Set Up Now</Text>
              </TouchableOpacity>
            )}
          </View>
        </BottomSheet>
      );

    default:
      return null;
  }
}

const sysStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 12,
  },
  message: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    backgroundColor: palette.teal[500],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
