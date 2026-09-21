import React from "react";
import { motion } from "framer-motion";
import { useLanguageStore } from "@/stores/useLanguageStore";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

const LanguagePopover = () => {
    const { language: globalLanguage, setLanguage: setGlobalLanguage } = useLanguageStore();

    const handleLanguageSelect = (lang: "english" | "arabic" | "pashto" | "farsi") => {
        // Map local language to global format before setting
        const globalLangFormat = {
            english: 'English',
            arabic: 'Arabic',
            pashto: 'Pashto',
            farsi: 'Farsi'
        } as const;

        setGlobalLanguage(globalLangFormat[lang]);
    };

    // Map global language to local format for display
    const mapGlobalToLocalLanguage = (globalLang: string) => {
        switch (globalLang) {
            case 'English': return 'english';
            case 'Arabic': return 'arabic';
            case 'Pashto': return 'pashto';
            case 'Farsi': return 'farsi';
            default: return 'english';
        }
    };

    const currentLanguage = mapGlobalToLocalLanguage(globalLanguage);

    const getLanguageDisplay = (lang: string) => {
        switch (lang) {
            case "english":
                return "English";
            case "arabic":
                return "عربي";
            case "pashto":
                return "پښتو";
            case "farsi":
                return "فارسی";
            default:
                return "English";
        }
    };

    const languages = [
        { value: "english", label: "English" },
        { value: "arabic", label: "عربي" },
        { value: "pashto", label: "پښتو" },
        { value: "farsi", label: "فارسی" },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
        >
            <Popover>
                <PopoverTrigger asChild>
                    <button className="w-32 h-9 text-sm bg-card rounded-md border border-border shadow-xs px-3 text-left flex items-center justify-between hover:bg-muted transition-colors">
                        {getLanguageDisplay(currentLanguage)}
                        <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-32 p-0 z-50 bg-card rounded-md border border-border shadow-lg">
                    {languages.map((lang) => (
                        <button
                            key={lang.value}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleLanguageSelect(lang.value as "english" | "arabic" | "pashto" | "farsi");
                            }}
                            className="w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors first:rounded-t-md last:rounded-b-md"
                        >
                            {lang.label}
                        </button>
                    ))}
                </PopoverContent>
            </Popover>
        </motion.div>
    );
};

export default LanguagePopover;
