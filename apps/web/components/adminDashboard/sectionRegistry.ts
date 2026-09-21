import type { LucideIcon } from "lucide-react";
import {
  Users,
  UserCheck,
  UserX,
  BriefcaseMedical,
  ShieldCheck,
  RotateCcw,
  ChartNoAxesColumn,
  Bell,
  Trash2,
  BotMessageSquare,
  UserPlus,
  Image,
  BarChart2,
  ShieldAlert,
  Languages,
  Database,
  Globe,
  AlertTriangle,
  MessageSquare,
  ClipboardList,
  HardDriveDownload,
} from "lucide-react";
import type { AdminSectionCategory, AdminSectionId } from "@fajr/shared/admin";
import { ADMIN_CATEGORY_LABELS, ADMIN_CATEGORY_ORDER } from "@fajr/shared/admin";

import NewSignupsView from "./sections/new-signups/NewSignupsView";
import DeniedDoctorsAndTriage from "./sections/denied-users/DeniedDoctorsTriageEvacView";
import ExistingDoctorsTriageEvacView from "./sections/existing-users/ExistingDoctorsTriageEvacView";
import MedOrdersView from "./sections/med-orders/MedOrdersView";
import ForgotPasswordView from "@/components/adminDashboard/sections/forgot-password/ForgotPasswordView";
import AdminManagement from "@/components/adminDashboard/sections/admin-management/AdminManagementView";
import StatisticsView from "@/components/adminDashboard/sections/staistics/views/StatisticsView";
import { PatientIntakeView } from "@/components/adminDashboard/sections/patient-intake/PatientIntakeView";
import AdminUserCreationView from "./sections/user-creation/AdminUserCreationView";
import ProfileUpdateRequestsView from "./sections/profile-update-requests/ProfileUpdateRequestsView";
import TranslationServiceView from "./sections/translation-service/TranslationServiceView";
import { PowerSyncView } from "./sections/powersync";
import MissionsManagementView from "./sections/missions/MissionsManagementView";
import CareTeamConflictsView from "./sections/care-team-conflicts/CareTeamConflictsView";
import UserFeedbackView from "./sections/user-feedback/UserFeedbackView";
import MissionRequestsView from "./sections/mission-requests/MissionRequestsView";
import { AdminNotificationsView } from "@/components/adminDashboard/sections/notifications/AdminNotificationsView";
import ClearTestDataView from "@/components/adminDashboard/sections/delete-patients/ClearTestDataView";
import ImageStorageView from "@/components/adminDashboard/sections/image-storage/ImageStorageView";
import AnalyticsView from "@/components/adminDashboard/sections/analytics/AnalyticsView";
import DatabaseBackupsView from "./sections/database-backups/DatabaseBackupsView";
import VerifyAuthMigrationView from "./sections/verify-auth-migration/VerifyAuthMigrationView";

/** @deprecated Use AdminSectionCategory from @fajr/shared/admin */
export type SectionCategory = AdminSectionCategory;

export interface SectionDefinition {
  id: AdminSectionId;
  title: string;
  icon: LucideIcon;
  category: AdminSectionCategory;
  component: React.ComponentType<{ isDialog?: boolean }>;
}

export const CATEGORY_LABELS = ADMIN_CATEGORY_LABELS;
export const CATEGORY_ORDER = ADMIN_CATEGORY_ORDER;

export const sections: SectionDefinition[] = [
  // User Management
  {
    id: "create-user",
    title: "Create New Doctor, Triage, or Evac User",
    icon: UserPlus,
    category: "userManagement",
    component: AdminUserCreationView,
  },
  {
    id: "new-signups",
    title: "New Signups",
    icon: Users,
    category: "userManagement",
    component: NewSignupsView,
  },
  {
    id: "existing-users",
    title: "Existing Doctors & Triage",
    icon: UserCheck,
    category: "userManagement",
    component: ExistingDoctorsTriageEvacView,
  },
  {
    id: "denied-users",
    title: "Denied Doctors & Triage",
    icon: UserX,
    category: "userManagement",
    component: DeniedDoctorsAndTriage,
  },
  {
    id: "profile-update-requests",
    title: "Profile Update Requests",
    icon: ShieldAlert,
    category: "userManagement",
    component: ProfileUpdateRequestsView,
  },
  {
    id: "admin-management",
    title: "Admin Management",
    icon: ShieldCheck,
    category: "userManagement",
    component: AdminManagement,
  },
  {
    id: "password-reset",
    title: "Password Reset",
    icon: RotateCcw,
    category: "userManagement",
    component: ForgotPasswordView,
  },

  // Notifications
  {
    id: "notifications",
    title: "Notifications",
    icon: Bell,
    category: "notifications",
    component: AdminNotificationsView,
  },

  // Clinical Operations
  {
    id: "medical-orders",
    title: "Medical Orders",
    icon: BriefcaseMedical,
    category: "clinicalOperations",
    component: MedOrdersView,
  },
  {
    id: "care-team-conflicts",
    title: "Care Team Conflicts",
    icon: AlertTriangle,
    category: "clinicalOperations",
    component: CareTeamConflictsView,
  },

  // Patient Intake
  {
    id: "telegram-bot-settings",
    title: "Telegram Bot Settings",
    icon: BotMessageSquare,
    category: "patientIntake",
    component: PatientIntakeView,
  },

  // Missions
  {
    id: "missions-management",
    title: "Missions Management",
    icon: Globe,
    category: "missions",
    component: MissionsManagementView,
  },
  {
    id: "mission-join-requests",
    title: "Mission Join Requests",
    icon: ClipboardList,
    category: "missions",
    component: MissionRequestsView,
  },

  // Analytics & Statistics
  {
    id: "statistics",
    title: "Statistics",
    icon: ChartNoAxesColumn,
    category: "analyticsStatistics",
    component: StatisticsView,
  },
  {
    id: "analytics-dashboard",
    title: "Analytics Dashboard",
    icon: BarChart2,
    category: "analyticsStatistics",
    component: AnalyticsView,
  },

  // System Tools
  {
    id: "powersync-service",
    title: "PowerSync Service",
    icon: Database,
    category: "systemTools",
    component: PowerSyncView,
  },
  {
    id: "translation-service",
    title: "Translation Service",
    icon: Languages,
    category: "systemTools",
    component: TranslationServiceView,
  },
  {
    id: "image-storage",
    title: "Media Storage",
    icon: Image,
    category: "systemTools",
    component: ImageStorageView,
  },
  {
    id: "clear-test-data",
    title: "Clear Test Data",
    icon: Trash2,
    category: "systemTools",
    component: ClearTestDataView,
  },
  {
    id: "database-backups",
    title: "Database Backups",
    icon: HardDriveDownload,
    category: "systemTools",
    component: DatabaseBackupsView,
  },
  {
    id: "verify-auth-migration",
    title: "Verify Auth Migration",
    icon: ShieldCheck,
    category: "systemTools",
    component: VerifyAuthMigrationView,
  },

  // Feedback
  {
    id: "user-feedback",
    title: "User Feedback",
    icon: MessageSquare,
    category: "feedback",
    component: UserFeedbackView,
  },
];

export function getSectionsByCategory(): Map<AdminSectionCategory, SectionDefinition[]> {
  const grouped = new Map<AdminSectionCategory, SectionDefinition[]>();
  for (const category of ADMIN_CATEGORY_ORDER) {
    grouped.set(category, []);
  }
  for (const section of sections) {
    grouped.get(section.category)!.push(section);
  }
  return grouped;
}
