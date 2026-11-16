import { CONTACT_EMAIL } from '@firstline/shared/constants';
// apps/web/form-ui/telegram-patient/aboutPage/NewPatientTranslations.ts
import { getTelegramBotUrl } from '@/utils/telegram';

interface Step {
    title: string;
    description: string;
}

export interface TranslationContent {
    title: string;
    subtitlePart1: string;
    subtitlePart2: string;
    subtitlePart3: string;
    steps: Step[];
    getStarted: string;
    buttonText: string;
    helpText: string;
    contactInfo: string;
    telegramLink: string;
}

interface Translations {
    english: TranslationContent;
    arabic: TranslationContent;
    pashto: TranslationContent;
    farsi: TranslationContent;
}

export const newPatientTranslations: Translations = {
    english: {
        title: "New Patient Registration",
        subtitlePart1: "If you are a patient who needs a medical consultation and would like to register for our free telehealth app",
        subtitlePart2: "Firstline,",
        subtitlePart3: "please follow the steps below:",
        steps: [
            {
                title: "Click the button Below to chat with Our Firstline Telegram chatbot",
                description: "Connect with our team on Telegram. This ensures flexible, quick, and easy communication.",
            },
            {
                title: "Send Us a Message",
                description: "Once you click the button, you'll be redirected to our Telegram chat. Send us a text to start, and you will receive a link to our patient registration form-ui.",
            },
            {
                title: "Complete Your Registration",
                description: "Once you've submitted your registration form-ui, you will receive a confirmation text and a member of our medical team will reach out to you!",
            },
        ],
        getStarted: "Ready to Get Started?",
        buttonText: "Chat with Our Team on Telegram",
        helpText: "Need Help?",
        contactInfo: `If you have any issues or need further assistance, send us an email at ${CONTACT_EMAIL} or send us a message on Instagram @TODO-SET-INSTAGRAM.`,
        telegramLink: getTelegramBotUrl(),
    },
    arabic: {
        title: "تسجيل المرضى الجدد",
        subtitlePart1: "إذا كنت مريضًا يحتاج إلى استشارة طبية وترغب في التسجيل في تطبيقنا المجاني للرعاية الصحية عن بعد،",
        subtitlePart2: "Firstline,",
        subtitlePart3: "يرجى اتباع الخطوات أدناه:",
        steps: [
            {
                title: "اضغط على الزر أدناه للدردشة مع بوت تليجرام الخاص بـ Firstline",
                description: "تواصل مع فريقنا على تليجرام لضمان تواصل مرن وسريع وسهل.",
            },
            {
                title: "أرسل لنا رسالة",
                description: "عند الضغط على الزر، سيتم توجيهك إلى دردشة تليجرام. أرسل رسالة نصية للبدء وستتلقى رابطًا لنموذج تسجيل المرضى.",
            },
            {
                title: "أكمل تسجيلك",
                description: "بمجرد تقديم نموذج التسجيل الخاص بك، ستتلقى رسالة تأكيد وسيقوم أحد أفراد فريقنا الطبي بالتواصل معك!",
            },
        ],
        getStarted: "هل أنت مستعد للبدء؟",
        buttonText: "تواصل مع فريقنا على تليجرام",
        helpText: "تحتاج مساعدة؟",
        contactInfo: `إذا واجهت أي مشكلات أو كنت بحاجة إلى مساعدة إضافية، يرجى إرسال بريد إلكتروني إلى ${CONTACT_EMAIL} أو رسالة على إنستغرام @TODO-SET-INSTAGRAM.`,
        telegramLink: getTelegramBotUrl(),
    },
    pashto: {
        title: "د نوي ناروغ ثبت کول",
        subtitlePart1: "که تاسو یو ناروغ یاست چې طبي مشورې ته اړتیا لرئ او غواړئ زموږ د وړیا ټیلی هیلت ایپ لپاره نوم لیکنه وکړئ،",
        subtitlePart2: "Firstline,",
        subtitlePart3: "مهرباني وکړئ لاندې ګامونه تعقیب کړئ:",
        steps: [
            {
                title: "لاندې تڼۍ کېکاږئ ترڅو زموږ د Firstline ټلیګرام چټ بوټ سره خبرې وکړئ",
                description: "زموږ له ټیم سره په ټلیګرام اړیکه ونیسئ. دا د انعطاف وړ، چټک، او اسانه اړیکې ډاډ ورکوي.",
            },
            {
                title: "موږ ته یو پیغام واستوئ",
                description: "کله چې تاسو په تڼۍ کلیک وکړئ، تاسو به زموږ ټلیګرام چټ ته واستول شئ. د پیل لپاره موږ ته یو متن ولیکئ، او تاسو ته به زموږ د ناروغ ثبت فورم لپاره یو لینک واستول شي.",
            },
            {
                title: "خپله ثبت بشپړ کړئ",
                description: "کله چې تاسو د ثبت فورمه وسپارئ، تاسو ته به د تایید پیغام ترلاسه کړئ او زموږ د طبي ټیم غړی به تاسو سره اړیکه ونیسي!",
            },
        ],
        getStarted: "د پیل لپاره چمتو یاست؟",
        buttonText: "زموږ ټیم سره په ټلیګرام خبرې وکړئ",
        helpText: "مرستې ته اړتیا لرئ؟",
        contactInfo: `که تاسو کومه ستونزه لرئ یا اضافي مرستې ته اړتیا لرئ، موږ ته په ${CONTACT_EMAIL} بریښنالیک واستوئ یا زموږ انسټاګرام کې پیغام ولیکئ @TODO-SET-INSTAGRAM.`,
        telegramLink: getTelegramBotUrl(),
    },
    farsi: {
        title: "ثبت نام بیمار جدید",
        subtitlePart1: "اگر بیمار هستید که نیاز به مشاوره پزشکی دارید و می خواهید در برنامه رایگان بهداشت از راه دور ما ثبت نام کنید،",
        subtitlePart2: "Firstline",
        subtitlePart3: "لطفا مراحل زیر را دنبال کنید:",
        steps: [
            {
                title: "بر روی دکمه زیر کلیک کنید تا با ربات تلگرام Firstline گفتگو کنید",
                description: "با تیم ما در تلگرام ارتباط برقرار کنید. این امر ارتباط آسان، سریع و منعطف را تضمین می‌کند.",
            },
            {
                title: "برای ما پیامی ارسال کنید",
                description: "پس از کلیک بر روی دکمه، به چت تلگرام ما هدایت می‌شوید. برای شروع به ما پیامی ارسال کنید و لینک فرم ثبت نام بیمار را دریافت کنید.",
            },
            {
                title: "ثبت نام خود را کامل کنید",
                description: "پس از ارسال فرم ثبت نام خود، یک پیام تأیید دریافت خواهید کرد و یکی از اعضای تیم پزشکی ما با شما تماس خواهد گرفت!",
            },
        ],
        getStarted: "آماده شروع هستید؟",
        buttonText: "با تیم ما در تلگرام گفتگو کنید",
        helpText: "نیاز به کمک دارید؟",
        contactInfo: `اگر مشکلی دارید یا به کمک بیشتری نیاز دارید، لطفاً یک ایمیل به ${CONTACT_EMAIL} ارسال کنید یا به ما در اینستاگرام پیام دهید @TODO-SET-INSTAGRAM.`,
        telegramLink: getTelegramBotUrl(),
    },
};