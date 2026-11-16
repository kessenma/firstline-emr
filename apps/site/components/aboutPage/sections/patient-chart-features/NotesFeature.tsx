"use client";

import React from "react";
import { Mic, FileText } from "lucide-react";
import { MobileFrame } from "../MobileFrame";

export const notesMeta = {
  id: "notes",
  title: "Voice-Powered Clinical Notes",
  description:
    "Surgeons can create procedure notes with on-device voice-dictation using (pre)downloaded large language models on the mobile app — hands-free for sterile environments.",
};

export function NotesVisual({ isActive }: { isActive?: boolean }) {
  const [activeTab, setActiveTab] = React.useState<"procedure" | "soap" | "brief">("procedure");
  const [micPulse, setMicPulse] = React.useState(false);

  React.useEffect(() => {
    if (!isActive) {
      setMicPulse(false);
      return;
    }
    // Pulse the mic button to draw attention
    const timer = setTimeout(() => setMicPulse(true), 1000);
    return () => clearTimeout(timer);
  }, [isActive]);

  return (
    <MobileFrame>
      {/* Header */}
      <div className="bg-card p-4 border-b border-border shadow-sm z-10">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <span className="font-bold font-aleo text-base">New Note</span>
        </div>
      </div>

      {/* Template tabs */}
      <div className="flex border-b border-border bg-card">
        {(
          [
            { key: "procedure", label: "Procedure" },
            { key: "soap", label: "SOAP" },
            { key: "brief", label: "Brief Note" },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
              activeTab === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted/50"
            }`}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Form content */}
      <div className="flex-1 overflow-hidden p-4 space-y-3 bg-muted/30">
        {activeTab === "procedure" && (
          <>
            <FormField label="Procedure Name" value="Right knee arthroscopy" />
            <FormField label="Diagnosis" value="Torn ACL, right knee" />
            <FormField
              label="Notes"
              value="Patient presented with chronic instability. Arthroscopic reconstruction performed using..."
              multiline
            />
            <FormField label="Plan" value="" placeholder="Post-op plan..." />
          </>
        )}
        {activeTab === "soap" && (
          <>
            <FormField label="Subjective" value="Patient reports knee pain for 3 months" />
            <FormField label="Objective" value="Swelling observed in right knee" />
            <FormField label="Assessment" value="Suspected ACL tear" />
            <FormField label="Plan" value="" placeholder="Treatment plan..." />
          </>
        )}
        {activeTab === "brief" && (
          <>
            <FormField label="Note" value="" placeholder="Write your note here..." multiline tall />
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className="bg-card border-t border-border px-4 py-3 flex gap-2">
        <button className="flex-1 py-2.5 text-xs font-semibold rounded-xl border border-border text-foreground bg-background">
          Save Draft
        </button>
        <button className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground">
          Create Note
        </button>
      </div>

      {/* Floating Mic FAB */}
      <div
        className={`absolute bottom-20 right-5 w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg z-20 transition-all duration-300 ${
          micPulse ? "ring-4 ring-primary/30 scale-110" : ""
        }`}
      >
        <Mic className="w-6 h-6 text-primary-foreground" />
        {micPulse && (
          <div className="absolute inset-0 rounded-full bg-primary/40 animate-ping" />
        )}
      </div>
    </MobileFrame>
  );
}

function FormField({
  label,
  value,
  placeholder,
  multiline,
  tall,
}: {
  label: string;
  value: string;
  placeholder?: string;
  multiline?: boolean;
  tall?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
        {label}
      </div>
      <div
        className={`bg-card border border-border rounded-xl px-3 text-xs text-foreground leading-relaxed ${
          multiline || tall ? `py-2 ${tall ? "min-h-[100px]" : "min-h-[60px]"}` : "py-2.5"
        }`}
      >
        {value || <span className="text-muted-foreground">{placeholder}</span>}
      </div>
    </div>
  );
}
