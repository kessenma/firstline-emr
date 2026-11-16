"use client";

import React from "react";
import { UserRoleCard } from "../cards/UserRoleCard";
import { PatientRoleAnimation } from "../animations/PatientRoleAnimation";
import { TriageRoleAnimation } from "../animations/TriageRoleAnimation";
import { DoctorRoleAnimation } from "../animations/DoctorRoleAnimation";
import { ClipboardPlus, Users, Stethoscope } from "lucide-react";

interface UserRolesSectionProps {
  className?: string;
}

/**
 * User Roles Section Component
 * Displays the three user role cards with their respective animations
 */
export function UserRolesSection({ className = "" }: UserRolesSectionProps) {
  return (
    <div className={`min-h-screen ${className}`}>
      <div className="px-4 py-20 mx-auto max-w-6xl sm:px-6 lg:px-8">
        <div className="mb-20 text-center relative z-10">
          <h2 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/70 sm:text-5xl md:text-6xl font-aleo drop-shadow-sm">
            App User-types
          </h2>
          <p className="mx-auto mt-6 max-w-2xl font-figtree text-lg text-muted-foreground sm:text-xl leading-relaxed">
            Managed by Admins:
          </p>
        </div>

        <div className="mt-20">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-4">
            {/* Patient Card */}
            <UserRoleCard
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  className="w-5 h-5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
              }
              title="Patients"
              description="Mission patients receive comprehensive pre-operative evaluation, surgical care, and longitudinal follow-up tracking across multiple missions."
              animationComponent={<PatientRoleAnimation />}
            />

            {/* Mission Coordinators Card */}
            <UserRoleCard
              icon={<Users className="w-5 h-5 text-primary" />}
              title="Triage Coordinators"
              description="Coordinators manage mission logistics, patient scheduling, case prioritization, and ensure seamless handoffs between mission teams."
              animationComponent={<TriageRoleAnimation />}
              headerClassName="ring-1 ring-primary"
            />

            {/* Surgeons Card */}
            <UserRoleCard
              icon={<Stethoscope className="w-5 h-5 text-primary" />}
              title="Surgeons"
              description="Surgeons document complete surgical cases including operative notes, intra-operative imaging, and follow-up plans for continuity across rotating teams."
              animationComponent={<DoctorRoleAnimation />}
              headerClassName="ring-1 ring-primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
