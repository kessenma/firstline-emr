// apps/web/components/telegram-patient/aboutPage/NewPatientTimeline.tsx
"use client"

import React, { useRef, useEffect, useState, useMemo } from "react";
import { motion, useTransform, useInView, useAnimation, useScroll } from "framer-motion";
import { Send } from "lucide-react";
import { ContainerScroll } from "./container-scroll-animation";
import Image from "next/image";
import { Spotlight } from "@/components/telegram-patient/aboutPage/Spotlight";
import StepItem from "./StepItem";
import { newPatientTranslations, TranslationContent } from "./NewPatientTranslations";
import AnimatedLogo from "@/components/telegram-patient/aboutPage/AnimatedLogo";
import { useLanguageStore } from "@/stores/useLanguageStore";


interface NewPatientWithTimelineProps {
    initialLanguage?: 'english' | 'arabic' | 'pashto' | 'farsi';
}

export default function NewPatientTimeline({ initialLanguage = 'english' }: NewPatientWithTimelineProps) {
    const { language: globalLanguage, setLanguage: setGlobalLanguage } = useLanguageStore();
    const [containerHeight, setContainerHeight] = useState(0);
    const controls = useAnimation();
    const stepsRef = useRef(null);
    const isStepsInView = useInView(stepsRef, { once: true, amount: 0.3 });

    const getStartedRef = useRef(null);
    const spotlightRef = useRef(null);
    const isSpotlightInView = useInView(spotlightRef, { once: true, amount: 0.3 });

    // Map global language to local format
    const mapGlobalToLocalLanguage = (globalLang: any) => {
        switch (globalLang) {
            case 'English': return 'english';
            case 'Arabic': return 'arabic';
            case 'Pashto': return 'pashto';
            case 'Farsi': return 'farsi';
            default: return 'english';
        }
    };

    // Map local language to global format
    const mapLocalToGlobalLanguage = (localLang: string) => {
        switch (localLang) {
            case 'english': return 'English';
            case 'arabic': return 'Arabic';
            case 'pashto': return 'Pashto';
            case 'farsi': return 'Farsi';
            default: return 'English';
        }
    };

    const language = mapGlobalToLocalLanguage(globalLanguage);
    const content: TranslationContent = newPatientTranslations[language];

    // Update global language when prop changes
    useEffect(() => {
        setGlobalLanguage(mapLocalToGlobalLanguage(initialLanguage));
    }, [initialLanguage, setGlobalLanguage]);

    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    const lineHeight = useTransform(scrollYProgress, [0, 1], [0, containerHeight]);

    useEffect(() => {
        if (containerRef.current) {
            setContainerHeight(containerRef.current.offsetHeight);
        }
    }, []);

    useEffect(() => {
        if (isStepsInView) {
            controls.start("visible");
        }
    }, [isStepsInView, controls]);

    const isRTL = language !== 'english';

    const renderedSteps = useMemo(() => {
        return content.steps.map((step, index) => (
            <StepItem key={index} step={step} index={index} controls={controls} isRTL={isRTL} />
        ));
    }, [content.steps, controls, isRTL]);

    return (
        <div ref={containerRef} className={`relative max-w-5xl mx-auto p-6 ${isRTL ? 'rtl' : 'ltr'}`}>

            
            {/* Timeline Content Container */}
            <div className="overflow-hidden">
                {/* Timeline Line */}
            {isStepsInView && (
                <div className={`absolute ${isRTL ? 'right-6 mr-4' : 'left-6 ml-4'} top-0 bottom-0 w-0.5`}>
                    <motion.div
                        className="w-full h-full"
                        style={{
                            height: lineHeight,
                            background: "linear-gradient(to bottom, hsl(var(--background)), hsl(var(--primary)))",
                            transformOrigin: "top"
                        }}
                    />
                </div>
            )}

            <div className="flex justify-center mb-8">
                <AnimatedLogo/>
            </div>

            {/* Title */}
            <motion.h1
                className="relative z-10 pb-24 -mr-10 mb-4 -ml-10 text-2xl font-bold text-center text-primary"
                initial={{opacity: 0, y: -20}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.8, ease: "easeOut"}}
            >
                {content.title}
            </motion.h1>

            {/* Subtitle */}
            <motion.div
                className={`text-foreground pb-12 relative z-10 border-primary ${isRTL ? 'pr-8 pl-4 mr-4 ml-4 text-right border-r-2' : 'pr-4 pl-8 ml-4 text-left border-l-2'}`}
                initial={{opacity: 0, y: -10}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.8, delay: 0.2, ease: "easeOut"}}
            >
                <p>
                    {content.subtitlePart1}{' '}
                    <span className="font-bold text-primary">{content.subtitlePart2}</span>{' '}
                    {content.subtitlePart3}
                </p>
            </motion.div>

            {/* Steps */}
            <div className="relative z-10 mx-auto mt-12 space-y-6 max-w-2xl" ref={stepsRef}>
                {renderedSteps}
            </div>
            {/* Spotlight */}
            <div ref={spotlightRef} className="absolute top-0 right-0 w-full h-screen -mt-48">
                <Spotlight className="z-0" fill="hsl(var(--primary))" isInView={isSpotlightInView}/>
            </div>

            {/* Get Started Section with Spotlight */}
            <div className="overflow-hidden relative my-16" ref={getStartedRef}>

                <motion.div
                    className="relative z-10 text-center"
                    initial={{opacity: 0, y: 20}}
                    animate={{opacity: 1, y: 0}}
                    transition={{duration: 0.8, delay: 1.2, ease: "easeOut"}}
                >
                    <a
                        href={content.telegramLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-6 py-2 font-bold text-primary-foreground rounded transition-transform duration-200 ease-in-out bg-primary hover:bg-primary/90 hover:scale-105 active:scale-95 hover:shadow-xl" 
                    >
                        <Send className={isRTL ? 'ml-2' : 'mr-2'}/>
                        <span>{content.buttonText}</span>
                    </a>
                </motion.div>

                {/* Get Started Content */}
                <ContainerScroll
                    titleComponent={
                        <h2 className="relative z-10 text-2xl font-semibold">{content.getStarted}</h2>
                    }
                >
                    <div className="relative z-10 p-6 bg-opacity-80 rounded-lg">
                        <Image
                            src="/assets/images/fajr-telegram-bot.svg"
                            alt="Telegram Chat"
                            width={600}
                            height={600}
                            className="object-contain mx-auto w-full h-auto"
                        />
                    </div>
                </ContainerScroll>
            </div>

            {/* Map Image Section */}
            <div className="relative mt-4">
                <div className="flex absolute inset-0 z-0 justify-center items-center translate-y-16">
                    <Image
                        src="/assets/images/map.png"
                        alt="Map"
                        width={800}
                        height={600}
                        className="w-2/3 opacity-20"
                    />
                </div>
            </div>

            {/* Help Section */}
            <motion.div
                className="relative z-10 mt-8 text-center"
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                transition={{duration: 0.8, delay: 1.5, ease: "easeOut"}}
            >
                <h3 className="mt-48 text-lg font-semibold text-foreground">{content.helpText}</h3>
                <p className="mr-12 ml-12 text-sm text-muted-foreground">{content.contactInfo}</p>
            </motion.div>
            </div>
        </div>
    );
}
