"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  MessageSquare,
  MessageCircle,
  CheckCircle,
  Search,
  ExternalLink,
  Paperclip,
  Smartphone,
  Monitor,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table } from "@/components/ui/Table/Table";
import type { TableColumn } from "@/components/ui/Table/types";
import {
  useUserFeedbackViewModel,
  type FeedbackItem,
} from "./useUserFeedbackViewModel";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<string, string> = {
  feature_request: "Feature Request",
  bug: "Bug",
  question: "Question",
  admin_assistance: "Admin Assistance",
  ui_improvement: "UI Improvement",
  praise: "Praise",
  offline_access: "Offline Access",
  other: "Other",
};

const STATUS_STYLES: Record<string, string> = {
  open: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  in_review:
    "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  resolved:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  closed: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const CATEGORY_STYLES: Record<string, string> = {
  bug: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  feature_request:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  question: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  admin_assistance:
    "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  ui_improvement:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  praise:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  offline_access:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  other: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const APP_SECTION_LABELS: Record<string, string> = {
  "patient_chart.patient_info": "Patient Info",
  "patient_chart.media_gallery": "Media Gallery",
  "patient_chart.telegram_thread": "Telegram Thread",
  "patient_chart.video_calling": "Video Calling",
  "patient_chart.medications": "Medications",
  "patient_chart.notes": "Clinical Notes",
  "patient_chart.rx_orders": "Rx Orders",
  "patient_dashboard.filtering": "Dashboard Filtering",
  "patient_dashboard.priority_status": "Priority / Status / Specialty",
  user_profile: "User Profile",
  user_settings: "User Settings",
  staff_messaging: "Staff Messaging",
  admin_dashboard: "Admin Dashboard",
  notifications: "Notifications",
  login_auth: "Login & Auth",
  general: "General",
  other_section: "Other",
};

export default function UserFeedbackView() {
  const {
    feedback,
    isLoading,
    isUpdating,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    handleUpdateFeedback,
    handleCreateThread,
    fetchFeedbackDetail,
    openCount,
  } = useUserFeedbackViewModel();

  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] =
    useState<FeedbackItem | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreatingThread, setIsCreatingThread] = useState(false);

  const openReviewDialog = async (item: FeedbackItem) => {
    // Fetch full detail with signed URLs
    const detail = await fetchFeedbackDetail(item.id);
    setSelectedFeedback(detail || item);
    setNewStatus(item.status);
    setAdminNotes(item.adminNotes || "");
    setReviewDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedFeedback) return;
    await handleUpdateFeedback(selectedFeedback.id, newStatus, adminNotes);
    setReviewDialogOpen(false);
    setSelectedFeedback(null);
  };

  // Filter by search term locally
  const filteredFeedback = searchTerm.trim()
    ? feedback.filter(
        (f) =>
          f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.userName?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : feedback;

  const columns: TableColumn<FeedbackItem>[] = [
    {
      key: "userName" as any,
      header: "User",
      render: (_: any, item: FeedbackItem) => (
        <div>
          <p className="font-medium text-sm">{item.userName || "Unknown"}</p>
          <p className="text-xs text-muted-foreground">{item.userEmail}</p>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (value: string) => (
        <span
          className={cn(
            "px-2 py-0.5 rounded-full text-xs font-medium",
            CATEGORY_STYLES[value] || CATEGORY_STYLES.other,
          )}
        >
          {CATEGORY_LABELS[value] || value}
        </span>
      ),
    },
    {
      key: "platform" as any,
      header: "Platform",
      render: (_: any, item: FeedbackItem) => (
        <span className="flex items-center gap-1 text-muted-foreground">
          {(item.platform === "mobile" || item.platform === "both") && (
            <Smartphone className="h-3.5 w-3.5" />
          )}
          {(item.platform === "web" || item.platform === "both") && (
            <Monitor className="h-3.5 w-3.5" />
          )}
          {item.mobilePlatform && (
            <span className="text-xs">
              {item.mobilePlatform === "ios" ? "iOS" : "Android"}
            </span>
          )}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: "appVersion" as any,
      header: "Version",
      render: (value: string | null) => (
        <span className="text-xs text-muted-foreground">
          {value ? `v${value}` : "-"}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: "title",
      header: "Title",
      render: (value: string, item: FeedbackItem) => (
        <div>
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-sm truncate max-w-[300px]">{value}</p>
            {item.threadId && (
              <MessageCircle className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
            )}
          </div>
          {item.attachments?.length > 0 && (
            <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Paperclip className="h-3 w-3" /> {item.attachments.length} file
              {item.attachments.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "appSections" as any,
      header: "App Section",
      render: (_: any, item: FeedbackItem) => {
        const sections = item.appSections || [];
        if (sections.length === 0) return <span className="text-xs text-muted-foreground">-</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {sections.slice(0, 2).map((s) => (
              <span key={s} className="px-1.5 py-0.5 rounded bg-muted text-xs">
                {APP_SECTION_LABELS[s] || s.split(".").pop()}
              </span>
            ))}
            {sections.length > 2 && (
              <span className="text-xs text-muted-foreground">+{sections.length - 2}</span>
            )}
          </div>
        );
      },
      hideOnMobile: true,
    },
    {
      key: "status",
      header: "Status",
      render: (value: string) => (
        <span
          className={cn(
            "px-2 py-0.5 rounded-full text-xs font-medium",
            STATUS_STYLES[value] || STATUS_STYLES.open,
          )}
        >
          {value.replace("_", " ")}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Date",
      render: (value: string) =>
        value ? new Date(value).toLocaleDateString() : "N/A",
      hideOnMobile: true,
    },
    {
      key: "actions" as any,
      header: "Actions",
      render: (_: any, item: FeedbackItem) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => openReviewDialog(item)}
        >
          Review
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">
            User Feedback
            {openCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                {openCount} open
              </span>
            )}
          </h2>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 w-40"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_review">In Review</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="bug">Bug</SelectItem>
              <SelectItem value="feature_request">Feature Request</SelectItem>
              <SelectItem value="question">Question</SelectItem>
              <SelectItem value="admin_assistance">Admin Assistance</SelectItem>
              <SelectItem value="ui_improvement">UI Improvement</SelectItem>
              <SelectItem value="praise">Praise</SelectItem>
              <SelectItem value="offline_access">Offline Access</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredFeedback.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CheckCircle className="h-12 w-12 text-green-400 mb-3" />
          <p className="text-muted-foreground">No feedback items found.</p>
        </div>
      ) : (
        <Table
          data={filteredFeedback}
          columns={columns}
          backgroundColor="card"
          textColor="foreground"
          borderColor="border"
          headerBackgroundColor="card"
          headerTextColor="muted-foreground"
          hoverBackgroundColor="muted"
          hoverTextColor="foreground"
          stickyHeader={true}
        />
      )}

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="shadow-sm max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Feedback</DialogTitle>
          </DialogHeader>

          {selectedFeedback && (
            <div className="space-y-4">
              {/* User info */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">From</p>
                  <p className="font-medium">
                    {selectedFeedback.userName || "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedFeedback.userEmail}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium",
                      CATEGORY_STYLES[selectedFeedback.category] ||
                        CATEGORY_STYLES.other,
                    )}
                  >
                    {CATEGORY_LABELS[selectedFeedback.category] ||
                      selectedFeedback.category}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(selectedFeedback.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Platform */}
              {selectedFeedback.platform && (
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">Platform:</p>
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted text-xs font-medium">
                    {(selectedFeedback.platform === "mobile" || selectedFeedback.platform === "both") && (
                      <Smartphone className="h-3.5 w-3.5" />
                    )}
                    {(selectedFeedback.platform === "web" || selectedFeedback.platform === "both") && (
                      <Monitor className="h-3.5 w-3.5" />
                    )}
                    {selectedFeedback.platform === "both" ? "Mobile & Web" : selectedFeedback.platform === "mobile" ? "Mobile" : "Web"}
                    {selectedFeedback.mobilePlatform && (
                      <span>({selectedFeedback.mobilePlatform === "ios" ? "iOS" : "Android"})</span>
                    )}
                  </span>
                </div>
              )}

              {/* App Version */}
              {selectedFeedback.appVersion && (
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">App Version:</p>
                  <span className="px-2 py-0.5 rounded-full bg-muted text-xs font-medium">
                    v{selectedFeedback.appVersion}
                  </span>
                </div>
              )}

              {/* Title & Description */}
              <div>
                <p className="font-semibold text-lg">
                  {selectedFeedback.title}
                </p>
                <p className="text-sm mt-2 whitespace-pre-wrap">
                  {selectedFeedback.description}
                </p>
              </div>

              {/* App Sections */}
              {selectedFeedback.appSections?.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1.5">
                    App Sections
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedFeedback.appSections.map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 rounded-full bg-muted text-xs font-medium"
                      >
                        {APP_SECTION_LABELS[s] || s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Sync Diagnostics (offline_access only) */}
              {selectedFeedback.syncDiagnostics && (
                <div className="rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 p-3 space-y-2">
                  <p className="text-sm font-semibold text-orange-800 dark:text-orange-200">
                    Sync Diagnostics
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <span className="text-muted-foreground">Connected</span>
                    <span className={selectedFeedback.syncDiagnostics.isConnected ? "text-green-600" : "text-red-600"}>
                      {selectedFeedback.syncDiagnostics.isConnected ? "Yes" : "No"}
                    </span>
                    <span className="text-muted-foreground">Timed Out</span>
                    <span>{selectedFeedback.syncDiagnostics.connectionTimedOut ? "Yes" : "No"}</span>
                    <span className="text-muted-foreground">Last Sync</span>
                    <span>{selectedFeedback.syncDiagnostics.lastSyncTime ?? "Never"}</span>
                    <span className="text-muted-foreground">Pending Changes</span>
                    <span>{selectedFeedback.syncDiagnostics.pendingChanges}</span>
                    <span className="text-muted-foreground">Server</span>
                    <span className="truncate">{selectedFeedback.syncDiagnostics.serverUrl || "unknown"}</span>
                    <span className="text-muted-foreground">Platform</span>
                    <span>{selectedFeedback.syncDiagnostics.devicePlatform}</span>
                  </div>
                  {Object.keys(selectedFeedback.syncDiagnostics.tableCounts).length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Table Counts</p>
                      <div className="grid grid-cols-3 gap-x-3 gap-y-0.5 text-xs">
                        {Object.entries(selectedFeedback.syncDiagnostics.tableCounts).map(([table, count]) => (
                          <React.Fragment key={table}>
                            <span className="text-muted-foreground col-span-2">{table}</span>
                            <span className="text-right font-mono">{count}</span>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedFeedback.syncDiagnostics.errors.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Errors</p>
                      {selectedFeedback.syncDiagnostics.errors.map((err, i) => (
                        <p key={i} className="text-xs text-red-600 dark:text-red-400 break-words">
                          {err}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Attachments */}
              {selectedFeedback.attachments?.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Attachments ({selectedFeedback.attachments.length})
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedFeedback.attachments.map((att, idx) => (
                      <div
                        key={idx}
                        className="border rounded-lg p-2 bg-muted/30"
                      >
                        {att.signedUrl &&
                        att.contentType?.startsWith("image/") ? (
                          <a
                            href={att.signedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <img
                              src={att.signedUrl}
                              alt={att.fileName}
                              className="w-full h-32 object-cover rounded mb-1"
                            />
                          </a>
                        ) : att.signedUrl ? (
                          <a
                            href={att.signedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-primary hover:underline text-sm"
                          >
                            <ExternalLink className="h-4 w-4" />
                            {att.fileName}
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {att.fileName}
                          </span>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {(att.fileSize / 1024).toFixed(0)} KB
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat Thread */}
              <div className="border rounded-lg p-3 bg-muted/20">
                <p className="text-sm font-medium mb-2">Follow-up Chat</p>
                {selectedFeedback.threadId ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      window.open(
                        `/messages/${selectedFeedback.threadId}`,
                        "_blank",
                      )
                    }
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    View Chat
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isCreatingThread}
                    onClick={async () => {
                      setIsCreatingThread(true);
                      const threadId = await handleCreateThread(
                        selectedFeedback.id,
                      );
                      if (threadId) {
                        setSelectedFeedback({
                          ...selectedFeedback,
                          threadId,
                        });
                      }
                      setIsCreatingThread(false);
                    }}
                  >
                    {isCreatingThread ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <MessageCircle className="h-4 w-4 mr-2" />
                    )}
                    Start Chat with User
                  </Button>
                )}
                <p className="text-xs text-muted-foreground mt-1.5">
                  {selectedFeedback.threadId
                    ? "A chat thread exists for this feedback. It will be archived when resolved."
                    : "Create a 1:1 chat thread to gather more details from the user."}
                </p>
              </div>

              {/* Status Update */}
              <div>
                <label className="text-sm font-medium">Update Status</label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_review">In Review</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Admin Notes */}
              <div>
                <label className="text-sm font-medium">Admin Notes</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes or a response for the user..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setReviewDialogOpen(false)}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button onClick={handleUpdate} disabled={isUpdating}>
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Update Feedback
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
