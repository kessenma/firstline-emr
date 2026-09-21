// Centralized download progress tracking context.
// Download hooks (useVoiceDictationModels, useTranslationModels) push state here.
// UI consumers (CustomTabBar badge, ProfileScreenView detail section) read from here.
//
// When hooks unmount (navigating away from Profile), the last-known progress
// stays in the context so the tab bar indicator remains visible.

import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';

export interface DownloadItem {
  id: string;
  label: string;
  progress: number; // 0-1
  type: 'voice' | 'translation' | 'sync' | 'transcription';
}

interface DownloadProgressState {
  downloads: DownloadItem[];
}

type Action =
  | { type: 'REGISTER'; item: DownloadItem }
  | { type: 'UPDATE'; id: string; progress: number }
  | { type: 'COMPLETE'; id: string }
  | { type: 'REMOVE'; id: string };

function reducer(state: DownloadProgressState, action: Action): DownloadProgressState {
  switch (action.type) {
    case 'REGISTER': {
      const exists = state.downloads.find(d => d.id === action.item.id);
      if (exists) {
        // Update existing entry instead of duplicating
        return {
          downloads: state.downloads.map(d =>
            d.id === action.item.id ? { ...d, ...action.item } : d,
          ),
        };
      }
      return { downloads: [...state.downloads, action.item] };
    }
    case 'UPDATE':
      return {
        downloads: state.downloads.map(d =>
          d.id === action.id ? { ...d, progress: action.progress } : d,
        ),
      };
    case 'COMPLETE':
    case 'REMOVE':
      return {
        downloads: state.downloads.filter(d => d.id !== action.id),
      };
    default:
      return state;
  }
}

interface DownloadProgressContextValue {
  downloads: DownloadItem[];
  totalProgress: number;
  isAnyDownloading: boolean;
  downloadCount: number;
  register: (item: DownloadItem) => void;
  update: (id: string, progress: number) => void;
  complete: (id: string) => void;
  remove: (id: string) => void;
}

const DownloadProgressContext = createContext<DownloadProgressContextValue | null>(null);

export function DownloadProgressProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { downloads: [] });

  const register = useCallback((item: DownloadItem) => {
    dispatch({ type: 'REGISTER', item });
  }, []);

  const update = useCallback((id: string, progress: number) => {
    dispatch({ type: 'UPDATE', id, progress });
  }, []);

  const complete = useCallback((id: string) => {
    dispatch({ type: 'COMPLETE', id });
  }, []);

  const remove = useCallback((id: string) => {
    dispatch({ type: 'REMOVE', id });
  }, []);

  const totalProgress = useMemo(() => {
    if (state.downloads.length === 0) return 0;
    const sum = state.downloads.reduce((acc, d) => acc + d.progress, 0);
    return sum / state.downloads.length;
  }, [state.downloads]);

  const value = useMemo<DownloadProgressContextValue>(
    () => ({
      downloads: state.downloads,
      totalProgress,
      isAnyDownloading: state.downloads.length > 0,
      downloadCount: state.downloads.length,
      register,
      update,
      complete,
      remove,
    }),
    [state.downloads, totalProgress, register, update, complete, remove],
  );

  return (
    <DownloadProgressContext.Provider value={value}>
      {children}
    </DownloadProgressContext.Provider>
  );
}

export function useDownloadProgress(): DownloadProgressContextValue {
  const ctx = useContext(DownloadProgressContext);
  if (!ctx) {
    throw new Error('useDownloadProgress must be used within a DownloadProgressProvider');
  }
  return ctx;
}
