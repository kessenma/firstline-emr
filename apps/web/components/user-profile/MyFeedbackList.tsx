"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  Paperclip,
  ExternalLink,
  Smartphone,
  Monitor,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FeedbackItem {
  id: string;
  category: string;
  title: string;
  description: string;
  attachments: Array<{
    filePath: string;
    fileName: string;
    fileSize: number;
    contentType: string;
  }>;
  platform: string;
  mobilePlatform: string | null;
  status: string;
  adminNotes: string | null;
  createdAt: string;
}

interface MyFeedbackListProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  feature_request: "Feature Request",
  bug: "Bug",
  question: "Question",
  admin_assistance: "Admin Assistance",
  ui_improvement: "UI Improvement",
  praise: "Praise",
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

export function MyFeedbackList({ isOpen, onClose }: MyFeedbackListProps) {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [attachmentUrls, setAttachmentUrls] = useState<
    Record<string, string>
  >({});

  const fetchFeedback = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/feedback");
      if (res.ok) {
        const data = await res.json();
        setFeedback(data.feedback || []);
      }
    } catch (err) {
      console.error("Failed to fetch feedback:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchFeedback();
    }
  }, [isOpen, fetchFeedback]);

  const handleToggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const getAttachmentUrl = async (feedbackId: string, filePath: string) => {
    if (attachmentUrls[filePath]) return;
    try {
      const res = await fetch(
        `/api/feedback/${feedbackId}/attachment-url?filePath=${encodeURIComponent(filePath)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setAttachmentUrls((prev) => ({ ...prev, [filePath]: data.signedUrl }));
      }
    } catch {
      // ignore
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>My Feedback</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && feedback.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              You haven&apos;t submitted any feedback yet.
            </p>
          )}

          {!isLoading && feedback.length > 0 && (
            <div className="space-y-3">
              {feedback.map((item) => {
                const isExpanded = expandedId === item.id;
                return (
                  <div
                    key={item.id}
                    className="border rounded-lg overflow-hidden"
                  >
                    {/* Header row */}
                    <button
                      onClick={() => handleToggle(item.id)}
                      className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className={cn(
                            "text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap",
                            STATUS_STYLES[item.status] || STATUS_STYLES.open,
                          )}
                        >
                          {item.status.replace("_", " ")}
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {CATEGORY_LABELS[item.category] || item.category}
                        </span>
                        {item.platform && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            {(item.platform === "mobile" || item.platform === "both") && (
                              <Smartphone className="h-3 w-3" />
                            )}
                            {(item.platform === "web" || item.platform === "both") && (
                              <Monitor className="h-3 w-3" />
                            )}
                            {item.mobilePlatform && (
                              <span className="text-xs">
                                {item.mobilePlatform === "ios" ? "iOS" : "Android"}
                              </span>
                            )}
                          </span>
                        )}
                        <span className="text-sm font-medium truncate">
                          {item.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {item.attachments?.length > 0 && (
                          <Paperclip className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDate(item.createdAt)}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="border-t p-3 space-y-3 bg-muted/20">
                        <p className="text-sm whitespace-pre-wrap">
                          {item.description}
                        </p>

                        {/* Attachments */}
                        {item.attachments?.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">
                              Attachments
                            </p>
                            {item.attachments.map((att, idx) => {
                              const url = attachmentUrls[att.filePath];
                              if (!url) {
                                getAttachmentUrl(item.id, att.filePath);
                              }
                              return (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  <Paperclip className="h-3 w-3 text-muted-foreground" />
                                  {url ? (
                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline flex items-center gap-1"
                                    >
                                      {att.fileName}
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  ) : (
                                    <span className="text-muted-foreground">
                                      {att.fileName}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Admin notes */}
                        {item.adminNotes && (
                          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                            <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                              Admin Response
                            </p>
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                              {item.adminNotes}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
