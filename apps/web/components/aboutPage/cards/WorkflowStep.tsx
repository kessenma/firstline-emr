"use client";

import React from 'react';

interface WorkflowStepProps {
  stepNumber: number;
  title: string;
  description: string;
}

/**
 * Workflow Step Component
 * Displays a numbered step in the patient care workflow process
 */
export function WorkflowStep({ stepNumber, title, description }: WorkflowStepProps) {
  return (
    <div className="flex items-start space-x-6">
      <div className="shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
        {stepNumber}
      </div>
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
