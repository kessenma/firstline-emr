"use client";

import React from "react";
import { Users, FileText, Pill, Image as ImageIcon, MessageCircle, RefreshCw } from "lucide-react";
import { MobileFrame } from "../MobileFrame";

export const offlineSyncMeta = {
  id: "offline-sync",
  title: "Works Offline, Syncs Automatically",
  description:
    "Every record, note, prescription, and photo syncs to your device. Review charts and write notes without internet — changes upload when connectivity returns. Verify your data matches your team with the built-in sync dashboard.",
};

const dataCounts = [
  { icon: Users, label: "Patients", count: 847 },
  { icon: FileText, label: "Clinical Notes", count: 2_134 },
  { icon: Pill, label: "Prescriptions", count: 1_563 },
  { icon: ImageIcon, label: "Patient Photos", count: 392 },
  { icon: MessageCircle, label: "Messages", count: 4_891 },
];

export function OfflineSyncVisual({ isActive }: { isActive?: boolean }) {
  const [animatedCounts, setAnimatedCounts] = React.useState<number[]>(dataCounts.map(() => 0));

  React.useEffect(() => {
    if (!isActive) {
      setAnimatedCounts(dataCounts.map(() => 0));
      return;
    }

    // Animate counts up
    const duration = 1200;
    const steps = 30;
    const interval = duration / steps;

    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = Math.min(step / steps, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedCounts(dataCounts.map((d) => Math.round(d.count * eased)));
      if (step >= steps) clearInterval(timer);
    }, interval);

    return () => clearInterval(timer);
  }, [isActive]);

  return (
    <MobileFrame>
      {/* Header */}
      <div className="bg-card p-4 border-b border-border shadow-sm z-10">
        <div className="font-bold font-aleo text-base">Data Sync</div>
      </div>

      <div className="flex-1 overflow-hidden p-4 space-y-3 bg-muted/30">
        {/* Status banner */}
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500">
              <div className="w-full h-full rounded-full bg-green-500 animate-ping opacity-50" />
            </div>
            <span className="text-sm font-semibold text-foreground">Connected</span>
          </div>
          <div className="text-[11px] text-muted-foreground ml-[18px]">
            Last synced: Just now
          </div>
        </div>

        {/* Section label */}
        <div className="flex items-center gap-1.5 pt-1">
          <RefreshCw className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Local Data
          </span>
        </div>

        {/* Data counts */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {dataCounts.map((row, i) => {
            const Icon = row.icon;
            return (
              <div
                key={row.label}
                className={`flex items-center justify-between px-4 py-3 ${
                  i < dataCounts.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{row.label}</span>
                </div>
                <span className="text-sm font-bold text-foreground tabular-nums">
                  {animatedCounts[i].toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>

        {/* Offline mode hint */}
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-primary/5 border border-primary/10">
          <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
          <span className="text-[10px] text-primary font-medium leading-snug">
            All data available offline. Changes sync automatically when connected.
          </span>
        </div>
      </div>
    </MobileFrame>
  );
}
