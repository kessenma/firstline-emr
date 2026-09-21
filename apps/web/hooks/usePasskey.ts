// hooks/usePasskey.ts
"use client";

import { useState, useCallback, useEffect } from "react";
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from "@simplewebauthn/browser";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/types";

interface UsePasskeyOptions {
  baseUrl?: string;
}

interface PasskeyCredentialData {
  credentialId: string;
  publicKey: string;
  counter: number;
  credentialDeviceType: string;
  credentialBackedUp: boolean;
  transports: string[];
  deviceName: string;
  aaguid: string;
}

interface RegisterResult {
  verified: boolean;
  pendingCredential?: PasskeyCredentialData;
  email?: string;
  tempUserId?: string;
  message?: string;
}

interface AuthenticateResult {
  verified: boolean;
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    accountType: string;
  };
}

export function usePasskey(options: UsePasskeyOptions = {}) {
  const { baseUrl = "" } = options;
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check browser support on mount
  useEffect(() => {
    setIsSupported(browserSupportsWebAuthn());
  }, []);

  /**
   * Register a new passkey for a user
   * @param email User's email address
   * @param userId Optional user ID (for existing users adding a new passkey)
   * @param deviceName Optional name for the device
   */
  const register = useCallback(
    async (
      email: string,
      userId?: string,
      deviceName?: string
    ): Promise<RegisterResult> => {
      if (!isSupported) {
        throw new Error("Passkeys are not supported on this device/browser");
      }

      setIsLoading(true);
      setError(null);

      try {
        // 1. Get registration options from server
        const optionsRes = await fetch(
          `${baseUrl}/api/auth/webauthn/register/options`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, userId }),
          }
        );

        if (!optionsRes.ok) {
          const errorData = await optionsRes.json();
          throw new Error(errorData.error || "Failed to get registration options");
        }

        const registrationOptions = await optionsRes.json();

        // 2. Trigger browser's WebAuthn prompt
        let credential: RegistrationResponseJSON;
        try {
          credential = await startRegistration({ optionsJSON: registrationOptions });
        } catch (browserError: any) {
          // Handle user cancellation gracefully
          if (browserError.name === "NotAllowedError") {
            throw new Error("Passkey registration was cancelled");
          }
          throw browserError;
        }

        // 3. Verify with server
        const verifyRes = await fetch(
          `${baseUrl}/api/auth/webauthn/register/verify`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              credential,
              userId,
              deviceName: deviceName || "My Device",
            }),
          }
        );

        if (!verifyRes.ok) {
          const errorData = await verifyRes.json();
          throw new Error(errorData.error || "Failed to verify registration");
        }

        const result: RegisterResult = await verifyRes.json();
        return result;
      } catch (err: any) {
        const errorMessage = err.message || "Passkey registration failed";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [baseUrl, isSupported]
  );

  /**
   * Authenticate using a registered passkey
   * @param email Optional user's email address. If not provided, uses discoverable credentials mode
   *              which allows the browser to show all passkeys for this site.
   */
  const authenticate = useCallback(
    async (email?: string): Promise<AuthenticateResult> => {
      if (!isSupported) {
        throw new Error("Passkeys are not supported on this device/browser");
      }

      setIsLoading(true);
      setError(null);

      try {
        // 1. Get authentication options from server
        // If email is provided, server will filter to that user's passkeys
        // If not, server enables discoverable credentials mode
        const optionsRes = await fetch(
          `${baseUrl}/api/auth/webauthn/authenticate/options`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email || undefined }),
          }
        );

        if (!optionsRes.ok) {
          const errorData = await optionsRes.json();
          throw new Error(
            errorData.error || "No passkey found for this account"
          );
        }

        const authOptions = await optionsRes.json();

        // 2. Trigger browser's WebAuthn prompt
        // In discoverable mode, browser shows all passkeys for this site
        let credential: AuthenticationResponseJSON;
        try {
          credential = await startAuthentication({ optionsJSON: authOptions });
        } catch (browserError: any) {
          // Handle user cancellation gracefully
          if (browserError.name === "NotAllowedError") {
            throw new Error("Passkey authentication was cancelled");
          }
          throw browserError;
        }

        // 3. Verify with server
        // Server will look up user from credential in discoverable mode
        const verifyRes = await fetch(
          `${baseUrl}/api/auth/webauthn/authenticate/verify`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credential, email: email || undefined }),
          }
        );

        if (!verifyRes.ok) {
          const errorData = await verifyRes.json();
          throw new Error(errorData.error || "Passkey authentication failed");
        }

        const result: AuthenticateResult = await verifyRes.json();
        return result;
      } catch (err: any) {
        const errorMessage = err.message || "Passkey authentication failed";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [baseUrl, isSupported]
  );

  /**
   * Clear any error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isSupported,
    isLoading,
    error,
    register,
    authenticate,
    clearError,
  };
}
