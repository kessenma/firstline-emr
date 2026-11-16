"use client";

import React, { useRef, useCallback, useEffect } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { Feature } from "./patient-dashboard-features";

interface InteractiveFeatureScrollerProps {
  heading: string;
  features: Feature[];
  className?: string;
  reverseDesktop?: boolean;
}

// Compute active index from scroll progress for N features
function useActiveIndex(scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"], count: number) {
  return useTransform(scrollYProgress, (v) => {
    const index = Math.floor(v * count);
    return Math.min(index, count - 1);
  });
}

// --- Mobile layout ---
function MobileLayout({ heading, features }: { heading: string; features: Feature[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const activeIndex = useActiveIndex(scrollYProgress, features.length);
  const [current, setCurrent] = React.useState(0);
  const [expanded, setExpanded] = React.useState(false);

  useMotionValueEvent(activeIndex, "change", (latest) => setCurrent(latest));

  // Auto-collapse when scrolling to a different feature
  const prevCurrent = useRef(current);
  useEffect(() => {
    if (prevCurrent.current !== current) {
      setExpanded(false);
      prevCurrent.current = current;
    }
  }, [current]);

  const toggleExpanded = useCallback(() => setExpanded((v) => !v), []);

  const scrollHeight = `${features.length * 100}vh`;

  return (
    <div ref={containerRef} className="lg:hidden relative" style={{ height: scrollHeight }}>
      <div className="sticky top-0 h-svh flex flex-col overflow-hidden">
        {/* Section heading */}
        <div className="shrink-0 px-6 pt-8 pb-1 text-center">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/70 font-aleo">
            {heading}
          </h2>
        </div>

        {/* Feature text — animates on scroll */}
        <div className="relative shrink-0 h-[148px] mx-4 z-20 overflow-visible">
          {features.map((feature, index) => {
            const isActive = current === index;
            const isExpanded = isActive && expanded;

            return (
              <motion.div
                key={feature.id}
                className="absolute inset-0 flex flex-col items-center justify-start pt-2 text-center px-4 overflow-visible"
                animate={{
                  opacity: isActive ? 1 : 0,
                  y: isActive ? 0 : current > index ? -14 : 14,
                }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                style={{ pointerEvents: isActive ? "auto" : "none" }}
              >
                <div
                  className={`shrink-0 inline-flex w-9 h-9 rounded-full items-center justify-center font-bold text-sm mb-2.5 transition-all duration-500 ${
                    isActive
                      ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg ring-4 ring-primary/20"
                      : "bg-muted text-muted-foreground border border-border"
                  }`}
                >
                  {index + 1}
                </div>
                <h3 className="shrink-0 text-xl font-bold font-aleo mb-1.5 text-primary">{feature.title}</h3>
                <div className={`${isExpanded ? "bg-background pb-2 rounded-b-xl relative z-30" : ""}`}>
                  <p className={`text-sm text-muted-foreground font-figtree leading-relaxed transition-all duration-300 ${isExpanded ? "" : "line-clamp-2"}`}>
                    {feature.description}
                  </p>
                  <button
                    onClick={toggleExpanded}
                    className="mt-1 mx-auto inline-flex items-center gap-0.5 text-xs text-primary/70 hover:text-primary transition-colors"
                  >
                    {isExpanded ? "less" : "more"}
                    <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Phone frame — sticky, visuals transition */}
        <div className="relative flex-1 min-h-0 overflow-hidden">
          {features.map((feature, index) => (
            <motion.div
              key={feature.id}
              className="absolute inset-0 flex items-start justify-center pt-3"
              animate={{
                opacity: current === index ? 1 : 0,
                scale: current === index ? 1 : 0.96,
                y: current === index ? 0 : current > index ? -16 : 16,
              }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ pointerEvents: current === index ? "auto" : "none" }}
            >
              <feature.Visual isActive={current === index} />
            </motion.div>
          ))}
        </div>

        {/* Step dots */}
        <div className="shrink-0 flex justify-center gap-2 py-3">
          {features.map((_, index) => (
            <div
              key={index}
              className={`rounded-full transition-all duration-500 ${
                current === index ? "w-6 h-2 bg-primary" : "w-2 h-2 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Desktop layout ---
function DesktopLayout({ heading, features, reverseDesktop }: { heading: string; features: Feature[]; reverseDesktop?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const activeIndex = useActiveIndex(scrollYProgress, features.length);
  const [current, setCurrent] = React.useState(0);

  useMotionValueEvent(activeIndex, "change", (latest) => {
    setCurrent(latest);
  });

  const scrollHeight = `${features.length * 100}vh`;

  return (
    <div ref={containerRef} className="hidden lg:block relative" style={{ height: scrollHeight }}>
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
        {/* Background gradient accent */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 gap-12 items-center relative z-10">

          {/* Text */}
          <div className={`space-y-8 ${reverseDesktop ? "order-2" : ""}`}>
            <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/70 font-aleo drop-shadow-sm">
              {heading}
            </h2>

            <div className="space-y-8 relative">
              {/* Progress line */}
              <div className="absolute left-[19px] top-4 bottom-4 w-1 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="w-full bg-gradient-to-b from-primary/50 via-primary to-primary/50 origin-top"
                  style={{ scaleY: scrollYProgress }}
                />
              </div>

              {features.map((feature, index) => (
                <div
                  key={feature.id}
                  className={`relative pl-14 transition-all duration-500 ${
                    current === index ? "opacity-100 scale-100" : "opacity-40 scale-95"
                  }`}
                >
                  <div
                    className={`absolute left-0 top-1 w-10 h-10 rounded-full flex items-center justify-center text-base font-bold transition-all duration-500 ${
                      current === index
                        ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg scale-110 ring-4 ring-primary/20"
                        : "bg-muted text-muted-foreground border border-border"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <h3
                    className={`text-2xl font-bold font-aleo mb-3 transition-colors duration-500 ${
                      current === index ? "text-primary drop-shadow-sm" : "text-foreground"
                    }`}
                  >
                    {feature.title}
                  </h3>
                  <p className="text-lg text-muted-foreground font-figtree leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Visuals */}
          <div className={`relative h-[600px] flex items-center justify-center perspective-1000 ${reverseDesktop ? "order-1" : ""}`}>
            {features.map((feature, index) => (
              <motion.div
                key={feature.id}
                className="absolute inset-0 flex items-center justify-center"
                animate={{
                  opacity: current === index ? 1 : 0,
                  rotateY: current === index ? 0 : current > index ? -10 : 10,
                  z: current === index ? 0 : -100,
                  scale: current === index ? 1 : 0.9,
                }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                style={{ pointerEvents: current === index ? "auto" : "none" }}
              >
                <feature.Visual isActive={current === index} />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Exported Scroller ---

export function InteractiveFeatureScroller({ heading, features, className = "", reverseDesktop }: InteractiveFeatureScrollerProps) {
  return (
    <div className={className}>
      <MobileLayout heading={heading} features={features} />
      <DesktopLayout heading={heading} features={features} reverseDesktop={reverseDesktop} />
    </div>
  );
}
