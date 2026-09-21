"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PanelRightOpen, ChevronRight, ArrowLeft } from "lucide-react";
import { useAdminSectionNav } from "../context/AdminSectionNavContext";
import {
  sections,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type SectionDefinition,
  type SectionCategory,
} from "../sectionRegistry";

export function AdminSectionNav() {
  const ctx = useAdminSectionNav();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] =
    useState<SectionCategory | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Keep expanded category in sync with active section
  useEffect(() => {
    if (ctx?.activeSection) {
      setExpandedCategory(ctx.activeSection.category);
    }
  }, [ctx?.activeSection?.category]);

  // Close panel on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  // Don't render if no context
  if (!ctx) return null;

  const { activeSection, selectSection, goBack } = ctx;

  // Group sections by category
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    items: sections.filter((s) => s.category === cat),
  })).filter((g) => g.items.length > 0);

  const handleSelect = (section: SectionDefinition) => {
    selectSection(section);
    setIsOpen(false);
  };

  const toggleCategory = (cat: SectionCategory) => {
    setExpandedCategory((prev) => (prev === cat ? null : cat));
  };

  return (
    <div ref={panelRef} className="fixed bottom-12 left-1/2 ml-[9rem] z-40">
      {/* Floating trigger button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-card border border-border shadow-lg hover:bg-muted transition-colors"
          aria-label="Open section navigator"
        >
          <PanelRightOpen className="h-4 w-4 text-foreground" />
        </button>
      )}

      {/* Expanded panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-64 max-h-[70vh] overflow-y-auto rounded-xl bg-card border border-border shadow-xl absolute bottom-12 right-0"
          >
            {/* Header */}
            <div className="sticky top-0 bg-card border-b border-border px-3 py-2.5 flex items-center justify-between z-10">
              {activeSection ? (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    goBack();
                  }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Grid
                </button>
              ) : (
                <span className="text-xs font-semibold text-foreground">
                  Sections
                </span>
              )}
              {activeSection && (
                <span className="text-xs font-medium text-muted-foreground truncate max-w-[140px]">
                  {activeSection.title}
                </span>
              )}
            </div>

            {/* Category groups */}
            <div className="p-1.5">
              {grouped.map(({ category, label, items }) => {
                const isExpanded = expandedCategory === category;
                return (
                  <div key={category} className="mb-0.5">
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors rounded-md hover:bg-muted/50"
                    >
                      {label}
                      <ChevronRight
                        className={`h-3 w-3 transition-transform duration-200 ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          {items.map((section) => {
                            const Icon = section.icon;
                            const isActive = section.id === activeSection?.id;
                            return (
                              <button
                                key={section.id}
                                onClick={() => handleSelect(section)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors text-sm ${
                                  isActive
                                    ? "bg-primary/10 text-primary font-medium"
                                    : "text-foreground hover:bg-muted"
                                }`}
                              >
                                <Icon
                                  className={`h-4 w-4 shrink-0 ${
                                    isActive
                                      ? "text-primary"
                                      : "text-muted-foreground"
                                  }`}
                                />
                                <span className="truncate leading-tight">
                                  {section.title}
                                </span>
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
