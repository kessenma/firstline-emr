// apps/web/components/ui/modal.tsx
"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, X } from "lucide-react";
import { cn } from "@/utils/classNames";

export interface ModalProps {
  /** Controls modal open/close state */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Modal description/subtitle */
  description?: string;
  /** Main content */
  children: React.ReactNode;
  /** Footer content (buttons, etc) */
  footer?: React.ReactNode;
  /** Size of the modal */
  size?: "sm" | "md" | "lg" | "xl" | "full";
  /** Custom class for content area */
  className?: string;
  /** Header actions (buttons, links, etc) */
  headerActions?: React.ReactNode;
  /** Show external link button that navigates to fullPageUrl */
  showExternalLink?: boolean;
  /** URL for external link button */
  externalLinkUrl?: string;
  /** Text for external link button */
  externalLinkText?: string;
  /** Callback when external link is clicked */
  onExternalLinkClick?: () => void;
  /** Hide the close X button */
  hideClose?: boolean;
  /** Disable scrolling */
  scrollable?: boolean;
  /** Remove padding from content */
  noPadding?: boolean;
  /** Custom class for the internal content wrapper */
  contentClassName?: string;
}

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-[95vw] sm:max-w-7xl",
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = "lg",
  className,
  headerActions,
  showExternalLink = false,
  externalLinkUrl,
  externalLinkText = "Open Full Page",
  onExternalLinkClick,
  hideClose = false,
  scrollable = true,
  noPadding = false,
  contentClassName,
}: ModalProps) {
  const handleExternalLinkClick = () => {
    if (onExternalLinkClick) {
      onExternalLinkClick();
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          sizeClasses[size],
          "max-h-[95vh] sm:max-h-[90vh]",
          className,
        )}
        scrollable={scrollable}
        noPadding={noPadding}
        hideClose={hideClose}
      >
        {(title || description || headerActions || showExternalLink) && (
          <DialogHeader
            className={cn(
              "sticky top-0 z-[60] bg-background",
              noPadding ? "p-4 sm:p-6 pb-3 sm:pb-4" : "pb-3 sm:pb-4",
            )}
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                {title && (
                  <DialogTitle className="text-xl sm:text-2xl">
                    {title}
                  </DialogTitle>
                )}
                {description && (
                  <DialogDescription className="mt-1 sm:mt-2 text-sm">
                    {description}
                  </DialogDescription>
                )}
              </div>

              {(headerActions || showExternalLink) && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  {headerActions}
                  {showExternalLink && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExternalLinkClick}
                      className="flex items-center gap-2 text-xs sm:text-sm"
                    >
                      <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">
                        {externalLinkText}
                      </span>
                      <span className="sm:hidden">Dashboard</span>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </DialogHeader>
        )}

        <div
          className={cn(
            "flex-1 min-h-0 flex flex-col",
            scrollable ? "overflow-auto" : "overflow-hidden",
            noPadding ? "" : "px-2 sm:px-6",
            contentClassName,
          )}
        >
          {children}
        </div>

        {footer && (
          <DialogFooter
            className={cn(
              "sticky bottom-0 bg-background border-t",
              noPadding ? "p-4 sm:p-6 pt-3 sm:pt-4" : "pt-3 sm:pt-4",
            )}
          >
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Convenience wrapper for confirmation dialogs
export interface ConfirmModalProps
  extends Omit<ModalProps, "footer" | "children"> {
  /** Confirmation message */
  message: string | React.ReactNode;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Confirm button variant */
  confirmVariant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  /** Callback when confirmed */
  onConfirm: () => void;
  /** Loading state */
  isLoading?: boolean;
}

export function ConfirmModal({
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant = "default",
  onConfirm,
  isLoading = false,
  onClose,
  ...props
}: ConfirmModalProps) {
  const handleConfirm = () => {
    onConfirm();
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Modal
      {...props}
      onClose={onClose}
      size="sm"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      }
    >
      <div className="py-4">
        {typeof message === "string" ? <p>{message}</p> : message}
      </div>
    </Modal>
  );
}
