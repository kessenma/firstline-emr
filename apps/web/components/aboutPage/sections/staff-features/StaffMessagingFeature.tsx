"use client";

import React from "react";
import { SquarePen, Megaphone, Users, MessageCircle } from "lucide-react";
import { MobileFrame } from "../MobileFrame";

export const staffMessagingMeta = {
  id: "staff-messaging",
  title: "Team Coordination & Group Chat",
  description:
    "Built-in messaging keeps surgical, triage, and coordination teams aligned. Start direct messages, create group threads, and share updates — all synced offline.",
};

const threads = [
  {
    name: "Orthopedic Team",
    lastMessage: "Surgery for Ahmad scheduled at 9 AM",
    badge: "Group",
    unread: 3,
    initials: "OT",
    color: "bg-blue-100 text-blue-700",
  },
  {
    name: "Dr. Sarah",
    lastMessage: "Can you review the post-op notes?",
    unread: 1,
    initials: "DS",
    color: "bg-teal-100 text-teal-700",
  },
  {
    name: "Triage Coordinators",
    lastMessage: "New batch of patients incoming from clinic B",
    badge: "Group",
    unread: 0,
    initials: "TC",
    color: "bg-purple-100 text-purple-700",
  },
];

export function StaffMessagingVisual({ isActive }: { isActive?: boolean }) {
  return (
    <MobileFrame>
      {/* Header */}
      <div className="bg-card px-5 py-4 border-b border-border shadow-sm z-10">
        <div className="font-bold text-xl font-aleo">Messages</div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border bg-card">
        <div className="flex-1 flex items-center justify-center gap-2 py-3 border-b-2 border-primary">
          <span className="text-sm font-semibold text-primary">Staff</span>
          <span className="min-w-[20px] h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center px-1.5">
            4
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center gap-2 py-3">
          <span className="text-sm text-muted-foreground">Patient</span>
          <span className="min-w-[20px] h-5 rounded-full bg-muted-foreground/30 text-muted-foreground text-[10px] font-semibold flex items-center justify-center px-1.5">
            2
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden p-4 space-y-3 bg-muted/10">
        {/* New Message button */}
        <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">
          <SquarePen className="w-4 h-4" />
          New Message
        </button>

        {/* Admin Notifications card */}
        <div className="flex items-center gap-3 p-3.5 rounded-xl border bg-amber-50 border-amber-200">
          <Megaphone className="w-7 h-7 text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-amber-700">Admin Notifications</div>
            <div className="text-[11px] text-muted-foreground">View system alerts and announcements</div>
          </div>
        </div>

        {/* Thread list */}
        {threads.map((thread, i) => (
          <div
            key={i}
            className={`p-3.5 rounded-xl border transition-colors ${
              thread.unread > 0
                ? "bg-primary/5 border-primary/20"
                : "bg-card border-border"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full ${thread.color} flex items-center justify-center font-bold text-xs shrink-0 shadow-inner`}>
                {thread.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-bold text-foreground truncate">{thread.name}</span>
                  {thread.badge && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold uppercase">
                      {thread.badge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{thread.lastMessage}</p>
              </div>
              {thread.unread > 0 && (
                <span className="min-w-[22px] h-[22px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 shrink-0">
                  {thread.unread}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </MobileFrame>
  );
}
