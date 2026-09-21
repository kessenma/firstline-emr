// apps/mobile/src/hooks/powersync/usePowerSync.ts
// Main PowerSync context hook - provides access to PowerSync service

import { useContext, createContext, useEffect, useRef, useState, ReactNode } from 'react';
import { powerSyncService, PowerSyncService } from '../../services/powersync/PowerSyncService';
import { powerSyncSchema } from '../../db/powerSyncSchema';
import { API_CONFIG } from '../../config';

// PowerSync Context Type
interface PowerSyncContextType {
  service: PowerSyncService;
  isInitialized: boolean;
  isConnecting: boolean;
  error: Error | null;
  initialize: (config?: { serverUrl?: string; authToken?: string }) => Promise<void>;
}

// Create PowerSync Context
const PowerSyncContext = createContext<PowerSyncContextType | null>(null);

// PowerSync Provider Props
interface PowerSyncProviderProps {
  children: ReactNode;
  config?: {
    serverUrl?: string;
    authToken?: string;
    autoInitialize?: boolean;
  };
}

// PowerSync Provider Component
export function PowerSyncProvider({ children, config }: PowerSyncProviderProps) {
  // Check if service is already initialized (e.g., by DatabaseContext)
  const [isInitialized, setIsInitialized] = useState(() => powerSyncService.isReady());
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Mirror the singleton's readiness into React state.
  //
  // The service is initialized elsewhere — AuthContext, only after login AND the
  // data-onboarding sheet is confirmed — so readiness can arrive arbitrarily late
  // in the session, and can drop back to false on logout. Poll for the whole
  // provider lifetime rather than for a fixed window after mount: this provider is
  // mounted above the auth gate, so a bounded window expires while the user is
  // still on the login screen, leaving isInitialized false forever and silently
  // disabling every gated consumer (usePowerSyncQuery, usePowerSyncPagedList,
  // useSyncStatus). Reading two booleans every 500ms costs nothing.
  const readyRef = useRef(isInitialized);

  useEffect(() => {
    const syncReadyState = () => {
      const ready = powerSyncService.isReady();
      if (ready === readyRef.current) return;

      readyRef.current = ready;
      console.log(
        ready
          ? '✅ PowerSyncProvider: Detected external initialization'
          : '🔌 PowerSyncProvider: Service is no longer ready',
      );
      setIsInitialized(ready);
    };

    syncReadyState();
    const interval = setInterval(syncReadyState, 500);

    return () => clearInterval(interval);
  }, []);

  // PowerSync initialization is handled by AuthContext after login + authorization check.
  // PowerSyncProvider only provides the service instance and manual initialize method.

  // Manual initialization function
  const initialize = async (initConfig?: { serverUrl?: string; authToken?: string }) => {
    if (isInitialized || isConnecting) {
      console.warn('PowerSync already initialized or initializing');
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);

      const finalConfig = {
        serverUrl: initConfig?.serverUrl || config?.serverUrl || API_CONFIG.current.POWERSYNC_URL,
        schema: powerSyncSchema,
        authToken: initConfig?.authToken || config?.authToken,
        syncIntervalMs: 30000,
        retryAttempts: 3,
        uploadChunkSize: 100,
      };

      await powerSyncService.initialize(finalConfig);
      readyRef.current = true;
      setIsInitialized(true);

      console.log('✅ PowerSync initialized via React hook');
    } catch (err) {
      const initError = err as Error;
      setError(initError);
      console.error('❌ PowerSync initialization failed:', initError);
      throw initError;
    } finally {
      setIsConnecting(false);
    }
  };

  const contextValue: PowerSyncContextType = {
    service: powerSyncService,
    isInitialized,
    isConnecting,
    error,
    initialize,
  };

  return (
    <PowerSyncContext.Provider value={contextValue}>
      {children}
    </PowerSyncContext.Provider>
  );
}

// Main PowerSync Hook
export function usePowerSync(): PowerSyncContextType {
  const context = useContext(PowerSyncContext);

  if (!context) {
    throw new Error(
      'usePowerSync must be used within a PowerSyncProvider. ' +
      'Wrap your app with <PowerSyncProvider> or ensure the provider is properly configured.'
    );
  }

  return context;
}

// Utility hook for PowerSync readiness
export function usePowerSyncReady(): boolean {
  const { isInitialized, isConnecting } = usePowerSync();
  return isInitialized && !isConnecting;
}

// Hook for PowerSync connection status
export function usePowerSyncConnection(): {
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
} {
  const { service, isConnecting, error } = usePowerSync();
  const [isConnected, setIsConnected] = useState(service.isConnected());

  useEffect(() => {
    const handleStatusChange = () => {
      setIsConnected(service.isConnected());
    };

    // Listen for connection changes
    service.addEventListener('onConnected', handleStatusChange);
    service.addEventListener('onDisconnected', handleStatusChange);

    // Initial status
    setIsConnected(service.isConnected());

    return () => {
      service.removeEventListener('onConnected');
      service.removeEventListener('onDisconnected');
    };
  }, [service]);

  return {
    isConnected,
    isConnecting,
    error,
  };
}

// Export context for advanced usage
export { PowerSyncContext };
export type { PowerSyncProviderProps, PowerSyncContextType };
