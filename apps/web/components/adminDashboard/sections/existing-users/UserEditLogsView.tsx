// apps/web/components/adminDashboard/sections/existing-users/UserEditLogsView.tsx
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
import {
  History,
  Search,
  X,
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
  Filter,
} from "lucide-react";
import { useUserEditLogsViewModel } from "./UserEditLogsViewModel";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StyledTabs } from "@/components/ui/tabs";

interface UserEditLogsViewProps {
  onExpandChange?: (expanded: boolean) => void;
}

type FilterType = "all" | "admin" | "user";

export function UserEditLogsView({ onExpandChange }: UserEditLogsViewProps) {
  const accordionRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const {
    logs,
    isLoading,
    error,
    pagination,
    handlePageChange,
    formatFieldName,
    formatValue,
  } = useUserEditLogsViewModel();

  const [searchTerm, setSearchTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  const [allExpanded, setAllExpanded] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>("all");

  const filteredLogs = logs.filter((log) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      log.userEmail?.toLowerCase().includes(searchLower) ||
      log.userName?.toLowerCase().includes(searchLower) ||
      log.userId.toLowerCase().includes(searchLower) ||
      log.changedBy.toLowerCase().includes(searchLower);

    const matchesFilter =
      filterType === "all" ||
      (filterType === "admin" && log.isAdminAction) ||
      (filterType === "user" && !log.isAdminAction);

    return matchesSearch && matchesFilter;
  });

  // Group logs by date
  const groupedLogs = filteredLogs.reduce(
    (groups, log) => {
      const date = new Date(log.changedAt);
      const dateStr = format(date, "yyyy-MM-dd");

      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }

      groups[dateStr].push(log);
      return groups;
    },
    {} as Record<string, typeof filteredLogs>,
  );

  // Sort dates in descending order (newest first)
  const sortedDates = Object.keys(groupedLogs).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  );

  // Handle expansion state and notify parent component
  const handleExpand = (expanded: boolean) => {
    setIsExpanded(expanded);
    if (onExpandChange) {
      onExpandChange(expanded);
    }
  };

  // Focus search input when search is opened
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    if (isExpanded && accordionRef.current) {
      accordionRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [isExpanded]);

  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
    if (!isSearchOpen) {
      // Reset search when opening
      setSearchTerm("");
    }
  };

  const toggleLogExpansion = (logId: string) => {
    setExpandedLogs((prev) => ({
      ...prev,
      [logId]: !prev[logId],
    }));
  };

  const toggleAllLogs = () => {
    const newExpandedState = !allExpanded;
    setAllExpanded(newExpandedState);

    const newExpandedLogs: Record<string, boolean> = {};
    filteredLogs.forEach((log) => {
      newExpandedLogs[log._id] = newExpandedState;
    });
    setExpandedLogs(newExpandedLogs);
  };

  return (
    <Card className="w-full bg-card shadow-md rounded-lg">
      <Accordion
        type="single"
        collapsible
        onValueChange={(value) => handleExpand(value === "logs")}
      >
        <AccordionItem value="logs" className="border-none" ref={accordionRef}>
          <AccordionTrigger className="px-6 py-4 hover:bg-muted">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5" />
              <h2 className="text-xl font-medium">All User Edit History</h2>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <CardContent className="p-6">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <AnimatePresence initial={false}>
                    {isSearchOpen ? (
                      <motion.div
                        className="relative flex-1"
                        initial={{ width: "40px", opacity: 0 }}
                        animate={{ width: "100%", opacity: 1 }}
                        exit={{ width: "40px", opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Input
                          ref={searchInputRef}
                          type="text"
                          placeholder="Search by user email, name, or ID"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 w-full pr-10"
                        />
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
                          onClick={toggleSearch}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                          onClick={toggleSearch}
                        >
                          <Search className="h-4 w-4" />
                          <span className="hidden sm:inline">Search</span>
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <StyledTabs.Root
                    defaultValue="all"
                    value={filterType}
                    onValueChange={(value) =>
                      setFilterType(value as FilterType)
                    }
                    className="w-full sm:w-auto"
                  >
                    <StyledTabs.List className="grid grid-cols-3 gap-0">
                      <StyledTabs.Trigger value="all" className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Filter className="h-3.5 w-3.5" />
                          <span>All Updates</span>
                        </div>
                      </StyledTabs.Trigger>
                      <StyledTabs.Trigger value="admin" className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="h-2.5 w-2.5 rounded-full bg-primary"></div>
                          <span>Admin</span>
                        </div>
                      </StyledTabs.Trigger>
                      <StyledTabs.Trigger value="user" className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="h-2.5 w-2.5 rounded-full bg-muted"></div>
                          <span>User</span>
                        </div>
                      </StyledTabs.Trigger>
                    </StyledTabs.List>
                  </StyledTabs.Root>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {filteredLogs.length}{" "}
                    {filteredLogs.length === 1 ? "edit" : "edits"} found
                  </div>

                  {filteredLogs.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleAllLogs}
                      className="flex items-center gap-1"
                    >
                      {allExpanded ? (
                        <>
                          <ChevronsUp className="h-4 w-4" />
                          <span className="hidden sm:inline">Collapse All</span>
                        </>
                      ) : (
                        <>
                          <ChevronsDown className="h-4 w-4" />
                          <span className="hidden sm:inline">Expand All</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {isLoading ? (
                <div className="flex justify-center p-4">
                  Loading edit history...
                </div>
              ) : error ? (
                <div className="text-center p-4 bg-destructive/10 text-destructive rounded-lg">
                  Error loading edit history: {(error as Error).message}
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center p-4 bg-muted rounded-lg mt-4">
                  {searchTerm || filterType !== "all"
                    ? "No matching edit history found"
                    : "No edit history available"}
                </div>
              ) : (
                <div className="mt-4">
                  <ScrollArea className="h-[calc(100vh-300px)] max-h-[800px]">
                    <div className="space-y-6 pr-4">
                      {sortedDates.map((dateStr) => (
                        <div key={dateStr} className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-foreground">
                              {format(new Date(dateStr), "MMMM d, yyyy")}
                            </div>
                            <Separator className="flex-1" />
                          </div>

                          <div className="space-y-2">
                            {groupedLogs[dateStr].map((log, index) => (
                              <motion.div
                                key={log._id || `log-${dateStr}-${index}`}
                                className={`border rounded-lg p-3 bg-card ${log.isAdminAction ? "border-primary" : "border-border"}`}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <div
                                  className="flex flex-col cursor-pointer"
                                  onClick={() => toggleLogExpansion(log._id)}
                                >
                                  <div className="flex justify-between items-center">
                                    <div className="font-medium truncate">
                                      {log.userName ||
                                        log.userEmail ||
                                        log.userId}
                                    </div>
                                    <motion.div
                                      animate={{
                                        rotate: expandedLogs[log._id] ? 180 : 0,
                                      }}
                                      transition={{ duration: 0.3 }}
                                    >
                                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                                    </motion.div>
                                  </div>

                                  <div className="text-xs text-muted-foreground mt-1">
                                    {formatDistanceToNow(
                                      new Date(log.changedAt),
                                      { addSuffix: true },
                                    )}
                                  </div>
                                </div>

                                <AnimatePresence>
                                  {expandedLogs[log._id] && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.3 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="mt-3 pt-3 border-t border-border">
                                        {log.changes.map((change, index) => (
                                          <div
                                            key={index}
                                            className="mb-3 pb-3 border-b last:border-b-0 last:mb-0 last:pb-0"
                                          >
                                            <div className="font-medium text-sm mb-1">
                                              {formatFieldName(change.field)}
                                            </div>
                                            <div className="grid grid-cols-1 gap-2">
                                              <div className="bg-card p-2 rounded border border-border">
                                                <div className="text-xs text-muted-foreground mb-1">
                                                  Old Value
                                                </div>
                                                <div className="break-words text-sm">
                                                  {formatValue(change.oldValue)}
                                                </div>
                                              </div>
                                              <div className="bg-card p-2 rounded border border-border">
                                                <div className="text-xs text-muted-foreground mb-1">
                                                  New Value
                                                </div>
                                                <div className="break-words text-sm">
                                                  {formatValue(change.newValue)}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {pagination.totalPages > 1 && (
                <div className="flex justify-center mt-6">
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </CardContent>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}
