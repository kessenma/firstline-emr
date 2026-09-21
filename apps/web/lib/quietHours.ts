// lib/quietHours.ts
// Shared quiet-hours evaluation. Extracted from NotificationService so the
// call-initiation route can ask the same question without duplicating the
// timezone arithmetic.

export interface QuietHoursSettings {
  quietHoursEnabled: boolean | null;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  quietHoursTimezone: string | null;
}

/**
 * Check if the current time falls within the user's quiet hours window.
 * Handles overnight ranges (e.g. 22:00–07:00).
 *
 * Fails open (returns false) on an invalid timezone or malformed window —
 * suppressing a notification because of bad config is worse than sending one.
 */
export function isInQuietHours(settings: QuietHoursSettings): boolean {
  if (!settings.quietHoursEnabled) return false;
  if (
    !settings.quietHoursStart ||
    !settings.quietHoursEnd ||
    !settings.quietHoursTimezone
  ) {
    return false;
  }

  try {
    // Get current time in user's timezone
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: settings.quietHoursTimezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const currentHour = parseInt(
      parts.find((p) => p.type === "hour")?.value || "0",
      10,
    );
    const currentMinute = parseInt(
      parts.find((p) => p.type === "minute")?.value || "0",
      10,
    );
    const currentMinutes = currentHour * 60 + currentMinute;

    // Parse start/end times
    const [startH, startM] = settings.quietHoursStart.split(":").map(Number);
    const [endH, endM] = settings.quietHoursEnd.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes <= endMinutes) {
      // Same-day range (e.g. 09:00–17:00)
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      // Overnight range (e.g. 22:00–07:00)
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
  } catch (error) {
    console.error("Failed to check quiet hours:", error);
    return false; // Fail open — don't suppress push if timezone is invalid
  }
}

/**
 * The local end time of the user's quiet hours window, formatted for display
 * to *another* user ("Dr. Ahmed has quiet hours on until 7:00 AM").
 *
 * Returns null when quiet hours are not configured or the window is unparseable.
 */
export function formatQuietHoursEnd(
  settings: QuietHoursSettings,
): string | null {
  if (!settings.quietHoursEnd) return null;

  try {
    const [endH, endM] = settings.quietHoursEnd.split(":").map(Number);
    if (Number.isNaN(endH) || Number.isNaN(endM)) return null;

    const suffix = endH >= 12 ? "PM" : "AM";
    const hour12 = endH % 12 === 0 ? 12 : endH % 12;
    return `${hour12}:${String(endM).padStart(2, "0")} ${suffix}`;
  } catch {
    return null;
  }
}
