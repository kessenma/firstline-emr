'use client';

import { useCallback, useEffect, useState } from 'react';

export function useAnalyticsViewModel(initialUrl?: string) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const url = (process.env.NEXT_PUBLIC_ANALYTICS_URL ?? initialUrl ?? 'https://analytics.dev.emr.fajrscientific.org/login');

  const openExternal = useCallback(() => {
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [url]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = originalOverflow || '';
    }
    return () => {
      document.body.style.overflow = originalOverflow || '';
    };
  }, [isFullscreen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return {
    url,
    isFullscreen,
    openExternal,
    toggleFullscreen,
    copyToClipboard,
  };
}