"use client";

import React, { useRef, useEffect, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useAnimation,
  useInView,
} from "framer-motion";
import { Card } from "@/components/ui/card";

interface WorkflowSectionProps {
  className?: string;
}

// Secure Patient Intake workflow steps
const intakeSteps = [
  {
    title: "Secure Token Generation",
    description:
      "Mission coordinator creates a patient record with Telegram Chat ID. System generates a unique cryptographic token linked 1:1 to that specific chat.",
  },
  {
    title: "Multilingual Intake Form",
    description:
      "Patient receives personalized link via Telegram. Form supports 8 languages (English, Arabic, Farsi, Pashto, Turkish, Urdu, Spanish, French) with seamless switching.",
  },
  {
    title: "Verified Submission",
    description:
      "Patient completes intake with name, DOB, contact info, and chief complaint. System validates token + chat ID match before accepting data.",
  },
  {
    title: "Triage Notification",
    description:
      "Mission coordinator is notified of new submission. Patient information is ready for surgical case review.",
  },
];

// Mission Surgical Workflow steps
const missionWorkflowSteps = [
  {
    title: "Case Review & Prioritization",
    description:
      "Surgeons review patient records remotely, prioritizing based on surgical complexity, urgency, and mission capacity.",
  },
  {
    title: "On-Site Pre-Operative Assessment",
    description:
      "During the mission, surgeons complete comprehensive evaluations with full documentation in the offline-capable EMR.",
  },
  {
    title: "Surgical Documentation",
    description:
      "Complete operative notes, intra-operative images, and post-operative plans documented in real-time or synced when connectivity allows.",
  },
  {
    title: "Post-Operative Care",
    description:
      "Clinical team documents post-operative course, medications, and discharge instructions with patient-specific follow-up protocols.",
  },
  {
    title: "Inter-Mission Follow-Up",
    description:
      "Local partners report patient outcomes between missions. Returning teams access complete longitudinal records for follow-up care.",
  },
];

interface AnimatedStepProps {
  step: { title: string; description: string };
  index: number;
  controls: any;
}

const AnimatedStep = React.memo(function AnimatedStep({
  step,
  index,
  controls,
}: AnimatedStepProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const backgroundColor = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    ["hsl(var(--color-teal-100))", "hsl(var(--color-teal-400))", "hsl(var(--color-teal-800))"],
  );

  return (
    <motion.div
      ref={ref}
      className="relative flex items-start space-x-6"
      initial="hidden"
      animate={controls}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.6, delay: index * 0.15 }}
    >
      <motion.div
        className="shrink-0 w-10 h-10 rounded-xl text-white font-bold flex items-center justify-center shadow-inner relative overflow-hidden"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          duration: 0.4,
          delay: 0.4 + index * 0.15,
          ease: "easeOut",
        }}
        style={{
          backgroundColor,
        }}
      >
        {/* Glassmorphism highlight */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
        <span className="relative z-10 drop-shadow-md">{index + 1}</span>
      </motion.div>
      <div className="flex-1 pt-1 group">
        <h3 className="text-xl font-bold text-foreground pb-2 font-aleo group-hover:text-primary transition-colors duration-300">
          {step.title}
        </h3>
        <p className="text-base text-muted-foreground font-figtree leading-relaxed">{step.description}</p>
      </div>
    </motion.div>
  );
});

/**
 * Workflow Section Component
 * Displays the patient care workflow process with animated timeline
 * Shows both secure intake and mission surgical workflow
 */
export function WorkflowSection({ className = "" }: WorkflowSectionProps) {
  const [intakeContainerHeight, setIntakeContainerHeight] = useState(0);
  const [missionContainerHeight, setMissionContainerHeight] = useState(0);
  const intakeControls = useAnimation();
  const missionControls = useAnimation();
  const intakeStepsRef = useRef<HTMLDivElement>(null);
  const missionStepsRef = useRef<HTMLDivElement>(null);
  const isIntakeInView = useInView(intakeStepsRef, { once: true, amount: 0.2 });
  const isMissionInView = useInView(missionStepsRef, { once: true, amount: 0.2 });

  const intakeContainerRef = useRef<HTMLDivElement>(null);
  const missionContainerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress: intakeScrollProgress } = useScroll({
    target: intakeContainerRef,
    offset: ["start end", "end start"],
  });

  const { scrollYProgress: missionScrollProgress } = useScroll({
    target: missionContainerRef,
    offset: ["start end", "end start"],
  });

  const intakeLineHeight = useTransform(
    intakeScrollProgress,
    [0.2, 0.8],
    [0, intakeContainerHeight],
  );

  const missionLineHeight = useTransform(
    missionScrollProgress,
    [0.2, 0.8],
    [0, missionContainerHeight],
  );

  useEffect(() => {
    if (intakeContainerRef.current) {
      setIntakeContainerHeight(intakeContainerRef.current.offsetHeight);
    }
    if (missionContainerRef.current) {
      setMissionContainerHeight(missionContainerRef.current.offsetHeight);
    }
  }, []);

  useEffect(() => {
    if (isIntakeInView) {
      intakeControls.start("visible");
    }
  }, [isIntakeInView, intakeControls]);

  useEffect(() => {
    if (isMissionInView) {
      missionControls.start("visible");
    }
  }, [isMissionInView, missionControls]);

  return (
    <div className={`mt-20 space-y-8 ${className}`}>
      {/* Secure Patient Intake Card */}
      <Card className="p-10 mx-auto w-full max-w-4xl bg-card/80 backdrop-blur-md rounded-3xl border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-500 relative overflow-hidden group">
        {/* Background gradient accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none transition-opacity duration-500 group-hover:opacity-100 opacity-50" />
        
        <div className="relative z-10">
        <motion.h2
          className="mb-4 text-3xl font-extrabold text-foreground font-aleo drop-shadow-sm"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Secure Patient Intake
        </motion.h2>
        <motion.p
          className="mb-8 text-muted-foreground"
          initial={{ opacity: 0, y: -10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Patients are onboarded through our secure Telegram-based intake system
          with cryptographic token validation and multilingual support.
        </motion.p>

        <div ref={intakeContainerRef} className="relative">
          {/* Timeline Line */}
          {isIntakeInView && (
            <div className="absolute left-4 top-0 bottom-0 w-0.5">
              <motion.div
                className="w-full h-full"
                style={{
                  height: intakeLineHeight,
                  background:
                    "linear-gradient(to bottom, hsl(var(--primary)), hsl(var(--accent)))",
                  transformOrigin: "top",
                }}
              />
            </div>
          )}

          {/* Intake Steps */}
          <div className="space-y-12" ref={intakeStepsRef}>
            {intakeSteps.map((step, index) => (
              <AnimatedStep
                key={index}
                step={step}
                index={index}
                controls={intakeControls}
              />
            ))}
          </div>
        </div>
        </div>
      </Card>

      {/* Mission Surgical Workflow Card */}
      <Card className="p-10 mx-auto w-full max-w-4xl bg-card/80 backdrop-blur-md rounded-3xl border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-500 relative overflow-hidden group">
        {/* Background gradient accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none transition-opacity duration-500 group-hover:opacity-100 opacity-50" />
        
        <div className="relative z-10">
        <motion.h2
          className="mb-4 text-3xl font-extrabold text-foreground font-aleo drop-shadow-sm"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Mission Surgical Workflow
        </motion.h2>
        <motion.p
          className="mb-8 text-muted-foreground"
          initial={{ opacity: 0, y: -10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          From case review to inter-mission follow-up, FAJR.EMR supports the
          complete surgical mission lifecycle with offline-capable documentation.
        </motion.p>

        <div ref={missionContainerRef} className="relative">
          {/* Timeline Line */}
          {isMissionInView && (
            <div className="absolute left-4 top-0 bottom-0 w-0.5">
              <motion.div
                className="w-full h-full"
                style={{
                  height: missionLineHeight,
                  background:
                    "linear-gradient(to bottom, hsl(var(--primary)), hsl(var(--accent)))",
                  transformOrigin: "top",
                }}
              />
            </div>
          )}

          {/* Mission Steps */}
          <div className="space-y-12" ref={missionStepsRef}>
            {missionWorkflowSteps.map((step, index) => (
              <AnimatedStep
                key={index}
                step={step}
                index={index}
                controls={missionControls}
              />
            ))}
          </div>
        </div>


        {/* Closing Statement */}
        <motion.p
          className="text-sm italic text-muted-foreground mt-6"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 1.3 }}
        >
         built for the realities of surgical missions in low-resource settings, our workflow is designed to ensure no patient falls through the cracks, even when connectivity does.
        </motion.p>
        </div>
      </Card>
    </div>
  );
}
