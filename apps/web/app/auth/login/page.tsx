// app/auth/login/page.tsx

"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import LoginForm from "@/components/auth/LoginForm";
import ResetPasswordView from "@/components/form/forgotPassword/ResetPasswordView";
import { Button } from "@/components/ui/button";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import ForgotPasswordForm from "@/components/auth/forgotPassword/ForgotPasswordForm";
import { ExternalLink, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const privacyPolicyUrl = "/auth/user-privacy-policy";
const termsOfServiceUrl = "/auth/user-terms-of-service";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const resetCode = searchParams ? searchParams.get("code") : null;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: session, status } = useSession();
  const [isSignupLoading, setIsSignupLoading] = useState(false);
  const [isTermsLoading, setIsTermsLoading] = useState(false);
  const [isPrivacyLoading, setIsPrivacyLoading] = useState(false);

  useEffect(() => {
    console.log("🔐 Login page - Session status:", status);
    console.log("🔐 Login page - User:", session?.user?.email);
    console.log("🔐 Login page - Has session:", !!session);

    // Redirect authenticated users away from login page
    if (status === "authenticated" && session?.user) {
      console.log(
        "🔐 Login page - User is authenticated, redirecting to /home",
      );
      console.log(
        "🔐 Login page - Current pathname:",
        window.location.pathname,
      );

      // Only redirect if we're actually on the login page
      if (window.location.pathname === "/auth/login") {
        console.log("🔐 Login page - Executing FORCED redirect...");
        // Use window.location.href for a hard redirect that can't be cancelled
        window.location.href = "/home";
      }
    }
  }, [status, session]);

  useEffect(() => {
    if (resetCode) {
      setIsDialogOpen(true);
    }
  }, [resetCode]);

  const closeDialog = () => {
    setIsDialogOpen(false);
  };

  const handleSignupNavigation = () => {
    router.push("/auth/");
  };

  // Don't redirect here - LoginForm already handles the redirect after successful login
  // This prevents double redirects and infinite loops

  return (
    <ThemeProvider mode="neutral">
      <AuroraBackground auroraStyle={"none"} className="bg-white">
        <div className="bg-white text-foreground flex flex-col items-center justify-center min-h-screen p-4">
          <div className="w-full max-w-md">
          <div className="relative z-[60] mb-12 text-center pointer-events-auto">
            <p className="text-md text-foreground">
              Do not have an account?{" "}
              <Button
                onClick={() => {
                  setIsSignupLoading(true);
                  handleSignupNavigation();
                }}
                variant={"darkBlueOutline"}
                className={
                  "ml-4 transition-colors hover:shadow-2xl"
                }
                disabled={isSignupLoading}
              >
                {isSignupLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Sign up here
              </Button>
            </p>
          </div>
          <LoginForm />
          <div className={"mt-12 object-center text-center"}>
            <ForgotPasswordForm />
          </div>

          <div className="flex justify-center space-x-4 text-xs mt-12">
            <a
              href={termsOfServiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-4 rounded-md bg-card text-foreground border border-border shadow-md hover:shadow-2xl hover:bg-accent hover:text-accent-foreground transition-all max-w-xs text-center"
              onClick={() => setIsTermsLoading(true)}
            >
              <p className="text-xs">
                <i>View Doctor & Triage </i>
                <br />
                <u>Terms of Service</u>
              </p>
              {isTermsLoading ? (
                <Loader2 className="ml-1 w-4 h-4 animate-spin" />
              ) : (
                <ExternalLink className="ml-1 w-4 h-4" />
              )}
            </a>
            <a
              href={privacyPolicyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-4 rounded-md bg-card text-foreground border border-border shadow-md hover:shadow-2xl hover:bg-accent hover:text-accent-foreground transition-all max-w-xs text-center"
              onClick={() => setIsPrivacyLoading(true)}
            >
              <p className="text-xs">
                <i>View Doctor & Triage</i>{" "}
                <u>
                  Privacy Policy
                  <br />
                </u>
                <br />
              </p>
              {isPrivacyLoading ? (
                <Loader2 className="ml-1 w-4 h-4 animate-spin" />
              ) : (
                <ExternalLink className="ml-1 w-4 h-4" />
              )}
            </a>
          </div>
        </div>

        {/* Reset Password Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>
                Enter your new password below.
              </DialogDescription>
            </DialogHeader>
            <div className="p-4">
              {resetCode && (
                <ResetPasswordView code={resetCode} onSuccess={closeDialog} />
              )}
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </AuroraBackground>
    </ThemeProvider>
  );
}
