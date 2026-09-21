"use client";

import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users, Stethoscope } from "lucide-react";
import { AccountTypeIcon, accountTypeLabel } from "@/components/calls/accountTypeIcon";
import {
  getRecipientTabs,
  filterRecipients,
  type RecipientTabId,
  type RecipientUser,
} from "@fajr/shared/patient-share";

interface Props {
  /** The patient being shared — drives the specialty tab's label and filter. */
  missionId?: string | null;
  specialty?: string | null;
  onSelect: (user: RecipientUser) => void;
  selectedUserId?: string | null;
  disabled?: boolean;
}

const TAB_ICONS = { Users, Stethoscope } as const;

/**
 * Recipient picker for "Send to Chat".
 *
 * Sending used to be limited to threads that already existed, so you couldn't
 * hand a patient to someone you'd never messaged. This picks a *person*; the
 * caller resolves them to a thread via POST /api/internal-messages/direct.
 *
 * Mirrors CallDirectoryDialog's structure — mobile has the same picker written
 * against React Native, sharing the tab config and predicates but not the UI.
 */
export function SendPatientRecipientPicker({
  missionId,
  specialty,
  onSelect,
  selectedUserId,
  disabled,
}: Props) {
  const tabs = getRecipientTabs(specialty);
  const firstEnabled = tabs.find((t) => !t.disabled)?.id ?? "triage";

  const [tab, setTab] = React.useState<RecipientTabId>(firstEnabled);
  const [query, setQuery] = React.useState("");
  const [users, setUsers] = React.useState<RecipientUser[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const requestSeq = React.useRef(0);

  React.useEffect(() => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ limit: "100" });
    if (query.trim()) params.set("q", query.trim());
    // Narrow server-side where we can; the shared predicates then apply the
    // exact same rule client-side, so both platforms agree.
    if (tab === "triage") params.set("accountType", "Triage");
    if (tab === "doctors") {
      params.set("accountType", "Doctor");
      if (missionId) params.set("missionId", missionId);
    }
    if (tab === "specialty") {
      params.set("accountType", "Doctor");
      if (specialty) params.set("specialty", specialty);
    }

    fetch(`/api/users/directory?${params.toString()}`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load recipients");
        return r.json();
      })
      .then((data) => {
        if (seq !== requestSeq.current) return; // a newer request superseded this
        setUsers(data.users ?? []);
      })
      .catch((err) => {
        if (seq !== requestSeq.current) return;
        setError(err instanceof Error ? err.message : "Failed to load recipients");
      })
      .finally(() => {
        if (seq === requestSeq.current) setLoading(false);
      });
  }, [tab, query, missionId, specialty]);

  const visible = filterRecipients(users, tab, { missionId, specialty });

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as RecipientTabId)}>
      <TabsList className="w-full">
        {tabs.map((t) => {
          const Icon = TAB_ICONS[t.iconName];
          return (
            <TabsTrigger
              key={t.id}
              value={t.id}
              disabled={t.disabled}
              title={t.disabledReason}
              className="flex-1 gap-1.5"
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="truncate">{t.label}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>

      <TabsContent value={tab} className="mt-3 space-y-2">
        <div className="flex items-center gap-2 rounded-md border border-input px-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email"
            className="border-0 shadow-none focus-visible:ring-0 px-0"
          />
        </div>

        <div className="h-[280px] overflow-y-auto space-y-1 pr-1">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))
          ) : error ? (
            <p className="text-sm text-destructive py-4 text-center">{error}</p>
          ) : visible.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No matching staff.
            </p>
          ) : (
            visible.map((user) => {
              const isSelected = selectedUserId === user.id;
              const name =
                [user.firstName, user.lastName].filter(Boolean).join(" ") ||
                user.email;
              return (
                <button
                  key={user.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelect(user)}
                  className={`w-full text-left rounded-md border px-3 py-2 transition-colors disabled:opacity-50 ${
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <AccountTypeIcon
                      accountType={user.accountType}
                      className="h-4 w-4 text-muted-foreground"
                    />
                    <span className="text-sm font-medium truncate">{name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate pl-6">
                    {accountTypeLabel(user.accountType)}
                    {user.doctorSpecialty?.length
                      ? ` · ${user.doctorSpecialty.join(", ")}`
                      : ""}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
