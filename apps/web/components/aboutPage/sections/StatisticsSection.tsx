"use client";

import React from 'react';
import { LucideIcon, WifiOff, History, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

export interface Capability {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

interface CapabilitiesSectionProps {
  capabilities: Capability[];
  className?: string;
}

/**
 * Capabilities Section Component
 * Displays capability badges highlighting key system features
 */
export function CapabilitiesSection({ capabilities, className = '' }: CapabilitiesSectionProps) {
  return (
    <div
      id="capabilities-section"
      className={`grid grid-cols-1 gap-6 mt-8 sm:grid-cols-3 ${className}`}
      style={{
        maxWidth: '80%',
        margin: '2rem auto',
      }}
    >
      {capabilities.map((capability, index) => {
        const Icon = capability.icon;
        return (
          <motion.div
            key={capability.id}
            className="relative flex flex-col items-center p-8 bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 overflow-hidden group"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            {/* Subtle gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="relative p-4 mb-5 bg-gradient-to-br from-background to-muted rounded-2xl shadow-inner border border-border/50 group-hover:scale-110 transition-transform duration-300">
              <Icon className="w-8 h-8 text-primary drop-shadow-sm" />
            </div>
            <h3 className="relative text-xl font-bold text-foreground font-aleo">{capability.label}</h3>
            <p className="relative mt-3 text-sm text-center text-muted-foreground font-figtree leading-relaxed">{capability.description}</p>
          </motion.div>
        );
      })}
    </div>
  );
}

// Keep the old StatisticsSection for backwards compatibility if needed
export interface Statistic {
  id: string;
  label: string;
  targetValue: number;
  suffix?: string;
  dialogComponent?: React.ReactNode;
}

interface StatisticsSectionProps {
  statistics: Statistic[];
  className?: string;
}

/**
 * Statistics Section Component (legacy)
 * @deprecated Use CapabilitiesSection instead
 */
export function StatisticsSection({ statistics, className = '' }: StatisticsSectionProps) {
  // Convert old statistics format to capabilities for display
  const defaultCapabilities: Capability[] = [
    {
      id: 'capability-offline',
      label: 'Offline-First',
      description: 'Works without internet connectivity',
      icon: WifiOff,
    },
    {
      id: 'capability-multi-mission',
      label: 'Multi-Mission',
      description: 'Track patients across missions',
      icon: History,
    },
    {
      id: 'capability-hipaa',
      label: 'HIPAA Compliant',
      description: 'Secure data handling',
      icon: Shield,
    },
  ];

  return <CapabilitiesSection capabilities={defaultCapabilities} className={className} />;
}
