"use client";

import { InteractiveFeatureScroller } from "./InteractiveFeatureScroller";
import { features } from "./patient-dashboard-features";

export function PatientDashboardSection({ className = "" }: { className?: string }) {
  return (
    <InteractiveFeatureScroller
      heading="Intuitive Patient Management"
      features={features}
      className={className}
    />
  );
}
