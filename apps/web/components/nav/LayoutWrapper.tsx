// apps/web/components/nav/LayoutWrapper.tsx
"use client";

import React, { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Nav from "./Nav";
import Footer from "./Footer";
import { useGlobalContext } from "@/components/globalContext/GlobalContext";
import { AdminSectionNavProvider } from "@/components/adminDashboard/context/AdminSectionNavContext";

interface LayoutWrapperProps {
  children: React.ReactNode;
}

const LayoutWrapper: React.FC<LayoutWrapperProps> = ({ children }) => {
  const pathname = usePathname();
  const { setIsNavigating } = useGlobalContext();
  const isFullWidth =
    pathname.startsWith("/new-patient/telegram") ||
    pathname.startsWith("/telegram-patient") ||
    pathname === "/patient-dashboard" ||
    pathname === "/auth/login" ||
    pathname === "/my-profile" ||
    pathname === "/new-patient" ||
    pathname === "/telegram-patient" ||
    pathname === "/create-patient" ||
    pathname === "/admin-signup/verify" ||
    pathname.startsWith("/admin-signup/");

  // For telegram patient pages, render without Nav and Footer (fullscreen)
  const isTelegramPatient = pathname.startsWith("/telegram-patient/");

  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    // Set navigating to false when pathname changes (page has loaded)
    setIsNavigating(false);
  }, [pathname, setIsNavigating]);



  // For admin signup token pages, render without Nav and Footer
  const isAdminSignupToken =
    pathname.startsWith("/admin-signup/") &&
    pathname !== "/admin-signup/verify";

  if (isAdminSignupToken || isTelegramPatient) {
    return (
      <div className="fixed inset-0 w-full h-full overflow-auto">
        {children}
      </div>
    );
  }

  return (
    <AdminSectionNavProvider>
      <div className="flex flex-col min-h-screen">
        <Nav className={"mb-8"} />
        <main
          className={`grow w-full ${isFullWidth ? "px-2" : "mx-auto max-w-6xl"} pt-[8px]`}
        >
          {children}
        </main>
        <Footer
          className={`w-full ${isFullWidth ? "" : "max-w-6xl mx-auto pt-12"}`}
        />
      </div>
    </AdminSectionNavProvider>
  );
};

export default LayoutWrapper;
