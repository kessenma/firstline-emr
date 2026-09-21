"use client";

import React from "react";
import { Camera, MessageSquare, Wifi, Play, FileText } from "lucide-react";
import { MobileFrame } from "../MobileFrame";

export const mediaGalleryMeta = {
  id: "media-gallery",
  title: "Offline Media Gallery",
  description:
    "Capture patient photos, review Telegram media, and upload documents — all cached on-device for offline access. Toggle WiFi-only downloads to save mobile data.",
};

// Generate mock photo grid items
const gridItems = [
  { type: "photo", color: "bg-blue-200", label: "Pre-Op" },
  { type: "photo", color: "bg-teal-200", label: "X-Ray" },
  { type: "video", color: "bg-purple-200", label: "Surgery" },
  { type: "photo", color: "bg-amber-200", label: "Post-Op" },
  { type: "pdf", color: "bg-gray-200", label: "Report.pdf" },
  { type: "photo", color: "bg-rose-200", label: "Follow-Up" },
  { type: "photo", color: "bg-emerald-200", label: "Wound" },
  { type: "video", color: "bg-indigo-200", label: "PT Session" },
  { type: "photo", color: "bg-orange-200", label: "Recovery" },
];

export function MediaGalleryVisual({ isActive }: { isActive?: boolean }) {
  const [section, setSection] = React.useState<"patient" | "telegram">("patient");

  return (
    <MobileFrame>
      {/* Header */}
      <div className="bg-card p-4 border-b border-border shadow-sm z-10">
        <div className="font-bold font-aleo text-base">Media Gallery</div>
      </div>

      {/* WiFi toggle */}
      <div className="flex items-center gap-2 px-4 py-2 bg-card border-b border-border">
        <Wifi className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[10px] text-foreground font-medium flex-1">Download on WiFi only</span>
        <div className="w-8 h-4 rounded-full bg-primary relative">
          <div className="absolute right-0.5 top-0.5 w-3 h-3 rounded-full bg-white shadow-sm" />
        </div>
      </div>

      {/* Section toggle */}
      <div className="flex mx-3 mt-2.5 bg-muted rounded-xl p-1">
        <button
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold transition-colors ${
            section === "patient"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground"
          }`}
          onClick={() => setSection("patient")}
        >
          <Camera className="w-3.5 h-3.5" />
          Patient Media
        </button>
        <button
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold transition-colors ${
            section === "telegram"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground"
          }`}
          onClick={() => setSection("telegram")}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Telegram Media
        </button>
      </div>

      {/* Photo grid */}
      <div className="flex-1 overflow-hidden p-3">
        <div className="grid grid-cols-3 gap-2">
          {gridItems.map((item, i) => (
            <div
              key={i}
              className={`aspect-square rounded-xl ${item.color} flex items-center justify-center relative overflow-hidden`}
            >
              {item.type === "video" && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-sm">
                    <Play className="w-4 h-4 text-foreground ml-0.5" fill="currentColor" />
                  </div>
                </div>
              )}
              {item.type === "pdf" && (
                <div className="flex flex-col items-center gap-1">
                  <FileText className="w-6 h-6 text-muted-foreground" />
                  <span className="text-[8px] text-muted-foreground font-medium">{item.label}</span>
                </div>
              )}
              {item.type === "photo" && (
                <span className="text-[9px] text-muted-foreground/60 font-medium">{item.label}</span>
              )}
              {/* Cached indicator */}
              {i < 6 && (
                <div className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-green-500/80 flex items-center justify-center">
                  <svg className="w-2 h-2 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Upload FAB */}
      <div className="absolute bottom-6 right-5 w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg z-20">
        <Camera className="w-6 h-6 text-primary-foreground" />
      </div>
    </MobileFrame>
  );
}
