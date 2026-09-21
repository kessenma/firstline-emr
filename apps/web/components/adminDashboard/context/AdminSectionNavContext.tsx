"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import type { SectionDefinition } from "../sectionRegistry";

interface AdminSectionNavState {
  activeSection: SectionDefinition | null;
  selectSection: (section: SectionDefinition) => void;
  goBack: () => void;
}

const AdminSectionNavContext = createContext<AdminSectionNavState | null>(null);

export function AdminSectionNavProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [activeSection, setActiveSection] =
    useState<SectionDefinition | null>(null);

  const selectSection = useCallback((section: SectionDefinition) => {
    setActiveSection(section);
  }, []);

  const goBack = useCallback(() => {
    setActiveSection(null);
  }, []);

  return (
    <AdminSectionNavContext.Provider
      value={{ activeSection, selectSection, goBack }}
    >
      {children}
    </AdminSectionNavContext.Provider>
  );
}

export function useAdminSectionNav() {
  return useContext(AdminSectionNavContext);
}
