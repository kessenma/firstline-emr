"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v3";
import { TextFormField } from "@/components/ui/TextFormField";
import { Button } from "@/components/ui/button";
import { Loader2, Clock, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/hooks/useToast";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { AuroraBackground } from "@/components/ui/aurora-background";

const verificationSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  verificationCode: z
    .string()
    .min(6, "Verification code must be at least 6 characters")
    .max(6, "Verification code must be at most 6 characters"),
});

type VerificationFormValues = z.infer<typeof verificationSchema>;

export default function AdminSignupVerify() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [accessValidated, setAccessValidated] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);

  const form = useForm<VerificationFormValues>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      email: searchParams.get("email") || "",
      verificationCode: "",
    },
  });

  // Validate access and fetch token expiry time when component mounts
  useEffect(() => {
    let isMounted = true;
    const validateAccess = async () => {
      const email = searchParams.get("email");
      if (!email) {
        setAccessDenied(true);
        setAccessError("No email provided in URL");
        return;
      }

      try {
        const response = await fetch(
          "/api/admin/validate-verification-access",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          },
        );

        const result = await response.json();

        if (isMounted) {
          if (response.ok && result.success) {
            // Access is valid, set up the timer
            setAccessValidated(true);
            const expiry = new Date(result.expiryDate);
            setExpiryDate(expiry);

            // Check if token is already expired when component loads
            const now = new Date();
            if (expiry.getTime() <= now.getTime()) {
              setTimeRemaining(0);
              setIsExpired(true);
            } else {
              const diff = expiry.getTime() - now.getTime();
              setTimeRemaining(Math.floor(diff / 1000));
              setIsExpired(false);
            }
          } else {
            // Access denied
            setAccessDenied(true);
            setAccessError(result.error || "Access denied");
          }
        }
      } catch (error) {
        console.error("Error validating access:", error);
        if (isMounted) {
          setAccessDenied(true);
          setAccessError("Failed to validate access");
        }
      }
    };

    validateAccess();

    return () => {
      isMounted = false;
    };
  }, [searchParams]); // Only run when searchParams changes

  // Separate effect for the countdown timer
  useEffect(() => {
    if (!expiryDate) return;

    // Set up interval to update countdown
    const intervalId = setInterval(() => {
      const now = new Date();
      const diff = expiryDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining(0);
        setIsExpired(true);
        clearInterval(intervalId);
      } else {
        setTimeRemaining(Math.floor(diff / 1000));
        setIsExpired(false);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [expiryDate]);

  // Time remaining is now managed directly in the useEffect hooks

  // Format time remaining as HH:MM:SS
  const formatTimeRemaining = () => {
    if (timeRemaining === null) return "--:--:--";
    if (timeRemaining <= 0) return "00:00:00";

    const hours = Math.floor(timeRemaining / 3600);
    const minutes = Math.floor((timeRemaining % 3600) / 60);
    const seconds = timeRemaining % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // Get timer color based on remaining time
  const getTimerColor = () => {
    if (timeRemaining === null) return "text-muted-foreground";
    if (timeRemaining <= 3600) return "text-destructive"; // Last hour
    if (timeRemaining <= 21600) return "text-accent-foreground"; // Last 6 hours
    return "text-success";
  };

  // Timer display component
  const TimerDisplay = () => {
    const color = getTimerColor();

    return (
      <div className="flex justify-center items-center space-x-2">
        <Clock className={`w-5 h-5 ${color}`} />
        <span className={`font-mono font-medium ${color}`}>
          {formatTimeRemaining()}
        </span>
      </div>
    );
  };

  const onSubmit = async (data: VerificationFormValues) => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/verify-user-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          verificationCode: data.verificationCode,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Redirect to the main signup page with the confirmation token
        router.push(`/admin-signup/${result.confirmationToken}`);
      } else {
        setToast({
          title: "Verification Failed",
          description:
            result.error || "Invalid verification code. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Verification error:", error);
      setToast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while validating access
  if (!accessValidated && !accessDenied) {
    return (
      <AuroraBackground auroraStyle={"grey"}>
        <div className="flex justify-center items-center px-4 py-12 min-h-screen sm:px-6 lg:px-8">
          <div className="space-y-8 w-full max-w-md">
            <div className="text-center">
              <Loader2 className="mx-auto w-8 h-8 animate-spin" />
              <p className="mt-4 text-sm text-muted-foreground">
                Validating access...
              </p>
            </div>
          </div>
        </div>
      </AuroraBackground>
    );
  }

  // Show access denied message
  if (accessDenied) {
    return (
      <AuroraBackground auroraStyle={"grey"}>
        <div className="flex justify-center items-center px-4 py-12 min-h-screen sm:px-6 lg:px-8">
          <div className="space-y-8 w-full max-w-md">
            <div className="text-center">
              <h2 className="mt-6 text-3xl font-extrabold text-foreground">
                Access Denied
              </h2>
              <div className="p-4 mt-4 mb-4 bg-destructive/10 rounded-md border border-destructive/30">
                <div className="flex items-start">
                  <AlertTriangle className="mr-2 w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-lg font-semibold text-destructive">
                      Invalid Access
                    </h3>
                    <p className="mt-1 text-sm text-destructive/90">
                      {accessError ||
                        "You do not have permission to access this verification page."}
                    </p>
                    <p className="mt-2 text-sm text-destructive/90">
                      This page is only accessible to users who have been
                      created by an administrator and have received a valid
                      verification email.
                    </p>
                  </div>
                </div>
              </div>
              <Button onClick={() => router.push("/login")} className="w-full">
                Go to Login
              </Button>
            </div>
          </div>
        </div>
      </AuroraBackground>
    );
  }

  return (
    <AuroraBackground auroraStyle={"grey"}>
      <div className="flex justify-center items-center px-4 py-12 min-h-screen sm:px-6 lg:px-8">
        <div className="space-y-8 w-full max-w-md">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-foreground">
              Verify Your Account
            </h2>
            {isExpired ? (
              <div className="p-4 mt-4 mb-4 bg-destructive/10 rounded-md border border-destructive/30">
                <div className="flex items-start">
                  <AlertTriangle className="mr-2 w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-lg font-semibold text-destructive">
                      Verification Code Expired
                    </h3>
                    <p className="mt-1 text-sm text-destructive/90">
                      Your verification code has expired. Please contact your
                      administrator to request a new verification code.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Please enter the verification code sent to your email address to
                continue setting up your account.
              </p>
            )}
          </div>

          <FormProvider {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="mt-8 space-y-6"
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <input
                    type="hidden"
                    {...form.register("email")}
                    value={searchParams.get("email") || ""}
                  />
                  <p className="p-2 text-foreground bg-muted rounded-md border border-border">
                    {searchParams.get("email") || "No email provided"}
                  </p>
                </div>

                <TextFormField
                  fieldName="verificationCode"
                  fieldLabel="Verification Code"
                  placeholder={
                    isExpired
                      ? "Verification code expired"
                      : "Enter 6-character code"
                  }
                  autoComplete="off"
                  disabled={isExpired}
                  error={form.formState.errors.verificationCode?.message}
                />

                {/* Timer display */}
                {timeRemaining !== null && (
                  <div className="mt-2 text-center">
                    <p className="mb-1 text-sm text-muted-foreground">
                      Time remaining:
                    </p>
                    <TimerDisplay />
                  </div>
                )}
              </div>

              {/* Warning about token completion */}
              <div className="p-3 mb-4 bg-accent/10 rounded-md border border-accent/30">
                <div className="flex items-start">
                  <AlertTriangle className="mr-2 w-5 h-5 text-accent-foreground shrink-0 mt-0.5" />
                  <p className="text-sm text-accent-foreground">
                    <span className="font-semibold">Important:</span> After
                    verification, you must complete the account setup form
                    immediately. Your token will become invalid if you close the
                    browser or navigate away before completing the setup.
                  </p>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading || isExpired}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    Verifying...
                  </>
                ) : isExpired ? (
                  "Verification Expired"
                ) : (
                  "Verify Code"
                )}
              </Button>
            </form>
          </FormProvider>

          <div className="text-center">
            {isExpired ? (
              <div className="p-4 mt-4 text-left bg-destructive/10 rounded-md border border-destructive/30">
                <h3 className="mb-2 text-lg font-semibold text-destructive">
                  Verification Code Expired
                </h3>
                <p className="mb-3 text-sm text-destructive/90">
                  Your verification code has expired. Please contact your
                  administrator to request a new verification code.
                </p>
                <p className="text-sm text-destructive/90">
                  The administrator can send you a new verification code by
                  accessing the admin dashboard and using the &quot;Send
                  Follow-up Email&quot; option for your account.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Didn&apos;t receive the code? Please check your spam folder or
                contact your administrator.
              </p>
            )}
          </div>
        </div>
      </div>
    </AuroraBackground>
  );
}
