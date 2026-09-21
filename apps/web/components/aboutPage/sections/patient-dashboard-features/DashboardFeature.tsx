"use client";

import { Hospital, Stethoscope, Merge, ArrowUpNarrowWide, NotebookPen, MessageSquare, UserPlus } from "lucide-react";
import { MobileFrame } from "../MobileFrame";

export const dashboardMeta = {
  id: "dashboard",
  title: "Mobile-Optimized Dashboard",
  description:
    "Access patient records on the go with our responsive, card-based dashboard designed for quick scanning in high-pressure environments.",
};

export function DashboardVisual() {
  return (
    <MobileFrame>
      <div className="bg-card p-5 border-b border-border flex justify-between items-center shadow-sm z-10">
        <div className="font-bold text-xl font-aleo">Patients</div>
        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shadow-inner">JD</div>
      </div>
      <div className="p-4 space-y-4 overflow-hidden flex-1 bg-muted/30">
        {/* Patient Card 1 */}
        <div className="bg-card rounded-2xl p-4 shadow-sm border border-border/50 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg shadow-inner">S</div>
              <div>
                <div className="font-bold font-aleo text-base">Patient Smith</div>
                <div className="text-xs text-muted-foreground font-figtree">45 years • Amman</div>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 items-end">
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 font-medium border border-orange-200">Pre-Op / Cleared</span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 font-medium border border-red-200">Urgent</span>
            </div>
          </div>
          <div className="bg-primary/5 p-2.5 rounded-xl mb-3 border border-primary/10">
            <div className="text-xs font-semibold text-primary mb-1">Chief Complaint:</div>
            <div className="text-xs text-primary/80 leading-relaxed">Severe abdominal pain, suspected appendicitis.</div>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium"><Hospital className="w-3.5 h-3.5" /> Al-Bashir</div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium"><Stethoscope className="w-3.5 h-3.5" /> Orthopedic Trauma</div>
          </div>
          <div className="pt-3 border-t border-border/60">
            <div className="flex justify-between items-center gap-1.5">
              {[Merge, ArrowUpNarrowWide, NotebookPen, MessageSquare, Stethoscope].map((Icon, i) => (
                <div key={i} className="flex-1 h-9 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-700">
                  <Icon className={`w-4 h-4 ${i < 2 ? "rotate-90" : ""}`} />
                </div>
              ))}
              <div className="flex-1 h-9 rounded-lg bg-orange-600 border border-orange-700 flex items-center justify-center text-white">
                <UserPlus className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Patient Card 2 */}
        <div className="bg-card rounded-2xl p-4 shadow-sm border border-border/50 opacity-60">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-lg shadow-inner">A</div>
              <div>
                <div className="font-bold font-aleo text-base">Patient Ali</div>
                <div className="text-xs text-muted-foreground font-figtree">32 years • Irbid</div>
              </div>
            </div>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-800 font-medium border border-gray-200">Not Started</span>
          </div>
          <div className="pt-3 border-t border-border/60">
            <div className="flex justify-between items-center gap-1.5">
              {[Merge, ArrowUpNarrowWide, NotebookPen, MessageSquare, Stethoscope].map((Icon, i) => (
                <div key={i} className={`flex-1 h-9 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-700 ${i !== 0 && i !== 2 ? "opacity-50" : ""}`}>
                  <Icon className={`w-4 h-4 ${i < 2 ? "rotate-90" : ""}`} />
                </div>
              ))}
              <div className="flex-1 h-9 rounded-lg bg-orange-600 border border-orange-700 flex items-center justify-center text-white opacity-50">
                <UserPlus className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </MobileFrame>
  );
}
