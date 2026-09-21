// apps/web/components/patient-chart/videocall/video-call-patient-translations.ts
//
// Every string the patient sees at /call?invite=<token>.
//
// The patient side of a consult is the one surface in this app where English is
// never a safe default: the audience is, by definition, whoever the clinic is
// treating. That includes the photo-consent prompt, which is the only place a
// patient is asked to agree to something — a prompt they cannot read is not
// consent.
//
// Shape follows access-denied-translations.ts: one entry per string key, each
// holding every language, plus a getter that falls back to English rather than
// rendering `undefined`.

import type { LanguageString } from "../../telegram-patient/container/intake-form/patient-form-translations";
import { languageEnumToString } from "../../telegram-patient/container/intake-form/patient-form-translations";

type VideoCallTranslationsType = {
  // --- Call shell ---
  connecting: Record<LanguageString, string>;
  callWithDoctor: Record<LanguageString, string>;
  videoCall: Record<LanguageString, string>;
  callEnded: Record<LanguageString, string>;
  callEndedByDoctor: Record<LanguageString, string>;
  doctorLeftWaiting: Record<LanguageString, string>;
  closeWindow: Record<LanguageString, string>;
  linkInvalid: Record<LanguageString, string>;
  linkExpired: Record<LanguageString, string>;
  connectionFailed: Record<LanguageString, string>;
  tryAgain: Record<LanguageString, string>;

  // --- Transcription consent (pre-join) ---
  transcriptionTitle: Record<LanguageString, string>;
  transcriptionBody: Record<LanguageString, string>;
  transcriptionAllow: Record<LanguageString, string>;
  transcriptionJoinWithout: Record<LanguageString, string>;
  transcriptionActiveBanner: Record<LanguageString, string>;
  transcriptionStop: Record<LanguageString, string>;
  transcriptionStopped: Record<LanguageString, string>;

  // --- Call surface: stage + controls ---
  reconnecting: Record<LanguageString, string>;
  waitingForDoctor: Record<LanguageString, string>;
  cameraOffNotice: Record<LanguageString, string>;
  fitWholeVideo: Record<LanguageString, string>;
  fillFrame: Record<LanguageString, string>;
  muteMic: Record<LanguageString, string>;
  unmuteMic: Record<LanguageString, string>;
  turnCameraOff: Record<LanguageString, string>;
  turnCameraOn: Record<LanguageString, string>;
  endCall: Record<LanguageString, string>;

  // --- Photo consent ---
  consentTitle: Record<LanguageString, string>;
  consentBody: Record<LanguageString, string>;
  consentAllow: Record<LanguageString, string>;
  consentDeny: Record<LanguageString, string>;

  // --- Capture feedback ---
  photoSavedBanner: Record<LanguageString, string>;
  photosHeading: Record<LanguageString, string>;

  // --- Patient-initiated delete ---
  deletePhoto: Record<LanguageString, string>;
  deleteConfirmTitle: Record<LanguageString, string>;
  deleteConfirmBody: Record<LanguageString, string>;
  deleteConfirmYes: Record<LanguageString, string>;
  deleteConfirmCancel: Record<LanguageString, string>;
  deleteFailed: Record<LanguageString, string>;
};

export const videoCallPatientTranslations: VideoCallTranslationsType = {
  connecting: {
    English: "Connecting to your video call…",
    Arabic: "جارٍ الاتصال بمكالمة الفيديو…",
    Farsi: "در حال اتصال به تماس تصویری شما…",
    Pashto: "ستاسو ویډیو زنګ سره نښلول کیږي…",
    Turkish: "Görüntülü görüşmenize bağlanılıyor…",
    Urdu: "آپ کی ویڈیو کال سے منسلک ہو رہے ہیں…",
    Spanish: "Conectando a su videollamada…",
    French: "Connexion à votre appel vidéo…",
  },
  callWithDoctor: {
    English: "Video call with {name}",
    Arabic: "مكالمة فيديو مع {name}",
    Farsi: "تماس تصویری با {name}",
    Pashto: "د {name} سره ویډیو زنګ",
    Turkish: "{name} ile görüntülü görüşme",
    Urdu: "{name} کے ساتھ ویڈیو کال",
    Spanish: "Videollamada con {name}",
    French: "Appel vidéo avec {name}",
  },
  videoCall: {
    English: "Video call",
    Arabic: "مكالمة فيديو",
    Farsi: "تماس تصویری",
    Pashto: "ویډیو زنګ",
    Turkish: "Görüntülü görüşme",
    Urdu: "ویڈیو کال",
    Spanish: "Videollamada",
    French: "Appel vidéo",
  },
  callEnded: {
    English: "Call ended",
    Arabic: "انتهت المكالمة",
    Farsi: "تماس پایان یافت",
    Pashto: "زنګ پای ته ورسید",
    Turkish: "Görüşme sona erdi",
    Urdu: "کال ختم ہو گئی",
    Spanish: "Llamada finalizada",
    French: "Appel terminé",
  },
  callEndedByDoctor: {
    English: "Your doctor has ended the call",
    Arabic: "أنهى طبيبك المكالمة",
    Farsi: "پزشک شما تماس را پایان داد",
    Pashto: "ستاسو ډاکټر زنګ پای ته ورساوه",
    Turkish: "Doktorunuz görüşmeyi sonlandırdı",
    Urdu: "آپ کے ڈاکٹر نے کال ختم کر دی ہے",
    Spanish: "Su médico ha finalizado la llamada",
    French: "Votre médecin a mis fin à l'appel",
  },
  doctorLeftWaiting: {
    English: "Your doctor has left the call. Waiting for them to return…",
    Arabic: "غادر طبيبك المكالمة. في انتظار عودته…",
    Farsi: "پزشک شما تماس را ترک کرد. در انتظار بازگشت او…",
    Pashto: "ستاسو ډاکټر زنګ پریښود. د هغه د بیرته راتګ په تمه…",
    Turkish: "Doktorunuz görüşmeden ayrıldı. Geri dönmesi bekleniyor…",
    Urdu: "آپ کے ڈاکٹر نے کال چھوڑ دی ہے۔ ان کی واپسی کا انتظار…",
    Spanish: "Su médico ha salido de la llamada. Esperando su regreso…",
    French: "Votre médecin a quitté l'appel. En attente de son retour…",
  },
  closeWindow: {
    English: "You can close this window.",
    Arabic: "يمكنك إغلاق هذه النافذة.",
    Farsi: "می‌توانید این پنجره را ببندید.",
    Pashto: "تاسو کولی شئ دا کړکۍ وتړئ.",
    Turkish: "Bu pencereyi kapatabilirsiniz.",
    Urdu: "آپ یہ ونڈو بند کر سکتے ہیں۔",
    Spanish: "Puede cerrar esta ventana.",
    French: "Vous pouvez fermer cette fenêtre.",
  },
  linkInvalid: {
    English: "This video call link is not valid.",
    Arabic: "رابط مكالمة الفيديو هذا غير صالح.",
    Farsi: "این پیوند تماس تصویری معتبر نیست.",
    Pashto: "د ویډیو زنګ دا لینک معتبر نه دی.",
    Turkish: "Bu görüntülü görüşme bağlantısı geçerli değil.",
    Urdu: "یہ ویڈیو کال لنک درست نہیں ہے۔",
    Spanish: "Este enlace de videollamada no es válido.",
    French: "Ce lien d'appel vidéo n'est pas valide.",
  },
  linkExpired: {
    English: "This video call has ended or the link has expired.",
    Arabic: "انتهت مكالمة الفيديو هذه أو انتهت صلاحية الرابط.",
    Farsi: "این تماس تصویری پایان یافته یا پیوند منقضی شده است.",
    Pashto: "دا ویډیو زنګ پای ته رسیدلی یا لینک یې پای ته رسیدلی دی.",
    Turkish: "Bu görüntülü görüşme sona erdi veya bağlantının süresi doldu.",
    Urdu: "یہ ویڈیو کال ختم ہو چکی ہے یا لنک کی میعاد ختم ہو گئی ہے۔",
    Spanish: "Esta videollamada ha terminado o el enlace ha caducado.",
    French: "Cet appel vidéo est terminé ou le lien a expiré.",
  },
  connectionFailed: {
    English: "Could not connect. Please check your connection and try again.",
    Arabic: "تعذر الاتصال. يرجى التحقق من اتصالك والمحاولة مرة أخرى.",
    Farsi: "اتصال برقرار نشد. لطفاً اتصال خود را بررسی کنید و دوباره تلاش کنید.",
    Pashto: "نښلول ونشو. مهرباني وکړئ خپل انټرنټ وګورئ او بیا هڅه وکړئ.",
    Turkish: "Bağlanılamadı. Lütfen bağlantınızı kontrol edip tekrar deneyin.",
    Urdu: "منسلک نہیں ہو سکا۔ براہ کرم اپنا کنکشن چیک کریں اور دوبارہ کوشش کریں۔",
    Spanish: "No se pudo conectar. Compruebe su conexión e inténtelo de nuevo.",
    French: "Connexion impossible. Vérifiez votre connexion et réessayez.",
  },
  tryAgain: {
    English: "Try again",
    Arabic: "حاول مرة أخرى",
    Farsi: "دوباره تلاش کنید",
    Pashto: "بیا هڅه وکړئ",
    Turkish: "Tekrar dene",
    Urdu: "دوبارہ کوشش کریں",
    Spanish: "Intentar de nuevo",
    French: "Réessayer",
  },

  // --- Transcription consent (pre-join) ---
  //
  // Plain language on purpose. This is asked of people who are often unwell, on
  // a phone, in a second language. "Consent to audio processing" is not
  // informed consent; "the doctor's phone can write down what is said" is.
  transcriptionTitle: {
    English: "Notes from this call",
    Arabic: "ملاحظات من هذه المكالمة",
    Farsi: "یادداشت‌های این تماس",
    Pashto: "د دې زنګ یادښتونه",
    Turkish: "Bu görüşmeden notlar",
    Urdu: "اس کال سے نوٹس",
    Spanish: "Notas de esta llamada",
    French: "Notes de cet appel",
  },
  transcriptionBody: {
    English:
      "Your doctor's phone can write down what is said, so it can be added to your medical record. A temporary recording stays on their phone until the notes are written, then it is deleted. It is not shared with anyone else. You can join without this, and you can stop it at any time during the call.",
    Arabic:
      "يمكن لهاتف طبيبك تدوين ما يُقال لإضافته إلى سجلك الطبي. يبقى تسجيل مؤقت على هاتفه حتى تُكتب الملاحظات، ثم يُحذف. ولا تتم مشاركته مع أي شخص آخر. يمكنك الانضمام بدون ذلك، ويمكنك إيقافه في أي وقت أثناء المكالمة.",
    Farsi:
      "تلفن پزشک شما می‌تواند آنچه گفته می‌شود را بنویسد تا به پرونده پزشکی شما اضافه شود. یک ضبط موقت تا نوشتن یادداشت‌ها روی تلفن او می‌ماند و سپس حذف می‌شود. با کسی دیگر به اشتراک گذاشته نمی‌شود. می‌توانید بدون آن بپیوندید و هر زمان در طول تماس آن را متوقف کنید.",
    Pashto:
      "ستاسو د ډاکټر تلیفون کولی شي هغه څه ولیکي چې ویل کیږي، ترڅو ستاسو طبي ریکارډ ته اضافه شي. یو لنډمهاله ثبت د هغه په تلیفون کې پاتې کیږي تر څو یادښتونه ولیکل شي، بیا ړنګیږي. له بل چا سره نه شریکیږي. تاسو کولی شئ پرته له دې یوځای شئ، او د زنګ په جریان کې یې هر وخت ودروئ.",
    Turkish:
      "Doktorunuzun telefonu, tıbbi kaydınıza eklenmek üzere söylenenleri yazabilir. Notlar yazılana kadar telefonunda geçici bir kayıt kalır, sonra silinir. Başka kimseyle paylaşılmaz. Bu olmadan da katılabilir, görüşme sırasında istediğiniz zaman durdurabilirsiniz.",
    Urdu:
      "آپ کے ڈاکٹر کا فون جو کہا جاتا ہے اسے لکھ سکتا ہے تاکہ آپ کے طبی ریکارڈ میں شامل کیا جا سکے۔ نوٹس لکھے جانے تک ان کے فون پر ایک عارضی ریکارڈنگ رہتی ہے، پھر حذف ہو جاتی ہے۔ یہ کسی اور کے ساتھ شیئر نہیں کی جاتی۔ آپ اس کے بغیر شامل ہو سکتے ہیں، اور کال کے دوران کسی بھی وقت روک سکتے ہیں۔",
    Spanish:
      "El teléfono de su médico puede escribir lo que se dice para añadirlo a su historial médico. Se guarda una grabación temporal en su teléfono hasta que se escriban las notas y luego se elimina. No se comparte con nadie más. Puede unirse sin esto y puede detenerlo en cualquier momento durante la llamada.",
    French:
      "Le téléphone de votre médecin peut noter ce qui est dit afin de l'ajouter à votre dossier médical. Un enregistrement temporaire reste sur son téléphone jusqu'à la rédaction des notes, puis il est supprimé. Il n'est partagé avec personne d'autre. Vous pouvez rejoindre sans cela et l'arrêter à tout moment pendant l'appel.",
  },
  transcriptionAllow: {
    English: "Join and allow notes",
    Arabic: "الانضمام والسماح بالملاحظات",
    Farsi: "پیوستن و اجازه یادداشت",
    Pashto: "یوځای شئ او یادښتونو ته اجازه ورکړئ",
    Turkish: "Katıl ve notlara izin ver",
    Urdu: "شامل ہوں اور نوٹس کی اجازت دیں",
    Spanish: "Unirse y permitir notas",
    French: "Rejoindre et autoriser les notes",
  },
  transcriptionJoinWithout: {
    English: "Join without notes",
    Arabic: "الانضمام بدون ملاحظات",
    Farsi: "پیوستن بدون یادداشت",
    Pashto: "پرته له یادښتونو یوځای شئ",
    Turkish: "Notlar olmadan katıl",
    Urdu: "نوٹس کے بغیر شامل ہوں",
    Spanish: "Unirse sin notas",
    French: "Rejoindre sans notes",
  },
  transcriptionActiveBanner: {
    English: "Notes are being written on the doctor's phone",
    Arabic: "تتم كتابة الملاحظات على هاتف الطبيب",
    Farsi: "یادداشت‌ها روی تلفن پزشک نوشته می‌شود",
    Pashto: "یادښتونه د ډاکټر په تلیفون کې لیکل کیږي",
    Turkish: "Notlar doktorun telefonunda yazılıyor",
    Urdu: "نوٹس ڈاکٹر کے فون پر لکھے جا رہے ہیں",
    Spanish: "Se están escribiendo notas en el teléfono del médico",
    French: "Des notes sont prises sur le téléphone du médecin",
  },
  transcriptionStop: {
    English: "Stop notes",
    Arabic: "إيقاف الملاحظات",
    Farsi: "توقف یادداشت‌ها",
    Pashto: "یادښتونه ودروئ",
    Turkish: "Notları durdur",
    Urdu: "نوٹس روکیں",
    Spanish: "Detener notas",
    French: "Arrêter les notes",
  },
  transcriptionStopped: {
    English: "Notes stopped",
    Arabic: "تم إيقاف الملاحظات",
    Farsi: "یادداشت‌ها متوقف شد",
    Pashto: "یادښتونه ودرېدل",
    Turkish: "Notlar durduruldu",
    Urdu: "نوٹس روک دیے گئے",
    Spanish: "Notas detenidas",
    French: "Notes arrêtées",
  },

  consentTitle: {
    English: "May your doctor save photos?",
    Arabic: "هل تسمح لطبيبك بحفظ الصور؟",
    Farsi: "آیا پزشک شما می‌تواند عکس ذخیره کند؟",
    Pashto: "ایا ستاسو ډاکټر کولی شي عکسونه خوندي کړي؟",
    Turkish: "Doktorunuz fotoğraf kaydedebilir mi?",
    Urdu: "کیا آپ کا ڈاکٹر تصاویر محفوظ کر سکتا ہے؟",
    Spanish: "¿Permite que su médico guarde fotos?",
    French: "Autorisez-vous votre médecin à enregistrer des photos ?",
  },
  consentBody: {
    English:
      "{name} would like to save photos from your camera during this call and add them to your medical record. You can remove any photo afterwards.",
    Arabic:
      "يرغب {name} في حفظ صور من الكاميرا الخاصة بك أثناء هذه المكالمة وإضافتها إلى سجلك الطبي. يمكنك حذف أي صورة لاحقًا.",
    Farsi:
      "{name} می‌خواهد در طول این تماس از دوربین شما عکس ذخیره کند و آن‌ها را به پرونده پزشکی شما اضافه کند. می‌توانید بعداً هر عکسی را حذف کنید.",
    Pashto:
      "{name} غواړي د دې زنګ پر مهال ستاسو له کیمرې څخه عکسونه خوندي کړي او ستاسو طبي دوسیې ته یې اضافه کړي. تاسو کولی شئ وروسته هر عکس لرې کړئ.",
    Turkish:
      "{name} bu görüşme sırasında kameranızdan fotoğraf kaydedip tıbbi kaydınıza eklemek istiyor. Herhangi bir fotoğrafı daha sonra kaldırabilirsiniz.",
    Urdu:
      "{name} اس کال کے دوران آپ کے کیمرے سے تصاویر محفوظ کرکے آپ کے طبی ریکارڈ میں شامل کرنا چاہتے ہیں۔ آپ بعد میں کوئی بھی تصویر ہٹا سکتے ہیں۔",
    Spanish:
      "{name} desea guardar fotos de su cámara durante esta llamada y añadirlas a su historial médico. Puede eliminar cualquier foto después.",
    French:
      "{name} souhaite enregistrer des photos de votre caméra pendant cet appel et les ajouter à votre dossier médical. Vous pourrez supprimer toute photo ensuite.",
  },
  consentAllow: {
    English: "Allow",
    Arabic: "أسمح",
    Farsi: "اجازه می‌دهم",
    Pashto: "اجازه ورکړئ",
    Turkish: "İzin ver",
    Urdu: "اجازت دیں",
    Spanish: "Permitir",
    French: "Autoriser",
  },
  consentDeny: {
    English: "Not now",
    Arabic: "ليس الآن",
    Farsi: "اکنون نه",
    Pashto: "اوس نه",
    Turkish: "Şimdi değil",
    Urdu: "ابھی نہیں",
    Spanish: "Ahora no",
    French: "Pas maintenant",
  },

  photoSavedBanner: {
    English: "Your doctor saved a photo from this call.",
    Arabic: "حفظ طبيبك صورة من هذه المكالمة.",
    Farsi: "پزشک شما عکسی از این تماس ذخیره کرد.",
    Pashto: "ستاسو ډاکټر د دې زنګ څخه یو عکس خوندي کړ.",
    Turkish: "Doktorunuz bu görüşmeden bir fotoğraf kaydetti.",
    Urdu: "آپ کے ڈاکٹر نے اس کال سے ایک تصویر محفوظ کی۔",
    Spanish: "Su médico guardó una foto de esta llamada.",
    French: "Votre médecin a enregistré une photo de cet appel.",
  },
  photosHeading: {
    English: "Photos saved during this call",
    Arabic: "الصور المحفوظة خلال هذه المكالمة",
    Farsi: "عکس‌های ذخیره‌شده در این تماس",
    Pashto: "د دې زنګ پر مهال خوندي شوي عکسونه",
    Turkish: "Bu görüşme sırasında kaydedilen fotoğraflar",
    Urdu: "اس کال کے دوران محفوظ کی گئی تصاویر",
    Spanish: "Fotos guardadas durante esta llamada",
    French: "Photos enregistrées pendant cet appel",
  },

  deletePhoto: {
    English: "Delete photo",
    Arabic: "حذف الصورة",
    Farsi: "حذف عکس",
    Pashto: "عکس ړنګ کړئ",
    Turkish: "Fotoğrafı sil",
    Urdu: "تصویر حذف کریں",
    Spanish: "Eliminar foto",
    French: "Supprimer la photo",
  },
  deleteConfirmTitle: {
    English: "Delete this photo?",
    Arabic: "هل تريد حذف هذه الصورة؟",
    Farsi: "این عکس حذف شود؟",
    Pashto: "دا عکس ړنګ کړئ؟",
    Turkish: "Bu fotoğraf silinsin mi?",
    Urdu: "یہ تصویر حذف کریں؟",
    Spanish: "¿Eliminar esta foto?",
    French: "Supprimer cette photo ?",
  },
  deleteConfirmBody: {
    English:
      "The photo will be permanently removed from your medical record. This cannot be undone.",
    Arabic: "ستتم إزالة الصورة نهائيًا من سجلك الطبي. لا يمكن التراجع عن ذلك.",
    Farsi:
      "این عکس برای همیشه از پرونده پزشکی شما حذف می‌شود. این کار قابل بازگشت نیست.",
    Pashto:
      "عکس به ستاسو له طبي دوسیې څخه د تل لپاره لرې شي. دا بیرته نشي کیدی.",
    Turkish:
      "Fotoğraf tıbbi kaydınızdan kalıcı olarak silinecek. Bu işlem geri alınamaz.",
    Urdu:
      "تصویر آپ کے طبی ریکارڈ سے مستقل طور پر ہٹا دی جائے گی۔ اسے واپس نہیں لایا جا سکتا۔",
    Spanish:
      "La foto se eliminará permanentemente de su historial médico. Esto no se puede deshacer.",
    French:
      "La photo sera définitivement supprimée de votre dossier médical. Cette action est irréversible.",
  },
  deleteConfirmYes: {
    English: "Delete",
    Arabic: "حذف",
    Farsi: "حذف",
    Pashto: "ړنګ کړئ",
    Turkish: "Sil",
    Urdu: "حذف کریں",
    Spanish: "Eliminar",
    French: "Supprimer",
  },
  deleteConfirmCancel: {
    English: "Keep",
    Arabic: "احتفظ بها",
    Farsi: "نگه‌داشتن",
    Pashto: "وساتئ",
    Turkish: "Sakla",
    Urdu: "رکھیں",
    Spanish: "Conservar",
    French: "Conserver",
  },
  reconnecting: {
    English: "Reconnecting…",
    Arabic: "جارٍ إعادة الاتصال…",
    Farsi: "در حال اتصال مجدد…",
    Pashto: "بیا نښلول کیږي…",
    Turkish: "Yeniden bağlanılıyor…",
    Urdu: "دوبارہ منسلک ہو رہا ہے…",
    Spanish: "Reconectando…",
    French: "Reconnexion…",
  },
  waitingForDoctor: {
    English: "Waiting for your doctor to join…",
    Arabic: "في انتظار انضمام طبيبك…",
    Farsi: "در انتظار پیوستن پزشک شما…",
    Pashto: "ستاسو د ډاکټر د راتګ په تمه…",
    Turkish: "Doktorunuzun katılması bekleniyor…",
    Urdu: "آپ کے ڈاکٹر کے شامل ہونے کا انتظار…",
    Spanish: "Esperando a que su médico se una…",
    French: "En attente de votre médecin…",
  },
  cameraOffNotice: {
    English: "Their camera is off",
    Arabic: "الكاميرا الخاصة بهم مغلقة",
    Farsi: "دوربین آن‌ها خاموش است",
    Pashto: "د هغوی کیمره بنده ده",
    Turkish: "Kamerası kapalı",
    Urdu: "ان کا کیمرہ بند ہے",
    Spanish: "Su cámara está apagada",
    French: "Leur caméra est éteinte",
  },
  fitWholeVideo: {
    English: "Show the whole video",
    Arabic: "عرض الفيديو كاملاً",
    Farsi: "نمایش کل تصویر",
    Pashto: "بشپړه ویډیو وښایاست",
    Turkish: "Videonun tamamını göster",
    Urdu: "پوری ویڈیو دکھائیں",
    Spanish: "Mostrar el vídeo completo",
    French: "Afficher toute la vidéo",
  },
  fillFrame: {
    English: "Fill the frame",
    Arabic: "ملء الإطار",
    Farsi: "پر کردن کادر",
    Pashto: "چوکاټ ډک کړئ",
    Turkish: "Çerçeveyi doldur",
    Urdu: "فریم بھریں",
    Spanish: "Llenar el marco",
    French: "Remplir le cadre",
  },
  muteMic: {
    English: "Mute microphone",
    Arabic: "كتم الميكروفون",
    Farsi: "بی‌صدا کردن میکروفون",
    Pashto: "مایکروفون بند کړئ",
    Turkish: "Mikrofonu kapat",
    Urdu: "مائیکروفون خاموش کریں",
    Spanish: "Silenciar micrófono",
    French: "Couper le micro",
  },
  unmuteMic: {
    English: "Unmute microphone",
    Arabic: "إلغاء كتم الميكروفون",
    Farsi: "باصدا کردن میکروفون",
    Pashto: "مایکروفون خلاص کړئ",
    Turkish: "Mikrofonu aç",
    Urdu: "مائیکروفون کھولیں",
    Spanish: "Activar micrófono",
    French: "Activer le micro",
  },
  turnCameraOff: {
    English: "Turn camera off",
    Arabic: "إيقاف الكاميرا",
    Farsi: "خاموش کردن دوربین",
    Pashto: "کیمره بنده کړئ",
    Turkish: "Kamerayı kapat",
    Urdu: "کیمرہ بند کریں",
    Spanish: "Apagar cámara",
    French: "Désactiver la caméra",
  },
  turnCameraOn: {
    English: "Turn camera on",
    Arabic: "تشغيل الكاميرا",
    Farsi: "روشن کردن دوربین",
    Pashto: "کیمره خلاصه کړئ",
    Turkish: "Kamerayı aç",
    Urdu: "کیمرہ آن کریں",
    Spanish: "Encender cámara",
    French: "Activer la caméra",
  },
  endCall: {
    English: "End call",
    Arabic: "إنهاء المكالمة",
    Farsi: "پایان تماس",
    Pashto: "زنګ پای ته ورسوئ",
    Turkish: "Görüşmeyi bitir",
    Urdu: "کال ختم کریں",
    Spanish: "Finalizar llamada",
    French: "Terminer l'appel",
  },
  deleteFailed: {
    English: "Could not delete the photo. Please try again.",
    Arabic: "تعذر حذف الصورة. يرجى المحاولة مرة أخرى.",
    Farsi: "حذف عکس ممکن نشد. لطفاً دوباره تلاش کنید.",
    Pashto: "عکس ړنګ نشو. مهرباني وکړئ بیا هڅه وکړئ.",
    Turkish: "Fotoğraf silinemedi. Lütfen tekrar deneyin.",
    Urdu: "تصویر حذف نہیں ہو سکی۔ براہ کرم دوبارہ کوشش کریں۔",
    Spanish: "No se pudo eliminar la foto. Inténtelo de nuevo.",
    French: "Impossible de supprimer la photo. Veuillez réessayer.",
  },
};

/**
 * Look up one string in the patient's language, falling back to English.
 *
 * `vars` fills `{placeholder}` tokens — used for the clinician's name, which is
 * the only value interpolated into patient-facing copy. Substituting rather
 * than concatenating keeps the name in the right place for languages whose
 * word order differs from English.
 */
export function getVideoCallTranslation(
  section: keyof VideoCallTranslationsType,
  language: string | LanguageString | null | undefined,
  vars?: Record<string, string>,
): string {
  const safeLang = languageEnumToString(language ?? "English");
  const entry = videoCallPatientTranslations[section];
  const template = entry[safeLang] || entry.English;

  if (!vars) return template;

  return Object.entries(vars).reduce(
    (text, [key, value]) => text.split(`{${key}}`).join(value),
    template,
  );
}
