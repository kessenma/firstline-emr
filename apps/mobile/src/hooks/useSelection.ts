// apps/mobile/src/hooks/useSelection.ts
// Shared multi-select state for list screens with bulk actions.

import { useState, useCallback } from 'react';

export interface SelectionResult {
  selectedIds: string[];
  isAllSelected: boolean;
  toggle: (id: string) => void;
  toggleAll: () => void;
  clear: () => void;
}

export function useSelection(allIds: string[]): SelectionResult {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const isAllSelected =
    allIds.length > 0 && selectedIds.length === allIds.length;

  const toggle = useCallback((id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds(isAllSelected ? [] : [...allIds]);
  }, [isAllSelected, allIds]);

  const clear = useCallback(() => {
    setSelectedIds([]);
  }, []);

  return { selectedIds, isAllSelected, toggle, toggleAll, clear };
}
