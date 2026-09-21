"use client";

import {
  ClipboardList,
  WifiOff,
  History,
  Stethoscope,
  Image,
  Users,
  Shield,
} from "lucide-react";
import { Feature } from "./types";

/**
 * About Page View Model
 * Centralizes all data and configuration for the About page
 */
export function useAboutPageViewModel() {
  // Features data - mission-focused features
  const features: Feature[] = [
    {
      icon: ClipboardList,
      title: "Comprehensive Patient Records",
      description: "Complete surgical documentation including pre-operative assessment, operative notes, and follow-up care across multiple missions",
    },
    {
      icon: WifiOff,
      title: "Offline-First Architecture",
      description: "Full functionality in low-connectivity environments with automatic sync when connection is restored",
    },
    {
      icon: History,
      title: "Longitudinal Patient Tracking",
      description: "Track the same patients across multiple missions with complete medical history continuity",
    },
    {
      icon: Stethoscope,
      title: "Postoperative Surveillance",
      description: "Monitor surgical outcomes and complications with structured follow-up protocols",
    },
    {
      icon: Image,
      title: "Clinical Image Gallery",
      description: "Capture and organize pre-operative, intra-operative, and post-operative imaging",
    },
    {
      icon: Users,
      title: "Team Continuity",
      description: "Seamless handoffs between rotating mission teams with complete case context",
    },
  ];

  // Capabilities data - replacing statistics with capability badges
  const capabilities = [
    {
      id: "capability-offline",
      label: "Offline-First",
      description: "Mobile app works without internet connectivity and syncs when online",
      icon: WifiOff,
    },
    {
      id: "capability-multi-mission",
      label: "Multi-Mission",
      description: "Admins create and manage missions for both patients and the medical team",
      icon: History,
    },
    {
      id: "capability-hipaa",
      label: "HIPAA Compliant",
      description: "Secure data handling with end-to-end encryption and role-based controls",
      icon: Shield,
    },
  ];

  // Hero section content - medical mission focused
  const heroContent = {
    title: "Orthopedic Medical Missions EMR",
    subtitle: "For Fajr Global",
    description:
      "Fajr Mission EMR is built for low-connectivity environments, it enables longitudinal patient tracking across missions, postoperative surveillance, and gold-standard documentation—ensuring ethical accountability and continuity of care.",
  };

  return {
    features,
    capabilities,
    heroContent,
  };
}
