"use client";

import React from "react";
import { AnimationProps } from "../types";

/**
 * Triage Role Animation Component
 * Displays animated balls that meet in the center, representing triage coordination
 */
export function TriageRoleAnimation({
  config,
  className = "",
}: AnimationProps) {
  const enabled = config?.enabled ?? true;

  if (!enabled) return null;

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Desktop: Horizontal meeting animation */}
      <div className="hidden md:block">
        <div
          className="absolute w-5 h-5 rounded-full animate-[triage-meet-horizontal_14s_infinite_ease-in-out]"
          style={{
            '--initial-top': '26%',
            '--final-top': '50%'
          } as React.CSSProperties}
        ></div>
        <div
          className="absolute w-5 h-5 rounded-full animate-[triage-meet-horizontal_9s_infinite_ease-in-out]"
          style={{
            '--initial-top': '42%',
            '--final-top': '50%'
          } as React.CSSProperties}
        ></div>
        <div
          className="absolute w-5 h-5 rounded-full animate-[triage-meet-horizontal_17s_infinite_ease-in-out]"
          style={{
            '--initial-top': '58%',
            '--final-top': '50%'
          } as React.CSSProperties}
        ></div>
        <div
          className="absolute w-5 h-5 rounded-full animate-[triage-meet-horizontal_12s_infinite_ease-in-out]"
          style={{
            '--initial-top': '72%',
            '--final-top': '50%'
          } as React.CSSProperties}
        ></div>
        <div
          className="absolute w-5 h-5 rounded-full animate-[triage-meet-horizontal_11.5s_infinite_ease-in-out]"
          style={{
            '--initial-top': '84%',
            '--final-top': '50%'
          } as React.CSSProperties}
        ></div>
      </div>

      {/* Mobile: Vertical meeting animation */}
      <div className="block md:hidden">
        <div
          className="absolute w-5 h-5 rounded-full animate-[triage-meet-vertical_14s_infinite_ease-in-out]"
          style={{
            '--initial-left': '20%',
            '--final-left': '50%'
          } as React.CSSProperties}
        ></div>
        <div
          className="absolute w-5 h-5 rounded-full animate-[triage-meet-vertical_9s_infinite_ease-in-out]"
          style={{
            '--initial-left': '35%',
            '--final-left': '50%'
          } as React.CSSProperties}
        ></div>
        <div
          className="absolute w-5 h-5 rounded-full animate-[triage-meet-vertical_17s_infinite_ease-in-out]"
          style={{
            '--initial-left': '50%',
            '--final-left': '50%'
          } as React.CSSProperties}
        ></div>
        <div
          className="absolute w-5 h-5 rounded-full animate-[triage-meet-vertical_12s_infinite_ease-in-out]"
          style={{
            '--initial-left': '65%',
            '--final-left': '50%'
          } as React.CSSProperties}
        ></div>
        <div
          className="absolute w-5 h-5 rounded-full animate-[triage-meet-vertical_11.5s_infinite_ease-in-out]"
          style={{
            '--initial-left': '80%',
            '--final-left': '50%'
          } as React.CSSProperties}
        ></div>
      </div>
    </div>
  );
}
