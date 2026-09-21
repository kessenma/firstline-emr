// Strings for the patient-facing prescription page and its access gate.
//
// Shared, and keyed on the `Languages` enum rather than a local locale enum,
// because this page is the other half of the Telegram message: whatever
// language `prescription-message.ts` writes in, the link opens in. Those two
// vocabularies used to differ — the page had four languages against the
// message's eight — so a patient could receive an Urdu message and land on an
// English page.
//
// Adding a key here is a compile error in every language until translated,
// which is the point. Do not widen `Record<Languages, …>` to make that go away.

import { Languages } from '../constants/languages';

export type PatientRxTranslationKey =
  // Page chrome
  | 'prescriptionDetails'
  | 'rxOrderCompleted'
  | 'contactDoctorRefill'
  | 'expandQrCode'
  | 'qrCode'
  | 'scanQrCode'
  | 'qrCodeNotAvailable'
  | 'qrCodeDispensed'
  | 'diagnosis'
  | 'prescriptions'
  | 'orderDetails'
  | 'patientInformation'
  | 'doctorInformation'
  | 'name'
  | 'dateOfBirth'
  | 'country'
  | 'city'
  | 'doctorSpecialty'
  | 'prescribingDoctor'
  | 'prescribedDate'
  | 'validTill'
  | 'rxStatus'
  | 'notSpecified'
  | 'loading'
  | 'error'
  | 'noPrescriptionFound'
  | 'selectLanguage'
  | 'patientAndDoctorInfo'
  | 'close'
  // Access gate — patient
  | 'enterAccessCode'
  | 'accessCodeHelp'
  | 'accessCodeLabel'
  | 'unlock'
  | 'wrongCode'
  | 'attemptsRemaining'
  | 'tooManyAttempts'
  | 'askDoctorForNewCode'
  // Cancelling your own prescription
  | 'cancelPrescription'
  | 'cancelPrescriptionHelp'
  | 'cancelReasonQuestion'
  | 'cancelOptionalNote'
  | 'cancelConfirm'
  | 'cancelKeep'
  | 'cancelledTitle'
  | 'cancelledBody'
  | 'cancelFailed'
  // Access gate — pharmacy
  | 'verifyPatient'
  | 'verifyPatientHelp'
  | 'lastNameLabel'
  | 'openPrescription'
  | 'verificationFailed'
  // Language names, always shown in their own language
  | 'english'
  | 'arabic'
  | 'pashto'
  | 'farsi'
  | 'turkish'
  | 'urdu'
  | 'spanish'
  | 'french';

export type PatientRxTranslations = Record<
  Languages,
  Record<PatientRxTranslationKey, string>
>;

/** Language names render in their own language in every table, on purpose. */
const languageNames = {
  english: 'English',
  arabic: 'العربية',
  pashto: 'پښتو',
  farsi: 'فارسی',
  turkish: 'Türkçe',
  urdu: 'اردو',
  spanish: 'Español',
  french: 'Français',
} as const;

export const patientRxTranslations: PatientRxTranslations = {
  [Languages.ENGLISH]: {
    cancelPrescription: 'Cancel this prescription',
    cancelPrescriptionHelp: 'If you no longer need this prescription, you can cancel it. Your care team will be told.',
    cancelReasonQuestion: 'Why are you cancelling?',
    cancelOptionalNote: 'Anything else you want your care team to know? (optional)',
    cancelConfirm: 'Cancel my prescription',
    cancelKeep: 'Keep it',
    cancelledTitle: 'This prescription has been cancelled',
    cancelledBody: 'If you still need this medication, please contact your doctor.',
    cancelFailed: 'Could not cancel this prescription. Please try again.',
    prescriptionDetails: 'Prescription Details',
    rxOrderCompleted: 'Medication Prescription Referral Completed',
    contactDoctorRefill: 'Please contact your doctor to refill your prescription.',
    expandQrCode: 'Expand QR Code',
    qrCode: 'QR Code',
    scanQrCode: 'Scan this QR code for your Medication Prescription Referral',
    qrCodeNotAvailable: 'QR Code not available',
    qrCodeDispensed:
      'This prescription has already been dispensed, so its QR code is no longer active.',
    diagnosis: 'Diagnosis',
    prescriptions: 'Prescriptions',
    orderDetails: 'Order Details',
    patientInformation: 'Patient Information',
    doctorInformation: 'Doctor Information',
    name: 'Name',
    dateOfBirth: 'Date of Birth',
    country: 'Country',
    city: 'City',
    doctorSpecialty: 'Doctor Specialty',
    prescribingDoctor: 'Prescribing Doctor',
    prescribedDate: 'Prescribed Date',
    validTill: 'Valid Till',
    rxStatus: 'RX Status',
    notSpecified: 'Not specified',
    loading: 'Loading...',
    error: 'Error',
    noPrescriptionFound: 'No prescription found',
    selectLanguage: 'Select Language',
    patientAndDoctorInfo: 'Patient and Doctor Information',
    close: 'Close',
    enterAccessCode: 'Enter your access code',
    accessCodeHelp:
      'Your doctor sent a 6-digit code in your chat, just after this link.',
    accessCodeLabel: 'Access code',
    unlock: 'View prescription',
    wrongCode: 'That code is not correct. Please check your chat and try again.',
    attemptsRemaining: 'Attempts remaining before a short wait',
    tooManyAttempts: 'Too many attempts. Please wait before trying again.',
    askDoctorForNewCode: 'Ask your doctor to send a new code.',
    verifyPatient: 'Verify the patient',
    verifyPatientHelp:
      "Enter the patient's last name and date of birth to open this prescription.",
    lastNameLabel: 'Last name',
    openPrescription: 'Open prescription',
    verificationFailed: 'Those details do not match this prescription.',
    ...languageNames,
  },
  [Languages.ARABIC]: {
    cancelPrescription: 'إلغاء هذه الوصفة الطبية',
    cancelPrescriptionHelp: 'إذا لم تعد بحاجة إلى هذه الوصفة الطبية، يمكنك إلغاؤها. سيتم إبلاغ فريق الرعاية الخاص بك.',
    cancelReasonQuestion: 'لماذا تقوم بالإلغاء؟',
    cancelOptionalNote: 'هل هناك شيء آخر تريد أن يعرفه فريق الرعاية؟ (اختياري)',
    cancelConfirm: 'إلغاء وصفتي الطبية',
    cancelKeep: 'الاحتفاظ بها',
    cancelledTitle: 'تم إلغاء هذه الوصفة الطبية',
    cancelledBody: 'إذا كنت لا تزال بحاجة إلى هذا الدواء، يرجى الاتصال بطبيبك.',
    cancelFailed: 'تعذر إلغاء هذه الوصفة الطبية. يرجى المحاولة مرة أخرى.',
    prescriptionDetails: 'تفاصيل الوصفة الطبية',
    rxOrderCompleted: 'اكتملت إحالة الوصفة الطبية',
    contactDoctorRefill: 'يرجى الاتصال بطبيبك لإعادة ملء الوصفة الطبية.',
    expandQrCode: 'توسيع رمز الاستجابة السريعة',
    qrCode: 'رمز الاستجابة السريعة',
    scanQrCode: 'قم بمسح رمز الاستجابة السريعة هذا ضوئيًا لإحالة الوصفة الطبية الخاصة بك',
    qrCodeNotAvailable: 'رمز الاستجابة السريعة غير متوفر',
    qrCodeDispensed:
      'تم صرف هذه الوصفة الطبية بالفعل، لذلك لم يعد رمز الاستجابة السريعة الخاص بها نشطًا.',
    diagnosis: 'التشخيص',
    prescriptions: 'الوصفات الطبية',
    orderDetails: 'تفاصيل الطلب',
    patientInformation: 'معلومات المريض',
    doctorInformation: 'معلومات الطبيب',
    name: 'الاسم',
    dateOfBirth: 'تاريخ الميلاد',
    country: 'البلد',
    city: 'المدينة',
    doctorSpecialty: 'تخصص الطبيب',
    prescribingDoctor: 'الطبيب الواصف',
    prescribedDate: 'تاريخ الوصف',
    validTill: 'صالح حتى',
    rxStatus: 'حالة الوصفة الطبية',
    notSpecified: 'غير محدد',
    loading: 'جاري التحميل...',
    error: 'خطأ',
    noPrescriptionFound: 'لم يتم العثور على وصفة طبية',
    selectLanguage: 'اختر اللغة',
    patientAndDoctorInfo: 'معلومات المريض والطبيب',
    close: 'إغلاق',
    enterAccessCode: 'أدخل رمز الدخول الخاص بك',
    accessCodeHelp: 'أرسل طبيبك رمزًا من 6 أرقام في محادثتك، بعد هذا الرابط مباشرة.',
    accessCodeLabel: 'رمز الدخول',
    unlock: 'عرض الوصفة الطبية',
    wrongCode: 'هذا الرمز غير صحيح. يرجى التحقق من محادثتك والمحاولة مرة أخرى.',
    attemptsRemaining: 'المحاولات المتبقية قبل فترة انتظار قصيرة',
    tooManyAttempts: 'محاولات كثيرة جدًا. يرجى الانتظار قبل المحاولة مرة أخرى.',
    askDoctorForNewCode: 'اطلب من طبيبك إرسال رمز جديد.',
    verifyPatient: 'تحقق من هوية المريض',
    verifyPatientHelp: 'أدخل اسم عائلة المريض وتاريخ ميلاده لفتح هذه الوصفة الطبية.',
    lastNameLabel: 'اسم العائلة',
    openPrescription: 'فتح الوصفة الطبية',
    verificationFailed: 'هذه البيانات لا تطابق هذه الوصفة الطبية.',
    ...languageNames,
  },
  [Languages.PASHTO]: {
    cancelPrescription: 'دا نسخه لغوه کړئ',
    cancelPrescriptionHelp: 'که تاسو نور دې نسخې ته اړتیا نلرئ، کولی شئ یې لغوه کړئ. ستاسو د پاملرنې ټیم ته به خبر ورکړل شي.',
    cancelReasonQuestion: 'ولې یې لغوه کوئ؟',
    cancelOptionalNote: 'بل څه شته چې غواړئ ستاسو د پاملرنې ټیم پرې پوه شي؟ (اختیاري)',
    cancelConfirm: 'زما نسخه لغوه کړئ',
    cancelKeep: 'وې ساتئ',
    cancelledTitle: 'دا نسخه لغوه شوې ده',
    cancelledBody: 'که تاسو لاهم دې درملو ته اړتیا لرئ، مهرباني وکړئ له خپل ډاکټر سره اړیکه ونیسئ.',
    cancelFailed: 'دا نسخه لغوه نه شوه. مهرباني وکړئ بیا هڅه وکړئ.',
    prescriptionDetails: 'د نسخې توضیحات',
    rxOrderCompleted: 'د درملو نسخه راجع کول بشپړ شوي',
    contactDoctorRefill: 'مهرباني وکړئ د خپلې نسخې ډکولو لپاره له خپل ډاکټر سره اړیکه ونیسئ.',
    expandQrCode: 'QR کوډ پراخول',
    qrCode: 'QR کوډ',
    scanQrCode: 'ستاسو د درملو نسخې راجع کولو لپاره دا QR کوډ سکین کړئ',
    qrCodeNotAvailable: 'QR کوډ شتون نلري',
    qrCodeDispensed: 'دا نسخه دمخه ورکړل شوې، نو د دې QR کوډ نور فعال نه دی.',
    diagnosis: 'تشخیص',
    prescriptions: 'نسخې',
    orderDetails: 'د امر تفصیلات',
    patientInformation: 'د ناروغ معلومات',
    doctorInformation: 'د ډاکټر معلومات',
    name: 'نوم',
    dateOfBirth: 'د زیږیدنې نیټه',
    country: 'هېواد',
    city: 'ښار',
    doctorSpecialty: 'د ډاکټر تخصص',
    prescribingDoctor: 'نسخه لیکونکی ډاکټر',
    prescribedDate: 'نسخه شوې نیټه',
    validTill: 'د اعتبار نیټه',
    rxStatus: 'د نسخې حالت',
    notSpecified: 'نه دی مشخص شوی',
    loading: 'بار کول...',
    error: 'تېروتنه',
    noPrescriptionFound: 'هیڅ نسخه ونه موندل شوه',
    selectLanguage: 'ژبه وټاکئ',
    patientAndDoctorInfo: 'د ناروغ او ډاکټر معلومات',
    close: 'بند کړئ',
    enterAccessCode: 'خپل د لاسرسي کوډ دننه کړئ',
    accessCodeHelp: 'ستاسو ډاکټر په ستاسو چیټ کې د 6 عددونو کوډ لیږلی، سمدلاسه د دې لینک وروسته.',
    accessCodeLabel: 'د لاسرسي کوډ',
    unlock: 'نسخه وګورئ',
    wrongCode: 'دا کوډ سم نه دی. مهرباني وکړئ خپل چیټ وګورئ او بیا هڅه وکړئ.',
    attemptsRemaining: 'د لنډ انتظار دمخه پاتې هڅې',
    tooManyAttempts: 'ډېرې هڅې. مهرباني وکړئ د بیا هڅې کولو دمخه انتظار وکړئ.',
    askDoctorForNewCode: 'له خپل ډاکټر څخه وغواړئ چې نوی کوډ ولیږي.',
    verifyPatient: 'د ناروغ پیژندنه تایید کړئ',
    verifyPatientHelp: 'د دې نسخې پرانیستلو لپاره د ناروغ تخلص او د زیږیدنې نیټه دننه کړئ.',
    lastNameLabel: 'تخلص',
    openPrescription: 'نسخه پرانیزئ',
    verificationFailed: 'دا معلومات د دې نسخې سره سمون نه خوري.',
    ...languageNames,
  },
  [Languages.FARSI]: {
    cancelPrescription: 'لغو این نسخه',
    cancelPrescriptionHelp: 'اگر دیگر به این نسخه نیاز ندارید، می‌توانید آن را لغو کنید. به تیم مراقبت شما اطلاع داده می‌شود.',
    cancelReasonQuestion: 'چرا آن را لغو می‌کنید؟',
    cancelOptionalNote: 'چیز دیگری هست که بخواهید تیم مراقبت بداند؟ (اختیاری)',
    cancelConfirm: 'نسخه من را لغو کن',
    cancelKeep: 'نگه‌داشتن',
    cancelledTitle: 'این نسخه لغو شده است',
    cancelledBody: 'اگر هنوز به این دارو نیاز دارید، لطفاً با پزشک خود تماس بگیرید.',
    cancelFailed: 'لغو این نسخه ممکن نشد. لطفاً دوباره تلاش کنید.',
    prescriptionDetails: 'جزئیات نسخه',
    rxOrderCompleted: 'ارجاع نسخه دارویی تکمیل شد',
    contactDoctorRefill: 'لطفاً برای تمدید نسخه با پزشک خود تماس بگیرید.',
    expandQrCode: 'گسترش کد QR',
    qrCode: 'کد QR',
    scanQrCode: 'این کد QR را برای معرفی نسخه دارویی خود اسکن کنید',
    qrCodeNotAvailable: 'کد QR موجود نیست',
    qrCodeDispensed: 'این نسخه قبلاً تحویل داده شده است، بنابراین کد QR آن دیگر فعال نیست.',
    diagnosis: 'تشخیص',
    prescriptions: 'نسخه‌ها',
    orderDetails: 'جزئیات سفارش',
    patientInformation: 'اطلاعات بیمار',
    doctorInformation: 'اطلاعات پزشک',
    name: 'نام',
    dateOfBirth: 'تاریخ تولد',
    country: 'کشور',
    city: 'شهر',
    doctorSpecialty: 'تخصص پزشک',
    prescribingDoctor: 'پزشک تجویز کننده',
    prescribedDate: 'تاریخ تجویز',
    validTill: 'معتبر تا',
    rxStatus: 'وضعیت نسخه',
    notSpecified: 'مشخص نشده',
    loading: 'در حال بارگذاری...',
    error: 'خطا',
    noPrescriptionFound: 'نسخه‌ای یافت نشد',
    selectLanguage: 'انتخاب زبان',
    patientAndDoctorInfo: 'اطلاعات بیمار و پزشک',
    close: 'بستن',
    enterAccessCode: 'کد دسترسی خود را وارد کنید',
    accessCodeHelp: 'پزشک شما یک کد ۶ رقمی درست بعد از این پیوند در گفتگوی شما فرستاده است.',
    accessCodeLabel: 'کد دسترسی',
    unlock: 'مشاهده نسخه',
    wrongCode: 'این کد درست نیست. لطفاً گفتگوی خود را بررسی کرده و دوباره تلاش کنید.',
    attemptsRemaining: 'تلاش‌های باقی‌مانده پیش از یک انتظار کوتاه',
    tooManyAttempts: 'تلاش‌های بیش از حد. لطفاً پیش از تلاش دوباره صبر کنید.',
    askDoctorForNewCode: 'از پزشک خود بخواهید کد جدیدی بفرستد.',
    verifyPatient: 'هویت بیمار را تأیید کنید',
    verifyPatientHelp: 'برای باز کردن این نسخه، نام خانوادگی و تاریخ تولد بیمار را وارد کنید.',
    lastNameLabel: 'نام خانوادگی',
    openPrescription: 'باز کردن نسخه',
    verificationFailed: 'این مشخصات با این نسخه مطابقت ندارد.',
    ...languageNames,
  },
  [Languages.TURKISH]: {
    cancelPrescription: 'Bu reçeteyi iptal et',
    cancelPrescriptionHelp: 'Bu reçeteye artık ihtiyacınız yoksa iptal edebilirsiniz. Bakım ekibinize bildirilecektir.',
    cancelReasonQuestion: 'Neden iptal ediyorsunuz?',
    cancelOptionalNote: 'Bakım ekibinizin bilmesini istediğiniz başka bir şey var mı? (isteğe bağlı)',
    cancelConfirm: 'Reçetemi iptal et',
    cancelKeep: 'Kalsın',
    cancelledTitle: 'Bu reçete iptal edildi',
    cancelledBody: 'Bu ilaca hâlâ ihtiyacınız varsa lütfen doktorunuzla iletişime geçin.',
    cancelFailed: 'Bu reçete iptal edilemedi. Lütfen tekrar deneyin.',
    prescriptionDetails: 'Reçete Ayrıntıları',
    rxOrderCompleted: 'İlaç Reçetesi Sevki Tamamlandı',
    contactDoctorRefill: 'Reçetenizi yenilemek için lütfen doktorunuzla iletişime geçin.',
    expandQrCode: 'QR Kodunu Büyüt',
    qrCode: 'QR Kodu',
    scanQrCode: 'İlaç reçetesi sevkiniz için bu QR kodunu taratın',
    qrCodeNotAvailable: 'QR kodu mevcut değil',
    qrCodeDispensed: 'Bu reçete zaten karşılandı, bu nedenle QR kodu artık geçerli değil.',
    diagnosis: 'Tanı',
    prescriptions: 'Reçeteler',
    orderDetails: 'Sipariş Ayrıntıları',
    patientInformation: 'Hasta Bilgileri',
    doctorInformation: 'Doktor Bilgileri',
    name: 'Ad',
    dateOfBirth: 'Doğum Tarihi',
    country: 'Ülke',
    city: 'Şehir',
    doctorSpecialty: 'Doktor Uzmanlığı',
    prescribingDoctor: 'Reçeteyi Yazan Doktor',
    prescribedDate: 'Reçete Tarihi',
    validTill: 'Geçerlilik Tarihi',
    rxStatus: 'Reçete Durumu',
    notSpecified: 'Belirtilmemiş',
    loading: 'Yükleniyor...',
    error: 'Hata',
    noPrescriptionFound: 'Reçete bulunamadı',
    selectLanguage: 'Dil Seçin',
    patientAndDoctorInfo: 'Hasta ve Doktor Bilgileri',
    close: 'Kapat',
    enterAccessCode: 'Erişim kodunuzu girin',
    accessCodeHelp: 'Doktorunuz bu bağlantının hemen ardından sohbetinize 6 haneli bir kod gönderdi.',
    accessCodeLabel: 'Erişim kodu',
    unlock: 'Reçeteyi görüntüle',
    wrongCode: 'Bu kod doğru değil. Lütfen sohbetinizi kontrol edip tekrar deneyin.',
    attemptsRemaining: 'Kısa bir beklemeden önce kalan deneme',
    tooManyAttempts: 'Çok fazla deneme. Lütfen tekrar denemeden önce bekleyin.',
    askDoctorForNewCode: 'Doktorunuzdan yeni bir kod göndermesini isteyin.',
    verifyPatient: 'Hastayı doğrulayın',
    verifyPatientHelp: 'Bu reçeteyi açmak için hastanın soyadını ve doğum tarihini girin.',
    lastNameLabel: 'Soyadı',
    openPrescription: 'Reçeteyi aç',
    verificationFailed: 'Bu bilgiler bu reçeteyle eşleşmiyor.',
    ...languageNames,
  },
  [Languages.URDU]: {
    cancelPrescription: 'یہ نسخہ منسوخ کریں',
    cancelPrescriptionHelp: 'اگر آپ کو اب اس نسخے کی ضرورت نہیں تو آپ اسے منسوخ کر سکتے ہیں۔ آپ کی نگہداشت ٹیم کو بتا دیا جائے گا۔',
    cancelReasonQuestion: 'آپ کیوں منسوخ کر رہے ہیں؟',
    cancelOptionalNote: 'کیا کچھ اور ہے جو آپ اپنی نگہداشت ٹیم کو بتانا چاہتے ہیں؟ (اختیاری)',
    cancelConfirm: 'میرا نسخہ منسوخ کریں',
    cancelKeep: 'اسے رہنے دیں',
    cancelledTitle: 'یہ نسخہ منسوخ کر دیا گیا ہے',
    cancelledBody: 'اگر آپ کو اب بھی اس دوا کی ضرورت ہے تو براہ کرم اپنے ڈاکٹر سے رابطہ کریں۔',
    cancelFailed: 'یہ نسخہ منسوخ نہیں ہو سکا۔ براہ کرم دوبارہ کوشش کریں۔',
    prescriptionDetails: 'نسخے کی تفصیلات',
    rxOrderCompleted: 'ادویات کے نسخے کا حوالہ مکمل ہو گیا',
    contactDoctorRefill: 'اپنا نسخہ دوبارہ حاصل کرنے کے لیے براہ کرم اپنے ڈاکٹر سے رابطہ کریں۔',
    expandQrCode: 'QR کوڈ بڑا کریں',
    qrCode: 'QR کوڈ',
    scanQrCode: 'اپنے ادویات کے نسخے کے حوالے کے لیے یہ QR کوڈ اسکین کریں',
    qrCodeNotAvailable: 'QR کوڈ دستیاب نہیں',
    qrCodeDispensed: 'یہ نسخہ پہلے ہی جاری کیا جا چکا ہے، اس لیے اس کا QR کوڈ اب فعال نہیں ہے۔',
    diagnosis: 'تشخیص',
    prescriptions: 'نسخے',
    orderDetails: 'آرڈر کی تفصیلات',
    patientInformation: 'مریض کی معلومات',
    doctorInformation: 'ڈاکٹر کی معلومات',
    name: 'نام',
    dateOfBirth: 'تاریخ پیدائش',
    country: 'ملک',
    city: 'شہر',
    doctorSpecialty: 'ڈاکٹر کی تخصص',
    prescribingDoctor: 'نسخہ لکھنے والا ڈاکٹر',
    prescribedDate: 'نسخے کی تاریخ',
    validTill: 'اس تاریخ تک کارآمد',
    rxStatus: 'نسخے کی حالت',
    notSpecified: 'متعین نہیں',
    loading: 'لوڈ ہو رہا ہے...',
    error: 'خرابی',
    noPrescriptionFound: 'کوئی نسخہ نہیں ملا',
    selectLanguage: 'زبان منتخب کریں',
    patientAndDoctorInfo: 'مریض اور ڈاکٹر کی معلومات',
    close: 'بند کریں',
    enterAccessCode: 'اپنا رسائی کوڈ درج کریں',
    accessCodeHelp: 'آپ کے ڈاکٹر نے اس لنک کے فوراً بعد آپ کی چیٹ میں 6 ہندسوں کا کوڈ بھیجا ہے۔',
    accessCodeLabel: 'رسائی کوڈ',
    unlock: 'نسخہ دیکھیں',
    wrongCode: 'یہ کوڈ درست نہیں ہے۔ براہ کرم اپنی چیٹ دیکھیں اور دوبارہ کوشش کریں۔',
    attemptsRemaining: 'مختصر انتظار سے پہلے باقی کوششیں',
    tooManyAttempts: 'بہت زیادہ کوششیں۔ دوبارہ کوشش کرنے سے پہلے براہ کرم انتظار کریں۔',
    askDoctorForNewCode: 'اپنے ڈاکٹر سے نیا کوڈ بھیجنے کو کہیں۔',
    verifyPatient: 'مریض کی تصدیق کریں',
    verifyPatientHelp: 'یہ نسخہ کھولنے کے لیے مریض کا خاندانی نام اور تاریخ پیدائش درج کریں۔',
    lastNameLabel: 'خاندانی نام',
    openPrescription: 'نسخہ کھولیں',
    verificationFailed: 'یہ تفصیلات اس نسخے سے میل نہیں کھاتیں۔',
    ...languageNames,
  },
  [Languages.SPANISH]: {
    cancelPrescription: 'Cancelar esta receta',
    cancelPrescriptionHelp: 'Si ya no necesita esta receta, puede cancelarla. Se informará a su equipo médico.',
    cancelReasonQuestion: '¿Por qué la cancela?',
    cancelOptionalNote: '¿Algo más que quiera que sepa su equipo médico? (opcional)',
    cancelConfirm: 'Cancelar mi receta',
    cancelKeep: 'Conservarla',
    cancelledTitle: 'Esta receta ha sido cancelada',
    cancelledBody: 'Si todavía necesita este medicamento, comuníquese con su médico.',
    cancelFailed: 'No se pudo cancelar esta receta. Inténtelo de nuevo.',
    prescriptionDetails: 'Detalles de la receta',
    rxOrderCompleted: 'Derivación de receta médica completada',
    contactDoctorRefill: 'Comuníquese con su médico para renovar su receta.',
    expandQrCode: 'Ampliar código QR',
    qrCode: 'Código QR',
    scanQrCode: 'Escanee este código QR para su derivación de receta médica',
    qrCodeNotAvailable: 'Código QR no disponible',
    qrCodeDispensed: 'Esta receta ya fue dispensada, por lo que su código QR ya no está activo.',
    diagnosis: 'Diagnóstico',
    prescriptions: 'Recetas',
    orderDetails: 'Detalles del pedido',
    patientInformation: 'Información del paciente',
    doctorInformation: 'Información del médico',
    name: 'Nombre',
    dateOfBirth: 'Fecha de nacimiento',
    country: 'País',
    city: 'Ciudad',
    doctorSpecialty: 'Especialidad del médico',
    prescribingDoctor: 'Médico prescriptor',
    prescribedDate: 'Fecha de prescripción',
    validTill: 'Válido hasta',
    rxStatus: 'Estado de la receta',
    notSpecified: 'No especificado',
    loading: 'Cargando...',
    error: 'Error',
    noPrescriptionFound: 'No se encontró ninguna receta',
    selectLanguage: 'Seleccionar idioma',
    patientAndDoctorInfo: 'Información del paciente y del médico',
    close: 'Cerrar',
    enterAccessCode: 'Introduzca su código de acceso',
    accessCodeHelp: 'Su médico envió un código de 6 dígitos en su chat, justo después de este enlace.',
    accessCodeLabel: 'Código de acceso',
    unlock: 'Ver receta',
    wrongCode: 'Ese código no es correcto. Revise su chat e inténtelo de nuevo.',
    attemptsRemaining: 'Intentos restantes antes de una breve espera',
    tooManyAttempts: 'Demasiados intentos. Espere antes de volver a intentarlo.',
    askDoctorForNewCode: 'Pida a su médico que le envíe un código nuevo.',
    verifyPatient: 'Verifique al paciente',
    verifyPatientHelp: 'Introduzca el apellido y la fecha de nacimiento del paciente para abrir esta receta.',
    lastNameLabel: 'Apellido',
    openPrescription: 'Abrir receta',
    verificationFailed: 'Esos datos no coinciden con esta receta.',
    ...languageNames,
  },
  [Languages.FRENCH]: {
    cancelPrescription: 'Annuler cette ordonnance',
    cancelPrescriptionHelp: 'Si vous n\'avez plus besoin de cette ordonnance, vous pouvez l\'annuler. Votre équipe soignante en sera informée.',
    cancelReasonQuestion: 'Pourquoi l\'annulez-vous ?',
    cancelOptionalNote: 'Autre chose que votre équipe soignante devrait savoir ? (facultatif)',
    cancelConfirm: 'Annuler mon ordonnance',
    cancelKeep: 'La conserver',
    cancelledTitle: 'Cette ordonnance a été annulée',
    cancelledBody: 'Si vous avez toujours besoin de ce médicament, veuillez contacter votre médecin.',
    cancelFailed: 'Impossible d\'annuler cette ordonnance. Veuillez réessayer.',
    prescriptionDetails: "Détails de l'ordonnance",
    rxOrderCompleted: "Orientation d'ordonnance médicale terminée",
    contactDoctorRefill: 'Veuillez contacter votre médecin pour renouveler votre ordonnance.',
    expandQrCode: 'Agrandir le code QR',
    qrCode: 'Code QR',
    scanQrCode: "Scannez ce code QR pour votre orientation d'ordonnance médicale",
    qrCodeNotAvailable: 'Code QR non disponible',
    qrCodeDispensed: "Cette ordonnance a déjà été délivrée, son code QR n'est donc plus actif.",
    diagnosis: 'Diagnostic',
    prescriptions: 'Ordonnances',
    orderDetails: 'Détails de la commande',
    patientInformation: 'Informations sur le patient',
    doctorInformation: 'Informations sur le médecin',
    name: 'Nom',
    dateOfBirth: 'Date de naissance',
    country: 'Pays',
    city: 'Ville',
    doctorSpecialty: 'Spécialité du médecin',
    prescribingDoctor: 'Médecin prescripteur',
    prescribedDate: 'Date de prescription',
    validTill: "Valable jusqu'au",
    rxStatus: "Statut de l'ordonnance",
    notSpecified: 'Non précisé',
    loading: 'Chargement...',
    error: 'Erreur',
    noPrescriptionFound: 'Aucune ordonnance trouvée',
    selectLanguage: 'Choisir la langue',
    patientAndDoctorInfo: 'Informations sur le patient et le médecin',
    close: 'Fermer',
    enterAccessCode: "Saisissez votre code d'accès",
    accessCodeHelp: 'Votre médecin a envoyé un code à 6 chiffres dans votre discussion, juste après ce lien.',
    accessCodeLabel: "Code d'accès",
    unlock: "Voir l'ordonnance",
    wrongCode: 'Ce code est incorrect. Vérifiez votre discussion et réessayez.',
    attemptsRemaining: 'Tentatives restantes avant une courte attente',
    tooManyAttempts: 'Trop de tentatives. Veuillez patienter avant de réessayer.',
    askDoctorForNewCode: 'Demandez à votre médecin de vous envoyer un nouveau code.',
    verifyPatient: 'Vérifiez le patient',
    verifyPatientHelp: "Saisissez le nom de famille et la date de naissance du patient pour ouvrir cette ordonnance.",
    lastNameLabel: 'Nom de famille',
    openPrescription: "Ouvrir l'ordonnance",
    verificationFailed: 'Ces informations ne correspondent pas à cette ordonnance.',
    ...languageNames,
  },
};

/** Right-to-left scripts, so the page can set `dir` correctly. */
const RTL_LANGUAGES: ReadonlySet<Languages> = new Set([
  Languages.ARABIC,
  Languages.FARSI,
  Languages.PASHTO,
  Languages.URDU,
]);

export function isRtlLanguage(language: Languages): boolean {
  return RTL_LANGUAGES.has(language);
}

/** Bound lookup for a language, so views read `t('key')`. */
export function getPatientRxTranslator(language: Languages) {
  const table = patientRxTranslations[language];
  return (key: PatientRxTranslationKey): string => table[key];
}
