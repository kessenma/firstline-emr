"use client";

import React from "react";
import { AnimationProps } from "../types";

/**
 * Doctor Role Animation Component
 * Displays animated heartrate monitor visualization
 */
export function DoctorRoleAnimation({
  config,
  className = "",
}: AnimationProps) {
  const enabled = config?.enabled ?? true;

  if (!enabled) return null;

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div className="absolute w-full h-full top-0 left-0 z-10">
        <svg
          viewBox="0 9 498.778 54.805"
          className="w-full h-full text-primary"
        >
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeMiterlimit="10"
            points="0 45.486 64.133 45.486 74.259 33.324 84.385 45.486 96.2 45.486 104.637 55.622 119.825 9 133.327 63.729 140.079 45.486 162.018 45.486 172.146 40.419 183.958 45.486 249.778 45.486"
          />
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeMiterlimit="10"
            points="249 45.562 313.133 45.562 323.259 33.4 333.385 45.562 345.2 45.562 353.637 55.698 368.825 9.076 382.327 63.805 389.079 45.562 411.018 45.562 421.146 40.495 432.958 45.562 498.778 45.562"
          />
        </svg>
        <div className="absolute w-full h-full top-0 right-0 animate-heart-rate-in bg-card"></div>
        <div className="absolute w-[120%] h-full top-0 -right-[120%] animate-heart-rate-out bg-linear-to-r from-card via-card/80 to-transparent"></div>
      </div>
    </div>
  );
}
