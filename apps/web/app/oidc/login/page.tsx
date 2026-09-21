// apps/web/app/oidc/login/page.tsx
// OIDC Login page for admin authentication to external services like Zitadel

"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v3";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BarLoader } from "react-spinners";
import { useToast } from "@/components/hooks/useToast";
import { Eye, EyeOff, Fingerprint, KeyRound, ShieldAlert, ShieldCheck, ExternalLink, ArrowLeft } from "lucide-react";
import { usePasskey } from "@/hooks/usePasskey";
import { motion } from "framer-motion";

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

interface InteractionDetails {
  uid: string;
  prompt: {
    name: string;
  };
  params: {
    client_id: string;
    redirect_uri: string;
    scope: string;
    login_hint?: string;
  };
}

export default function OidcLoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const interactionId = searchParams?.get("interaction");

  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interactionDetails, setInteractionDetails] = useState<InteractionDetails | null>(null);

  // 2FA state
  const [twoFAState, setTwoFAState] = useState<{
    loginToken: string;
    methods: string[];
    email: string;
  } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [twoFASubmitting, setTwoFASubmitting] = useState(false);

  const { setToast } = useToast();
  const { isSupported: passkeySupported, authenticate: passkeyAuthenticate } = usePasskey();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Fetch interaction details on mount
  useEffect(() => {
    async function fetchInteraction() {
      if (!interactionId) {
        setError("No interaction ID provided. Please start the login flow from the external service.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/oidc/interaction?uid=${interactionId}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Failed to load login session. It may have expired.");
          setLoading(false);
          return;
        }

        setInteractionDetails(data);

        // Pre-fill email if provided as login_hint
        if (data.params?.login_hint) {
          form.setValue("email", data.params.login_hint);
        }

        setLoading(false);
      } catch (err: any) {
        console.error("Failed to fetch interaction:", err);
        setError("Failed to load login session. Please try again.");
        setLoading(false);
      }
    }

    fetchInteraction();
  }, [interactionId, form]);

  const completeLogin = async (email: string, password?: string, passkeyToken?: string) => {
    try {
      const response = await fetch("/api/oidc/interaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid: interactionId,
          email,
          password,
          passkeyToken,
        }),
      });

      const data = await response.json();

      // Handle 2FA requirement
      if (data.requires2FA) {
        setTwoFAState({
          loginToken: data.loginToken,
          methods: data.methods || ["totp"],
          email,
        });
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Redirect to the OIDC redirect URL
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        throw new Error("No redirect URL received");
      }
    } catch (err: any) {
      console.error("OIDC login error:", err);
      throw err;
    }
  };

  const handleTotpVerify = async () => {
    if (!twoFAState || totpCode.length !== 6) return;
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
        setToast({ title: "Invalid Code", description: data.error || "Please try again.", variant: "destructive" });
        setTwoFASubmitting(false);
        return;
      }

      // Complete OIDC login with the TOTP-issued token (same format as passkey token)
      await completeLogin(twoFAState.email, undefined, data.token);
    } catch (err: any) {
      setToast({ title: "Error", description: err.message || "Verification failed.", variant: "destructive" });
      setTwoFASubmitting(false);
    }
  };

  const handle2FAPasskey = async () => {
    if (!twoFAState) return;
    setTwoFASubmitting(true);

    try {
      const result = await passkeyAuthenticate(twoFAState.email);
      if (result.verified && result.token) {
        await completeLogin(result.user.email, undefined, result.token);
      }
    } catch (err: any) {
      if (!err?.message?.includes("cancelled") && !err?.message?.includes("canceled")) {
        setToast({ title: "Passkey Failed", description: err.message || "Try authenticator code.", variant: "destructive" });
      }
      setTwoFASubmitting(false);
    }
  };

  const onSubmit = async (data: LoginFormValues) => {
    setSubmitting(true);

    try {
      await completeLogin(data.email, data.password);
    } catch (err: any) {
      setToast({
        title: "Login Failed",
        description: err.message || "Invalid credentials or not an admin. Only admins can access this service.",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  const handlePasskeyLogin = async () => {
    const email = form.getValues("email").trim() || undefined;

    setPasskeyLoading(true);

    try {
      // Authenticate with passkey
      const result = await passkeyAuthenticate(email);

      if (result.verified && result.token) {
        await completeLogin(result.user.email, undefined, result.token);
      }
    } catch (err: any) {
      console.error("Passkey authentication failed:", err);
      setToast({
        title: "Passkey Login Failed",
        description: err.message || "Could not authenticate with passkey. Try using your password.",
        variant: "destructive",
      });
      setPasskeyLoading(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <BarLoader color="#3b82f6" />
          <p className="mt-4 text-slate-400">Loading secure login...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <Card className="max-w-md w-full p-6 bg-slate-800 border-slate-700">
          <div className="text-center">
            <ShieldAlert className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h1 className="text-xl font-semibold text-white mb-2">Login Error</h1>
            <p className="text-slate-400 mb-6">{error}</p>
            <Button
              onClick={() => router.push("/")}
              variant="outline"
              className="w-full"
            >
              Return to Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // 2FA verification screen
  if (twoFAState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
          <Card className="p-6 bg-slate-800 border-slate-700">
            <button
              type="button"
              onClick={() => { setTwoFAState(null); setTotpCode(""); }}
              className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-300 mb-4"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            <div className="text-center mb-6">
              <ShieldCheck className="mx-auto h-10 w-10 text-blue-500 mb-3" />
              <h1 className="text-xl font-semibold text-white">Two-Factor Authentication</h1>
              <p className="text-sm text-slate-400 mt-2">Enter the 6-digit code from your authenticator app</p>
            </div>

            {twoFAState.methods.includes("totp") && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="totp-code" className="block text-sm font-medium text-slate-300">Verification Code</label>
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
                    className="mt-1 block w-full px-3 py-2 rounded-md border border-slate-600 bg-slate-700 text-white text-center text-2xl tracking-[0.5em] font-mono placeholder:text-slate-500 placeholder:tracking-[0.5em] placeholder:text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <Button onClick={handleTotpVerify} disabled={totpCode.length !== 6 || twoFASubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  {twoFASubmitting ? "Verifying..." : "Verify Code"}
                </Button>
              </div>
            )}

            {twoFAState.methods.includes("passkey") && passkeySupported && (
              <>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-600" /></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-800 px-2 text-slate-500">Or</span></div>
                </div>
                <Button type="button" onClick={handle2FAPasskey} disabled={twoFASubmitting} variant="submit" className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">
                  <Fingerprint className="mr-2 h-4 w-4" />
                  {twoFASubmitting ? "Authenticating..." : "Use Passkey Instead"}
                </Button>
              </>
            )}

            {twoFASubmitting && (
              <div className="fixed inset-0 bg-slate-900/75 flex items-center justify-center z-50">
                <div className="text-center"><BarLoader color="#3b82f6" /><p className="mt-4 text-slate-400">Authenticating...</p></div>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="p-6 bg-slate-800 border-slate-700">
          {/* Header */}
          <div className="text-center mb-6">
            <ShieldAlert className="mx-auto h-10 w-10 text-blue-500 mb-3" />
            <h1 className="text-xl font-semibold text-white">Admin Authentication</h1>
            <p className="text-sm text-slate-400 mt-2">
              Sign in with your Fajr EMR admin credentials to access this service.
            </p>
          </div>

          {/* Service info */}
          {interactionDetails && (
            <div className="mb-6 p-3 bg-slate-700/50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <ExternalLink className="h-4 w-4" />
                <span>Signing in to external service</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Requested scopes: {interactionDetails.params.scope}
              </p>
            </div>
          )}

          {/* Admin-only notice */}
          <div className="mb-6 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-sm text-amber-200">
              Only administrators can access this service. If you're not an admin, please contact your system administrator.
            </p>
          </div>

          {/* Login Form */}
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-300"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  {...form.register("email")}
                  className="mt-1 block w-full px-3 py-2 rounded-md border border-slate-600 bg-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                  placeholder="admin@example.com"
                />
                {form.formState.errors.email && (
                  <p className="mt-1 text-sm text-red-400">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="relative">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-300"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    {...form.register("password")}
                    className="mt-1 block w-full px-3 py-2 pr-10 rounded-md border border-slate-600 bg-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {form.formState.errors.password && (
                  <p className="mt-1 text-sm text-red-400">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={submitting || passkeyLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  {submitting ? "Signing in..." : "Sign in with Password"}
                </Button>

                {passkeySupported && (
                  <>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-slate-600" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-slate-800 px-2 text-slate-500">Or</span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={handlePasskeyLogin}
                      disabled={submitting || passkeyLoading}
                      variant="submit"
                      className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                    >
                      <Fingerprint className="mr-2 h-4 w-4" />
                      {passkeyLoading ? "Authenticating..." : "Sign in with Passkey"}
                    </Button>
                  </>
                )}
              </div>
            </form>
          </FormProvider>

          {/* Loading overlay */}
          {(submitting || passkeyLoading) && (
            <div className="fixed inset-0 bg-slate-900/75 flex items-center justify-center z-50">
              <div className="text-center">
                <BarLoader color="#3b82f6" />
                <p className="mt-4 text-slate-400">Authenticating...</p>
              </div>
            </div>
          )}
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-4">
          Protected by Fajr Mission EMR
        </p>
      </motion.div>
    </div>
  );
}
