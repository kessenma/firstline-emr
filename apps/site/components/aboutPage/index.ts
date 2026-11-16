// About Page Components - Public API
// Export all components that should be used outside this module

export { AboutPageView } from "./AboutPageView";
export { useAboutPageViewModel } from "./AboutPageViewModel";

// Section Components
export { HeroSection } from "./sections/HeroSection";
export { StatisticsSection, CapabilitiesSection } from "./sections/StatisticsSection";
export { UserRolesSection } from "./sections/UserRolesSection";
export { WorkflowSection } from "./sections/WorkflowSection";
export { StaffFeaturesSection } from "./sections/StaffFeaturesSection";

// Card Components
export { UserRoleCard } from "./cards/UserRoleCard";
export { WorkflowStep as WorkflowStepCard } from "./cards/WorkflowStep";
export { FeatureItem } from "./cards/FeatureItem";

// Animation Components
export { PatientRoleAnimation } from "./animations/PatientRoleAnimation";
export { TriageRoleAnimation } from "./animations/TriageRoleAnimation";
export { DoctorRoleAnimation } from "./animations/DoctorRoleAnimation";
export { ConnectionAnimation } from "./animations/ConnectionAnimation";

// Dialog Components
export { DoctorSpecialtiesDialog } from "./DoctorSpecialtiesDialog";
export { CountriesDialog } from "./CountriesServedDialog";

// Background Components
export { AnimatedBackgroundCircle } from "./AnimatedBackgroundCirlce";

// Types
export type {
  Feature,
  WorkflowStep as WorkflowStepType,
  UserRole,
  Capability,
  AnimationConfig,
  AnimationProps,
} from "./types";

// View Models
export { useStatisticsSectionViewModel } from "./sections/StatisticsSectionViewModel";
export type { StatisticItem } from "./sections/StatisticsSectionViewModel";
