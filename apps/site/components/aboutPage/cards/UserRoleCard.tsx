"use client";

import React from "react";
import { Card } from "@/components/ui/card";

interface UserRoleCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  animationComponent: React.ReactNode;
  className?: string;
  headerClassName?: string;
}

/**
 * User Role Card Component
 * Displays a card for each user role with icon, animation, and description
 */
export function UserRoleCard({
  icon,
  title,
  description,
  animationComponent,
  className = "",
  headerClassName = "",
}: UserRoleCardProps) {
  return (
    <Card className={`p-0 bg-card/80 backdrop-blur-md flex flex-col min-h-[500px] overflow-hidden relative rounded-2xl border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-500 group ${className}`}>
      {/* Top gradient bar */}
      <div className="h-1 w-full bg-gradient-to-r from-primary/40 via-primary to-primary/40 opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Header with Icon */}
      <div className="flex-shrink-0 flex items-center justify-center p-6 min-h-[80px] relative z-10">
        <div
          className={`flex justify-center items-center w-12 h-12 rounded-xl bg-gradient-to-br from-background to-muted text-primary border border-border/50 shadow-inner group-hover:scale-110 transition-transform duration-500 ${headerClassName}`}
        >
          {icon}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-2xl font-aleo font-bold text-center text-foreground relative z-10 drop-shadow-sm">
        {title}
      </h3>

      {/* Animation Section */}
      <div className="h-[200px] relative w-full flex-shrink-0 mt-4 bg-gradient-to-b from-transparent to-muted/10">
        {animationComponent}
      </div>

      {/* Description */}
      <div className="flex-shrink-0 p-8 relative z-10 flex items-start bg-gradient-to-t from-card via-card to-transparent">
        <p className="text-base text-muted-foreground font-figtree leading-relaxed break-words hyphens-auto w-full text-center group-hover:text-foreground transition-colors duration-300">{description}</p>
      </div>
    </Card>
  );
}
