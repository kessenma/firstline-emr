// apps/web/components/patient-chart/videocall/PatientPhotoStrip.tsx
//
// What the patient sees of the photos taken during their call, and how they
// remove one.
//
// Consent to a photograph you never see is a weak kind of consent, so this is
// not a courtesy: it is the visible half of the permission the patient granted.
// Every string, including the delete confirmation, renders in their language.
"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getVideoCallTranslation } from "./video-call-patient-translations";
import type { CapturedPhoto } from "@fajr/shared/video-call";

interface PatientPhotoStripProps {
  inviteToken: string;
  language: string;
  photos: CapturedPhoto[];
  onRemoved: (mediaId: string) => void;
}

const PatientPhotoStrip: React.FC<PatientPhotoStripProps> = ({
  inviteToken,
  language,
  photos,
  onRemoved,
}) => {
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [failed, setFailed] = useState(false);

  const t = useCallback(
    (key: Parameters<typeof getVideoCallTranslation>[0]) =>
      getVideoCallTranslation(key, language),
    [language],
  );

  // The confirm dialog would otherwise linger over a photo the clinician just
  // deleted from their side.
  useEffect(() => {
    if (
      pendingDelete &&
      !photos.some((photo) => photo.mediaId === pendingDelete)
    ) {
      setPendingDelete(null);
    }
  }, [photos, pendingDelete]);

  if (photos.length === 0) return null;

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setFailed(false);
    try {
      const response = await fetch("/api/video-call/media/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteToken, mediaId: pendingDelete }),
      });
      if (!response.ok) throw new Error("delete-failed");
      onRemoved(pendingDelete);
      setPendingDelete(null);
    } catch {
      setFailed(true);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <section className="border-t bg-background px-4 py-3">
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">
          {t("photosHeading")}
        </h2>
        <ul className="flex gap-3 overflow-x-auto pb-1">
          {photos.map((photo) => (
            <li key={photo.mediaId} className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt=""
                className="h-20 w-20 rounded object-cover"
              />
              <button
                type="button"
                onClick={() => setPendingDelete(photo.mediaId)}
                aria-label={t("deletePhoto")}
                title={t("deletePhoto")}
                className="absolute -right-1 -top-1 rounded-full bg-destructive p-1.5 text-destructive-foreground shadow"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {pendingDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[140] flex items-center justify-center bg-black/60 px-4"
        >
          <div className="w-full max-w-sm rounded-lg bg-background p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-foreground">
              {t("deleteConfirmTitle")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("deleteConfirmBody")}
            </p>
            {failed && (
              <p className="mt-2 text-sm text-destructive" role="alert">
                {t("deleteFailed")}
              </p>
            )}
            <div className="mt-6 flex gap-3">
              <Button
                className="flex-1"
                variant="destructive"
                disabled={deleting}
                onClick={() => void confirmDelete()}
              >
                {t("deleteConfirmYes")}
              </Button>
              <Button
                className="flex-1"
                variant="outline"
                disabled={deleting}
                onClick={() => {
                  setPendingDelete(null);
                  setFailed(false);
                }}
              >
                {t("deleteConfirmCancel")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PatientPhotoStrip;
