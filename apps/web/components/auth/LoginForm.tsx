// apps/web/components/auth/LoginForm.tsx
"use client";

import { useForm, FormProvider } from "react-hook-form";
import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v3";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { getProviders } from "next-auth/react";
import { BarLoader } from "react-spinners";
import { useApi } from "@/components/hooks/useApi";
import { Card } from "../ui/card";
import { motion } from "framer-motion";
import { useToast } from "@/components/hooks/useToast";
import { Eye, EyeOff, Fingerprint, KeyRound, ShieldCheck, ArrowLeft } from "lucide-react";
import { usePasskey } from "@/hooks/usePasskey";
import Link from "next/link";
import type { TwoFactorMethod } from "@fajr/shared/2fa";

const loginSchema = z.object({
  email: z
    .string()
    .nonempty("Email is required.")
    .email("Please enter a valid email address."),
  password: z
    .string()
    .nonempty("Password is required.")
    .min(8, "Password must be at least 8 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSuccessfulLogin?: () => void;
}

export function LoginForm({ onSuccessfulLogin }: LoginFormProps) {
  const router = useRouter();
  const api = useApi();
  const [submitting, setSubmitting] = useState(false);
  const [providers, setProviders] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const { setToast } = useToast();
  const { isSupported: passkeySupported, authenticate: passkeyAuthenticate } = usePasskey();

  // 2FA state
  const [twoFAState, setTwoFAState] = useState<{
    active: boolean;
    loginToken: string;
    methods: TwoFactorMethod[];
    email: string;
  } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [twoFASubmitting, setTwoFASubmitting] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    console.log("🔐 LoginForm - Component mounted");
    const fetchProviders = async () => {
      const res = await getProviders();
      setProviders(res);
      console.log("🔐 LoginForm - Providers fetched:", res);
    };
    fetchProviders();
  }, []);

  const onSubmit = async (data: LoginFormValues) => {
    console.log("🔐 LoginForm - onSubmit called!");
    console.log("🔐 LoginForm - Form data:", {
      email: data.email,
      hasPassword: !!data.password,
    });
    console.log("🔐 LoginForm - Current submitting state:", submitting);

    setSubmitting(true);
    console.log("🔐 LoginForm - Set submitting to true");

    try {
      console.log("🔐 LoginForm - Starting login attempt with api.signIn");
      console.log("🔐 LoginForm - api object exists:", !!api);
      console.log("🔐 LoginForm - api.signIn exists:", !!api?.signIn);

      const response = await api.signIn("credentials", {
        email: data.email,
        password: data.password,
      });

      console.log("🔐 LoginForm - SignIn response received:");
      console.log("🔐 LoginForm - Full response:", response);
      console.log("🔐 LoginForm - Response type:", typeof response);
      console.log(
        "🔐 LoginForm - Response keys:",
        response ? Object.keys(response) : "null",
      );
      console.log("🔐 LoginForm - response.ok:", response?.ok);
      console.log("🔐 LoginForm - response.error:", response?.error);
      console.log("🔐 LoginForm - response.status:", response?.status);
      console.log("🔐 LoginForm - response.url:", response?.url);

      // NextAuth signIn returns { ok, error, status, url }
      // Check ok === true OR (!error && status === 200)
      const isSuccess =
        response?.ok === true || (!response?.error && response?.status === 200);

      console.log("🔐 LoginForm - isSuccess evaluated to:", isSuccess);

      if (isSuccess) {
        console.log("✅ LoginForm - Login successful!");
        console.log("✅ LoginForm - About to redirect to /home");
        console.log(
          "✅ LoginForm - onSuccessfulLogin callback exists:",
          !!onSuccessfulLogin,
        );

        if (onSuccessfulLogin) {
          console.log("✅ LoginForm - Calling onSuccessfulLogin callback");
          onSuccessfulLogin();
        } else {
          console.log("✅ LoginForm - Using window.location.href redirect");
          console.log(
            "✅ LoginForm - Current window.location:",
            window.location.href,
          );
          console.log("✅ LoginForm - Redirecting NOW...");

          // Force a delay to ensure logs are visible
          setTimeout(() => {
            console.log("✅ LoginForm - REDIRECT EXECUTING");
            window.location.href = "/home";
          }, 100);
        }
      } else {
        // Check for 2FA_REQUIRED error
        const errorMsg = response?.error || "";
        if (errorMsg.startsWith("2FA_REQUIRED:")) {
          const parts = errorMsg.split(":");
          const loginToken = parts[1];
          const methods = (parts[2] || "totp").split(",") as TwoFactorMethod[];
          console.log("🔐 LoginForm - 2FA required, methods:", methods);
          setTwoFAState({ active: true, loginToken, methods, email: data.email });
          setSubmitting(false);
          return;
        }

        if (errorMsg === "2FA_SETUP_REQUIRED") {
          setToast({
            title: "2FA Setup Required",
            description: "Please set up two-factor authentication to continue.",
            variant: "destructive",
          });
          setSubmitting(false);
          // Redirect to 2FA setup page
          setTimeout(() => { window.location.href = "/auth/setup-2fa"; }, 1000);
          return;
        }

        console.error("❌ LoginForm - Login failed");
        setToast({
          title: "Error",
          description:
            errorMsg ||
            "Login failed. Please check your credentials and try again.",
          variant: "destructive",
        });
        setSubmitting(false);
      }
    } catch (error) {
      console.error("❌ LoginForm - Caught exception:", error);
      setToast({
        title: "Error",
        description: "An unexpected error occurred. Please try again later.",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  // Handle 2FA TOTP verification
  const handleTotpVerify = async () => {
    if (!twoFAState || !totpCode || totpCode.length !== 6) return;
    setTwoFASubmitting(true);

    try {
      const res = await fetch("/api/auth/totp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: twoFAState.email,
          code: totpCode,
          loginToken: twoFAState.loginToken,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.verified) {
        setToast({
          title: "Invalid Code",
          description: data.error || "Please check your authenticator app and try again.",
          variant: "destructive",
        });
        setTwoFASubmitting(false);
        return;
      }

      // Use the token to complete sign-in via NextAuth
      const response = await api.signIn("credentials", {
        email: twoFAState.email,
        passkeyToken: data.token,
      });

      const isSuccess =
        response?.ok === true || (!response?.error && response?.status === 200);

      if (isSuccess) {
        if (onSuccessfulLogin) {
          onSuccessfulLogin();
        } else {
          setTimeout(() => { window.location.href = "/home"; }, 100);
        }
      } else {
        setToast({
          title: "Error",
          description: response?.error || "Login failed after 2FA verification.",
          variant: "destructive",
        });
        setTwoFASubmitting(false);
      }
    } catch {
      setToast({
        title: "Error",
        description: "Failed to verify code. Please try again.",
        variant: "destructive",
      });
      setTwoFASubmitting(false);
    }
  };

  // Handle 2FA passkey verification
  const handle2FAPasskey = async () => {
    if (!twoFAState) return;
    setTwoFASubmitting(true);

    try {
      const result = await passkeyAuthenticate(twoFAState.email);
      if (result.verified && result.token) {
        const response = await api.signIn("credentials", {
          email: result.user.email,
          passkeyToken: result.token,
        });

        const isSuccess =
          response?.ok === true || (!response?.error && response?.status === 200);

        if (isSuccess) {
          if (onSuccessfulLogin) {
            onSuccessfulLogin();
          } else {
            setTimeout(() => { window.location.href = "/home"; }, 100);
          }
        } else {
          throw new Error(response?.error || "Passkey login failed");
        }
      }
    } catch (error: any) {
      if (!error?.message?.includes("cancelled") && !error?.message?.includes("canceled")) {
        setToast({
          title: "Passkey Failed",
          description: error.message || "Please try using your authenticator app instead.",
          variant: "destructive",
        });
      }
      setTwoFASubmitting(false);
    }
  };

  const handlePasskeyLogin = async () => {
    // Email is optional - if not provided, uses discoverable credentials mode
    // which lets the browser show all passkeys registered for this site
    const email = form.getValues("email").trim() || undefined;

    setPasskeyLoading(true);
    console.log("🔑 LoginForm - Starting passkey authentication", email ? `for: ${email}` : "(discoverable mode)");

    try {
      // Authenticate with passkey (email is optional)
      const result = await passkeyAuthenticate(email);
      console.log("🔑 LoginForm - Passkey authentication result:", result);

      if (result.verified && result.token) {
        // Sign in with NextAuth using the passkey token
        // Use the email from the result (server looked it up from credential)
        const response = await api.signIn("credentials", {
          email: result.user.email,
          passkeyToken: result.token,
        });

        const isSuccess =
          response?.ok === true || (!response?.error && response?.status === 200);

        if (isSuccess) {
          console.log("✅ LoginForm - Passkey login successful!");
          if (onSuccessfulLogin) {
            onSuccessfulLogin();
          } else {
            setTimeout(() => {
              window.location.href = "/home";
            }, 100);
          }
        } else {
          throw new Error(response?.error || "Passkey login failed");
        }
      }
    } catch (error: any) {
      console.error("❌ LoginForm - Passkey authentication failed:", error);
      setToast({
        title: "Passkey Login Failed",
        description: error.message || "Could not authenticate with passkey. Try using your password.",
        variant: "destructive",
      });
      setPasskeyLoading(false);
    }
  };

  // 2FA verification screen
  if (twoFAState) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <Card
          className="w-full md:max-w-md p-4 md:p-8"
          backgroundColor="card"
          backgroundOpacity={100}
          blurAmount={10}
          shadowSize="lg"
          borderColor="border-border"
          borderSize={1}
        >
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => { setTwoFAState(null); setTotpCode(""); }}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <div className="text-center">
              <ShieldCheck className="h-10 w-10 text-primary mx-auto mb-2" />
              <h2 className="text-lg font-semibold text-foreground">Two-Factor Authentication</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            {/* TOTP Code Input */}
            {twoFAState.methods.includes("totp") && (
              <div>
                <label
                  htmlFor="totp-code"
                  className="block text-sm font-medium text-foreground"
                >
                  Verification Code
                </label>
                <input
                  id="totp-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={(e) => { if (e.key === "Enter" && totpCode.length === 6) handleTotpVerify(); }}
                  className="mt-1 block w-full px-3 py-2 rounded-md shadow-xs border border-border bg-background text-foreground text-center text-2xl tracking-[0.5em] font-mono placeholder:text-muted-foreground placeholder:tracking-[0.5em] placeholder:text-lg focus:outline-hidden focus:ring-ring focus:border-primary sm:text-2xl"
                />
                <Button
                  type="button"
                  onClick={handleTotpVerify}
                  disabled={totpCode.length !== 6 || twoFASubmitting}
                  variant="default"
                  className="w-full mt-3"
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  {twoFASubmitting ? "Verifying..." : "Verify Code"}
                </Button>
              </div>
            )}

            {/* Passkey alternative */}
            {twoFAState.methods.includes("passkey") && passkeySupported && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or</span>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={handle2FAPasskey}
                  disabled={twoFASubmitting}
                  variant="outline"
                  className="w-full"
                >
                  <Fingerprint className="mr-2 h-4 w-4" />
                  {twoFASubmitting ? "Authenticating..." : "Use Passkey Instead"}
                </Button>
              </>
            )}

            {twoFASubmitting && (
              <div className="fixed inset-0 bg-background/75 flex items-center justify-center z-50">
                <BarLoader />
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <Card
        className="w-full md:max-w-md p-4 md:p-8"
        backgroundColor="card"
        backgroundOpacity={100}
        blurAmount={10}
        shadowSize="lg"
        borderColor="border-border"
        borderSize={1}
      >
        <FormProvider {...form}>
          <form
            onSubmit={(e) => {
              form.handleSubmit(onSubmit)(e);
            }}
            className="space-y-4"
          >
            <div className="relative">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-foreground"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                {...form.register("email")}
                className="mt-1 block w-full px-3 py-2 pr-16 rounded-md shadow-xs border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-ring focus:border-primary sm:text-sm"
              />
            </div>
            <div className="relative">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-foreground"
              >
                Password
              </label>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                {...form.register("password")}
                className="mt-1 block w-full px-3 py-2 pr-16 rounded-md shadow-xs border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-ring focus:border-primary sm:text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-muted-foreground text-sm"
                style={{ top: "50%", transform: "translateY(3%)" }}
              >
                {showPassword ? <EyeOff size={"24"} /> : <Eye size={"24"} />}
              </button>
            </div>
            <div className="flex flex-col gap-3 mt-6">
              <Button
                type="submit"
                disabled={submitting || passkeyLoading}
                variant="default"
                className="w-full hover:shadow-2xl"
              >
                <KeyRound className="mr-2 h-4 w-4" />
                Login with Password
              </Button>

              {passkeySupported && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={handlePasskeyLogin}
                    disabled={submitting || passkeyLoading}
                    variant="outline"
                    className="w-full hover:shadow-2xl"
                  >
                    <Fingerprint className="mr-2 h-4 w-4" />
                    {passkeyLoading ? "Authenticating..." : "Login with Passkey"}
                  </Button>
                </>
              )}

              {(submitting || passkeyLoading) && (
                <div className="fixed inset-0 bg-background/75 flex items-center justify-center z-50">
                  <BarLoader />
                </div>
              )}
            </div>

            <div className="flex justify-center gap-4 mt-4 text-xs text-muted-foreground">
              <Link href="/auth/user-privacy-policy" className="hover:underline">
                Privacy Policy
              </Link>
              <span>|</span>
              <Link href="/auth/user-terms-of-service" className="hover:underline">
                Terms of Service
              </Link>
            </div>
          </form>
        </FormProvider>
      </Card>
    </motion.div>
  );
}

export default LoginForm;
