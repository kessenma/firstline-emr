// What the clinician is told after trying to send a prescription.
//
// The wording lives here rather than at each call site because web and mobile
// both report the same outcomes, and previously drifted: web's toast said
// "TelegramMessage Copied … the SMS message has been copied", describing a
// clipboard write, for a button labelled like a send. Owning the copy centrally
// means a change to what the button does can't leave one platform describing
// the old behaviour.
//
// The toast *mechanism* stays platform-specific — web's `setToast` and mobile's
// `toast` are separate implementations — but they take the same shape, so these
// descriptors drop straight into either.

import { MESSAGING_CHANNELS, type MessagingChannel } from '../messaging/channels';

/** The variants both platforms' toast components implement. */
export type PrescriptionToastVariant = 'success' | 'destructive';

export interface PrescriptionToast {
  title: string;
  description: string;
  variant: PrescriptionToastVariant;
}

/**
 * Why a send failed, in the vocabulary the server returns.
 *
 * `no-channel` and `no-thread` are deliberately distinct: the first means the
 * patient has no messaging address at all, the second that nobody has ever
 * opened a conversation with them. They need different things done about them.
 */
export type PrescriptionSendFailureReason =
  | 'offline'
  | 'no-channel'
  | 'no-thread'
  | 'missing-link'
  | 'unknown';

/** One line, for an inline warning under the button. */
export function describePrescriptionSendFailure(
  reason: PrescriptionSendFailureReason | null | undefined,
): string | null {
  switch (reason) {
    case 'offline':
      return "You're offline — reconnect to send this prescription.";
    case 'no-channel':
      return `${MESSAGING_CHANNELS.telegram.unreachableLabel}, so the link cannot be sent.`;
    case 'no-thread':
      return 'No conversation exists with this patient yet, so there is nowhere to send the link.';
    case 'missing-link':
      return 'This prescription has no patient link. Re-create it, then send again.';
    case 'unknown':
      return 'Could not send the prescription. Please try again.';
    default:
      return null;
  }
}

export type PrescriptionSendOutcome =
  | { ok: true; channel: MessagingChannel }
  | { ok: false; reason: PrescriptionSendFailureReason };

/**
 * The toast shown after a send attempt.
 *
 * The success description names both messages on purpose: the clinician needs
 * to know the access code went out too, because a patient who only receives the
 * link will call the clinic rather than the pharmacy.
 */
export function prescriptionSendToast(
  outcome: PrescriptionSendOutcome,
): PrescriptionToast {
  if (outcome.ok) {
    return {
      title: MESSAGING_CHANNELS[outcome.channel].sentLabel,
      description:
        'The patient now has the prescription link and their access code.',
      variant: 'success',
    };
  }

  return {
    title: 'Could not send',
    description:
      describePrescriptionSendFailure(outcome.reason) ??
      'Could not send the prescription. Please try again.',
    variant: 'destructive',
  };
}

/** The clipboard path, which is a different promise from a send. */
export function prescriptionLinkCopiedToast(): PrescriptionToast {
  return {
    title: 'Link copied',
    description: 'The prescription link has been copied to your clipboard.',
    variant: 'success',
  };
}

export function prescriptionMissingLinkToast(): PrescriptionToast {
  return {
    title: 'No prescription link',
    description:
      'This prescription has no patient link. Re-create the prescription, then share it again.',
    variant: 'destructive',
  };
}

// ---------------------------------------------------------------------------
// Cancellation
// ---------------------------------------------------------------------------

export type PrescriptionCancelFailureReason =
  | 'offline'
  | 'reason-required'
  | 'already-cancelled'
  | 'not-found'
  | 'unknown';

export function describePrescriptionCancelFailure(
  reason: PrescriptionCancelFailureReason | null | undefined,
): string | null {
  switch (reason) {
    case 'offline':
      return "You're offline — reconnect to cancel this prescription.";
    case 'reason-required':
      return 'A reason is required before this prescription can be cancelled.';
    case 'already-cancelled':
      // Terminal by design, so a second attempt is a no-op rather than an
      // error the user should try to fix.
      return 'This prescription has already been cancelled.';
    case 'not-found':
      return 'This prescription could not be found.';
    case 'unknown':
      return 'Could not cancel the prescription. Please try again.';
    default:
      return null;
  }
}

export type PrescriptionCancelOutcome =
  | { ok: true; notifiedPatient: boolean }
  | { ok: false; reason: PrescriptionCancelFailureReason };

/**
 * The toast after a cancellation.
 *
 * `notifiedPatient` is false when the patient cancelled it themselves — telling
 * them they have been told would be nonsense.
 */
export function prescriptionCancelToast(
  outcome: PrescriptionCancelOutcome,
): PrescriptionToast {
  if (outcome.ok) {
    return {
      title: 'Prescription cancelled',
      description: outcome.notifiedPatient
        ? 'The patient has been told, and the care team has been notified.'
        : 'The care team has been notified.',
      variant: 'success',
    };
  }

  return {
    title: 'Could not cancel',
    description:
      describePrescriptionCancelFailure(outcome.reason) ??
      'Could not cancel the prescription. Please try again.',
    variant: 'destructive',
  };
}
