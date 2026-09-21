"use client";

import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Bell,
  MessageSquare,
  MessageCircle,
  UserCog,
  Moon,
  Phone,
  Clock,
  Globe,
  Info,
} from "lucide-react";
import { useUserSettings } from "./settings/UserSettingsViewModel";

interface NotificationToggleProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

function NotificationToggle({
  icon,
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false,
}: NotificationToggleProps) {
  return (
    <div
      className={`flex items-start justify-between gap-4 rounded-lg border p-4 ${disabled ? "opacity-50" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-primary">{icon}</div>
        <div>
          <Label className="text-sm font-medium">{label}</Label>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}

export function NotificationSettings() {
  const { settings, updateSettings, isLoading } = useUserSettings();

  // Timezone change detection
  const [showTimezoneDialog, setShowTimezoneDialog] = useState(false);
  const [detectedTimezone, setDetectedTimezone] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || !settings) return;
    const s = settings as any;
    if (!s.quietHoursEnabled || !s.quietHoursTimezone) return;

    const currentTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (currentTz !== s.quietHoursTimezone) {
      setDetectedTimezone(currentTz);
      setShowTimezoneDialog(true);
    }
  }, [isLoading, settings]);

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">
        Loading notification settings...
      </div>
    );
  }

  const s = settings as any;
  const pushEnabled = s.pushNotificationsEnabled !== false;
  const quietHoursEnabled = s.quietHoursEnabled === true;

  const handleUpdate = (field: string, value: any) => {
    updateSettings({ settings: { [field]: value } as any });
  };

  const handleKeepSameLocalTimes = () => {
    // Just update timezone, keep HH:mm values the same
    handleUpdate("quietHoursTimezone", detectedTimezone);
    setShowTimezoneDialog(false);
  };

  const handleKeepAbsoluteTimes = () => {
    if (!detectedTimezone || !s.quietHoursTimezone || !s.quietHoursStart || !s.quietHoursEnd) {
      setShowTimezoneDialog(false);
      return;
    }

    // Convert times from old timezone to new timezone
    const convertTime = (timeStr: string) => {
      const [h, m] = timeStr.split(":").map(Number);
      // Create a date in the old timezone at the given time
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}T${timeStr}:00`;

      // Get the UTC equivalent from old timezone, then convert to new timezone
      const oldFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: detectedTimezone!,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      // Use a reference date to compute offset difference
      const refDate = new Date(`${dateStr}`);
      // This is approximate — compute using timezone offset difference
      const oldParts = new Intl.DateTimeFormat("en-US", {
        timeZone: s.quietHoursTimezone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(refDate);
      const newParts = oldFormatter.formatToParts(refDate);

      const newH = newParts.find((p: any) => p.type === "hour")?.value || "00";
      const newM = newParts.find((p: any) => p.type === "minute")?.value || "00";
      return `${newH}:${newM}`;
    };

    const newStart = convertTime(s.quietHoursStart);
    const newEnd = convertTime(s.quietHoursEnd);

    updateSettings({
      settings: {
        quietHoursTimezone: detectedTimezone,
        quietHoursStart: newStart,
        quietHoursEnd: newEnd,
      } as any,
    });
    setShowTimezoneDialog(false);
  };

  return (
    <div className="space-y-6">
      {/* Timezone change dialog */}
      {showTimezoneDialog && detectedTimezone && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-amber-500" />
            <p className="text-sm font-medium">Timezone Changed</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Your timezone changed from <strong>{s.quietHoursTimezone}</strong> to{" "}
            <strong>{detectedTimezone}</strong>. Your quiet hours are set to{" "}
            {s.quietHoursStart}–{s.quietHoursEnd} ({s.quietHoursTimezone}).
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleKeepSameLocalTimes}
              className="px-3 py-1.5 text-xs font-medium rounded-md border hover:bg-muted transition-colors"
            >
              Keep same local times
            </button>
            <button
              onClick={handleKeepAbsoluteTimes}
              className="px-3 py-1.5 text-xs font-medium rounded-md border hover:bg-muted transition-colors"
            >
              Keep same absolute times
            </button>
            <button
              onClick={() => setShowTimezoneDialog(false)}
              className="px-3 py-1.5 text-xs font-medium rounded-md text-muted-foreground hover:text-foreground transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Master push toggle */}
      <NotificationToggle
        icon={<Bell className="h-5 w-5" />}
        label="Push Notifications"
        description="Receive push notifications on your device"
        checked={pushEnabled}
        onCheckedChange={(checked) =>
          handleUpdate("pushNotificationsEnabled", checked)
        }
      />

      {/* Category toggles */}
      <div className="space-y-3 pl-2 border-l-2 border-primary/20 ml-2">
        <NotificationToggle
          icon={<MessageSquare className="h-4 w-4" />}
          label="Internal Messages"
          description="Messages from your care team in internal threads"
          checked={s.notifyInternalMessages !== false}
          onCheckedChange={(checked) =>
            handleUpdate("notifyInternalMessages", checked)
          }
          disabled={!pushEnabled}
        />
        <NotificationToggle
          icon={<MessageCircle className="h-4 w-4" />}
          label="Patient Messages"
          description="Messages from patients on Telegram threads you're participating in"
          checked={s.notifyPatientMessages !== false}
          onCheckedChange={(checked) =>
            handleUpdate("notifyPatientMessages", checked)
          }
          disabled={!pushEnabled}
        />
        <NotificationToggle
          icon={<UserCog className="h-4 w-4" />}
          label="Patient Actions"
          description="New patient registrations, specialty assignments, and care team changes"
          checked={s.notifyPatientActions !== false}
          onCheckedChange={(checked) =>
            handleUpdate("notifyPatientActions", checked)
          }
          disabled={!pushEnabled}
        />
        <NotificationToggle
          icon={<Phone className="h-4 w-4" />}
          label="Staff Calls"
          description="Incoming audio calls from colleagues — turning this off makes you unreachable by call"
          checked={s.notifyCalls !== false}
          onCheckedChange={(checked) => handleUpdate("notifyCalls", checked)}
          disabled={!pushEnabled}
        />
      </div>

      {/* Quiet Hours */}
      <div className="space-y-3">
        <NotificationToggle
          icon={<Moon className="h-5 w-5" />}
          label="Quiet Hours"
          description="Pause push notifications during set hours — notifications still appear in-app"
          checked={quietHoursEnabled}
          onCheckedChange={(checked) =>
            handleUpdate("quietHoursEnabled", checked)
          }
        />

        {/* Calls are the one category that ignores quiet hours, so say so here
            rather than letting someone discover it at 3am. The caller has to
            confirm an override first — see POST /api/calls. */}
        {quietHoursEnabled && (
          <p className="pl-2 ml-2 text-xs text-muted-foreground">
            Live calls from staff will still ring during quiet hours.
          </p>
        )}

        {quietHoursEnabled && (
          <div className="pl-4 border-l-2 border-primary/20 ml-4 space-y-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm">Start</Label>
                <input
                  type="time"
                  value={s.quietHoursStart || "22:00"}
                  onChange={(e) =>
                    handleUpdate("quietHoursStart", e.target.value)
                  }
                  className="rounded-md border bg-background px-2 py-1 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">End</Label>
                <input
                  type="time"
                  value={s.quietHoursEnd || "07:00"}
                  onChange={(e) =>
                    handleUpdate("quietHoursEnd", e.target.value)
                  }
                  className="rounded-md border bg-background px-2 py-1 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm">Timezone</Label>
              <select
                value={
                  s.quietHoursTimezone ||
                  Intl.DateTimeFormat().resolvedOptions().timeZone
                }
                onChange={(e) =>
                  handleUpdate("quietHoursTimezone", e.target.value)
                }
                className="rounded-md border bg-background px-2 py-1 text-sm max-w-[250px]"
              >
                {Intl.supportedValuesOf("timeZone").map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3" />
              Push notifications are paused during quiet hours. In-app
              notifications are always delivered.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
