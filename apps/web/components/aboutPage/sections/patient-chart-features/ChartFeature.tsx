"use client";

import { User, FileText, Pill, Image as ImageIcon } from "lucide-react";
import { MobileFrame } from "../MobileFrame";

export const chartMeta = {
  id: "chart",
  title: "Comprehensive Patient Chart",
  description:
    "Dive deep into patient history with a unified chart view. Access notes, medications, media, and secure messaging all in one place.",
};

export function ChartVisual() {
  return (
    <MobileFrame>
      <div className="bg-card p-4 border-b border-border shadow-sm z-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shadow-inner">S</div>
          <div>
            <div className="font-bold font-aleo text-lg leading-tight">Patient Smith</div>
            <div className="text-xs text-muted-foreground font-figtree">ID: PAT-12345</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-border bg-card scrollbar-hide shadow-sm z-0">
        {[
          { Icon: User, label: "Info", active: true },
          { Icon: FileText, label: "Notes", active: false },
          { Icon: Pill, label: "Meds", active: false },
          { Icon: ImageIcon, label: "Images", active: false },
        ].map(({ Icon, label, active }) => (
          <div
            key={label}
            className={`px-4 py-3.5 flex items-center gap-2 min-w-max transition-colors ${
              active
                ? "border-b-[3px] border-primary text-primary bg-primary/5"
                : "text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className={`text-sm ${active ? "font-semibold" : "font-medium"}`}>{label}</span>
          </div>
        ))}
      </div>

      <div className="p-4 space-y-4 overflow-hidden flex-1 bg-muted/30">
        <div className="bg-card rounded-2xl p-4 shadow-sm border border-border/50 space-y-3.5">
          {[
            { label: "DOB:", value: "Jan 15, 1979 (45y)" },
            { label: "Sex:", value: "Male" },
            { label: "Loc:", value: "Amman, Jordan" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center gap-3 text-sm">
              <div className="w-10 text-muted-foreground font-medium">{label}</div>
              <div className="font-semibold text-foreground">{value}</div>
            </div>
          ))}
        </div>

        <div className="bg-card rounded-2xl p-4 shadow-sm border border-border/50">
          <div className="text-sm font-bold font-aleo mb-3 text-foreground">Care Team</div>
          <div className="flex items-center gap-3 bg-muted/50 p-2.5 rounded-xl border border-border/50">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shadow-inner">DR</div>
            <div>
              <div className="text-sm font-semibold text-foreground">Dr. Roberts</div>
              <div className="text-xs text-primary font-medium">Lead Surgeon</div>
            </div>
          </div>
        </div>
      </div>
    </MobileFrame>
  );
}
