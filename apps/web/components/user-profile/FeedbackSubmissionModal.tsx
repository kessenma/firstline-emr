"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  X,
  Upload,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Paperclip,
  FileText,
  Film,
  ImageIcon,
  ChevronDown,
  ChevronRight,
  Check,
  Smartphone,
  Monitor,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import { RadioCard } from "@/components/ui/radio-card";
import { cn } from "@/lib/utils";

interface FeedbackSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CATEGORIES = [
  { value: "bug", label: "Bug Report" },
  { value: "feature_request", label: "Feature Request" },
  { value: "question", label: "Question" },
  { value: "admin_assistance", label: "Admin Assistance" },
  { value: "ui_improvement", label: "UI Improvement" },
  { value: "praise", label: "Praise" },
  { value: "other", label: "Other" },
] as const;

interface AppSectionGroup {
  id: string;
  label: string;
  children?: { id: string; label: string }[];
}

const APP_SECTION_GROUPS: AppSectionGroup[] = [
  {
    id: "patient_chart",
    label: "Patient Chart",
    children: [
      { id: "patient_chart.patient_info", label: "Patient Info" },
      { id: "patient_chart.media_gallery", label: "Media Gallery" },
      { id: "patient_chart.telegram_thread", label: "Telegram Thread" },
      { id: "patient_chart.video_calling", label: "Video Calling" },
      { id: "patient_chart.medications", label: "Medications" },
      { id: "patient_chart.notes", label: "Clinical Notes" },
      { id: "patient_chart.rx_orders", label: "Rx Orders" },
    ],
  },
  {
    id: "patient_dashboard",
    label: "Patient Dashboard",
    children: [
      { id: "patient_dashboard.filtering", label: "Filtering" },
      { id: "patient_dashboard.priority_status", label: "Priority / Status / Specialty" },
    ],
  },
  { id: "user_profile", label: "User Profile" },
  { id: "user_settings", label: "User Settings" },
  { id: "staff_messaging", label: "Internal Staff Messaging" },
  { id: "admin_dashboard", label: "Admin Dashboard" },
  { id: "notifications", label: "Notifications" },
  { id: "login_auth", label: "Login & Authentication" },
  { id: "general", label: "General" },
  { id: "other_section", label: "Other" },
];

const MAX_FILES = 5;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string) {
  if (type.startsWith("video/")) return Film;
  if (type.startsWith("image/")) return ImageIcon;
  return FileText;
}

export function FeedbackSubmissionModal({
  isOpen,
  onClose,
  onSuccess,
}: FeedbackSubmissionModalProps) {
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [platform, setPlatform] = useState("");
  const [mobilePlatform, setMobilePlatform] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [appSections, setAppSections] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSection = (id: string) => {
    setAppSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
      "video/*": [".mp4", ".mov", ".webm"],
    },
    onDrop: (acceptedFiles) => {
      const remaining = MAX_FILES - files.length;
      const newFiles = acceptedFiles.slice(0, remaining);

      // Validate sizes
      for (const file of newFiles) {
        const isVideo = file.type.startsWith("video/");
        const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
        if (file.size > maxSize) {
          setError(
            `"${file.name}" exceeds ${isVideo ? "50MB" : "10MB"} limit`,
          );
          return;
        }
      }

      setFiles((prev) => [...prev, ...newFiles]);
      setError(null);
    },
    maxFiles: MAX_FILES,
    noClick: false,
    disabled: files.length >= MAX_FILES,
  });

  const rootProps = getRootProps() as React.HTMLAttributes<HTMLDivElement>;
  const { style: _rootStyle, ...safeRootProps } = rootProps as any;
  const inputProps =
    getInputProps() as React.InputHTMLAttributes<HTMLInputElement>;
  const { style: _inputStyle, ...safeInputProps } = inputProps as any;

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const includesMobile = platform === "mobile" || platform === "both";

  const handleSubmit = async () => {
    if (!category || !title.trim() || !description.trim() || !platform) {
      setError("Please fill in all required fields");
      return;
    }
    if (includesMobile && !mobilePlatform) {
      setError("Please select a mobile OS");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("category", category);
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("platform", platform);
      if (includesMobile && mobilePlatform) {
        formData.append("mobilePlatform", mobilePlatform);
      }
      if (appSections.length > 0) {
        formData.append("appSections", JSON.stringify(appSections));
      }

      for (const file of files) {
        formData.append("file", file);
      }

      const response = await fetch("/api/feedback", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit feedback");
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        handleClose();
      }, 2000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to submit feedback",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCategory("");
    setTitle("");
    setDescription("");
    setPlatform("");
    setMobilePlatform("");
    setFiles([]);
    setAppSections([]);
    setExpandedGroups(new Set());
    setSubmitSuccess(false);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Submit Feedback</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Help us improve by reporting bugs, requesting features, or sharing
            your thoughts. You can attach screenshots or videos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Success State */}
          {submitSuccess && (
            <div className="flex flex-col items-center justify-center p-8 bg-success/10 rounded-lg">
              <CheckCircle className="h-16 w-16 text-success mb-4" />
              <p className="text-lg font-medium text-success">
                Feedback Submitted!
              </p>
              <p className="text-sm text-success/80 mt-2">
                Thank you for your feedback.
              </p>
            </div>
          )}

          {/* Form */}
          {!submitSuccess && (
            <>
              {/* Category */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Category *</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="What type of feedback?" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Platform */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Platform *</label>
                <RadioCard.Root
                  value={platform}
                  onValueChange={(val) => {
                    setPlatform(val);
                    if (val === "web") setMobilePlatform("");
                  }}
                  className="flex gap-3"
                >
                  <RadioCard.Item value="mobile" className="flex-1">
                    <div className="flex items-center justify-center gap-2 text-sm font-medium">
                      <Smartphone className="h-4 w-4" />
                      Mobile
                    </div>
                  </RadioCard.Item>
                  <RadioCard.Item value="web" className="flex-1">
                    <div className="flex items-center justify-center gap-2 text-sm font-medium">
                      <Monitor className="h-4 w-4" />
                      Web
                    </div>
                  </RadioCard.Item>
                  <RadioCard.Item value="both" className="flex-1">
                    <div className="flex items-center justify-center gap-2 text-sm font-medium">
                      <Smartphone className="h-4 w-4" />
                      <Monitor className="h-4 w-4" />
                      Both
                    </div>
                  </RadioCard.Item>
                </RadioCard.Root>
              </div>

              {/* Mobile OS (conditional) */}
              {includesMobile && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Mobile OS *</label>
                  <RadioCard.Root
                    value={mobilePlatform}
                    onValueChange={setMobilePlatform}
                    className="flex gap-3"
                  >
                    <RadioCard.Item value="android" className="flex-1">
                      <div className="text-center text-sm font-medium">Android</div>
                    </RadioCard.Item>
                    <RadioCard.Item value="ios" className="flex-1">
                      <div className="text-center text-sm font-medium">iOS</div>
                    </RadioCard.Item>
                  </RadioCard.Root>
                </div>
              )}

              {/* Title */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Title *</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Brief summary of your feedback"
                  maxLength={255}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Description *</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue, feature, or feedback in detail..."
                  rows={4}
                />
              </div>

              {/* App Sections (multi-select) */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Which part of the app? (optional)
                </label>
                <p className="text-xs text-muted-foreground">
                  Select all areas your feedback relates to
                </p>
                <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                  {APP_SECTION_GROUPS.map((group) => {
                    const hasChildren = group.children && group.children.length > 0;
                    const isExpanded = expandedGroups.has(group.id);
                    const isSelected = appSections.includes(group.id);
                    const selectedChildren = hasChildren
                      ? group.children!.filter((c) => appSections.includes(c.id))
                      : [];

                    return (
                      <div key={group.id}>
                        <div
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors",
                            (isSelected || selectedChildren.length > 0) && "bg-primary/5",
                          )}
                          onClick={() => {
                            if (hasChildren) {
                              toggleGroup(group.id);
                            } else {
                              toggleSection(group.id);
                            }
                          }}
                        >
                          {hasChildren ? (
                            isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            )
                          ) : (
                            <div
                              className={cn(
                                "h-4 w-4 rounded border flex-shrink-0 flex items-center justify-center",
                                isSelected
                                  ? "bg-primary border-primary"
                                  : "border-border",
                              )}
                            >
                              {isSelected && (
                                <Check className="h-3 w-3 text-primary-foreground" />
                              )}
                            </div>
                          )}
                          <span className="text-sm flex-1">{group.label}</span>
                          {selectedChildren.length > 0 && (
                            <span className="text-xs text-primary font-medium">
                              {selectedChildren.length} selected
                            </span>
                          )}
                        </div>
                        {hasChildren && isExpanded && (
                          <div className="bg-muted/20">
                            {group.children!.map((child) => {
                              const childSelected = appSections.includes(child.id);
                              return (
                                <div
                                  key={child.id}
                                  className={cn(
                                    "flex items-center gap-2 pl-9 pr-3 py-1.5 cursor-pointer hover:bg-muted/50 transition-colors",
                                    childSelected && "bg-primary/5",
                                  )}
                                  onClick={() => toggleSection(child.id)}
                                >
                                  <div
                                    className={cn(
                                      "h-4 w-4 rounded border flex-shrink-0 flex items-center justify-center",
                                      childSelected
                                        ? "bg-primary border-primary"
                                        : "border-border",
                                    )}
                                  >
                                    {childSelected && (
                                      <Check className="h-3 w-3 text-primary-foreground" />
                                    )}
                                  </div>
                                  <span className="text-sm">{child.label}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* File Attachments */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Attachments ({files.length}/{MAX_FILES})
                </label>

                {/* Uploaded files list */}
                {files.length > 0 && (
                  <div className="space-y-2">
                    {files.map((file, index) => {
                      const Icon = getFileIcon(file.type);
                      return (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-2 border rounded-lg bg-muted/30"
                        >
                          <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFile(index)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Dropzone */}
                {files.length < MAX_FILES && (
                  <div
                    {...safeRootProps}
                    className={cn(
                      "border-2 border-dashed rounded-lg p-6 transition-all duration-200 cursor-pointer",
                      isDragActive
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-border/80",
                    )}
                  >
                    <input {...safeInputProps} />
                    <div className="text-center">
                      <Paperclip className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {isDragActive
                          ? "Drop files here"
                          : "Click or drag to attach screenshots or videos"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Images up to 10MB, videos up to 50MB
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={
                    !category ||
                    !title.trim() ||
                    !description.trim() ||
                    !platform ||
                    (includesMobile && !mobilePlatform) ||
                    isSubmitting
                  }
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Submit Feedback
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
