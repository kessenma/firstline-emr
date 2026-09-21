// apps/web/components/telegram-patient/container/intake-form/patient-form-translations.ts
import { Languages } from "@/data/languages.enum";
import {
  CountriesList,
  CountriesListArabic,
  CountriesListFarsi,
  CountriesListPashto,
} from "@/data/countries.enum";
import {
  LanguagesList,
  LanguagesListArabic,
  LanguagesListFarsi,
  LanguagesListPashto,
} from "@/data/languages.enum";

// Updated type for the language strings used in the component
export type LanguageString =
  | "English"
  | "Arabic"
  | "Farsi"
  | "Pashto"
  | "Turkish"
  | "Urdu"
  | "Spanish"
  | "French";

// Helper function to convert Languages enum to LanguageString
export function languageEnumToString(lang: Languages | string): LanguageString {
  switch (lang) {
    case Languages.ENGLISH:
    case "English":
      return "English";
    case Languages.ARABIC:
    case "Arabic":
      return "Arabic";
    case Languages.FARSI:
    case "Farsi":
      return "Farsi";
    case Languages.PASHTO:
    case "Pashto":
      return "Pashto";
    case Languages.TURKISH:
    case "Turkish":
      return "Turkish";
    case Languages.URDU:
    case "Urdu":
      return "Urdu";
    case Languages.SPANISH:
    case "Spanish":
      return "Spanish";
    case Languages.FRENCH:
    case "French":
      return "French";
    default:
      return "English";
  }
}

// Helper function to convert LanguageString to Languages enum
export function stringToLanguageEnum(lang: LanguageString): Languages {
  switch (lang) {
    case "English":
      return Languages.ENGLISH;
    case "Arabic":
      return Languages.ARABIC;
    case "Farsi":
      return Languages.FARSI;
    case "Pashto":
      return Languages.PASHTO;
    case "Turkish":
      return Languages.TURKISH;
    case "Urdu":
      return Languages.URDU;
    case "Spanish":
      return Languages.SPANISH;
    case "French":
      return Languages.FRENCH;
    default:
      return Languages.ENGLISH;
  }
}

export function getLanguageOptions(currentLanguage: LanguageString) {
  switch (currentLanguage) {
    case "Arabic":
      return LanguagesListArabic;
    case "Farsi":
      return LanguagesListFarsi;
    case "Pashto":
      return LanguagesListPashto;
    default:
      return LanguagesList;
  }
}

// Get country options based on current language
export function getCountryOptions(currentLanguage: string | LanguageString) {
  // Convert any string to a valid LanguageString
  const safeLanguage = languageEnumToString(currentLanguage);
  const filterCountries = (list: string[]) =>
    list.filter((country) => country !== "Yemen" && country !== "Syria");

  switch (safeLanguage) {
    case "Arabic":
      return filterCountries(CountriesListArabic);
    case "Farsi":
      return filterCountries(CountriesListFarsi);
    case "Pashto":
      return filterCountries(CountriesListPashto);
    default:
      return filterCountries(CountriesList);
  }
}

// Type for the translations object
type TranslationsType = {
  language: Record<LanguageString, string>;
  firstName: Record<LanguageString, string>;
  lastName: Record<LanguageString, string>;
  dob: Record<LanguageString, string>;
  phone: Record<LanguageString, string>;
  country: Record<LanguageString, string>;
  city: Record<LanguageString, string>;
  chiefComplaint: Record<LanguageString, string>;
  genderPreference: {
    label: Record<LanguageString, string>;
    options: Record<LanguageString, string[]>;
  };
  currentMedications: {
    label: Record<LanguageString, string>;
    options: Record<LanguageString, string[]>;
    placeholder: Record<LanguageString, string>;
  };
  allergies: {
    label: Record<LanguageString, string>;
    options: Record<LanguageString, string[]>;
    placeholder: Record<LanguageString, string>;
  };
  isPatient: Record<LanguageString, string>;
  patientRelation: Record<LanguageString, string>;
  submitting: Record<LanguageString, string[]>;
  loading: Record<LanguageString, string>;
  submittedMessage: Record<LanguageString, string>;
  header: Record<LanguageString, string>;
  languageButtons: Record<LanguageString, string>;
};

export const translations: TranslationsType = {
  language: {
    English: "Language",
    Arabic: "اللغة",
    Farsi: "زبان",
    Pashto: "ژبه",
    Turkish: "Dil",
    Urdu: "زبان",
    Spanish: "Idioma",
    French: "Langue",
  },
  firstName: {
    English: "First Name",
    Arabic: "الاسم الأول",
    Farsi: "نام:",
    Pashto: "لومړی نوم:",
    Turkish: "Ad",
    Urdu: "پہلا نام",
    Spanish: "Nombre",
    French: "Prénom",
  },
  lastName: {
    English: "Last Name",
    Arabic: "العائلة اسم",
    Farsi: "نام خانوادگی:",
    Pashto: "تخلص:",
    Turkish: "Soyadı",
    Urdu: "آخری نام",
    Spanish: "Apellido",
    French: "Nom de famille",
  },
  dob: {
    English: "Date of Birth",
    Arabic: "العمر",
    Farsi: "سن:",
    Pashto: "عمر:",
    Turkish: "Doğum Tarihi",
    Urdu: "تاریخ پیدائش",
    Spanish: "Fecha de nacimiento",
    French: "Date de naissance",
  },
  phone: {
    English: "Phone Number",
    Arabic: "رقم الهاتف",
    Farsi: "شماره تلفن:",
    Pashto: "د تلیفون شمیره:",
    Turkish: "Telefon Numarası",
    Urdu: "فون نمبر",
    Spanish: "Número de teléfono",
    French: "Numéro de téléphone",
  },
  country: {
    English: "Country",
    Arabic: "بلد",
    Farsi: "کشور:",
    Pashto: "هیواد:",
    Turkish: "Ülke",
    Urdu: "ملک",
    Spanish: "País",
    French: "Pays",
  },
  city: {
    English: "City",
    Arabic: "مدينة",
    Farsi: "شهر:",
    Pashto: "ښار:",
    Turkish: "Şehir",
    Urdu: "شہر",
    Spanish: "Ciudad",
    French: "Ville",
  },
  chiefComplaint: {
    English: "What is your medical complaint? please provide details.",
    Arabic: "ما هي مشكلتك الطبية؟ يرجى تقديم التفاصيل.",
    Farsi: "مشکل پزشکی شما چیست؟ لطفاً جزئیات را ارائه دهید.",
    Pashto: "ستاسو طبي ستونزه څه ده؟ مهرباني وکړئ تفصيلات وړاندې کړئ.",
    Turkish: "Tıbbi şikayetiniz nedir? Lütfen ayrıntıları veriniz.",
    Urdu: "آپ کی طبی شکایت کیا ہے؟ براہ کرم تفصیلات فراہم کریں.",
    Spanish: "¿Cuál es su queja médica? Por favor, proporcione detalles.",
    French: "Quelle est votre plainte médicale ? Veuillez fournir des détails.",
  },
  genderPreference: {
    label: {
      English: "Doctor Gender Preference",
      Arabic: "تفضيل جنس الطبيب",
      Farsi: "ترجیح جنسیت پزشک",
      Pashto: "د ډاکټر جنسیت غوره توب",
      Turkish: "Doktor Cinsiyeti Tercihi",
      Urdu: "ڈاکٹر کے جنس کی ترجیح",
      Spanish: "Preferencia de género del médico",
      French: "Préférence de genre du médecin",
    },
    options: {
      English: ["Female", "Male", "No Preference"],
      Arabic: ["أنثى", "ذكر", "كلا"],
      Farsi: ["زن", "مرد", "هیچ"],
      Pashto: ["ښځه", "نارینه", "هیڅ"],
      Turkish: ["Kadın", "Erkek", "Tercih Yok"],
      Urdu: ["خاتون", "مرد", "کوئی ترجیح نہیں"],
      Spanish: ["Femenino", "Masculino", "Sin preferencia"],
      French: ["Féminin", "Masculin", "Pas de préférence"],
    },
  },
  currentMedications: {
    label: {
      English: "Are you currently taking any medications?",
      Arabic: "هل تتناول أي أدوية حالياً؟",
      Farsi: "آیا در حال حاضر دارویی مصرف می‌کنید؟",
      Pashto: "ایا تاسو اوس مهال کومه درمل کاروئ؟",
      Turkish: "Şu anda herhangi bir ilaç kullanıyor musunuz?",
      Urdu: "کیا آپ فی الحال کوئی دوائی لے رہے ہیں؟",
      Spanish: "¿Está tomando algún medicamento actualmente?",
      French: "Prenez-vous actuellement des médicaments ?",
    },
    options: {
      English: ["Yes", "No"],
      Arabic: ["نعم", "لا"],
      Farsi: ["بله", "خیر"],
      Pashto: ["هو", "نه"],
      Turkish: ["Evet", "Hayır"],
      Urdu: ["ہاں", "نہیں"],
      Spanish: ["Sí", "No"],
      French: ["Oui", "Non"],
    },
    placeholder: {
      English: "Please list your current medications",
      Arabic: "يرجى ذكر أدويتك الحالية",
      Farsi: "لطفاً داروهای فعلی خود را ذکر کنید",
      Pashto: "مهرباني وکړئ خپل اوسني درمل ولیکئ",
      Turkish: "Lütfen mevcut ilaçlarınızı listeleyin",
      Urdu: "براہ کرم اپنی موجودہ دوائیں درج کریں",
      Spanish: "Por favor, enumere sus medicamentos actuales",
      French: "Veuillez lister vos médicaments actuels",
    },
  },
  allergies: {
    label: {
      English: "Do you have any allergies?",
      Arabic: "هل لديك أي حساسية؟",
      Farsi: "آیا آلرژی دارید؟",
      Pashto: "ایا تاسو کومه الرجي لرئ؟",
      Turkish: "Herhangi bir alerjiniz var mı?",
      Urdu: "کیا آپ کو کوئی الرجی ہے؟",
      Spanish: "¿Tiene alguna alergia?",
      French: "Avez-vous des allergies ?",
    },
    options: {
      English: ["Yes", "No allergies"],
      Arabic: ["نعم", "لا حساسية"],
      Farsi: ["بله", "بدون آلرژی"],
      Pashto: ["هو", "الرجي نشته"],
      Turkish: ["Evet", "Alerjim yok"],
      Urdu: ["ہاں", "کوئی الرجی نہیں"],
      Spanish: ["Sí", "Sin alergias"],
      French: ["Oui", "Pas d'allergies"],
    },
    placeholder: {
      English: "Please list your allergies",
      Arabic: "يرجى ذكر حساسيتك",
      Farsi: "لطفاً آلرژی‌های خود را ذکر کنید",
      Pashto: "مهرباني وکړئ خپل الرجي ولیکئ",
      Turkish: "Lütfen alerjilerinizi listeleyin",
      Urdu: "براہ کرم اپنی الرجی درج کریں",
      Spanish: "Por favor, enumere sus alergias",
      French: "Veuillez lister vos allergies",
    },
  },
  isPatient: {
    English: "I confirm I am filling this form out on my own.",
    Arabic: "أؤكد أنني أملأ هذا النموذج بنفسي.",
    Farsi: "من تأیید می‌کنم که این فرم را به‌تنهایی پر می‌کنم.",
    Pashto: "زه تاییدوم چې زه دا فورم په خپل سر ډکوم.",
    Turkish: "Bu formu kendim doldurduğumu onaylıyorum.",
    Urdu: "میں تصدیق کرتا ہوں کہ میں یہ فارم اپنی طرف سے بھر رہا ہوں.",
    Spanish: "Confirmo que estoy llenando este formulario por mi cuenta.",
    French: "Je confirme que je remplis ce formulaire de mon propre chef.",
  },
  patientRelation: {
    English: "What is your relation to the patient?",
    Arabic: "ما هي علاقتك بالمريض؟",
    Farsi: "نسبت شما با بیمار چیست؟",
    Pashto: "ستاسو د ناروغ سره څه اړیکه ده؟",
    Turkish: "Hastayla ilişkiniz nedir?",
    Urdu: "آپ کا مریض کے ساتھ کیا رشتہ ہے؟",
    Spanish: "¿Cuál es su relación con el paciente?",
    French: "Quelle est votre relation avec le patient ?",
  },
  submitting: {
    English: ["Submit New Patient", "Submitting..."],
    Arabic: ["إرسال مريض جديد", "تقديم"],
    Farsi: ["ارائه بیمار جدید", "ارائه"],
    Pashto: ["نوی ناروغ وسپاري", "سپارل"],
    Turkish: ["Yeni Hastayı Gönder", "Gönderiliyor..."],
    Urdu: ["نئے مریض کو جمع کرائیں", "جمع کیا جا رہا ہے..."],
    Spanish: ["Enviar Nuevo Paciente", "Enviando..."],
    French: ["Soumettre un nouveau patient", "Soumission en cours..."],
  },
  loading: {
    English: "Loading patient data...",
    Arabic: "تحميل بيانات المريض...",
    Farsi: "در حال بارگیری اطلاعات بیمار...",
    Pashto: "د ناروغ معلومات لوډ کیږي...",
    Turkish: "Hasta verileri yükleniyor...",
    Urdu: "مریض کا ڈیٹا لوڈ ہو رہا ہے...",
    Spanish: "Cargando datos del paciente...",
    French: "Chargement des données du patient...",
  },
  // New addition from SubmittedPatientView.tsx
  submittedMessage: {
    English:
      "Thanks for submitting. Please wait for our team to review your info.",
    Arabic: "شكرا على التقديم. يرجى الانتظار حتى يراجع فريقنا معلوماتك.",
    Farsi:
      "با تشکر از ارسال. لطفاً منتظر بمانید تا تیم ما اطلاعات شما را بررسی کند.",
    Pashto:
      "د سپارلو لپاره مننه. مهرباني وکړئ صبر وکړئ چې زموږ ټیم ستاسو معلومات وګوري.",
    Turkish:
      "Gönderdiğiniz için teşekkürler. Lütfen ekibimizin bilgilerinizi incelemesini bekleyin.",
    Urdu: "جمع کرانے کا شکریہ. براہ کرم ہماری ٹیم کو آپ کی معلومات کا جائزہ لینے کا انتظار کریں.",
    Spanish:
      "Gracias por enviar. Por favor, espere a que nuestro equipo revise su información.",
    French:
      "Merci de l'avoir soumis. Veuillez attendre que notre équipe examine vos informations.",
  },
  // New addition from TelegramPatientFormContainer.tsx
  header: {
    English: "Patient Information Form",
    Arabic: "نموذج معلومات المريض",
    Farsi: "فرم اطلاعات بیمار",
    Pashto: "د ناروغ د معلوماتو فورم",
    Turkish: "Hasta Bilgi Formu",
    Urdu: "مریض کی معلومات فارم",
    Spanish: "Formulario de Información del Paciente",
    French: "Formulaire d'information du patient",
  },
  languageButtons: {
    English: "English",
    Arabic: "العربية",
    Farsi: "فارسی",
    Pashto: "پښتو",
    Turkish: "Türkçe",
    Urdu: "اردو",
    Spanish: "Español",
    French: "Français",
  },
};

// Helper function to safely get translation
export function getTranslation(
  section: keyof TranslationsType,
  language: string | LanguageString,
): string | string[] {
  const safeLanguage = languageEnumToString(language);
  const translationSection = translations[section] as Record<
    LanguageString,
    string | string[]
  >;
  return translationSection[safeLanguage] || translationSection.English;
}
