// apps/web/app/ClientLayout.tsx
"use client";

import type React from "react";

import { DM_Serif_Text, Aleo, Figtree } from "next/font/google";
import "@/styles/globals.css";
import "@/styles/fonts.css";
import LayoutWrapper from "@/components/nav/LayoutWrapper";
import { Providers } from "@/components/hooks/Providers";
import {
  ToastContext,
  useToastState,
  ToastComponent,
} from "@/components/hooks/useToast";
import { createApiWrapper } from "@/utils/apiWrapper";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { GlobalContextProvider } from "@/components/globalContext/GlobalContext";
import { LastPageRedirect } from "@/components/nav/last-page-redirect";
import { ThemeProvider } from "@/components/ui/ThemeProvider";

const dmSerifText = DM_Serif_Text({
  weight: ["400"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-dm-serif-text",
});

const aleo = Aleo({
  weight: ["600", "700"],
  subsets: ["latin"],
  variable: "--font-aleo",
});

const figtree = Figtree({
  weight: ["400", "600"],
  subsets: ["latin"],
  variable: "--font-figtree",
});

export default function ClientLayout({
  children,
  initialHtmlClass,
  initialDataTheme,
}: {
  children: React.ReactNode;
  initialHtmlClass?: string;
  initialDataTheme?: string;
}) {
  const toastState = useToastState();
  const api = createApiWrapper(toastState.setToast);
  const pathname = usePathname();

  // Only emit route change event on pathname change, don't set up unnecessary listeners
  useEffect(() => {
    // Emit custom event to notify components to cleanup on route change only
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("route-change", { detail: { pathname } }),
      );
    }
  }, [pathname]);

  return (
    <html
      suppressHydrationWarning
      lang="en"
      data-theme={initialDataTheme || undefined}
      className={`h-full w-full ${dmSerifText.variable} ${aleo.variable} ${figtree.variable} ${initialHtmlClass || ""}`}
    >
      <head>
        <title>Fajr.emr</title>
        <Script id="theme-boot" strategy="beforeInteractive">
          {`(function(){
  try {
    var cookies = document.cookie ? document.cookie.split('; ') : [];
    var map = {};
    for (var i = 0; i < cookies.length; i++) {
      var parts = cookies[i].split('=');
      map[decodeURIComponent(parts[0])] = decodeURIComponent(parts.slice(1).join('='));
    }
    var mode = map['themeMode'] || 'system';
    var root = document.documentElement;
    var apply = function(m){
      if (m === 'dark') {
        root.classList.add('dark');
        root.setAttribute('data-theme','dark');
      } else if (m === 'light') {
        root.classList.remove('dark');
        root.setAttribute('data-theme','light');
      } else {
        var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) { root.classList.add('dark'); root.setAttribute('data-theme','dark'); } else { root.classList.remove('dark'); root.setAttribute('data-theme','light'); }
      }
    };
    apply(mode);
  } catch(e) {}
})();`}
        </Script>
      </head>
      <body className="flex flex-col w-full h-full">
          <Providers>
            <ThemeProvider>
              <GlobalContextProvider>
                <ToastContext.Provider value={{ ...toastState, api }}>
                  <div className="relative w-full">
                    <div className="absolute inset-0 gradient" />
                  </div>
                  <LayoutWrapper>{children}</LayoutWrapper>
                  <ToastComponent />
                  {/* Add the LastPageRedirect component here */}
                  <LastPageRedirect />
                </ToastContext.Provider>
              </GlobalContextProvider>
            </ThemeProvider>
          </Providers>
      </body>
    </html>
  );
}
