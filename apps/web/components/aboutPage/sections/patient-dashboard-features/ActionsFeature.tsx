"use client";

import React, { useRef } from "react";
import { Merge, ArrowUpNarrowWide, NotebookPen, MessageSquare, Stethoscope, UserPlus, Check, X } from "lucide-react";
import { MobileFrame } from "../MobileFrame";

export const actionsMeta = {
  id: "actions",
  title: "Quick Actions",
  description:
    "Update patient status, priority, and specialties with a single tap. Add notes and join care teams instantly without leaving the dashboard.",
};

const sheets = ["status", "priority", "notes", "specialty", "team"] as const;
type Sheet = (typeof sheets)[number];

export function ActionsVisual({ isActive }: { isActive?: boolean }) {
  const [activeSheet, setActiveSheet] = React.useState<Sheet | null>(null);
  const [isInteracting, setIsInteracting] = React.useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cycleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  React.useEffect(() => {
    if (!isActive) {
      setActiveSheet(null);
      setIsInteracting(false);
      if (cycleIntervalRef.current) clearInterval(cycleIntervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    if (isInteracting) {
      if (cycleIntervalRef.current) clearInterval(cycleIntervalRef.current);
      return;
    }

    const startTimeout = setTimeout(() => {
      setActiveSheet(sheets[0]);
      cycleIntervalRef.current = setInterval(() => {
        setActiveSheet((prev) => {
          if (prev === null) return sheets[0];
          const currentIndex = sheets.indexOf(prev);
          return sheets[(currentIndex + 1) % sheets.length];
        });
      }, 2500);
    }, 1000);

    return () => {
      clearTimeout(startTimeout);
      if (cycleIntervalRef.current) clearInterval(cycleIntervalRef.current);
    };
  }, [isInteracting, isActive]);

  const handleInteraction = (sheet: Sheet | null) => {
    setActiveSheet(sheet);
    setIsInteracting(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsInteracting(false);
      setActiveSheet(null);
    }, 5000);
  };

  return (
    <MobileFrame>
      {!isInteracting && isActive && (
        <div className="absolute top-4 right-4 bg-primary/90 text-primary-foreground text-[10px] font-bold px-3 py-1.5 rounded-full animate-pulse z-30 pointer-events-none shadow-md flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
          Auto-playing • Tap to interact
        </div>
      )}
      {isInteracting && isActive && (
        <div className="absolute top-4 right-4 bg-muted/80 text-muted-foreground text-[10px] font-bold px-3 py-1.5 rounded-full z-30 pointer-events-none shadow-sm border border-border backdrop-blur-sm">
          Interactive Mode
        </div>
      )}

      <div className="bg-card p-5 border-b border-border flex justify-between items-center shadow-sm z-10">
        <div className="font-bold text-xl font-aleo">Patients</div>
      </div>
      <div className="p-4 space-y-4 overflow-hidden flex-1 bg-muted/30 relative">
        <div className="bg-card rounded-2xl p-4 shadow-md border-2 border-primary/40 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
          <div className="flex items-center gap-3 mb-4 mt-1">
            <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg shadow-inner">S</div>
            <div>
              <div className="font-bold font-aleo text-base">Patient Smith</div>
              <div className="text-xs text-muted-foreground font-figtree">45 years • Amman</div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-border/60">
            <div className="flex justify-between items-center gap-1.5 relative z-20">
              {(["status", "priority", "notes", "specialty"] as const).map((id, i) => {
                const icons = [Merge, ArrowUpNarrowWide, NotebookPen, Stethoscope];
                const Icon = icons[i];
                const isSelected = activeSheet === id;
                return (
                  <button
                    key={id}
                    onClick={() => handleInteraction(id)}
                    className={`flex-1 h-11 rounded-xl border flex items-center justify-center shadow-sm transition-all duration-300 relative ${
                      isSelected
                        ? "bg-orange-100 border-orange-400 text-orange-800 scale-110 z-10 ring-4 ring-orange-500/20"
                        : "bg-gradient-to-b from-orange-50 to-orange-100/50 border-orange-200 text-orange-700 hover:shadow-md hover:scale-105"
                    }`}
                  >
                    <Icon className={`w-5 h-5 drop-shadow-sm ${i < 2 ? "rotate-90" : ""}`} />
                    {id === "notes" && (
                      <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-[8px] text-white font-bold">!</div>
                    )}
                  </button>
                );
              })}
              <button
                onClick={() => handleInteraction("team")}
                className={`flex-1 h-11 rounded-xl border flex items-center justify-center shadow-sm transition-all duration-300 ${
                  activeSheet === "team"
                    ? "bg-orange-700 border-orange-800 text-white scale-110 z-10 ring-4 ring-orange-500/30"
                    : "bg-gradient-to-b from-orange-600 to-orange-700 border-orange-800 text-white hover:shadow-md hover:scale-105"
                }`}
              >
                <UserPlus className="w-5 h-5 drop-shadow-sm" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Sheet */}
        <div
          className={`absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] border-t border-border transition-transform duration-300 ease-in-out z-20 ${activeSheet ? "translate-y-0" : "translate-y-full"}`}
          style={{ height: "65%" }}
        >
          <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full mx-auto mt-3 mb-4" />

          {activeSheet === "status" && (
            <div className="px-5 pb-5 h-full flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold font-aleo text-lg">Change Status</h3>
                <button onClick={() => handleInteraction(null)} className="p-1 rounded-full hover:bg-muted"><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
              <div className="space-y-2 overflow-y-auto flex-1 pb-4 scrollbar-hide">
                {["Pre-Op / Not Cleared", "Pre-Op / Cleared", "Peri-Op / In Surgery", "Post-Op / In-Patient", "Post-Op / Discharged"].map((status, i) => (
                  <div key={i} className={`p-3 rounded-xl border flex justify-between items-center transition-colors ${i === 1 ? "border-orange-500 bg-orange-50" : "border-border bg-background hover:border-orange-300 cursor-pointer"}`}>
                    <span className={`font-medium text-sm ${i === 1 ? "text-orange-700" : "text-foreground"}`}>{status}</span>
                    {i === 1 && <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSheet === "priority" && (
            <div className="px-5 pb-5 h-full flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold font-aleo text-lg">Change Priority</h3>
                <button onClick={() => handleInteraction(null)} className="p-1 rounded-full hover:bg-muted"><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
              <div className="space-y-2 overflow-y-auto flex-1 pb-4 scrollbar-hide">
                {["Not Selected", "Routine", "Moderate", "Urgent", "Emergency"].map((priority, i) => (
                  <div key={i} className={`p-3 rounded-xl border flex justify-between items-center transition-colors ${i === 3 ? "border-orange-500 bg-orange-50" : "border-border bg-background hover:border-orange-300 cursor-pointer"}`}>
                    <span className={`font-medium text-sm ${i === 3 ? "text-orange-700" : "text-foreground"}`}>{priority}</span>
                    {i === 3 && <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSheet === "notes" && (
            <div className="px-5 pb-5 h-full flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold font-aleo text-lg">Patient Notes</h3>
                <button onClick={() => handleInteraction(null)} className="p-1 rounded-full hover:bg-muted"><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
              <div className="flex-1 flex flex-col">
                <textarea
                  className="w-full flex-1 border border-border rounded-xl p-3 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  defaultValue="Patient needs to be evaluated by orthopedic trauma for suspected fracture. Fasting since midnight."
                />
                <button className="w-full mt-3 bg-orange-600 hover:bg-orange-700 transition-colors text-white font-semibold py-3 rounded-xl shadow-sm" onClick={() => handleInteraction(null)}>Save Notes</button>
              </div>
            </div>
          )}

          {activeSheet === "specialty" && (
            <div className="px-5 pb-5 h-full flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold font-aleo text-lg">Select Specialties</h3>
                <button onClick={() => handleInteraction(null)} className="p-1 rounded-full hover:bg-muted"><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
              <div className="space-y-2 overflow-y-auto flex-1 pb-4 scrollbar-hide">
                {["Orthopedic Trauma", "Pediatric Orthopedics", "Spine", "Hand & Upper Extremity", "Foot & Ankle"].map((spec, i) => (
                  <div key={i} className={`p-3 rounded-xl border flex justify-between items-center transition-colors ${i === 0 ? "border-orange-500 bg-orange-50" : "border-border bg-background hover:border-orange-300 cursor-pointer"}`}>
                    <span className={`font-medium text-sm ${i === 0 ? "text-orange-700" : "text-foreground"}`}>{spec}</span>
                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${i === 0 ? "bg-orange-500 border-orange-500" : "border-muted-foreground/30"}`}>
                      {i === 0 && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSheet === "team" && (
            <div className="px-5 pb-5 h-full flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold font-aleo text-lg">Join Care Team</h3>
                <button onClick={() => handleInteraction(null)} className="p-1 rounded-full hover:bg-muted"><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
              <div className="space-y-3 overflow-y-auto flex-1 pb-4 scrollbar-hide">
                {[
                  { role: "Surgeon", color: "blue", title: "Lead Surgeon", desc: "Primary surgeon responsible for the operative case." },
                  { role: "Anesthesia", color: "teal", title: "Anesthesiologist", desc: "Manages anesthesia and perioperative care." },
                  { role: "Nursing", color: "purple", title: "Circulating Nurse", desc: "Manages the operating room and patient care." },
                ].map(({ role, color, title, desc }) => (
                  <div key={role} className="p-3 rounded-xl border border-border bg-background hover:border-orange-300 cursor-pointer transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full bg-${color}-100 text-${color}-800 text-[10px] font-bold`}>{role}</span>
                      <span className="font-medium text-sm text-foreground">{title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Overlay */}
        {activeSheet && (
          <div
            className="absolute inset-0 bg-black/20 z-10 rounded-[1.5rem] transition-opacity duration-300"
            onClick={() => handleInteraction(null)}
          />
        )}
      </div>
    </MobileFrame>
  );
}
