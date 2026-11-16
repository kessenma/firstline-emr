'use client';

import { useEffect, useState } from 'react';
import { FirstlineMark } from '@/components/icons/FirstlineMark';
import { APP_URL, DOCS_URL, GITHUB_URL } from '@/lib/links';

/** Top bar for firstline.care: brand on the left, Docs / GitHub / Sign in on the right. */
export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? 'border-b border-border/60 bg-background/80 backdrop-blur' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <a href="/" className="flex items-center gap-2">
          <FirstlineMark className="h-[28px] w-[28px] text-foreground" />
          <span className="text-xl font-bold text-foreground">Firstline</span>
        </a>
        <div className="flex items-center gap-1 text-sm font-medium sm:gap-2">
          <a href={DOCS_URL} className="rounded-md px-3 py-2 text-foreground/80 hover:text-foreground">
            Docs
          </a>
          <a
            href={GITHUB_URL}
            className="hidden rounded-md px-3 py-2 text-foreground/80 hover:text-foreground sm:inline-block"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <a
            href={APP_URL}
            className="rounded-md bg-primary px-3 py-2 text-primary-foreground hover:bg-primary/90"
          >
            Sign in
          </a>
        </div>
      </div>
    </nav>
  );
}
