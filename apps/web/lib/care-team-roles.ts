// Shared care team role utilities

export type CareTeamRole = "surgeon" | "assistant" | "consulting" | "triage" | "coordinator";

export const CARE_TEAM_ROLES: CareTeamRole[] = [
  "surgeon",
  "assistant",
  "consulting",
  "triage",
  "coordinator",
];

export const ROLE_LABELS: Record<CareTeamRole, string> = {
  surgeon: "Surgeon (Lead)",
  assistant: "Assistant",
  consulting: "Consulting",
  triage: "Triage",
  coordinator: "Coordinator",
};

export const ROLE_DESCRIPTIONS: Record<CareTeamRole, string> = {
  surgeon: "You will be assigned as lead doctor for this patient",
  assistant: "Assist the lead surgeon on this case",
  consulting: "Provide consulting expertise for this case",
  triage: "Manage triage and patient flow",
  coordinator: "Coordinate care logistics",
};

export const ROLE_BADGE_COLORS: Record<CareTeamRole, string> = {
  surgeon: "bg-blue-100 text-blue-800",
  assistant: "bg-green-100 text-green-800",
  consulting: "bg-purple-100 text-purple-800",
  triage: "bg-amber-100 text-amber-800",
  coordinator: "bg-gray-100 text-gray-800",
};

/**
 * Returns the care team roles available for a given account type.
 * Doctors can be surgeon/assistant/consulting.
 * Triage users can be triage/coordinator.
 */
export function getRolesForAccountType(accountType: string): CareTeamRole[] {
  if (accountType === "Doctor") return ["surgeon", "assistant", "consulting"];
  if (accountType === "Triage") return ["triage", "coordinator"];
  return [];
}

/** Only surgeon is considered a lead role */
export function isLeadRole(role: CareTeamRole | string): boolean {
  return role === "surgeon";
}

/** Denormalized care team member stored in patients.careTeam JSON array */
export interface CareTeamMemberJSON {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: CareTeamRole;
  isLead: boolean;
}
