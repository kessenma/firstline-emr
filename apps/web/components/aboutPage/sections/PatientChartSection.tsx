"use client";

import { InteractiveFeatureScroller } from "./InteractiveFeatureScroller";
import { features } from "./patient-chart-features";

export function PatientChartSection({ className = "" }: { className?: string }) {
  return (
    <InteractiveFeatureScroller
      heading="Complete Patient Care, One Tap Away"
      features={features}
      className={className}
    />
  );
}
