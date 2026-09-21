// apps/mobile/src/utils/notificationRouting.ts
// Maps notification types to mobile navigation actions and sheet display decisions

import type { Notification } from '../viewModels/NotificationsViewModel';

export type NotificationRoute =
  | {
      tab: 'Dashboard';
      screen: 'PatientChart';
      params: { patientId: string; returnTo?: string };
    }
  | { tab: 'Admin'; screen: 'AdminDashboard'; params: { initialSection: string } }
  | { tab: 'Profile' }
  | { tab: 'Messages'; params?: { openThreadId?: string } }
  | null;

/** Check if this alert notification is a mission update */
export function isMissionNotification(notification: Notification): boolean {
  if (notification.type !== 'alert') return false;
  // New notifications: redirectTo set by backend
  if (notification.redirectTo?.startsWith('/missions/')) return true;
  // Legacy notifications: message pattern from update-mission route
  if (notification.message?.startsWith('Mission "')) return true;
  return false;
}

/** Extract missionId from redirectTo like "/missions/abc-123" */
export function getMissionIdFromNotification(
  notification: Notification,
): string | null {
  if (
    notification.type === 'alert' &&
    notification.redirectTo?.startsWith('/missions/')
  ) {
    return notification.redirectTo.replace('/missions/', '');
  }
  return null;
}

/** Extract mission name from legacy message like 'Mission "Gaza 2025" updated: ...' */
export function getMissionNameFromNotification(
  notification: Notification,
): string | null {
  const match = notification.message?.match(/^Mission "([^"]+)"/);
  return match?.[1] ?? null;
}

/**
 * Determines if tapping this notification should open an inline sheet
 * (rather than navigating away from the notifications screen).
 */
export function shouldOpenSheet(
  notification: Notification,
  isAdmin: boolean,
): boolean {
  switch (notification.type) {
    case 'new_user_signup':
      return isAdmin;
    case 'specialty_no_doctors':
      return !!notification.patientId;
    case 'profile_update_approved':
      return true;
    case 'announcement':
    case 'reminder':
      return true;
    case 'alert':
      // Admin notification alerts also open sheet
      if (notification.isAdminNotification) return true;
      // Mission update alerts — open mission sheet for all users
      if (isMissionNotification(notification)) return true;
      // Feedback alerts: no patientId, no mission — show sheet for admins
      return isAdmin && !notification.patientId;
    default:
      return false;
  }
}

/**
 * For notification types that navigate directly (no sheet),
 * returns the React Navigation route params.
 */
export function getNotificationRoute(
  notification: Notification,
): NotificationRoute {
  switch (notification.type) {
    case 'announcement':
    case 'reminder':
      return null;

    case 'alert':
      if (notification.isAdminNotification) return null;
    // falls through for regular alerts
    case 'patient_update':
      if (notification.patientId) {
        return {
          tab: 'Dashboard',
          screen: 'PatientChart',
          params: { patientId: notification.patientId },
        };
      }
      return null;

    case 'specialty_no_doctors':
      // Fallback navigation if sheet can't open (e.g. from push notification)
      if (notification.patientId) {
        return {
          tab: 'Dashboard',
          screen: 'PatientChart',
          params: { patientId: notification.patientId },
        };
      }
      return null;

    case 'new_user_signup':
      // Fallback navigation (from push)
      return {
        tab: 'Admin',
        screen: 'AdminDashboard',
        params: { initialSection: 'newSignups' },
      };

    case 'profile_update_request':
      return {
        tab: 'Admin',
        screen: 'AdminDashboard',
        params: { initialSection: 'profileUpdateRequests' },
      };

    case 'profile_update_approved':
    case 'profile_update_denied':
      return { tab: 'Profile' };

    case 'message':
    // A missed call lands on Messages: that is where the call-summary card for
    // this call lives, so the user can call back from the same place.
    case 'missed_call':
      return { tab: 'Messages' };

    case 'system_notification':
    default:
      return null;
  }
}

/**
 * Returns the action text to display on a notification card.
 */
export function getNotificationActionText(
  notification: Notification,
  isAdmin: boolean,
): string | null {
  switch (notification.type) {
    case 'new_user_signup':
      return isAdmin ? 'Review signups' : null;
    case 'specialty_no_doctors':
      return 'View unassigned patient';
    case 'profile_update_approved':
      return 'Get started';
    case 'profile_update_denied':
      return 'View profile';
    case 'profile_update_request':
      return isAdmin ? 'Review requests' : null;
    case 'announcement':
    case 'reminder':
      return notification.actionUrl ? 'View details' : null;
    case 'alert':
      if (notification.isAdminNotification) return notification.actionUrl ? 'View details' : null;
      if (isMissionNotification(notification)) return 'View mission';
      if (notification.patientId) return 'View patient';
      if (isAdmin && !notification.patientId) return 'View feedback';
      return null;
    case 'patient_update':
      return notification.patientId ? 'View patient' : null;
    case 'message':
      return 'View messages';
    case 'missed_call':
      return 'Call back';
    default:
      return null;
  }
}
