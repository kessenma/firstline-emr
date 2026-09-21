// apps/web/components/hooks/Providers.tsx
"use client";

import type React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { useEffect, useState } from "react";
import { SessionProvider } from "next-auth/react";
import {
  ToastContext,
  useToastState,
  ToastComponent,
} from "@/components/hooks/useToast";
import { createApiWrapper } from "@/utils/apiWrapper";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 15, // 15 minutes - prevents refetch on tab switch
            gcTime: 1000 * 60 * 30, // 30 minutes cache time
            refetchOnWindowFocus: false, // Don't refetch when window regains focus
            refetchOnMount: false, // Don't refetch on component mount
            refetchOnReconnect: false, // Don't refetch when network reconnects
            retry: 1,
            retryDelay: 1000,
          },
        },
      }),
  );

  const toastState = useToastState();
  const router = useRouter();

  const [authExpiredOpen, setAuthExpiredOpen] = useState(false);
  const [authExpiredMsg, setAuthExpiredMsg] = useState<string>("");

  const triggerAuthExpired = (message?: string) => {
    setAuthExpiredMsg(message || "User token expired. Please re‑log in.");
    setAuthExpiredOpen(true);
  };

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | { message?: string }
        | undefined;
      triggerAuthExpired(detail?.message);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("auth-expired", handler as EventListener);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("auth-expired", handler as EventListener);
      }
    };
  }, []);

  const api = createApiWrapper(toastState.setToast, triggerAuthExpired);

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ToastContext.Provider value={{ ...toastState, api }}>
          {children}
          <ToastComponent />
          <Dialog open={authExpiredOpen} onOpenChange={setAuthExpiredOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Session expired</DialogTitle>
                <DialogDescription>
                  {authExpiredMsg ||
                    "Your session has expired. Please log in again to continue."}
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setAuthExpiredOpen(false)}
                >
                  Dismiss
                </Button>
                <Button
                  onClick={() => {
                    setAuthExpiredOpen(false);
                    router.push("/auth/login");
                  }}
                >
                  Go to Login
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </ToastContext.Provider>
        {/* <ReactQueryDevtools initialIsOpen={false} /> */}
      </QueryClientProvider>
    </SessionProvider>
  );
}
