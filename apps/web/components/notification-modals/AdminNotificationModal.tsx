// apps/web/components/notification-modals/AdminNotificationModal.tsx
// Modal for viewing admin notification details with rich content
"use client";

import { useState, useEffect, useMemo } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/CopyButton";
import { MediaViewer } from "@/components/ui/MediaViewer";
import {
  Megaphone,
  AlertTriangle,
  Bell,
  ExternalLink,
  Image as ImageIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { Notification } from "@/components/notifications/NotificationsViewModel";

interface AdminNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notification: Notification | null;
}

export function AdminNotificationModal({
  isOpen,
  onClose,
  notification,
}: AdminNotificationModalProps) {
  const router = useRouter();
  const [signedImageUrls, setSignedImageUrls] = useState<
    Record<string, string>
  >({});
  const [fullScreenIndex, setFullScreenIndex] = useState<number | null>(null);

  // Resolve signed URLs for images
  useEffect(() => {
    if (!notification?.images?.length) {
      setSignedImageUrls({});
      return;
    }

    const resolveUrls = async () => {
      const resolved: Record<string, string> = {};

      for (const img of notification.images!) {
        try {
          const res = await fetch(
            `/api/media/get-signed-url?filePath=${encodeURIComponent(img.filePath)}`,
          );
          if (res.ok) {
            const data = await res.json();
            resolved[img.filePath] = data.signedUrl;
          }
        } catch {
          // Skip failed image resolutions
        }
      }

      setSignedImageUrls(resolved);
    };

    resolveUrls();
  }, [notification?.images]);

  // Build resolved image URL list for the full-screen viewer
  const resolvedImages = useMemo(() => {
    if (!notification?.images?.length) return [];
    return notification.images
      .filter((img) => signedImageUrls[img.filePath])
      .map((img) => ({
        url: signedImageUrls[img.filePath],
        type: "image" as const,
      }));
  }, [notification?.images, signedImageUrls]);

  if (!notification) return null;

  const getTypeIcon = () => {
    switch (notification.type) {
      case "alert":
        return <AlertTriangle className="h-6 w-6 text-amber-500" />;
      case "reminder":
        return <Bell className="h-6 w-6 text-amber-500" />;
      case "announcement":
      default:
        return <Megaphone className="h-6 w-6 text-amber-500" />;
    }
  };

  const handleCtaClick = () => {
    if (notification.actionUrl) {
      onClose();
      router.push(notification.actionUrl);
    }
  };

  const getCtaLabel = (url: string): string => {
    if (url.startsWith("/profile")) return "Go to Profile";
    if (url.startsWith("/admin")) return "Open Admin Dashboard";
    if (url.startsWith("/messages")) return "Open Messages";
    return "View Details";
  };

  // Simple markdown rendering for description
  const renderDescription = (text: string) => {
    return text.split("\n").map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={i} className="h-2" />;

      const bulletMatch = trimmed.match(/^[-*]\s+(.*)/);
      if (bulletMatch) {
        return (
          <li key={i} className="ml-4 list-disc text-foreground">
            {bulletMatch[1]}
          </li>
        );
      }

      const numberMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (numberMatch) {
        return (
          <li
            key={i}
            className="ml-4 list-decimal text-foreground"
            value={parseInt(numberMatch[1])}
          >
            {numberMatch[2]}
          </li>
        );
      }

      return (
        <p key={i} className="text-foreground">
          {trimmed}
        </p>
      );
    });
  };

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Admin Notification"
      description={
        notification.type.charAt(0).toUpperCase() + notification.type.slice(1)
      }
    >
      <div className="flex flex-col gap-4 py-2">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15">
            {getTypeIcon()}
          </div>
          <div className="flex-1">
            <span className="inline-block rounded px-2 py-0.5 text-xs font-semibold uppercase bg-amber-500/15 text-amber-600">
              {notification.type}
            </span>
            <p className="text-sm text-muted-foreground mt-1">
              {new Date(notification.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Message */}
        <p className="text-lg font-semibold text-foreground">
          {notification.message}
        </p>

        {/* Description */}
        {notification.description && (
          <div className="rounded-lg bg-muted/50 p-4 space-y-1">
            {renderDescription(notification.description)}
          </div>
        )}

        {/* Images */}
        {notification.images && notification.images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {notification.images.map((img, index) => {
              const signedUrl = signedImageUrls[img.filePath];
              const resolvedIndex = signedUrl
                ? resolvedImages.findIndex((r) => r.url === signedUrl)
                : -1;
              return (
                <button
                  key={index}
                  type="button"
                  disabled={!signedUrl}
                  onClick={() => {
                    if (resolvedIndex >= 0) setFullScreenIndex(resolvedIndex);
                  }}
                  className="w-[140px] h-[100px] rounded-lg border overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-shadow disabled:cursor-default disabled:hover:ring-0"
                >
                  {signedUrl ? (
                    <img
                      src={signedUrl}
                      alt={img.fileName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Links */}
        {notification.links && notification.links.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Links
            </p>
            {notification.links.map((link, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2"
              >
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center gap-2 text-primary hover:underline truncate"
                >
                  <ExternalLink className="h-4 w-4 shrink-0" />
                  {link.displayName || link.url}
                </a>
                <CopyButton textToCopy={link.url} label="Copy" size="sm" />
              </div>
            ))}
          </div>
        )}

        {/* CTA Button */}
        {notification.actionUrl && (
          <Button
            onClick={handleCtaClick}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white"
          >
            {getCtaLabel(notification.actionUrl)}
          </Button>
        )}
      </div>
    </Modal>

      {/* Full-screen image gallery */}
      {fullScreenIndex !== null && resolvedImages.length > 0 && (
        <MediaViewer
          media={resolvedImages[fullScreenIndex]}
          onClose={() => setFullScreenIndex(null)}
          onPrev={() =>
            setFullScreenIndex((i) =>
              i !== null && i > 0 ? i - 1 : i,
            )
          }
          onNext={() =>
            setFullScreenIndex((i) =>
              i !== null && i < resolvedImages.length - 1 ? i + 1 : i,
            )
          }
          hasMultiple={resolvedImages.length > 1}
          currentIndex={fullScreenIndex + 1}
          totalItems={resolvedImages.length}
        />
      )}
    </>
  );
}
