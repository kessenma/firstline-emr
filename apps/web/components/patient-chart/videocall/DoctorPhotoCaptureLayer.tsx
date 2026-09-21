// apps/web/components/patient-chart/videocall/DoctorPhotoCaptureLayer.tsx
//
// Mounts the clinician's capture UI inside the LiveKit room.
//
// It exists as its own component because usePhotoCapture calls useRoomContext,
// which is only available beneath <LiveKitRoom> — VideoCallView sits outside it.
"use client";

import React, { useCallback } from "react";
import { usePatientDashboard } from "../PatientViewModelContext";
import { usePhotoCapture } from "./usePhotoCapture";
import PhotoCaptureButton from "./PhotoCaptureButton";
import CapturedPhotoStrip from "./CapturedPhotoStrip";

interface DoctorPhotoCaptureLayerProps {
  sessionId: string;
  patientId: string;
}

const DoctorPhotoCaptureLayer: React.FC<DoctorPhotoCaptureLayerProps> = ({
  sessionId,
  patientId,
}) => {
  const { setPatientPhotos } = usePatientDashboard();

  const handleCaptured = useCallback(
    ({ mediaId, filePath }: { mediaId: string; filePath: string }) => {
      // Push straight into the chart context so the Media section shows the
      // photo without refetching the patient. The gallery view model re-signs
      // whatever appears in `photos`.
      setPatientPhotos((prev) => [
        ...prev,
        {
          id: mediaId,
          url: filePath,
          uploadedAt: new Date(),
          contentType: "image/jpeg",
          source: "video_call",
        },
      ]);
    },
    [setPatientPhotos],
  );

  const handleRemoved = useCallback(
    (mediaId: string) => {
      setPatientPhotos((prev) => prev.filter((photo) => photo.id !== mediaId));
    },
    [setPatientPhotos],
  );

  const controller = usePhotoCapture({
    sessionId,
    patientId,
    // Left empty on purpose: the patient's page already knows who started the
    // call, from its own join response, and that is the clinician in the room.
    // Sending a name from here would only add a second source of truth.
    requestedBy: "",
    onCaptured: handleCaptured,
    onRemoved: handleRemoved,
  });

  return (
    <>
      <PhotoCaptureButton controller={controller} />
      <CapturedPhotoStrip
        photos={controller.photos}
        onRemove={controller.remove}
      />
    </>
  );
};

export default DoctorPhotoCaptureLayer;
