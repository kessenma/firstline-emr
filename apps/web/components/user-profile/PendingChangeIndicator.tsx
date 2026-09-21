// components/user-profile/PendingChangeIndicator.tsx
'use client';

import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
/*
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
*/

interface PendingChangeIndicatorProps {
  requestedValue: any;
  requestedAt?: string;
  fieldDisplayName?: string;
  className?: string;
  showBadge?: boolean;
}

const formatValue = (value: any): string => {
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }
  return String(value || 'None');
};

export function PendingChangeIndicator({
  requestedValue,
  requestedAt,
  fieldDisplayName = 'field',
  className = '',
  showBadge = true,
}: PendingChangeIndicatorProps) {
  const formattedDate = requestedAt
    ? new Date(requestedAt).toLocaleString()
    : 'recently';

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {/* Tooltip removed due to missing component */}
      <div title={`Change Pending Admin Approval\nRequested: ${formatValue(requestedValue)}\nRequested at: ${formattedDate}`}>
            <div className="inline-flex items-center gap-1">
              <ShieldAlert className="w-4 h-4 text-amber-500 animate-pulse" />
              {showBadge && (
                <Badge
                  variant="outline"
                  className="bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300"
                >
                  Pending Approval
                </Badge>
              )}
            </div>
      </div>
    </div>
  );
}

// Inline version for use within form labels
export function PendingChangeIndicatorInline({
  requestedValue,
  className = '',
}: {
  requestedValue: any;
  className?: string;
}) {
  return (
    <div title={`Change Pending Admin Approval\nRequested: ${formatValue(requestedValue)}`}>
        <ShieldAlert className={`w-4 h-4 text-amber-500 animate-pulse cursor-help ${className}`} />
    </div>
  );
}
