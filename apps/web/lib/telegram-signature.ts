// apps/web/lib/telegram-signature.ts
//
// Where the "-- Name" signature goes on an outbound patient message.
//
// Deliberately its own module with no imports: this is the piece with the
// non-obvious truth table, and keeping it free of database and network
// dependencies is what makes it checkable on its own.

export type SignatureMode = "inline" | "separate";

export interface SignaturePlan {
  /** The primary message body, signed or not. */
  primaryText: string;
  /** Posted as its own message after the body, or null. */
  followUpSignature: string | null;
}

/**
 * Truth table:
 *
 *   omitSignature: true       → no signature anywhere (wins over signatureMode)
 *   signatureMode: 'separate' → body verbatim, signature as its own message
 *   signatureMode: 'inline'   → body + "\n\n-- Name"   (default)
 *
 * 'separate' exists for messages whose body must stay tappable: a URL with
 * "-- Dr. Name" glued to the end turns "tap the link" into "copy the message,
 * then edit the signature out of it".
 */
export function resolveMessageSignature(input: {
  text: string;
  senderName: string;
  omitSignature?: boolean;
  signatureMode?: SignatureMode;
}): SignaturePlan {
  const { text, senderName, omitSignature = false, signatureMode = "inline" } = input;
  const signature = `-- ${senderName}`;
  const signAsFollowUp = !omitSignature && signatureMode === "separate";

  return {
    primaryText: omitSignature || signAsFollowUp ? text : `${text}\n\n${signature}`,
    followUpSignature: signAsFollowUp ? signature : null,
  };
}
