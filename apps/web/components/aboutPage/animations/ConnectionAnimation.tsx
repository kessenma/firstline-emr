"use client";

import React from 'react';
import { AnimationProps } from '../types';

/**
 * Connection Animation Component
 * Displays animated balls moving horizontally and transforming colors
 * Represents the connection between patient intake and doctor assignment
 */
export function ConnectionAnimation({ config, className = '' }: AnimationProps) {
  const enabled = config?.enabled ?? true;
  const playOnce = config?.playOnce ?? false;

  if (!enabled) return null;

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {/* First balls - move horizontally, change from triage to doctor color */}
      <div
        className={`absolute w-5 h-5 rounded-full bg-teal-500 motion-reduce:opacity-50 motion-reduce:animate-none ${
          playOnce
            ? 'animate-[connection-move-first_14s_linear_1_forwards]'
            : 'animate-[connection-move-first_14s_linear_infinite]'
        }`}
        style={{
          '--y-offset': '26%',
        } as React.CSSProperties}
      ></div>
      <div
        className={`absolute w-5 h-5 rounded-full bg-teal-500 motion-reduce:opacity-50 motion-reduce:animate-none ${
          playOnce
            ? 'animate-[connection-move-first_9s_linear_1_forwards]'
            : 'animate-[connection-move-first_9s_linear_infinite]'
        }`}
        style={{
          '--y-offset': '42%',
        } as React.CSSProperties}
      ></div>
      <div
        className={`absolute w-5 h-5 rounded-full bg-teal-500 motion-reduce:opacity-50 motion-reduce:animate-none ${
          playOnce
            ? 'animate-[connection-move-first_17s_linear_1_forwards]'
            : 'animate-[connection-move-first_17s_linear_infinite]'
        }`}
        style={{
          '--y-offset': '58%',
        } as React.CSSProperties}
      ></div>
      <div
        className={`absolute w-5 h-5 rounded-full bg-teal-500 motion-reduce:opacity-50 motion-reduce:animate-none ${
          playOnce
            ? 'animate-[connection-move-first_12s_linear_1_forwards]'
            : 'animate-[connection-move-first_12s_linear_infinite]'
        }`}
        style={{
          '--y-offset': '72%',
        } as React.CSSProperties}
      ></div>
      <div
        className={`absolute w-5 h-5 rounded-full bg-teal-500 motion-reduce:opacity-50 motion-reduce:animate-none ${
          playOnce
            ? 'animate-[connection-move-first_11.5s_linear_1_forwards]'
            : 'animate-[connection-move-first_11.5s_linear_infinite]'
        }`}
        style={{
          '--y-offset': '84%',
        } as React.CSSProperties}
      ></div>

      {/* Regular balls - meet in center, change from surgeon to coordinator color */}
      <div
        className={`absolute w-5 h-5 rounded-full motion-reduce:opacity-50 motion-reduce:animate-none ${
          playOnce
            ? 'animate-[connection-meet-move_14s_ease-in-out_1_forwards]'
            : 'animate-[connection-meet-move_14s_ease-in-out_infinite]'
        }`}
        style={{
          '--initial-top': '26%',
          '--final-top': '50%'
        } as React.CSSProperties}
      ></div>
      <div
        className={`absolute w-5 h-5 rounded-full motion-reduce:opacity-50 motion-reduce:animate-none ${
          playOnce
            ? 'animate-[connection-meet-move_9s_ease-in-out_1_forwards]'
            : 'animate-[connection-meet-move_9s_ease-in-out_infinite]'
        }`}
        style={{
          '--initial-top': '42%',
          '--final-top': '50%'
        } as React.CSSProperties}
      ></div>
      <div
        className={`absolute w-5 h-5 rounded-full motion-reduce:opacity-50 motion-reduce:animate-none ${
          playOnce
            ? 'animate-[connection-meet-move_17s_ease-in-out_1_forwards]'
            : 'animate-[connection-meet-move_17s_ease-in-out_infinite]'
        }`}
        style={{
          '--initial-top': '58%',
          '--final-top': '50%'
        } as React.CSSProperties}
      ></div>
      <div
        className={`absolute w-5 h-5 rounded-full motion-reduce:opacity-50 motion-reduce:animate-none ${
          playOnce
            ? 'animate-[connection-meet-move_12s_ease-in-out_1_forwards]'
            : 'animate-[connection-meet-move_12s_ease-in-out_infinite]'
        }`}
        style={{
          '--initial-top': '72%',
          '--final-top': '50%'
        } as React.CSSProperties}
      ></div>
      <div
        className={`absolute w-5 h-5 rounded-full motion-reduce:opacity-50 motion-reduce:animate-none ${
          playOnce
            ? 'animate-[connection-meet-move_11.5s_ease-in-out_1_forwards]'
            : 'animate-[connection-meet-move_11.5s_ease-in-out_infinite]'
        }`}
        style={{
          '--initial-top': '84%',
          '--final-top': '50%'
        } as React.CSSProperties}
      ></div>
    </div>
  );
}
