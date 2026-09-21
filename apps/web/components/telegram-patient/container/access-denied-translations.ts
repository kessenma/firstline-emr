// apps/web/components/telegram-patient/container/access-denied-translations.ts

import { Languages } from "@/data/languages.enum"
import type { LanguageString } from "../container/intake-form/patient-form-translations"
import { languageEnumToString } from "../container/intake-form/patient-form-translations"

/**
 * We define the shape of translations specifically needed for the AccessDeniedPage.
 */
type AccessDeniedTranslationsType = {
    title: Record<LanguageString, string>
    description: Record<LanguageString, string>
    instruction: Record<LanguageString, string>
    codeLabel: Record<LanguageString, string>
    copyButton: Record<LanguageString, string>
    copiedConfirmation: Record<LanguageString, string>
    openTelegram: Record<LanguageString, string>
}

/**
 * The actual translation entries, for each piece of text you need,
 * across all supported languages.
 */
export const accessDeniedTranslations: AccessDeniedTranslationsType = {
    title: {
        English: "Access Denied",
        Arabic: "تم رفض الوصول",
        Farsi: "دسترسی رد شد",
        Pashto: "لاس رسی رد شو",
        Turkish: "Erişim Engellendi",
        Urdu: "رسائی مسترد کردی گئی",
        Spanish: "Acceso denegado",
        French: "Accès refusé",
    },
    description: {
        English: "We could not verify your access to this patient form.",
        Arabic: "تعذر علينا التحقق من وصولك إلى استمارة المريض هذه.",
        Farsi: "ما نتوانستیم دسترسی شما به این فرم بیمار را تأیید کنیم.",
        Pashto: "موږ ونشو کولی چې ستاسو د دې ناروغ فورم ته لاس رسی تأیید کړو.",
        Turkish: "Bu hasta formuna erişiminizi doğrulayamadık.",
        Urdu: "ہم آپ کی اس مریض کے فارم تک رسائی کی توثیق نہیں کر سکے۔",
        Spanish: "No pudimos verificar su acceso a este formulario de paciente.",
        French: "Nous n'avons pas pu vérifier votre accès à ce formulaire de patient.",
    },
    instruction: {
        English: "Our patient links have updated security. Please text the following command to our bot to receive your link:",
        Arabic: "تم تحديث أمان روابط المريض. يرجى إرسال الأمر التالي إلى البوت للحصول على الرابط:",
        Farsi: "لینک‌های بیمار ما امنیت به‌روز شده دارند. لطفاً دستور زیر را به ربات ما ارسال کنید تا لینک خود را دریافت کنید:",
        Pashto: "زموږ د ناروغ لینکونه نوي امنیت لري. مهرباني وکړئ لاندې قوماند زموږ بوټ ته واستوئ تر څو خپل لینک ترلاسه کړئ:",
        Turkish: "Hasta bağlantılarımızın güvenliği güncellendi. Bağlantınızı almak için lütfen aşağıdaki komutu botumuza gönderin:",
        Urdu: "ہمارے مریض کے لنکس میں سیکیورٹی اب بہتر ہوگئی ہے۔ براہ کرم نیچے دیا گیا کمانڈ ہمارے بوٹ کو بھیجیں تاکہ آپ کا لنک حاصل ہو سکے:",
        Spanish: "Los enlaces de pacientes tienen seguridad actualizada. Por favor, envíe el siguiente comando a nuestro bot para recibir su enlace:",
        French: "Les liens patients ont été mis à jour pour plus de sécurité. Veuillez envoyer la commande suivante à notre bot pour recevoir votre lien :",
    },
    codeLabel: {
        English: "/url",
        Arabic: "/url",
        Farsi: "/url",
        Pashto: "/url",
        Turkish: "/url",
        Urdu: "/url",
        Spanish: "/url",
        French: "/url",
    },
    copyButton: {
        English: "Copy",
        Arabic: "نسخ",
        Farsi: "کپی کردن",
        Pashto: "کاپي",
        Turkish: "Kopyala",
        Urdu: "کاپی کریں",
        Spanish: "Copiar",
        French: "Copier",
    },
    copiedConfirmation: {
        English: "Copied!",
        Arabic: "تم النسخ!",
        Farsi: "کپی شد!",
        Pashto: "کاپي شو!",
        Turkish: "Kopyalandı!",
        Urdu: "کاپی ہوگیا!",
        Spanish: "¡Copiado!",
        French: "Copié !",
    },
    openTelegram: {
        English: "Open Telegram",
        Arabic: "افتح تيليجرام",
        Farsi: "باز کردن تلگرام",
        Pashto: "ټیلیګرام خلاص کړئ",
        Turkish: "Telegram'ı Aç",
        Urdu: "ٹیلیگرام کھولیں",
        Spanish: "Abrir Telegram",
        French: "Ouvrir Telegram",
    },
}

/**
 * Helper function to safely retrieve AccessDenied translations
 */
export function getAccessDeniedTranslation(
    section: keyof AccessDeniedTranslationsType,
    language: string | LanguageString
): string {
    const safeLang = languageEnumToString(language)
    // e.g. accessDeniedTranslations["title"][safeLang]
    return accessDeniedTranslations[section][safeLang] || accessDeniedTranslations[section].English
}