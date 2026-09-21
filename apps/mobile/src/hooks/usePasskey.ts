// hooks/usePasskey.ts
import { useState, useCallback, useEffect } from 'react';
import { Passkey } from 'react-native-passkey';
import { API_CONFIG, getEnvironment } from '../config';
import { Platform } from 'react-native';

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

export function usePasskey() {
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check passkey support on mount
  useEffect(() => {
    try {
      // Check if passkeys are supported on this device
      // iOS 16+ and Android API 28+ required
      // Note: isSupported() is synchronous in v3.x
      const supported = Passkey.isSupported();
      setIsSupported(supported);
    } catch {
      setIsSupported(false);
    }
  }, []);

  // Get the current base URL based on environment
  const getBaseUrl = useCallback(() => {
    const env = getEnvironment();
    if (Platform.OS === 'android' && env === 'development') {
      return API_CONFIG.DEV.BASE_URL.replace('localhost', '10.0.2.2');
    }
    return env === 'production' ? API_CONFIG.PROD.BASE_URL : API_CONFIG.DEV.BASE_URL;
  }, []);

  /**
   * Register a new passkey for a user
   */
  const register = useCallback(
    async (email: string, userId?: string): Promise<any> => {
      if (!isSupported) {
        throw new Error('Passkeys are not supported on this device');
      }

      setIsLoading(true);
      setError(null);

      try {
        const baseUrl = getBaseUrl();

        // 1. Get registration options from server
        console.log('[Passkey] Fetching registration options...');
        const optionsRes = await fetch(
          `${baseUrl}/api/auth/webauthn/register/options`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, userId }),
          }
        );

        if (!optionsRes.ok) {
          const errorData = await optionsRes.json();
          throw new Error(errorData.error || 'Failed to get registration options');
        }

        const optionsData = await optionsRes.json();
        // Extract challengeToken for stateless auth (cookies don't work cross-origin)
        const { challengeToken: regChallengeToken, ...options } = optionsData;

        // If user already has passkeys synced via iCloud, excludeCredentials may
        // cause iOS to throw a generic error. Try without them as a fallback.
        console.log('[Passkey] Got options, excludeCredentials count:', options.excludeCredentials?.length ?? 0);

        // 2. Trigger native passkey registration (using create() in v3.x API)
        let credential;
        try {
          console.log('[Passkey] Triggering native passkey creation...');
          credential = await Passkey.create(options);
          console.log('[Passkey] Native passkey created successfully');
        } catch (nativeErr: any) {
          console.error('[Passkey] Native creation failed:', nativeErr.message, nativeErr);

          // If native creation fails and we had excludeCredentials, retry without them.
          // iCloud Keychain syncs passkeys across devices, and iOS may throw a generic
          // "unknown error" when it detects a conflict with excluded credentials.
          if (options.excludeCredentials?.length > 0) {
            console.log('[Passkey] Retrying without excludeCredentials...');
            const retryOptions = { ...options, excludeCredentials: [] };
            credential = await Passkey.create(retryOptions);
            console.log('[Passkey] Retry succeeded');
          } else {
            // Handle specific native error types
            const msg = nativeErr.message || '';
            if (msg.includes('cancelled') || msg.includes('canceled')) {
              throw new Error('Passkey registration was cancelled');
            }
            throw new Error(
              msg || 'Passkey creation failed. Ensure you are using iOS 16+ and have iCloud Keychain enabled.'
            );
          }
        }

        // 3. Verify with server
        // Include challengeToken since mobile can't use cookies
        console.log('[Passkey] Verifying credential with server...');
        const verifyRes = await fetch(
          `${baseUrl}/api/auth/webauthn/register/verify`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              credential,
              userId,
              deviceName: `${Platform.OS} Device`,
              challengeToken: regChallengeToken, // Pass the signed challenge token for mobile
            }),
          }
        );

        if (!verifyRes.ok) {
          const errorData = await verifyRes.json();
          console.error('[Passkey] Server verification failed:', errorData);
          throw new Error(errorData.error || 'Failed to verify registration');
        }

        console.log('[Passkey] Registration complete!');
        return await verifyRes.json();
      } catch (err: any) {
        const errorMessage = err.message || 'Passkey registration failed';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [isSupported, getBaseUrl]
  );

  /**
   * Authenticate using a registered passkey
   * @param email Optional email. If not provided, uses discoverable credentials mode
   *              which lets the OS show all passkeys for this site.
   */
  const authenticate = useCallback(
    async (email?: string): Promise<AuthenticateResult> => {
      if (!isSupported) {
        throw new Error('Passkeys are not supported on this device');
      }

      setIsLoading(true);
      setError(null);

      try {
        const baseUrl = getBaseUrl();

        // 1. Get authentication options from server
        // If email is provided, server filters to that user's passkeys
        // If not, server enables discoverable credentials mode
        const optionsRes = await fetch(
          `${baseUrl}/api/auth/webauthn/authenticate/options`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email || undefined }),
          }
        );

        if (!optionsRes.ok) {
          const errorData = await optionsRes.json();
          throw new Error(
            errorData.error || 'No passkey found for this account'
          );
        }

        const optionsData = await optionsRes.json();
        // Extract challengeToken for stateless auth (cookies don't work cross-origin)
        const { challengeToken, ...options } = optionsData;

        // 2. Trigger native passkey authentication (using get() in v3.x API)
        // In discoverable mode, OS shows all passkeys for this site
        const credential = await Passkey.get(options);

        // 3. Verify with server
        // Server will look up user from credential in discoverable mode
        // Include challengeToken since mobile can't use cookies
        const verifyRes = await fetch(
          `${baseUrl}/api/auth/webauthn/authenticate/verify`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              credential,
              email: email || undefined,
              challengeToken, // Pass the signed challenge token for mobile
            }),
          }
        );

        if (!verifyRes.ok) {
          const errorData = await verifyRes.json();
          throw new Error(errorData.error || 'Passkey authentication failed');
        }

        return await verifyRes.json();
      } catch (err: any) {
        const errorMessage = err.message || 'Passkey authentication failed';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [isSupported, getBaseUrl]
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
