"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

interface FeatureItemProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

/**
 * Feature Item Component
 * Displays a feature with icon, title, and description
 */
export function FeatureItem({
  icon: Icon,
  title,
  description,
}: FeatureItemProps) {
  return (
    <div className="flex items-start space-x-4 p-4 rounded-2xl hover:bg-muted/50 transition-colors duration-300 group cursor-default">
      <div className="flex-shrink-0 p-3 bg-gradient-to-br from-background to-muted rounded-xl shadow-inner border border-border/50 group-hover:scale-110 transition-transform duration-300">
        <Icon className="w-6 h-6 text-primary drop-shadow-sm" />
      </div>
      <div className="pt-1">
        <h3 className="text-lg font-bold text-foreground font-aleo group-hover:text-primary transition-colors duration-300">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground font-figtree leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
