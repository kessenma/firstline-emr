"use client";

import React from "react";
import {
  Users,
  UserPlus,
  Bell,
  MapPin,
  ChevronDown,
  ChevronUp,
  Search,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { MobileFrame } from "../MobileFrame";

export const adminMeta = {
  id: "admin",
  title: "Mission Control for Admins",
  description:
    "Manage users, missions, notifications, and system health from your phone. Approve signups, assign roles, and monitor analytics — even in the field.",
};

const sections = [
  { icon: UserPlus, label: "New Signups", badge: 4, expandable: true },
  { icon: Users, label: "Existing Users", expandable: false },
  { icon: MapPin, label: "Missions Management", expandable: false },
  { icon: Bell, label: "Notifications", expandable: false },
  { icon: ShieldCheck, label: "Admin Management", expandable: false },
  { icon: MessageSquare, label: "User Feedback", badge: 2, expandable: false },
];

const pendingUsers = [
  { name: "Dr. Khalil Ahmed", specialty: "Orthopedic Surgery", time: "2h ago" },
  { name: "Nurse Fatima Hassan", specialty: "Triage", time: "5h ago" },
];

export function AdminVisual({ isActive }: { isActive?: boolean }) {
  const [expandedIndex, setExpandedIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!isActive) {
      setExpandedIndex(null);
      return;
    }
    // Auto-expand "New Signups" after a delay
    const timer = setTimeout(() => setExpandedIndex(0), 800);
    return () => clearTimeout(timer);
  }, [isActive]);

  return (
    <MobileFrame>
      {/* Header */}
      <div className="bg-card p-4 border-b border-border shadow-sm z-10">
        <div className="font-bold font-aleo text-base mb-2.5">Admin Dashboard</div>
        {/* Search bar */}
        <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground">Search sections...</span>
        </div>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-hidden p-3 space-y-2 bg-muted/30">
        {sections.map((section, i) => {
          const Icon = section.icon;
          const isExpanded = expandedIndex === i;

          return (
            <div key={i} className="bg-card rounded-xl border border-border overflow-hidden">
              <button
                className="w-full flex items-center gap-3 px-3.5 py-3 text-left"
                onClick={() => setExpandedIndex(isExpanded ? null : i)}
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground">{section.label}</div>
                </div>
                {section.badge && (
                  <span className="min-w-[22px] h-[22px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1.5 shrink-0">
                    {section.badge}
                  </span>
                )}
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
              </button>

              {/* Expanded content for New Signups */}
              {isExpanded && i === 0 && (
                <div className="px-3.5 pb-3 space-y-2 border-t border-border pt-2">
                  {pendingUsers.map((user, j) => (
                    <div key={j} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/50">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-[10px] shrink-0">
                        {user.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-foreground truncate">{user.name}</div>
                        <div className="text-[10px] text-muted-foreground">{user.specialty} • {user.time}</div>
                      </div>
                      <div className="flex gap-1.5">
                        <button className="px-2.5 py-1 rounded-md bg-green-500 text-white text-[9px] font-bold">
                          Approve
                        </button>
                        <button className="px-2.5 py-1 rounded-md bg-muted border border-border text-[9px] font-semibold text-muted-foreground">
                          Deny
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </MobileFrame>
  );
}
