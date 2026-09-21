// apps/web/components/adminDashboard/sections/existing-users/CallLogsView.tsx
//
// Global staff-call log for admins. Sits beside UserEditLogsView and follows
// the same precedent: an accordion inside the existing-users section, so it
// needs no sectionRegistry entry and no packages/shared change.
"use client";

import { useEffect, useRef, useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Pagination } from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Phone,
  PhoneMissed,
  PhoneOff,
  Search,
  X,
  Users,
} from "lucide-react";
import { formatDuration, type CallStatus } from "@fajr/shared/calls";
import { cn } from "@/lib/utils";
import {
  useCallLogsViewModel,
  type CallStatusFilter,
} from "./CallLogsViewModel";

interface CallLogsViewProps {
  onExpandChange?: (expanded: boolean) => void;
}

const FILTERS: { value: CallStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "completed", label: "Completed" },
  { value: "missed", label: "Missed" },
  { value: "declined", label: "Declined" },
];

/** Colour by outcome — an admin scanning this cares about failures first. */
function statusVariant(
  status: CallStatus,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "completed":
      return "default";
    case "missed":
    case "failed":
      return "destructive";
    case "declined":
    case "canceled":
      return "secondary";
    default:
      return "outline";
  }
}

export function CallLogsView({ onExpandChange }: CallLogsViewProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const {
    calls,
    isLoading,
    error,
    pagination,
    page,
    setPage,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
  } = useCallLogsViewModel();

  useEffect(() => {
    onExpandChange?.(isExpanded);
  }, [isExpanded, onExpandChange]);

  useEffect(() => {
    if (isSearchOpen) searchRef.current?.focus();
  }, [isSearchOpen]);

  return (
    <Card className="w-full" backgroundColor="card" shadowSize="lg">
      <Accordion
        type="single"
        collapsible
        onValueChange={(v) => setIsExpanded(v === "call-logs")}
      >
        <AccordionItem value="call-logs" className="border-none">
          <AccordionTrigger className="px-6 py-4">
            <div className="flex items-center gap-2 transition-colors border border-border p-2 rounded-2xl hover:bg-accent hover:text-accent-foreground">
              <Phone className="h-5 w-5 text-primary" />
              <span className="text-xl font-semibold text-foreground">
                Staff Call Logs
              </span>
              {pagination.total > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {pagination.total}
                </Badge>
              )}
            </div>
          </AccordionTrigger>

          <AccordionContent>
            <CardContent className="space-y-4">
              {/* Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {FILTERS.map((f) => (
                  <Button
                    key={f.value}
                    type="button"
                    size="sm"
                    variant={statusFilter === f.value ? "default" : "outline"}
                    onClick={() => {
                      setStatusFilter(f.value);
                      setPage(1);
                    }}
                  >
                    {f.label}
                  </Button>
                ))}

                <div className="ml-auto flex items-center gap-2">
                  {isSearchOpen ? (
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        ref={searchRef}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Filter by name or email"
                        className="pl-8 w-64"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSearch("");
                          setIsSearchOpen(false);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label="Close search"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setIsSearchOpen(true)}
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Body */}
              {isLoading ? (
                <div className="flex justify-center p-8 text-muted-foreground">
                  Loading call logs…
                </div>
              ) : error ? (
                <div className="p-4 text-center text-destructive">{error}</div>
              ) : calls.length === 0 ? (
                <div className="flex flex-col items-center gap-2 p-8 text-center text-muted-foreground">
                  <PhoneOff className="h-8 w-8 opacity-50" />
                  <p className="text-sm">
                    {search || statusFilter !== "all"
                      ? "No calls match this filter"
                      : "No staff calls yet"}
                  </p>
                </div>
              ) : (
                <ScrollArea className="max-h-[520px]">
                  <div className="space-y-2 pr-2">
                    {calls.map((call) => {
                      const missed =
                        call.status === "missed" || call.status === "failed";
                      return (
                        <div
                          key={call.callId}
                          className="rounded-lg border border-border p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2 min-w-0">
                              {missed ? (
                                <PhoneMissed className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
                              ) : (
                                <Phone className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                              )}
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {call.caller?.name ?? "Unknown"}
                                  <span className="text-muted-foreground font-normal">
                                    {" → "}
                                    {call.callees.length === 0
                                      ? "nobody"
                                      : call.callees
                                          .map((c) => c.name)
                                          .join(", ")}
                                  </span>
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(call.startedAt), "PPp")}
                                  {" · "}
                                  {formatDistanceToNow(
                                    new Date(call.startedAt),
                                    { addSuffix: true },
                                  )}
                                  {call.endReason ? ` · ${call.endReason}` : ""}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {call.isGroupCall && (
                                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                              {call.durationSeconds != null &&
                                call.durationSeconds > 0 && (
                                  <span className="text-xs tabular-nums text-muted-foreground">
                                    {formatDuration(call.durationSeconds)}
                                  </span>
                                )}
                              <Badge
                                variant={statusVariant(call.status)}
                                className={cn("capitalize")}
                              >
                                {call.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}

              {pagination.totalPages > 1 && (
                <Pagination
                  currentPage={page}
                  totalPages={pagination.totalPages}
                  onPageChange={setPage}
                />
              )}
            </CardContent>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}

export default CallLogsView;
