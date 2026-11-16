import { staffMessagingMeta, StaffMessagingVisual } from "./StaffMessagingFeature";
import { offlineSyncMeta, OfflineSyncVisual } from "./OfflineSyncFeature";
import { adminMeta, AdminVisual } from "./AdminFeature";
import type { Feature } from "../patient-dashboard-features";

export const features: Feature[] = [
  { ...staffMessagingMeta, Visual: StaffMessagingVisual },
  { ...offlineSyncMeta, Visual: OfflineSyncVisual },
  { ...adminMeta, Visual: AdminVisual },
];
