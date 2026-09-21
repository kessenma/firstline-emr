// The Telegram message a clinician sends to invite a patient into a consult.
//
// Localized for the same reason the patient call screens are (see
// video-call-patient-translations.ts): the recipient is whoever the clinic is
// treating, so English is never a safe default.
//
// The link is the LAST line and nothing follows it. The bot's "-- Dr. Name"
// signature is posted as a *separate* Telegram message
// (`signatureMode: 'separate'` on send-text), because a signature glued to the
// end of this one turns "tap the link" into "copy the message, then edit the
// signature out of it".

const inviteBodies = {
  english:
    'Your doctor is ready for a video call. Tap the link below to join:',
  arabic: 'طبيبك جاهز لمكالمة فيديو. اضغط على الرابط أدناه للانضمام:',
  farsi: 'پزشک شما برای تماس تصویری آماده است. برای پیوستن روی پیوند زیر بزنید:',
  pashto:
    'ستاسو ډاکټر د ویډیو زنګ لپاره چمتو دی. د یوځای کیدو لپاره لاندې لینک کېکاږئ:',
  turkish:
    'Doktorunuz görüntülü görüşme için hazır. Katılmak için aşağıdaki bağlantıya dokunun:',
  urdu: 'آپ کے ڈاکٹر ویڈیو کال کے لیے تیار ہیں۔ شامل ہونے کے لیے نیچے دیے گئے لنک پر ٹیپ کریں:',
  spanish:
    'Su médico está listo para una videollamada. Toque el enlace de abajo para unirse:',
  french:
    'Votre médecin est prêt pour un appel vidéo. Appuyez sur le lien ci-dessous pour rejoindre :',
} as const;

/**
 * Invite body + join link, in the patient's recorded language.
 *
 * `language` is the full English language name as stored on the patient row
 * ("Arabic", "Farsi", …); anything unrecognized falls back to English rather
 * than rendering `undefined`.
 */
export function buildInviteMessage(
  inviteUrl: string,
  language?: string | null,
): string {
  const key = (language ?? '').trim().toLowerCase();
  const body =
    inviteBodies[key as keyof typeof inviteBodies] ?? inviteBodies.english;
  return `${body}\n${inviteUrl}`;
}
