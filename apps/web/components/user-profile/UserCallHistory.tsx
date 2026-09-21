// apps/web/components/user-profile/UserCallHistory.tsx
//
// One user's staff-call history, shown on their profile.
//
// Reads from `calls` via /api/calls/user/[userId], NOT from userProfileLogs:
// that table is a field-level diff of profile edits and structurally cannot
// represent a call. Same auth rule as the profile logs — your own history, or
// anyone's if you're an admin.
"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import {
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  Loader2,
} from "lucide-react";
import {
  type CallRecent,
  displayName,
  formatCallTime,
  formatDuration,
  initialsOf,
  isMissedCall,
} from "@fajr/shared/calls";
import { cn } from "@/lib/utils";

interface UserCallHistoryProps {
  userId: string;
  className?: string;
}

export function UserCallHistory({ userId, className }: UserCallHistoryProps) {
  const [calls, setCalls] = useState<CallRecent[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (cursor?: string | null) => {
      if (!userId) return;
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ limit: "20" });
        if (cursor) params.set("cursor", cursor);
        const res = await fetch(
          `/api/calls/user/${userId}?${params.toString()}`,
        );
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        setCalls((prev) =>
          cursor ? [...prev, ...(data.calls ?? [])] : (data.calls ?? []),
        );
        setNextCursor(data.nextCursor ?? null);
      } catch (err) {
        console.error("Error loading call history:", err);
        setError("Could not load call history");
      } finally {
        setIsLoading(false);
        setHasLoaded(true);
      }
    },
    [userId],
  );

  // Deferred until the accordion is opened — a profile page should not pay for
  // a history nobody looked at.
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    if (isOpen && !hasLoaded) void load();
  }, [isOpen, hasLoaded, load]);

  if (!userId) return null;

  return (
    <Card
      className={cn("w-full max-w-3xl mx-auto", className)}
      backgroundColor="card"
      shadowSize="lg"
    >
      <Accordion
        type="single"
        collapsible
        onValueChange={(v) => setIsOpen(v === "calls")}
      >
        <AccordionItem value="calls" className="border-none">
          <AccordionTrigger className="px-6 py-4">
            <div className="flex items-center gap-2 transition-colors border border-border p-2 rounded-2xl hover:bg-accent hover:text-accent-foreground">
              <Phone className="h-5 w-5 text-primary" />
              <span className="text-xl font-semibold text-foreground">
                Call History
              </span>
            </div>
          </AccordionTrigger>

          <AccordionContent>
            <CardContent>
              {isLoading && calls.length === 0 ? (
                <div className="flex justify-center p-4 text-muted-foreground">
                  Loading…
                </div>
              ) : error ? (
                <div className="p-4 text-center text-destructive">{error}</div>
              ) : calls.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No calls yet
                </div>
              ) : (
                <div className="space-y-2">
                  {calls.map((call) => {
                    const other = call.counterparties[0];
                    const extra = call.counterparties.length - 1;
                    const missed = isMissedCall(call);
                    const DirectionIcon = missed
                      ? PhoneMissed
                      : call.direction === "incoming"
                        ? PhoneIncoming
                        : PhoneOutgoing;

                    return (
                      <div
                        key={call.callId}
                        className="flex items-center gap-3 rounded-lg border border-border p-3"
                      >
                        <Avatar
                          src={other?.image ?? undefined}
                          initials={other ? initialsOf(other) : "?"}
                          className="h-9 w-9 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {other ? displayName(other) : "Unknown"}
                            {extra > 0 && (
                              <span className="text-muted-foreground">
                                {" "}
                                +{extra}
                              </span>
                            )}
                          </p>
                          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <DirectionIcon
                              className={cn(
                                "h-3 w-3 shrink-0",
                                missed && "text-destructive",
                              )}
                            />
                            <span className={cn(missed && "text-destructive")}>
                              {formatCallTime(call.startedAt)}
                            </span>
                            {call.durationSeconds != null &&
                              call.durationSeconds > 0 && (
                                <span>
                                  · {formatDuration(call.durationSeconds)}
                                </span>
                              )}
                          </p>
                        </div>
                        <Badge variant="outline" className="capitalize shrink-0">
                          {call.status}
                        </Badge>
                      </div>
                    );
                  })}

                  {nextCursor && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => void load(nextCursor)}
                      disabled={isLoading}
                    >
                      {isLoading && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Load more
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}

export default UserCallHistory;
