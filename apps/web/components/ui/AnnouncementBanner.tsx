// apps/web/components/ui/AnnouncementBanner.tsx
"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { CopyButton } from "@/components/ui/CopyButton";

const AnnouncementBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const pathname = usePathname();
  const url = "https://medflow.cloud";

  // Only show on "/patient-dashboard"
  const isDashboard = pathname === "/patient-dashboard";

  useEffect(() => {
    if (!isDashboard) return;

    const lastDismissed = localStorage.getItem("announcementDismissed");
    const today = new Date().toISOString().split("T")[0];

    if (lastDismissed !== today) {
      setIsVisible(true);
    }
  }, [isDashboard]);

  const dismissBanner = () => {
    localStorage.setItem(
      "announcementDismissed",
      new Date().toISOString().split("T")[0],
    );
    setIsVisible(false);
  };

  if (!isVisible || !isDashboard) return null;

  return (
    <motion.div
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      exit={{ y: -100 }}
      className="bg-accent/10 text-foreground fixed top-0 left-0 w-full z-60 shadow-md"
    >
      <div className="relative px-4 py-3 max-w-2xl mx-auto">
        {/* Close button - positioned absolutely in the top right */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-8 w-8"
          onClick={dismissBanner}
          aria-label="Dismiss announcement"
        >
          <X size={16} />
        </Button>

        {/* Main content - stacked vertically */}
        <div className="pt-2 pb-1">
          <p className="text-center mb-2">
            ⚠️ Please attempt logging into your account here:
          </p>

          {/* Link and copy button container */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-1 mb-2">
            <Link
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-foreground hover:text-accent underline inline-flex items-center"
            >
              {url}
            </Link>

            <CopyButton
                textToCopy={url}
                label="link"
                variant="ghost"
                size="sm"
                className="h-8 px-3"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AnnouncementBanner;
