"use client";

import React from "react";
import { motion } from "framer-motion";
import { GenerativeTree } from "../animations/GenerativeTree";
import { HeroPhoneMockup } from "./HeroPhoneMockup";

interface HeroSectionProps {
  title: string;
  subtitle: string;
  description: string;
  className?: string;
}

const ease = [0.22, 1, 0.36, 1] as const;

export function HeroSection({
  title,
  subtitle,
  description,
  className = "",
}: HeroSectionProps) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Subtle background gradient blob */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Desktop: text left, tree right in a grid */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
        <div className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">
          {/* Text content — centered on mobile/tablet, right-aligned on desktop */}
          <motion.div
            className="text-center lg:text-right"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease }}
          >
            <h1 className="pt-8 lg:pt-0 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/70 font-aleo drop-shadow-sm">
              {title}
            </h1>
            <p className="mt-6 max-w-2xl mx-auto lg:mx-0 lg:ml-auto font-figtree text-lg text-foreground/90 sm:text-xl md:text-2xl font-medium">
              {subtitle}
            </p>
            <p className="mt-4 max-w-2xl mx-auto lg:mx-0 lg:ml-auto font-figtree text-base text-muted-foreground sm:text-lg md:text-xl leading-relaxed">
              {description}
            </p>
          </motion.div>

          {/* Tree — only visible on desktop (lg+), in the right column */}
          <motion.div
            className="hidden lg:block relative h-[500px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.2, ease }}
          >
            <GenerativeTree />
          </motion.div>
        </div>
      </div>

      {/* Phone mockup + tree behind it — mobile/tablet only */}
      <div className="relative lg:hidden">
        {/* Tree: positioned so trunk emerges from behind the top of the phone */}
        <motion.div
          className="absolute inset-x-0 top-0 bottom-[60%] flex justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.2, ease }}
        >
          <div className="relative w-[350px] sm:w-[450px] h-full">
            <GenerativeTree />
          </div>
        </motion.div>

        {/* Phone mockup overlaid on top of the tree trunk */}
        <motion.div
          className="relative z-10 flex justify-center pb-12 pt-[340px] sm:pt-[400px]"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease }}
        >
          <div className="relative transform scale-90 sm:scale-100 origin-top">
            <div className="absolute -inset-6 bg-primary/5 rounded-[3.5rem] blur-3xl pointer-events-none" />
            <div className="relative">
              <HeroPhoneMockup />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Phone mockup — desktop only, below the grid */}
      <motion.div
        className="relative z-10 hidden lg:flex justify-center pb-12"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5, ease }}
      >
        <div className="relative transform origin-top">
          <div className="absolute -inset-6 bg-primary/5 rounded-[3.5rem] blur-3xl pointer-events-none" />
          <div className="relative">
            <HeroPhoneMockup />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
