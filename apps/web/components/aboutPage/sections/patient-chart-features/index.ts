import { chartMeta, ChartVisual } from "./ChartFeature";
import { messagingMeta, MessagingVisual } from "./MessagingFeature";
import { notesMeta, NotesVisual } from "./NotesFeature";
import { mediaGalleryMeta, MediaGalleryVisual } from "./MediaGalleryFeature";
import type { Feature } from "../patient-dashboard-features";

export const features: Feature[] = [
  { ...chartMeta, Visual: ChartVisual },
  { ...messagingMeta, Visual: MessagingVisual },
  { ...notesMeta, Visual: NotesVisual },
  { ...mediaGalleryMeta, Visual: MediaGalleryVisual },
];
