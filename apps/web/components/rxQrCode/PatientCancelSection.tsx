// apps/web/components/rxQrCode/PatientCancelSection.tsx
//
// A patient withdrawing their own prescription.
//
// They pick from a short list rather than typing: they are on a phone, often
// in a second language, and free text in eight scripts is not something the
// care team can act on consistently. The stored value is a language-neutral
// code, so staff read "Already filled it elsewhere" whatever the patient tapped.
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Ban, Loader2 } from 'lucide-react';
import {
  getPatientCancellationReasons,
  type PatientCancellationReasonCode,
  type PatientRxTranslationKey,
} from '@fajr/shared/medications';
import type { Languages } from '@fajr/shared/constants/languages';

interface PatientCancelSectionProps {
  t: (key: PatientRxTranslationKey) => string;
  language: Languages;
  submitting: boolean;
  error: string | null;
  onCancel: (
    reasonCode: PatientCancellationReasonCode,
    note: string,
  ) => void;
}

export const PatientCancelSection: React.FC<PatientCancelSectionProps> = ({
  t,
  language,
  submitting,
  error,
  onCancel,
}) => {
  const [open, setOpen] = useState(false);
  const [reasonCode, setReasonCode] =
    useState<PatientCancellationReasonCode | null>(null);
  const [note, setNote] = useState('');

  const reasons = getPatientCancellationReasons(language);

  // Collapsed by default. This is a destructive action on a page whose main job
  // is showing a prescription — it should take a deliberate tap to reach.
  if (!open) {
    return (
      <div className="border-t border-border pt-4 text-center">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-destructive"
        >
          <Ban className="h-4 w-4" />
          {t('cancelPrescription')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
      <div>
        <h4 className="flex items-center gap-2 font-semibold text-destructive">
          <Ban className="h-4 w-4 shrink-0" />
          {t('cancelPrescription')}
        </h4>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('cancelPrescriptionHelp')}
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">
          {t('cancelReasonQuestion')}
        </legend>
        {reasons.map((reason) => (
          <label
            key={reason.code}
            className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-background p-3 text-sm"
          >
            <input
              type="radio"
              name="cancel-reason"
              value={reason.code}
              checked={reasonCode === reason.code}
              onChange={() => setReasonCode(reason.code)}
              className="h-4 w-4 shrink-0"
            />
            <span>{reason.label}</span>
          </label>
        ))}
      </fieldset>

      <label className="block space-y-2">
        <span className="text-sm font-medium">{t('cancelOptionalNote')}</span>
        <textarea
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
        />
      </label>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => setOpen(false)}
          disabled={submitting}
        >
          {t('cancelKeep')}
        </Button>
        <Button
          variant="destructive"
          className="flex-1"
          // A reason is not required of a patient, but a choice is: the list
          // includes "Another reason", so there is always something to pick.
          disabled={!reasonCode || submitting}
          onClick={() => reasonCode && onCancel(reasonCode, note.trim())}
        >
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('cancelConfirm')}
        </Button>
      </div>
    </div>
  );
};

export default PatientCancelSection;
