"use client";

import React from "react";

interface MobileFrameProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Shared phone mockup frame used across all about page feature visuals.
 * Provides a consistent device bezel with fixed dimensions.
 */
export function MobileFrame({ children, className = "" }: MobileFrameProps) {
  return (
    <div
      className={`w-[360px] h-[550px] mx-auto bg-background rounded-[2.5rem] border-[12px] border-muted shadow-2xl overflow-hidden flex flex-col relative ${className}`}
    >
      {children}
    </div>
  );
}
