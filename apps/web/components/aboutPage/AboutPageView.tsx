"use client";

import React from "react";
import { HeroSection } from "./sections/HeroSection";
import { CapabilitiesSection } from "./sections/StatisticsSection";
import { UserRolesSection } from "./sections/UserRolesSection";
import { WorkflowSection } from "./sections/WorkflowSection";
import { IntakeSection } from "./sections/IntakeSection";
import { PatientDashboardSection } from "./sections/PatientDashboardSection";
import { PatientChartSection } from "./sections/PatientChartSection";
import { StaffFeaturesSection } from "./sections/StaffFeaturesSection";
import { ConnectionAnimation } from "./animations/ConnectionAnimation";
import { HipaaAnimation } from "./animations/HipaaAnimation";
import { useAboutPageViewModel } from "./AboutPageViewModel";

/**
 * About Page View Component
 * Main component that orchestrates all sections of the about page
 */
export function AboutPageView() {
  const { features, capabilities, heroContent } = useAboutPageViewModel();

  return (
    <div className="min-h-screen" style={{
      '--about-surgeon': 'hsl(205 55% 56%)',
      '--about-coordinator': 'hsl(222 30% 28%)'
    } as React.CSSProperties}>
      {/* Hero Section with Generative Tree */}
      <HeroSection
        title={heroContent.title}
        subtitle={heroContent.subtitle}
        description={heroContent.description}
      />

      {/* Intake: How patients register via Telegram bot */}
      <IntakeSection />

      {/* Patient Dashboard: Where patients appear after intake */}
      <PatientDashboardSection />

      {/* Patient Chart: Tap into a patient to see chart features */}
      <PatientChartSection />

      {/* Staff Features: Collaboration & admin tools */}
      <StaffFeaturesSection />


      {/* User Roles Section */}
      <UserRolesSection />

      {/* Connection Animation - Top Section */}
      {/* <div className="relative w-full h-[200px]">
        <ConnectionAnimation config={{ enabled: true }} />
      </div> */}

      {/* Capabilities Section */}
      <CapabilitiesSection capabilities={capabilities} />

      {/* Infrastructure Section */}
      <div className="px-4 mx-auto max-w-6xl sm:px-6 lg:px-8">
        <HipaaAnimation />
      </div>

      {/* Connection Animation - Bottom Section (plays once) */}
      <div className="relative w-full h-[100px]">
        <ConnectionAnimation config={{ enabled: true, playOnce: true }} />
      </div>

      {/* Workflow Section */}
      <div className="px-4 mx-auto max-w-6xl sm:px-6 lg:px-8">
        <WorkflowSection />
      </div>

    </div>
  );
}
