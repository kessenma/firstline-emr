"use client";

import { InteractiveFeatureScroller } from "./InteractiveFeatureScroller";
import { intakeBotMeta, IntakeBotVisual } from "./patient-chart-features/IntakeBotFeature";
import type { Feature } from "./patient-dashboard-features";

const features: Feature[] = [
  { ...intakeBotMeta, Visual: IntakeBotVisual },
];

export function IntakeSection({ className = "" }: { className?: string }) {
  return (
    <InteractiveFeatureScroller
      heading="How Patients Get Started"
      features={features}
      className={className}
      reverseDesktop
    />
  );
}
