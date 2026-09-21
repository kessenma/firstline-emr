// components/user-profile/AdminApprovalWarningModal.tsx
'use client';

import React from 'react';
import { ShieldAlert } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface AdminApprovalWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  fieldName: string;
  currentValue: any;
  requestedValue: any;
  isLoading?: boolean;
}

const fieldDisplayNames: Record<string, string> = {
  doctorSpecialty: 'Doctor Specialty',
  accountType: 'Account Type',
};

const formatValue = (value: any): string => {
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }
  return String(value || 'None');
};

export function AdminApprovalWarningModal({
  isOpen,
  onClose,
  onConfirm,
  fieldName,
  currentValue,
  requestedValue,
  isLoading = false,
}: AdminApprovalWarningModalProps) {
  const displayName = fieldDisplayNames[fieldName] || fieldName;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-6 h-6 text-amber-500" />
            <DialogTitle className="text-xl">Admin Approval Required</DialogTitle>
          </div>
          <DialogDescription className="text-base pt-2">
            Changes to <span className="font-semibold">{displayName}</span> require
            administrator approval. Your request will be reviewed by an admin before
            taking effect.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="bg-muted rounded-lg p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Current Value:
              </p>
              <p className="text-sm font-semibold">{formatValue(currentValue)}</p>
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Requested Value:
              </p>
              <p className="text-sm font-semibold text-primary">
                {formatValue(requestedValue)}
              </p>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-3">
            <p className="text-sm text-amber-900 dark:text-amber-200">
              <strong>Note:</strong> You will continue to see your current value until
              an administrator approves your request. You'll be able to track the status
              of your request in your profile.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
