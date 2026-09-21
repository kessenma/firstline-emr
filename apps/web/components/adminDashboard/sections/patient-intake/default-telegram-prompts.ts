// apps/web/components/adminDashboard/sections/patient-intake/default-telegram-prompts.ts
import { Languages } from "@/data/languages.enum";

type SupportedLanguage = `${Languages}`;

export const defaultTelegramPrompts: {
    intakeMessage: Record<SupportedLanguage, string>;
    confirmationMessage: Record<SupportedLanguage, string>;
} = {
    intakeMessage: {
        English: "Welcome! Please complete your registration.",
        Arabic: "يرجى إكمال التسجيل الخاص بك.",
        Farsi: "لطفاً فرم ثبت‌نام را تکمیل کنید.",
        Pashto: "مهرباني وکړئ خپل ثبت نام بشپړ کړئ.",
        Turkish: "Lütfen kaydınızı tamamlayın.",
        Urdu: "براہ کرم اپنا اندراج مکمل کریں۔",
        Spanish: "Por favor, complete su registro.",
        French: "Veuillez compléter votre inscription.",
    },
    confirmationMessage: {
        English: "Thank you for joining! We'll guide you through the next steps.",
        Arabic: "شكرًا لانضمامك! سنرشدك في الخطوات التالية.",
        Farsi: "از پیوستن شما سپاسگزاریم! مراحل بعدی را راهنمایی خواهیم کرد.",
        Pashto: "مننه چې ګډون مو وکړ! موږ به تاسو ته راتلونکي ګامونه وښیو.",
        Turkish: "Katıldığınız için teşekkürler! Sizi sonraki adımlarda yönlendireceğiz.",
        Urdu: "شمولیت کے لئے شکریہ! ہم آپ کو اگلے مراحل میں رہنمائی کریں گے۔",
        Spanish: "¡Gracias por unirte! Te guiaremos en los siguientes pasos.",
        French: "Merci de vous être joint à nous ! Nous vous guiderons dans les prochaines étapes.",
    },
};