import { signIn as nextAuthSignIn } from "next-auth/react";
import { ToastProps } from "@/components/hooks/useToast";

type AuthExpiredHandler = (message?: string) => void;

export const createApiWrapper = (
  setToast: (toast: ToastProps) => void,
  onAuthExpired?: AuthExpiredHandler,
) => {
  const notifyAuthExpired = (message: string) => {
    setToast({
      title: "Session expired",
      description: message || "Please log in again to continue.",
      variant: "error",
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("auth-expired", { detail: { message } }),
      );
    }
    onAuthExpired?.(message);
  };

  const handleResponse = async (response: Response | any) => {
    // Attempt to read error text for diagnosis
    let bodyText = "";
    try {
      if (response && typeof response.text === "function") {
        bodyText = await response.clone().text();
      }
    } catch {}

    const isExpired =
      (response?.status === 401 || response?.status === 403) &&
      /jwt expired|TokenExpiredError|token expired/i.test(
        bodyText || `${response?.statusText || ""}`,
      );

    if (isExpired) {
      notifyAuthExpired("User token expired. Please re‑log in.");
    }

    // Do not auto-show success toasts; let callers decide.
    if (!response.ok && !isExpired) {
      setToast({
        title: "Error",
        description: `Error: ${response.status || ""} ${response.statusText || response.error}`,
        variant: "error",
      });
    }
    return response;
  };

  const apiCall = async (url: string, options: RequestInit = {}) => {
    try {
      const response = await fetch(url, options);
      await handleResponse(response);
      if (response.ok) {
        return await response.json();
      }

      // Read error body and check for explicit expiry
      let errorText = "";
      try {
        errorText = await response.text();
      } catch {}
      const expired =
        (response.status === 401 || response.status === 403) &&
        /jwt expired|TokenExpiredError|token expired/i.test(
          errorText || response.statusText,
        );
      if (expired) {
        notifyAuthExpired("User token expired. Please re‑log in.");
      }

      throw new Error(
        `HTTP ${response.status} - ${response.statusText} ${errorText ? `- ${errorText}` : ""}`,
      );
    } catch (error) {
      setToast({
        title: "Error",
        description: "An unexpected error occurred while making the API call.",
        variant: "error",
      });
      throw error;
    }
  };

  const signIn = async (provider: string, data: any) => {
    console.log("🔐 apiWrapper.signIn - Starting NextAuth signIn");
    console.log("🔐 apiWrapper.signIn - Provider:", provider);
    console.log("🔐 apiWrapper.signIn - Data:", { ...data, password: "***" });

    const response = await nextAuthSignIn(provider, {
      ...data,
      redirect: false,
    });

    console.log("🔐 apiWrapper.signIn - NextAuth response received");
    console.log("🔐 apiWrapper.signIn - Response:", response);
    console.log("🔐 apiWrapper.signIn - Response type:", typeof response);

    // NextAuth signIn returns a plain object { ok, error, status, url }, NOT a Response
    // Don't call handleResponse which expects a fetch Response object

    // Check for auth errors (invalid credentials, etc.)
    if (response?.error) {
      console.error(
        "🔐 apiWrapper.signIn - Error from NextAuth:",
        response.error,
      );
      // Don't show toast here - let the LoginForm handle it
      // This allows the form to show more specific error messages
    }

    console.log("🔐 apiWrapper.signIn - Returning response to caller");
    return response;
  };

  return {
    get: (url: string, options?: RequestInit) => apiCall(url, options),
    post: (url: string, data: any, options?: RequestInit) => {
      const base = {
        method: "POST",
        headers: { "Content-Type": "application/json" as const },
        body: JSON.stringify(data),
      } as RequestInit;
      return apiCall(url, {
        ...base,
        ...(options || {}),
        headers: {
          ...(base.headers as Record<string, string>),
          ...((options?.headers as Record<string, string>) || {}),
        },
      });
    },
    put: (url: string, data: any, options?: RequestInit) => {
      const base = {
        method: "PUT",
        headers: { "Content-Type": "application/json" as const },
        body: JSON.stringify(data),
      } as RequestInit;
      return apiCall(url, {
        ...base,
        ...(options || {}),
        headers: {
          ...(base.headers as Record<string, string>),
          ...((options?.headers as Record<string, string>) || {}),
        },
      });
    },
    patch: (url: string, data: any, options?: RequestInit) => {
      const base = {
        method: "PATCH",
        headers: { "Content-Type": "application/json" as const },
        body: JSON.stringify(data),
      } as RequestInit;
      return apiCall(url, {
        ...base,
        ...(options || {}),
        headers: {
          ...(base.headers as Record<string, string>),
          ...((options?.headers as Record<string, string>) || {}),
        },
      });
    },
    delete: (url: string, options?: RequestInit) => {
      const base = { method: "DELETE" } as RequestInit;
      return apiCall(url, { ...base, ...(options || {}) });
    },
    signIn,
  };
};
