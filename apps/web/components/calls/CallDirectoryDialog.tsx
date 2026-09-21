// components/calls/CallDirectoryDialog.tsx
// The call directory: Recents and a searchable Contacts list.
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertTriangle,
  Loader2,
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  Search,
} from "lucide-react";
import { cn } from "@/utils/classNames";
import { useCallDirectoryStore } from "@/stores/useCallDirectoryStore";
import { AccountTypeIcon, accountTypeLabel } from "./accountTypeIcon";
import {
  type CallRecent,
  type DirectoryUser,
  displayName,
  formatCallTime,
  formatDuration,
  initialsOf,
  isMissedCall,
} from "./types";

/**
 * Why the directory has no data. 'not-deployed' is a 404 — the server is on a
 * build without /api/calls/* — and must not be reported as a failure.
 */
type CallsUnavailable = "not-deployed" | "failed";

interface CallDirectoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (user: DirectoryUser) => void;
  /** Set while a call is being placed, to disable further taps. */
  placingUserId?: string | null;
}

export function CallDirectoryDialog({
  open,
  onOpenChange,
  onSelect,
  placingUserId,
}: CallDirectoryDialogProps) {
  const [tab, setTab] = useState<"recents" | "contacts">("recents");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" scrollable={false}>
        <DialogHeader>
          <DialogTitle>Call a colleague</DialogTitle>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "recents" | "contacts")}
          className="w-full"
        >
          <TabsList className="w-full mb-3">
            <TabsTrigger value="recents" className="flex-1">
              Recents
            </TabsTrigger>
            <TabsTrigger value="contacts" className="flex-1">
              Contacts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recents">
            <RecentsTab
              active={open && tab === "recents"}
              onSelect={onSelect}
              placingUserId={placingUserId}
            />
          </TabsContent>

          <TabsContent value="contacts">
            <ContactsTab
              active={open && tab === "contacts"}
              onSelect={onSelect}
              placingUserId={placingUserId}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Recents
// ---------------------------------------------------------------------------

function RecentsTab({
  active,
  onSelect,
  placingUserId,
}: {
  active: boolean;
  onSelect: (user: DirectoryUser) => void;
  placingUserId?: string | null;
}) {
  const calls = useCallDirectoryStore((s) => s.recents);
  const setRecents = useCallDirectoryStore((s) => s.setRecents);
  const isStale = useCallDirectoryStore((s) => s.isRecentsStale);
  const fetchedAt = useCallDirectoryStore((s) => s.recentsFetchedAt);

  // "Never loaded" is distinct from "loaded and empty" — conflating the two is
  // what made the skeleton render forever.
  const neverLoaded = fetchedAt === null;
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<CallsUnavailable | null>(null);

  useEffect(() => {
    if (!active) return;
    if (!isStale()) return; // cached data is fresh — skip the network
    let cancelled = false;

    (async () => {
      setIsFetching(true);
      setError(null);
      try {
        const res = await fetch("/api/calls/recents?limit=30");
        // 404 means the server is on a build without staff calling. That is a
        // deployment state, not a fault — reporting it as a failure sends
        // people debugging the wrong thing.
        if (res.status === 404) throw new Error("not-deployed");
        if (!res.ok) throw new Error("request-failed");
        const data = await res.json();
        if (!cancelled) setRecents(data.calls ?? []);
      } catch (err) {
        if (cancelled) return;
        console.warn("Recent calls unavailable:", err);
        setError(
          err instanceof Error && err.message === "not-deployed"
            ? "not-deployed"
            : "failed",
        );
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // isStale/setRecents are stable zustand selectors.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Skeleton only when there is nothing to show; a refresh over existing rows
  // is silent.
  if (neverLoaded && isFetching) {
    return (
      <ScrollArea className="h-[360px]">
        <RowSkeletons />
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-[360px]">
      {calls.length === 0 && (
        <EmptyState
          icon={
            error ? (
              <AlertTriangle className="h-8 w-8" />
            ) : (
              <Phone className="h-8 w-8" />
            )
          }
          title={
            error === "not-deployed"
              ? "Calling isn't available on this server yet"
              : error
                ? "Could not load recent calls"
                : "No recent calls"
          }
          hint={
            error === "not-deployed"
              ? "The server is running a build without staff calling."
              : error
                ? undefined
                : "Find someone in Contacts to place your first call."
          }
        />
      )}

      {calls.map((call) => {
        // 1:1 today, but the schema and this list are already N-participant.
        const other = call.counterparties[0];
        if (!other) return null;

        const extra = call.counterparties.length - 1;
        const missed = isMissedCall(call);

        const DirectionIcon = missed
          ? PhoneMissed
          : call.direction === "incoming"
            ? PhoneIncoming
            : PhoneOutgoing;

        return (
          <PersonRow
            key={call.callId}
            image={other.image}
            initials={initialsOf(other)}
            title={
              extra > 0
                ? `${displayName(other)} +${extra}`
                : displayName(other)
            }
            subtitle={
              <span className="flex items-center gap-1.5">
                <DirectionIcon
                  className={cn(
                    "h-3 w-3 shrink-0",
                    missed && "text-destructive",
                  )}
                />
                <span className={cn(missed && "text-destructive")}>
                  {formatCallTime(call.startedAt)}
                </span>
                {call.durationSeconds != null && call.durationSeconds > 0 && (
                  <span className="text-muted-foreground">
                    · {formatDuration(call.durationSeconds)}
                  </span>
                )}
              </span>
            }
            email={other.email}
            accountType={other.accountType}
            busy={placingUserId === other.id}
            disabled={!!placingUserId}
            onClick={() =>
              onSelect({
                id: other.id,
                email: other.email,
                firstName: other.firstName,
                lastName: other.lastName,
                accountType: other.accountType,
                image: other.image,
              })
            }
          />
        );
      })}
    </ScrollArea>
  );
}

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

function ContactsTab({
  active,
  onSelect,
  placingUserId,
}: {
  active: boolean;
  onSelect: (user: DirectoryUser) => void;
  placingUserId?: string | null;
}) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [users, setUsers] = useState<DirectoryUser[] | null>(null);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<CallsUnavailable | null>(null);

  // Only the unfiltered first page is cached. Search results are
  // query-dependent and paged, so caching them would mean a cache key per
  // query for data that changes as people are authorized — not worth it.
  const cachedContacts = useCallDirectoryStore((s) => s.contacts);
  const setCachedContacts = useCallDirectoryStore((s) => s.setContacts);
  const isContactsStale = useCallDirectoryStore((s) => s.isContactsStale);

  // Rising counter so a slow in-flight response can never overwrite a newer one.
  const requestSeq = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(
    async (q: string, offset: number) => {
      const seq = ++requestSeq.current;
      if (offset > 0) setIsLoadingMore(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          limit: "50",
          offset: String(offset),
        });
        if (q) params.set("q", q);

        const res = await fetch(`/api/users/directory?${params}`);
        if (res.status === 404) throw new Error("not-deployed");
        if (!res.ok) throw new Error("request-failed");
        const data = await res.json();
        if (seq !== requestSeq.current) return; // superseded

        setUsers((prev) =>
          offset > 0 ? [...(prev ?? []), ...data.users] : data.users,
        );
        // Seed the cache from the unfiltered first page only.
        if (!q && offset === 0) setCachedContacts(data.users ?? []);
        setNextOffset(data.nextOffset ?? null);
      } catch (err) {
        if (seq !== requestSeq.current) return;
        console.warn("Contacts unavailable:", err);
        if (offset === 0) setUsers([]);
        setError(
          err instanceof Error && err.message === "not-deployed"
            ? "not-deployed"
            : "failed",
        );
      } finally {
        if (seq === requestSeq.current) setIsLoadingMore(false);
      }
    },
    [setCachedContacts],
  );

  useEffect(() => {
    if (!active) return;

    // Show cached contacts immediately for the unfiltered view, and skip the
    // request entirely while that cache is fresh. This is what removes the
    // skeleton on reopen.
    if (!debounced && cachedContacts.length > 0) {
      setUsers(cachedContacts);
      if (!isContactsStale()) return;
      void load("", 0);
      return;
    }

    setUsers(null);
    void load(debounced, 0);
    // cachedContacts/isContactsStale are stable zustand selectors.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, debounced, load]);

  const isSearching = useMemo(
    () => query.trim() !== debounced,
    [query, debounced],
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email"
          className="pl-8"
          autoFocus
        />
        {isSearching && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      <ScrollArea className="h-[312px]">
        {users === null ? (
          <RowSkeletons />
        ) : (
          <>
            {users.length === 0 && (
              <EmptyState
                icon={
                  error ? (
                    <AlertTriangle className="h-8 w-8" />
                  ) : (
                    <Search className="h-8 w-8" />
                  )
                }
                title={
                  error === "not-deployed"
                    ? "Calling isn't available on this server yet"
                    : error
                      ? "Could not load contacts"
                      : debounced
                        ? "No matches"
                        : "No colleagues found"
                }
                hint={
                  error === "not-deployed"
                    ? "The server is running a build without staff calling."
                    : error
                      ? undefined
                      : debounced
                        ? "Try a different name or email."
                        : undefined
                }
              />
            )}

            {users.map((user) => (
              <PersonRow
                key={user.id}
                image={user.image}
                initials={initialsOf(user)}
                title={displayName(user)}
                subtitle={
                  <span>
                    {accountTypeLabel(user.accountType)}
                    {user.doctorSpecialty?.length
                      ? ` · ${user.doctorSpecialty.join(", ")}`
                      : ""}
                  </span>
                }
                email={user.email}
                accountType={user.accountType}
                busy={placingUserId === user.id}
                disabled={!!placingUserId}
                onClick={() => onSelect(user)}
              />
            ))}

            {nextOffset !== null && (
              <div className="p-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => void load(debounced, nextOffset)}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </ScrollArea>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared row / states
// ---------------------------------------------------------------------------

function PersonRow({
  image,
  initials,
  title,
  subtitle,
  email,
  accountType,
  onClick,
  busy,
  disabled,
}: {
  image?: string | null;
  initials: string;
  title: string;
  subtitle: React.ReactNode;
  /** Third line. Recents rows carry it too, so both tabs read the same. */
  email?: string;
  /** Drives the role icon beside the name. */
  accountType?: string;
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 text-left border-b transition",
        "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
        disabled && !busy && "opacity-50 cursor-not-allowed",
      )}
    >
      <Avatar
        src={image ?? undefined}
        initials={initials}
        className="h-9 w-9 shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="flex items-center gap-1.5 font-medium text-sm">
          {accountType ? (
            <AccountTypeIcon
              accountType={accountType}
              className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
            />
          ) : null}
          <span className="truncate">{title}</span>
        </p>
        <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        {email ? (
          <p className="text-xs text-muted-foreground/70 truncate">{email}</p>
        ) : null}
      </div>
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
      ) : (
        <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
      )}
    </button>
  );
}

function RowSkeletons() {
  return (
    <>
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5 border-b">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </>
  );
}

function EmptyState({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
      <div className="mb-3 opacity-50">{icon}</div>
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="text-xs mt-1">{hint}</p>}
    </div>
  );
}
