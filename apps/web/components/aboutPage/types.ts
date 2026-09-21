import { LucideIcon } from "lucide-react";

/**
 * Feature displayed in the features section
 */
export interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

/**
 * Workflow step in the patient care process
 */
export interface WorkflowStep {
  title: string;
  description: string;
}

/**
 * User role card configuration
 */
export interface UserRole {
  id: "patient" | "coordinator" | "surgeon";
  icon: React.ReactNode;
  title: string;
  description: string;
  animationType: "patient" | "coordinator" | "surgeon";
  cardClassName?: string;
}

/**
 * Capability item for the capabilities section
 */
export interface Capability {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

/**
 * Animation configuration for role animations
 */
export interface AnimationConfig {
  duration?: number;
  delay?: number;
  enabled?: boolean;
  playOnce?: boolean;
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
}

/**
 * Props for animation components
 */
export interface AnimationProps {
  config?: AnimationConfig;
  className?: string;
}
