"use client";

import React from "react";
import { AnimationProps } from "../types";

/**
 * Patient Role Animation Component
 * Displays animated balls moving horizontally to represent patient flow
 */
export function PatientRoleAnimation({
  config,
  className = "",
}: AnimationProps) {
  const enabled = config?.enabled ?? true;

  if (!enabled) return null;

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Desktop: Horizontal animation */}
      <div className="hidden md:block">
        <div
          className="absolute w-5 h-5 rounded-full bg-teal-500 animate-[patient-move-horizontal_14s_infinite_linear]"
          style={{ top: '26%' }}
        ></div>
        <div
          className="absolute w-5 h-5 rounded-full bg-teal-500 animate-[patient-move-horizontal_9s_infinite_linear]"
          style={{ top: '42%' }}
        ></div>
        <div
          className="absolute w-5 h-5 rounded-full bg-teal-500 animate-[patient-move-horizontal_17s_infinite_linear]"
          style={{ top: '58%' }}
        ></div>
        <div
          className="absolute w-5 h-5 rounded-full bg-teal-500 animate-[patient-move-horizontal_12s_infinite_linear]"
          style={{ top: '72%' }}
        ></div>
        <div
          className="absolute w-5 h-5 rounded-full bg-teal-500 animate-[patient-move-horizontal_11.5s_infinite_linear]"
          style={{ top: '84%' }}
        ></div>
      </div>

      {/* Mobile: Vertical animation */}
      <div className="block md:hidden">
        <div
          className="absolute w-5 h-5 rounded-full bg-teal-500 animate-[patient-move-vertical_14s_infinite_linear]"
          style={{ left: '20%' }}
        ></div>
        <div
          className="absolute w-5 h-5 rounded-full bg-teal-500 animate-[patient-move-vertical_9s_infinite_linear]"
          style={{ left: '35%' }}
        ></div>
        <div
          className="absolute w-5 h-5 rounded-full bg-teal-500 animate-[patient-move-vertical_17s_infinite_linear]"
          style={{ left: '50%' }}
        ></div>
        <div
          className="absolute w-5 h-5 rounded-full bg-teal-500 animate-[patient-move-vertical_12s_infinite_linear]"
          style={{ left: '65%' }}
        ></div>
        <div
          className="absolute w-5 h-5 rounded-full bg-teal-500 animate-[patient-move-vertical_11.5s_infinite_linear]"
          style={{ left: '80%' }}
        ></div>
      </div>
    </div>
  );
}
