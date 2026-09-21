// apps/web/lib/debugNotifications.ts

/**
 * Debug utilities for notification toast management
 * These functions are intended for development and debugging only
 *
 * Usage in browser console (automatically available as global):
 *
 * debugNotifications.logShown()
 * debugNotifications.clearAll()
 * debugNotifications.info()
 * debugNotifications.resetForTesting()
 *
 * Or import in code:
 * import { debugNotifications } from '@/lib/debugNotifications'
 */

import {
  getShownNotifications,
  clearShownNotifications,
  removeShownNotifications,
  getShownNotificationsCount,
  markNotificationAsShown,
} from "./notificationStorage";

export const debugNotifications = {
  /**
   * Log all shown notification IDs to console
   */
  logShown() {
    const shown = Array.from(getShownNotifications());
    console.log("📊 Shown Notifications:", shown);
    console.log(`Total count: ${shown.length}`);
    return shown;
  },

  /**
   * Get count of shown notifications
   */
  count() {
    const count = getShownNotificationsCount();
    console.log(`📊 Total shown notifications: ${count}`);
    return count;
  },

  /**
   * Clear all shown notification history
   */
  clearAll() {
    clearShownNotifications();
    console.log("✅ Cleared all shown notification history");
  },

  /**
   * Remove specific notification IDs from history
   */
  remove(ids: string | string[]) {
    const idsArray = Array.isArray(ids) ? ids : [ids];
    removeShownNotifications(idsArray);
    console.log(
      `✅ Removed ${idsArray.length} notification(s) from history:`,
      idsArray,
    );
  },

  /**
   * Manually mark a notification as shown
   */
  markAsShown(id: string) {
    markNotificationAsShown(id);
    console.log(`✅ Marked notification as shown: ${id}`);
  },

  /**
   * Check if a specific notification has been shown
   */
  hasBeenShown(id: string) {
    const shown = getShownNotifications();
    const result = shown.has(id);
    console.log(`🔍 Notification ${id} has been shown: ${result}`);
    return result;
  },

  /**
   * Display all information about notification state
   */
  info() {
    const shown = Array.from(getShownNotifications());
    const count = shown.length;

    console.group("📊 Notification Toast Debug Info");
    console.log("Total shown notifications:", count);
    console.log("Storage key:", "shownNotifications");
    console.log("Max stored:", "100 (oldest removed automatically)");
    console.log("All shown IDs:", shown);

    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("shownNotifications");
        const size = raw ? new Blob([raw]).size : 0;
        console.log("Storage size:", `${size} bytes`);
      } catch (e) {
        console.warn("Could not calculate storage size");
      }
    }

    console.groupEnd();

    return {
      count,
      ids: shown,
    };
  },

  /**
   * Simulate showing a notification (for testing)
   */
  simulateShow(id: string) {
    console.log(`🧪 Simulating notification show: ${id}`);
    markNotificationAsShown(id);
    this.info();
  },

  /**
   * Reset and prepare for testing
   */
  resetForTesting() {
    clearShownNotifications();
    console.log("🧪 Reset notification state for testing");
    console.log("The next notification will appear as a toast");
  },
};

// Make it available globally for easy console access
if (typeof window !== "undefined") {
  (window as any).debugNotifications = debugNotifications;
}

// Export default for direct import
export default debugNotifications;
