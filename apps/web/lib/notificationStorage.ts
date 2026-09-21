// apps/web/lib/notificationStorage.ts

/**
 * Utility functions for managing shown notification history in localStorage
 * This prevents notification toasts from appearing repeatedly on page refresh
 */

const STORAGE_KEY = "shownNotifications";
const MAX_STORED_NOTIFICATIONS = 100;

/**
 * Get the set of notification IDs that have already been shown as toasts
 */
export function getShownNotifications(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch (error) {
    console.error("Error reading shown notifications from localStorage:", error);
    return new Set();
  }
}

/**
 * Mark a notification as shown (add to localStorage)
 */
export function markNotificationAsShown(notificationId: string): void {
  if (typeof window === "undefined") return;
  try {
    const shown = getShownNotifications();
    shown.add(notificationId);

    // Keep only the most recent notifications to prevent unbounded growth
    const array = Array.from(shown).slice(-MAX_STORED_NOTIFICATIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(array));
  } catch (error) {
    console.error("Error saving shown notification to localStorage:", error);
  }
}

/**
 * Check if a notification has already been shown
 */
export function hasNotificationBeenShown(notificationId: string): boolean {
  const shown = getShownNotifications();
  return shown.has(notificationId);
}

/**
 * Clear all shown notification history
 * Useful for debugging or if you want to reset the state
 */
export function clearShownNotifications(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Error clearing shown notifications from localStorage:", error);
  }
}

/**
 * Remove specific notification IDs from the shown list
 * Useful if you want to allow a notification to be shown again
 */
export function removeShownNotifications(notificationIds: string[]): void {
  if (typeof window === "undefined") return;
  try {
    const shown = getShownNotifications();
    notificationIds.forEach(id => shown.delete(id));

    const array = Array.from(shown);
    if (array.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(array));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (error) {
    console.error("Error removing shown notifications from localStorage:", error);
  }
}

/**
 * Get the count of shown notifications currently stored
 */
export function getShownNotificationsCount(): number {
  return getShownNotifications().size;
}
