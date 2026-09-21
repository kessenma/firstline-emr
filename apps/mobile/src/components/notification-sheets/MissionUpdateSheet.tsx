// apps/mobile/src/components/notification-sheets/MissionUpdateSheet.tsx
// Wraps the existing MissionInfoSheet, finding the mission by ID or name from PowerSync

import React from 'react';
import { MissionInfoSheet } from '../../screens/user-profile/components/MissionInfoSheet';
import { useMissions } from '../../hooks/useMissions';

interface MissionUpdateSheetProps {
  visible: boolean;
  missionId: string | null;
  missionName: string | null;
  onClose: () => void;
}

export function MissionUpdateSheet({
  visible,
  missionId,
  missionName,
  onClose,
}: MissionUpdateSheetProps) {
  const { missions } = useMissions();

  // Try to find by ID first, then fall back to name match (for legacy notifications)
  const mission =
    (missionId ? missions.find((m) => m.id === missionId) : null) ??
    (missionName
      ? missions.find(
          (m) => m.name.toLowerCase() === missionName.toLowerCase(),
        )
      : null) ??
    null;

  return (
    <MissionInfoSheet
      visible={visible}
      onClose={onClose}
      mission={mission}
    />
  );
}
