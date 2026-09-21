// apps/web/form-ui/telegram-patient/aboutPage/StepItem.tsx
import React, { useRef, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

interface Step {
    title: string;
    description: string;
}

interface StepItemProps {
    step: Step;
    index: number;
    controls: any;
    isRTL: boolean;
}

const StepItem = React.memo(function StepItem({ step, index, controls, isRTL }: StepItemProps) {
    const ref = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "end start"]
    });

    const backgroundColor = useTransform(
        scrollYProgress,
        [0, 0.5, 1],
        ["hsl(var(--primary) / 0.2)", "hsl(var(--primary) / 0.6)", "hsl(var(--primary))"]
    );

    return (
        <motion.div
            ref={ref}
            key={index}
            className={`relative flex items-start ${isRTL ? 'flex-row-reverse' : 'flex-row'} w-full`}
            initial="hidden"
            animate={controls}
            variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.6, delay: index * 0.2 }}
        >
            <motion.div
                className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full text-primary-foreground font-bold border-2 ${isRTL ? 'ml-4' : 'mr-4'}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                    duration: 0.4,
                    delay: 0.6 + index * 0.2,
                    ease: "easeOut",
                }}
                style={{
                    backgroundColor: useTransform(
                        scrollYProgress,
                        [0, 0.5, 1],
                        ["hsl(var(--primary) / 0.2)", "hsl(var(--primary) / 0.7)", "hsl(var(--primary))"]
                    ),
                }}
            >
                {index + 1}
            </motion.div>
            <div className={`grow ${isRTL ? 'text-right' : 'text-left'}`}>
                <h3 className="font-semibold text-lg text-foreground pb-1">
                    {step.title}
                </h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
        </motion.div>
    );
});

StepItem.displayName = "StepItem";

export default StepItem;
