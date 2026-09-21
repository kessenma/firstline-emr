import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
} from 'react';
import {
  powerSyncService,
  PowerSyncService,
} from '../services/powersync/PowerSyncService';
import { powerSyncSchema } from '../db/powerSyncSchema';
import { API_CONFIG } from '../config';
import { DatabaseService } from '../services/DatabaseService';

interface DatabaseContextType {
  powerSyncService: PowerSyncService;
  databaseService?: DatabaseService;
  isInitialized: boolean;
  isInitializing: boolean;
  error: Error | null;
  initialize: (config?: {
    serverUrl?: string;
    authToken?: string;
  }) => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(
  undefined,
);

interface DatabaseProviderProps {
  children: React.ReactNode;
  config?: {
    serverUrl?: string;
    authToken?: string;
    autoInitialize?: boolean;
  };
}

export const DatabaseProvider: React.FC<DatabaseProviderProps> = ({
  children,
  config = {},
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [databaseService] = useState(() => new DatabaseService());

  // PowerSync initialization is handled by AuthContext after login + authorization check.
  // DatabaseContext only provides the service instance and manual initialize method.

  const initializePowerSync = useCallback(
    async (initConfig?: { serverUrl?: string; authToken?: string }) => {
      if (isInitialized || isInitializing) {
        console.warn('PowerSync already initialized or initializing');
        return;
      }

      try {
        setIsInitializing(true);
        setError(null);

        const finalConfig = {
          serverUrl:
            initConfig?.serverUrl ||
            config.serverUrl ||
            API_CONFIG.current.POWERSYNC_URL,
          schema: powerSyncSchema,
          // authToken is optional — fetchCredentials in PowerSyncService
          // handles token retrieval and auto-refresh from the server
          authToken: initConfig?.authToken || config.authToken,
          syncIntervalMs: 30000,
          retryAttempts: 3,
          uploadChunkSize: 100,
        };

        console.log('[DatabaseContext] Initializing PowerSync...');
        await powerSyncService.initialize(finalConfig);
        setIsInitialized(true);

        console.log('✅ PowerSync initialized via DatabaseContext');
      } catch (err) {
        const initError = err as Error;
        setError(initError);
        console.error('❌ PowerSync initialization failed:', initError);
      } finally {
        setIsInitializing(false);
      }
    },
    [config.serverUrl, config.authToken, isInitialized, isInitializing],
  );

  const value = useMemo(
    () => ({
      powerSyncService,
      databaseService,
      isInitialized,
      isInitializing,
      error,
      initialize: initializePowerSync,
    }),
    [
      databaseService,
      isInitialized,
      isInitializing,
      error,
      initializePowerSync,
    ],
  );

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};

/**
 * Hook to use the PowerSync database service
 */
export const useDatabase = (): DatabaseContextType => {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};

/**
 * Hook to access PowerSync service directly
 */
export const usePowerSync = () => {
  const { powerSyncService: service } = useDatabase();
  return service;
};

export default DatabaseContext;
