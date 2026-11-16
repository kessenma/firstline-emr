import { dashboardMeta, DashboardVisual } from "./DashboardFeature";
import { actionsMeta, ActionsVisual } from "./ActionsFeature";
import type { ComponentType } from "react";

export type FeatureVisualProps = {
  isActive?: boolean;
};

export type Feature = {
  id: string;
  title: string;
  description: string;
  Visual: ComponentType<FeatureVisualProps>;
};

export const features: Feature[] = [
  { ...dashboardMeta, Visual: DashboardVisual },
  { ...actionsMeta, Visual: ActionsVisual },
];

export { DashboardVisual } from "./DashboardFeature";
export { ActionsVisual } from "./ActionsFeature";
