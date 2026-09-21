// The messages a clinician sends a patient to hand over a prescription.
//
// Modelled on video-call/invite-message.ts, and subject to the same two rules
// that file exists to enforce:
//
//   1. The link is the LAST line of its message and nothing follows it. The
//      bot's "-- Dr. Name" signature is posted as a *separate* Telegram message
//      (`signatureMode: 'separate'` on send-text), because a signature glued to
//      the end turns "tap the link" into "copy the message, then edit the
//      signature out of it".
//
//   2. Localized, because the recipient is whoever the clinic is treating, so
//      English is never a safe default.
//
// A third rule is specific to prescriptions: the access code is sent as a
// message containing *nothing but the digits*, so a long-press copies it clean.
// That is why the explanation of the code rides in message 1, above the link,
// rather than next to the code itself.

import { normalizeLanguage, Languages } from '../constants/languages';
import type { RxOrder } from './types';
import { getPrescriptionLink } from './utils';

/**
 * Message 1, minus the link. Every line is localized.
 *
 * `intro` warns about the lockout before the patient can trip it — the first
 * they hear of the throttle should not be a wall.
 */
const prescriptionBodies: Record<Languages, { greeting: (dr: string) => string; intro: string }> = {
  [Languages.ENGLISH]: {
    greeting: (dr) => `Hello, this is Dr. ${dr}.`,
    intro:
      'Your prescription is ready. Your access code is in the next message — please keep it private. Entering it wrong many times will lock the link for a while.\nOpen the link below and show it at your pharmacy:',
  },
  [Languages.ARABIC]: {
    greeting: (dr) => `مرحباً، أنا الدكتور ${dr}.`,
    intro:
      'وصفتك الطبية جاهزة. رمز الدخول الخاص بك في الرسالة التالية — يرجى الحفاظ على سريته. إدخاله بشكل خاطئ عدة مرات سيؤدي إلى قفل الرابط لفترة.\nافتح الرابط أدناه وأظهره في الصيدلية:',
  },
  [Languages.FARSI]: {
    greeting: (dr) => `سلام، من دکتر ${dr} هستم.`,
    intro:
      'نسخه شما آماده است. کد دسترسی شما در پیام بعدی است — لطفاً آن را محرمانه نگه دارید. وارد کردن اشتباه آن چندین بار باعث قفل شدن پیوند برای مدتی می‌شود.\nپیوند زیر را باز کنید و آن را در داروخانه نشان دهید:',
  },
  [Languages.PASHTO]: {
    greeting: (dr) => `سلام، زه ډاکټر ${dr} یم.`,
    intro:
      'ستاسو نسخه چمتو ده. ستاسو د لاسرسي کوډ په راتلونکي پیغام کې دی — مهرباني وکړئ پټ یې وساتئ. څو ځله ناسم داخلول به لینک د یو څه وخت لپاره بند کړي.\nلاندې لینک پرانیزئ او په درملتون کې یې وښیئ:',
  },
  [Languages.TURKISH]: {
    greeting: (dr) => `Merhaba, ben Dr. ${dr}.`,
    intro:
      'Reçeteniz hazır. Erişim kodunuz bir sonraki mesajda — lütfen gizli tutun. Birçok kez yanlış girmek bağlantıyı bir süreliğine kilitler.\nAşağıdaki bağlantıyı açın ve eczanenizde gösterin:',
  },
  [Languages.URDU]: {
    greeting: (dr) => `السلام علیکم، میں ڈاکٹر ${dr} ہوں۔`,
    intro:
      'آپ کا نسخہ تیار ہے۔ آپ کا رسائی کوڈ اگلے پیغام میں ہے — براہ کرم اسے خفیہ رکھیں۔ اسے کئی بار غلط درج کرنے سے لنک کچھ دیر کے لیے بند ہو جائے گا۔\nنیچے دیا گیا لنک کھولیں اور اسے اپنی فارمیسی پر دکھائیں:',
  },
  [Languages.SPANISH]: {
    greeting: (dr) => `Hola, soy el Dr. ${dr}.`,
    intro:
      'Su receta está lista. Su código de acceso está en el siguiente mensaje: manténgalo privado. Introducirlo mal muchas veces bloqueará el enlace durante un tiempo.\nAbra el enlace de abajo y muéstrelo en su farmacia:',
  },
  [Languages.FRENCH]: {
    greeting: (dr) => `Bonjour, je suis le Dr ${dr}.`,
    intro:
      "Votre ordonnance est prête. Votre code d'accès se trouve dans le message suivant — veuillez le garder confidentiel. Le saisir plusieurs fois de façon incorrecte verrouillera le lien pendant un moment.\nOuvrez le lien ci-dessous et présentez-le à votre pharmacie :",
  },
};

export type PrescriptionMessageResult =
  | { ok: true; message: string; link: string }
  | { ok: false; reason: 'missing-link'; message: null; link: null };

export interface PrescriptionMessageOptions {
  rxOrder: Pick<RxOrder, 'patientRxUrl'>;
  /** Patient's recorded language — the full English name, as stored on the row. */
  language?: string | null;
  /**
   * Doctor's display name, without the "Dr." prefix, for the greeting.
   *
   * Omit when sending over a channel that appends its own signature: send-text
   * with `signatureMode: 'separate'` posts "-- Name" as its own message, and a
   * greeting here would name the doctor twice. Pass it for the clipboard and
   * OS-share paths, which have no signature of their own.
   */
  doctorName?: string | null;
  /**
   * Appended to the link as `?lang=`, so the page opens in the same language
   * the message is written in. Defaults to on.
   */
  includeLanguageParam?: boolean;
}

/** Adds `?lang=` to the stored link without disturbing an existing query. */
function withLanguageParam(link: string, language: Languages): string {
  const separator = link.includes('?') ? '&' : '?';
  return `${link}${separator}lang=${encodeURIComponent(language)}`;
}

/**
 * Builds the prescription hand-off message, in the patient's language.
 *
 * Returns `ok: false` instead of a string when the link is missing, so a broken
 * order can never be sent to a patient as the word "undefined" — the failure
 * that shipped before this helper existed. Callers must surface the failure.
 */
export function buildPrescriptionMessage({
  rxOrder,
  language,
  doctorName,
  includeLanguageParam = true,
}: PrescriptionMessageOptions): PrescriptionMessageResult {
  const rawLink = getPrescriptionLink(rxOrder);
  if (!rawLink) {
    return { ok: false, reason: 'missing-link', message: null, link: null };
  }

  const lang = normalizeLanguage(language);
  const body = prescriptionBodies[lang];
  const link = includeLanguageParam ? withLanguageParam(rawLink, lang) : rawLink;

  const name = doctorName?.trim();
  const lines = [
    ...(name ? [body.greeting(name)] : []),
    body.intro,
    // Last. Nothing may follow it.
    link,
  ];

  return { ok: true, message: lines.join('\n'), link };
}

/**
 * The Telegram request body, built once and posted identically by web and
 * mobile so the two cannot drift.
 *
 * `signatureMode: 'separate'` keeps the link message verbatim; `followUps`
 * carries the bare access code, which the route sends before the signature.
 */
export interface PrescriptionTelegramPayload {
  text: string;
  signatureMode: 'separate';
  followUps: string[];
}

export type PrescriptionTelegramPayloadResult =
  | { ok: true; payload: PrescriptionTelegramPayload; link: string }
  | { ok: false; reason: 'missing-link' };

export function buildPrescriptionTelegramPayload({
  rxOrder,
  language,
  accessCode,
}: {
  rxOrder: Pick<RxOrder, 'patientRxUrl'>;
  language?: string | null;
  /** Omit only if the order is not gated; normally always supplied. */
  accessCode?: string | null;
}): PrescriptionTelegramPayloadResult {
  // No doctorName: the signature message carries the clinician's identity, and
  // it comes from the server's users row rather than from client-held state.
  const built = buildPrescriptionMessage({ rxOrder, language });
  if (!built.ok) {
    return { ok: false, reason: 'missing-link' };
  }

  return {
    ok: true,
    link: built.link,
    payload: {
      text: built.message,
      signatureMode: 'separate',
      // Digits only — a long-press on this message must copy the code and
      // nothing else. Any label would be copied along with it.
      followUps: accessCode ? [accessCode] : [],
    },
  };
}

// ---------------------------------------------------------------------------
// Cancellation
// ---------------------------------------------------------------------------

/**
 * Told to the patient when a doctor or pharmacist withdraws a script.
 *
 * A patient who cancelled it themselves is not messaged — they know.
 *
 * `intro` differs by who acted, because "your pharmacy could not fill this" and
 * "your doctor has withdrawn this" send the patient to different places next.
 * The reason follows, quoted, as the last thing they read.
 */
const cancellationBodies: Record<
  Languages,
  { doctor: string; pharmacist: string; closing: string; reasonLabel: string }
> = {
  [Languages.ENGLISH]: {
    doctor: 'Your doctor has cancelled your prescription. Please do not take it to a pharmacy.',
    pharmacist: 'Your pharmacy could not fill your prescription, so it has been cancelled.',
    closing: 'If you still need this medication, please contact your doctor.',
    reasonLabel: 'Reason',
  },
  [Languages.ARABIC]: {
    doctor: 'قام طبيبك بإلغاء وصفتك الطبية. يرجى عدم أخذها إلى الصيدلية.',
    pharmacist: 'لم تتمكن الصيدلية من صرف وصفتك الطبية، لذلك تم إلغاؤها.',
    closing: 'إذا كنت لا تزال بحاجة إلى هذا الدواء، يرجى الاتصال بطبيبك.',
    reasonLabel: 'السبب',
  },
  [Languages.FARSI]: {
    doctor: 'پزشک شما نسخه‌تان را لغو کرده است. لطفاً آن را به داروخانه نبرید.',
    pharmacist: 'داروخانه نتوانست نسخه شما را تهیه کند، بنابراین لغو شد.',
    closing: 'اگر هنوز به این دارو نیاز دارید، لطفاً با پزشک خود تماس بگیرید.',
    reasonLabel: 'دلیل',
  },
  [Languages.PASHTO]: {
    doctor: 'ستاسو ډاکټر ستاسو نسخه لغوه کړې ده. مهرباني وکړئ دا درملتون ته مه وړئ.',
    pharmacist: 'درملتون ستاسو نسخه نشوه ورکولی، نو لغوه شوه.',
    closing: 'که تاسو لاهم دې درملو ته اړتیا لرئ، مهرباني وکړئ له خپل ډاکټر سره اړیکه ونیسئ.',
    reasonLabel: 'دلیل',
  },
  [Languages.TURKISH]: {
    doctor: 'Doktorunuz reçetenizi iptal etti. Lütfen eczaneye götürmeyin.',
    pharmacist: 'Eczaneniz reçetenizi karşılayamadı, bu nedenle iptal edildi.',
    closing: 'Bu ilaca hâlâ ihtiyacınız varsa lütfen doktorunuzla iletişime geçin.',
    reasonLabel: 'Sebep',
  },
  [Languages.URDU]: {
    doctor: 'آپ کے ڈاکٹر نے آپ کا نسخہ منسوخ کر دیا ہے۔ براہ کرم اسے فارمیسی نہ لے جائیں۔',
    pharmacist: 'آپ کی فارمیسی آپ کا نسخہ پورا نہ کر سکی، اس لیے یہ منسوخ کر دیا گیا ہے۔',
    closing: 'اگر آپ کو اب بھی اس دوا کی ضرورت ہے تو براہ کرم اپنے ڈاکٹر سے رابطہ کریں۔',
    reasonLabel: 'وجہ',
  },
  [Languages.SPANISH]: {
    doctor: 'Su médico ha cancelado su receta. Por favor, no la lleve a una farmacia.',
    pharmacist: 'Su farmacia no pudo surtir su receta, por lo que ha sido cancelada.',
    closing: 'Si todavía necesita este medicamento, comuníquese con su médico.',
    reasonLabel: 'Motivo',
  },
  [Languages.FRENCH]: {
    doctor: "Votre médecin a annulé votre ordonnance. Merci de ne pas la présenter en pharmacie.",
    pharmacist: "Votre pharmacie n'a pas pu délivrer votre ordonnance, elle a donc été annulée.",
    closing: "Si vous avez toujours besoin de ce médicament, veuillez contacter votre médecin.",
    reasonLabel: 'Motif',
  },
};

export interface CancellationMessageOptions {
  language?: string | null;
  /** Patients are not messaged about their own cancellation. */
  role: 'doctor' | 'pharmacist';
  /** Staff-written, sent verbatim. Both dialogs warn about this before it is typed. */
  reason?: string | null;
}

/**
 * The cancellation notice, localized around a verbatim reason.
 *
 * The reason itself is NOT translated — it is written by staff in their
 * language and read by the patient in theirs. The messaging UI has a
 * translate-before-send flow that should be wired in here; until then the
 * mismatch is deliberate and visible rather than hidden.
 */
export function buildCancellationMessage({
  language,
  role,
  reason,
}: CancellationMessageOptions): string {
  const body = cancellationBodies[normalizeLanguage(language)];
  const trimmed = reason?.trim();

  return [
    body[role],
    // Quoted and last: it is the part the patient actually needs, and burying
    // it above the boilerplate is how it gets skimmed past.
    ...(trimmed ? [`${body.reasonLabel}: ${trimmed}`] : []),
    body.closing,
  ].join('\n');
}

export interface CancellationTelegramPayload {
  text: string;
  /** Inline: there is no link here to keep tappable. */
  signatureMode: 'inline';
}

/** Built once, posted identically by every cancel route. */
export function buildCancellationTelegramPayload(
  options: CancellationMessageOptions,
): CancellationTelegramPayload {
  return {
    text: buildCancellationMessage(options),
    signatureMode: 'inline',
  };
}
