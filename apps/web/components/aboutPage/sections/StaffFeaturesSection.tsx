"use client";

import { InteractiveFeatureScroller } from "./InteractiveFeatureScroller";
import { features } from "./staff-features";

export function StaffFeaturesSection({ className = "" }: { className?: string }) {
  return (
    <InteractiveFeatureScroller
      heading="Connected Anywhere, Online or Off"
      features={features}
      className={className}
    />
  );
}
