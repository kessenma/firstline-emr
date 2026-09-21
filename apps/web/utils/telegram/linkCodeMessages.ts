// apps/web/utils/telegram/linkCodeMessages.ts
// Multi-language messages for Telegram link code feature

import { Languages, normalizeLanguage } from "@fajr/shared/constants/languages";

interface LinkCodeMessages {
  /** Bot sends this when link succeeds */
  linkSuccess: (patientName: string) => string;
  /** Bot sends this when code is pending (doctor offline) */
  linkPending: string;
  /** Bot sends this when code is invalid/expired */
  linkInvalid: string;
  /** Bot sends this when rate limited */
  linkRateLimited: string;
  /** Patient-facing instructions (shown in doctor's UI for them to share) */
  patientInstructions: (code: string, botUsername: string) => string;
}

const messages: Record<Languages, LinkCodeMessages> = {
  [Languages.ENGLISH]: {
    linkSuccess: (name) =>
      `Your Telegram is now linked to your medical record. Welcome, ${name}!`,
    linkPending: "Code not yet registered. Please try again shortly.",
    linkInvalid:
      "Invalid or expired code. Please ask your doctor for a new one.",
    linkRateLimited: "Too many attempts. Please try again later.",
    patientInstructions: (code, botUsername) =>
      `To connect your Telegram to your medical record:\n1. Open Telegram\n2. Search for @${botUsername}\n3. Send this code: ${code}`,
  },
  [Languages.ARABIC]: {
    linkSuccess: (name) =>
      `تم ربط حساب تيليجرام الخاص بك بسجلك الطبي بنجاح. مرحباً، ${name}!`,
    linkPending: "الرمز غير مسجل بعد. يرجى المحاولة مرة أخرى بعد قليل.",
    linkInvalid:
      "رمز غير صالح أو منتهي الصلاحية. يرجى طلب رمز جديد من طبيبك.",
    linkRateLimited: "محاولات كثيرة جداً. يرجى المحاولة مرة أخرى لاحقاً.",
    patientInstructions: (code, botUsername) =>
      `لربط حساب تيليجرام بسجلك الطبي:\n1. افتح تيليجرام\n2. ابحث عن @${botUsername}\n3. أرسل هذا الرمز: ${code}`,
  },
  [Languages.FARSI]: {
    linkSuccess: (name) =>
      `تلگرام شما با موفقیت به پرونده پزشکی شما متصل شد. خوش آمدید، ${name}!`,
    linkPending: "کد هنوز ثبت نشده است. لطفاً کمی بعد دوباره تلاش کنید.",
    linkInvalid:
      "کد نامعتبر یا منقضی شده است. لطفاً از پزشک خود کد جدید بخواهید.",
    linkRateLimited:
      "تلاش‌های زیادی انجام شده است. لطفاً بعداً دوباره تلاش کنید.",
    patientInstructions: (code, botUsername) =>
      `برای اتصال تلگرام به پرونده پزشکی:\n1. تلگرام را باز کنید\n2. @${botUsername} را جستجو کنید\n3. این کد را ارسال کنید: ${code}`,
  },
  [Languages.PASHTO]: {
    linkSuccess: (name) =>
      `ستاسو تلیګرام په بریالیتوب سره ستاسو طبي ریکارډ سره وصل شو. ښه راغلاست، ${name}!`,
    linkPending:
      "کوډ لا تر اوسه ثبت شوی نه دی. مهرباني وکړئ لږ وروسته بیا هڅه وکړئ.",
    linkInvalid:
      "ناباوره یا ختم شوی کوډ. مهرباني وکړئ له خپل ډاکټر نه نوی کوډ وغواړئ.",
    linkRateLimited: "ډېرې هڅې. مهرباني وکړئ وروسته بیا هڅه وکړئ.",
    patientInstructions: (code, botUsername) =>
      `د خپل تلیګرام د طبي ریکارډ سره وصلولو لپاره:\n1. تلیګرام خلاص کړئ\n2. @${botUsername} وپلټئ\n3. دا کوډ واستوئ: ${code}`,
  },
  [Languages.TURKISH]: {
    linkSuccess: (name) =>
      `Telegram hesabınız tıbbi kaydınıza başarıyla bağlandı. Hoş geldiniz, ${name}!`,
    linkPending:
      "Kod henüz kayıtlı değil. Lütfen kısa bir süre sonra tekrar deneyin.",
    linkInvalid:
      "Geçersiz veya süresi dolmuş kod. Lütfen doktorunuzdan yeni bir kod isteyin.",
    linkRateLimited: "Çok fazla deneme. Lütfen daha sonra tekrar deneyin.",
    patientInstructions: (code, botUsername) =>
      `Telegram'ınızı tıbbi kaydınıza bağlamak için:\n1. Telegram'ı açın\n2. @${botUsername} arayın\n3. Bu kodu gönderin: ${code}`,
  },
  [Languages.URDU]: {
    linkSuccess: (name) =>
      `آپ کا ٹیلیگرام آپ کے طبی ریکارڈ سے کامیابی سے منسلک ہو گیا ہے۔ خوش آمدید، ${name}!`,
    linkPending:
      "کوڈ ابھی تک رجسٹرڈ نہیں ہوا۔ براہ کرم تھوڑی دیر بعد دوبارہ کوشش کریں۔",
    linkInvalid:
      "غلط یا میعاد ختم شدہ کوڈ۔ براہ کرم اپنے ڈاکٹر سے نیا کوڈ حاصل کریں۔",
    linkRateLimited:
      "بہت زیادہ کوششیں۔ براہ کرم بعد میں دوبارہ کوشش کریں۔",
    patientInstructions: (code, botUsername) =>
      `اپنے ٹیلیگرام کو طبی ریکارڈ سے جوڑنے کے لیے:\n1. ٹیلیگرام کھولیں\n2. @${botUsername} تلاش کریں\n3. یہ کوڈ بھیجیں: ${code}`,
  },
  [Languages.SPANISH]: {
    linkSuccess: (name) =>
      `Tu Telegram se ha vinculado exitosamente a tu registro médico. ¡Bienvenido/a, ${name}!`,
    linkPending:
      "El código aún no está registrado. Por favor, inténtelo de nuevo en breve.",
    linkInvalid:
      "Código inválido o expirado. Por favor, pida un nuevo código a su médico.",
    linkRateLimited: "Demasiados intentos. Por favor, inténtelo más tarde.",
    patientInstructions: (code, botUsername) =>
      `Para conectar tu Telegram a tu registro médico:\n1. Abre Telegram\n2. Busca @${botUsername}\n3. Envía este código: ${code}`,
  },
  [Languages.FRENCH]: {
    linkSuccess: (name) =>
      `Votre Telegram est maintenant lié à votre dossier médical. Bienvenue, ${name} !`,
    linkPending:
      "Code pas encore enregistré. Veuillez réessayer dans un moment.",
    linkInvalid:
      "Code invalide ou expiré. Veuillez demander un nouveau code à votre médecin.",
    linkRateLimited:
      "Trop de tentatives. Veuillez réessayer plus tard.",
    patientInstructions: (code, botUsername) =>
      `Pour connecter votre Telegram à votre dossier médical :\n1. Ouvrez Telegram\n2. Recherchez @${botUsername}\n3. Envoyez ce code : ${code}`,
  },
};

// `normalizeLanguage` now lives in @fajr/shared/constants/languages — it is
// needed by video consults and by mobile too, none of which should be reaching
// into a Telegram module for it. Re-exported here so existing imports keep
// working.
export { normalizeLanguage };

/**
 * Get link code messages for a given language
 */
export function getLinkCodeMessages(
  language?: string | null,
): LinkCodeMessages {
  return messages[normalizeLanguage(language)];
}
