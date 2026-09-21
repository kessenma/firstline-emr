// apps/web/components/nav/LoggedInNav.tsx
"use client";

import type React from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { UserDrawer } from "@/components/ui/userDrawer";
import { BottomMenu } from "@/components/ui/bottom-menu";
import ChangeAccountTypeView from "@/components/adminDashboard/sections/ChangeAccountTypeView";
import { RotatingArrows } from "@/components/nav/rotating-arrows";
import { SaveButton } from "@/components/nav/save-button";
import { NotificationToast } from "../notifications/NotificationToast";
import { motion, useMotionValue, useTransform } from "framer-motion";
import LanguagePopover from "../telegram-patient/aboutPage/LanguagePopover";
import { MedicalLicenseUploadModal } from "@/components/user-profile/MedicalLicenseUploadModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getRoleRingClass } from "@/components/ui/RoleIcon";
import { AlertTriangle } from "lucide-react";
import { AdminSectionNav } from "@/components/adminDashboard/shared/AdminSectionNav";

interface LoggedInNavProps {
  className?: string;
}

const LoggedInNav: React.FC<LoggedInNavProps> = ({ className }) => {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isLoginPage = pathname === "/auth/login";
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPulsing, setisPulsing] = useState(false);
  const [showLicensePrompt, setShowLicensePrompt] = useState(false);
  const [showLicenseUploadModal, setShowLicenseUploadModal] = useState(false);

  // Motion values for scroll-based animation
  const scrollY = useMotionValue(0);
  const languagePopoverTranslateX = useTransform(scrollY, [0, 100], [0, 120]);
  const languagePopoverTranslateY = useTransform(scrollY, [0, 100], [0, -35]);
  const languagePopoverScale = useTransform(scrollY, [0, 50], [1, 0.9]);

  const handleLogoClick = () => {
    setisPulsing(true);
    setTimeout(() => setisPulsing(false), 1000); // Reset after animation
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`;
  };

  // Get brand ring color based on account type
  const getRingColor = () => getRoleRingClass(session?.user?.accountType);

  const handleOpenUserDrawer = () => {
    setIsDrawerOpen(true);
  };

  const handleAccountTypeChanged = (
    newType: "Doctor" | "Triage",
    oldType: "Doctor" | "Triage",
  ) => {
    // If switching from non-Doctor to Doctor, prompt for license upload
    if (oldType !== "Doctor" && newType === "Doctor") {
      setShowLicensePrompt(true);
    }
  };

  const handleLicensePromptClose = () => {
    setShowLicensePrompt(false);
  };

  const handleUploadNow = () => {
    setShowLicensePrompt(false);
    setShowLicenseUploadModal(true);
  };

  const handleUploadLater = () => {
    setShowLicensePrompt(false);
  };

  const handleUploadSuccess = () => {
    setShowLicenseUploadModal(false);
    // Optionally show a success message
    // You can add a toast notification here if you have a toast system
  };


  useEffect(() => {
    const handleScroll = () => {
      scrollY.set(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [scrollY]);

  return (
    <>
      <nav
        className={`fixed z-40 px-4 py-4 w-full md:px-4 ${className}`}
        style={{}}
      >
        <div className="flex justify-between items-center mx-auto max-w-7xl">
          <div className="flex flex-col gap-0 items-center">
            <div className="flex gap-2 items-center">
              <Link href="/" className="flex gap-2 items-center">
                <div
                  onClick={handleLogoClick}
                  className={`cursor-pointer transition-transform duration-300 ease-in-out ${
                    isPulsing ? "pulse-on-click" : "hover:scale-150"
                  }`}
                >
                  <Image
                    src="/assets/images/logo.svg"
                    alt="MedFlow logo"
                    width={30}
                    height={30}
                    className="object-contain"
                  />
                </div>
                <span
                  className="text-xl font-bold cursor-pointer text-foreground"
                  onClick={handleLogoClick}
                >
                  Fajr.EMR
                </span>
              </Link>
            </div>
            {pathname === "/new-patient" && (
              <motion.div
                className="mt-1"
                style={{
                  x: languagePopoverTranslateX,
                  y: languagePopoverTranslateY,
                  scale: languagePopoverScale,
                }}
              >
                <LanguagePopover />
              </motion.div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <SaveButton />
            {session?.user.isAdmin && (
              <div className="relative">
                <button
                  onClick={() => setIsDialogOpen(!isDialogOpen)}
                  className="flex justify-center items-center p-2 bg-card rounded-full border-2 transition-colors border-border text-foreground hover:bg-primary hover:text-primary-foreground"
                  aria-label="Change Account Type"
                >
                  <RotatingArrows isRotating={isDialogOpen} />
                </button>
                {isDialogOpen && (
                  <div className="absolute right-0 z-50 p-2 mt-2 bg-card text-foreground rounded border border-border shadow-sm">
                    <ChangeAccountTypeView
                      onClose={() => setIsDialogOpen(false)}
                      isDialog={isDialogOpen}
                      onAccountTypeChanged={handleAccountTypeChanged}
                    />
                  </div>
                )}
              </div>
            )}
            <button
              onClick={handleOpenUserDrawer}
              className="flex justify-center items-center"
              aria-label="Open user menu"
            >
              {session?.user.image ? (
                <div className={`rounded-full ring-2 ${getRingColor()}`}>
                  <Image
                    src={session.user.image || "/placeholder.svg"}
                    width={37}
                    height={37}
                    className="rounded-full"
                    alt="profile"
                  />
                </div>
              ) : (
                <div
                  className={`flex justify-center items-center w-9 h-9 font-semibold bg-secondary rounded-full text-foreground ring-2 ${getRingColor()}`}
                >
                  {getInitials(session?.user.firstName, session?.user.lastName)}
                </div>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Notification Toast - Don't render on login page */}
      {session?.user && !isLoginPage && <NotificationToast />}

      {/* Bottom Menu - Don't render on login page */}
      {session?.user && !isLoginPage && (
        <BottomMenu
          isAdmin={session.user.isAdmin}
          onOpenUserDrawer={handleOpenUserDrawer}
        />
      )}

      {/* Admin Section Nav - floating button on /admin when inside a section */}
      {session?.user?.isAdmin && pathname === "/admin" && (
        <AdminSectionNav />
      )}

      {/* User Drawer */}
      {session?.user && (
        <UserDrawer
          isOpen={isDrawerOpen}
          setIsOpen={setIsDrawerOpen}
          user={session.user}
        />
      )}

      {/* Medical License Prompt Dialog */}
      <Dialog open={showLicensePrompt} onOpenChange={handleLicensePromptClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-accent" />
              Medical License Required
            </DialogTitle>
            <DialogDescription>
              You&apos;ve switched to a Doctor account. To complete your
              profile, you need to upload your medical license.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Would you like to upload your medical license now? You can also do
              this later from your profile page.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleUploadLater}>
                Upload Later
              </Button>
              <Button variant="submit" onClick={handleUploadNow}>
                Upload Now
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Medical License Upload Modal */}
      {session?.user && (
        <MedicalLicenseUploadModal
          isOpen={showLicenseUploadModal}
          onClose={() => setShowLicenseUploadModal(false)}
          userId={session.user.id}
          userName={`${session.user.firstName} ${session.user.lastName}`}
          onUploadSuccess={handleUploadSuccess}
        />
      )}
    </>
  );
};

export default LoggedInNav;
