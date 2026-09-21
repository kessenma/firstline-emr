// apps/mobile/src/contexts/BottomSheetManagerContext.tsx
// Global bottom sheet dismiss manager — allows dismissing all open sheets at once
// (e.g., when switching tabs). Lightweight: uses a Map ref, no re-renders.

import React, { createContext, useContext, useRef, useCallback } from 'react';

interface BottomSheetManagerContextType {
  registerSheet: (id: string, dismissFn: () => void) => void;
  unregisterSheet: (id: string) => void;
  dismissAll: () => void;
}

const BottomSheetManagerContext = createContext<BottomSheetManagerContextType | null>(null);

export const BottomSheetManagerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const sheetsRef = useRef<Map<string, () => void>>(new Map());

  const registerSheet = useCallback((id: string, dismissFn: () => void) => {
    sheetsRef.current.set(id, dismissFn);
  }, []);

  const unregisterSheet = useCallback((id: string) => {
    sheetsRef.current.delete(id);
  }, []);

  const dismissAll = useCallback(() => {
    sheetsRef.current.forEach((dismiss) => {
      try {
        dismiss();
      } catch {
        // Sheet may already be dismissed
      }
    });
  }, []);

  // Stable ref — never changes, so no re-renders for consumers
  const value = useRef<BottomSheetManagerContextType>({ registerSheet, unregisterSheet, dismissAll }).current;

  return (
    <BottomSheetManagerContext.Provider value={value}>
      {children}
    </BottomSheetManagerContext.Provider>
  );
};

export function useBottomSheetManager(): BottomSheetManagerContextType {
  const ctx = useContext(BottomSheetManagerContext);
  if (!ctx) {
    // Graceful fallback: if not wrapped in provider, return no-ops
    return { registerSheet: () => {}, unregisterSheet: () => {}, dismissAll: () => {} };
  }
  return ctx;
}
