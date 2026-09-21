import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import NetInfo, { NetInfoStateType } from '@react-native-community/netinfo';
import {
  removeStoredToken,
  removeStoredUser,
  getStoredToken,
  getStoredUser,
  setStoredToken,
  setStoredUser,
} from '../utils/storage';
import { PowerSyncService } from '../services/powersync/PowerSyncService';
import { powerSyncSchema } from '../db/powerSyncSchema';
import { API_CONFIG } from '../config';
import { offlineAccountSwitcher } from '../services/powersync/OfflineAccountSwitcherService';
import { syncNetworkController } from '../services/powersync/SyncNetworkController';
import {
  TranslationModelService,
  type TranslationDirection,
} from '../services/TranslationModelService';
import {
  getPendingTranslationModelDownloads,
  hasCompletedDataOnboarding,
  setPendingTranslationModelDownloads,
} from '../utils/dataOnboarding';
import { storage } from '../utils/mmkv';
import { TRANSLATION_MODEL_WIFI_ONLY_KEY } from '../hooks/useTranslationModelWifiOnly';

// How long login will wait for the first sync before carrying on without it.
// Generous, because the whole patient + notes corpus lands in that first sync
// and a mission connection is often poor — but bounded, because this sits on the
// login path and sync continues in the background either way.
const FIRST_SYNC_TIMEOUT_MS = 20_000;

interface StartDataSyncOptions {
  queuedModelDownloads?: TranslationDirection[];
  translationModelWifiOnly?: boolean;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null;
  login: (token: string, user: any) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: any) => void;
  startDataSync: (options?: StartDataSyncOptions) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const syncInitPromiseRef = useRef<Promise<void> | null>(null);

  const runQueuedModelDownloads = useCallback(async (options?: StartDataSyncOptions) => {
    const requested = options?.queuedModelDownloads ?? [];
    const pending = getPendingTranslationModelDownloads();
    const queue = Array.from(new Set([...pending, ...requested]));

    if (queue.length === 0) return;

    const wifiOnly = options?.translationModelWifiOnly
      ?? storage.getString(TRANSLATION_MODEL_WIFI_ONLY_KEY) !== 'false';

    const network = await NetInfo.fetch();
    const isOnWifi = network.type === NetInfoStateType.wifi;
    if (wifiOnly && !isOnWifi) {
      console.log('[AuthContext] Model download queue deferred: WiFi required', { queue });
      setPendingTranslationModelDownloads(queue);
      return;
    }

    const service = TranslationModelService.getInstance();
    const remaining: TranslationDirection[] = [...queue];

    for (const direction of queue) {
      try {
        if (!service.isModelReady(direction)) {
          await service.downloadModel(direction);
        }

        const idx = remaining.indexOf(direction);
        if (idx >= 0) remaining.splice(idx, 1);
        setPendingTranslationModelDownloads(remaining);
      } catch (err) {
        console.warn('[AuthContext] Queued model download failed:', direction, err);
        setPendingTranslationModelDownloads(remaining);
        return;
      }
    }
  }, []);

  const startDataSyncForUser = useCallback(
    async (userId: string, options?: StartDataSyncOptions) => {
      if (syncInitPromiseRef.current) {
        await syncInitPromiseRef.current;
        await runQueuedModelDownloads(options);
        return;
      }

      syncInitPromiseRef.current = (async () => {
        const powerSync = PowerSyncService.getInstance();

        if (!powerSync.isReady()) {
          console.log('[AuthContext] Initializing PowerSync for user...');
          await powerSync.initialize({
            serverUrl: API_CONFIG.current.POWERSYNC_URL,
            schema: powerSyncSchema,
          });
          console.log('[AuthContext] ✅ PowerSync initialized');
        }

        // Wait for data to actually arrive, not just for the database to open.
        //
        // This used to be waitForReady(), which resolves as soon as the SQLite
        // handle is ready — no rows have synced at that point. The user_settings
        // query below then ran against an empty table on every fresh login, so
        // the server's data_sync_wifi_only preference was silently never seeded.
        //
        // Bounded, because this is on the login path: the first sync pulls the
        // whole patient + notes corpus and can take a while on a mission
        // connection. waitForFirstSync *completes* rather than rejects when the
        // signal fires, so a timeout degrades to the old behaviour instead of
        // blocking login.
        //
        // Intentionally no `priority` yet. sync-rules.yaml now marks user_data as
        // priority 1, so once that image is rebuilt and deployed this can become
        // waitForFirstSync({ signal, priority: 1 }) and stop waiting on the bulk
        // reference_data bucket. Passing it before the server serves priorities
        // would just wait for a full sync, so it stays out until then.
        console.log('[AuthContext] Waiting for initial sync...');
        const db = powerSync.getDatabase();
        if (db) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), FIRST_SYNC_TIMEOUT_MS);
          try {
            await db.waitForFirstSync({ signal: controller.signal });
          } catch (syncErr) {
            console.warn('[AuthContext] waitForFirstSync failed:', syncErr);
          } finally {
            clearTimeout(timeoutId);
          }

          if (db.currentStatus?.hasSynced) {
            console.log('[AuthContext] ✅ Initial sync complete!');
          } else {
            console.log(
              `[AuthContext] ⏱️ Initial sync still in progress after ${FIRST_SYNC_TIMEOUT_MS}ms — continuing; it will finish in the background`,
            );
          }
        }

        try {
          const settingsRows = await powerSync.query<{ data_sync_wifi_only: number | null }>(
            `SELECT data_sync_wifi_only FROM user_settings WHERE user_id = ? LIMIT 1`,
            [userId],
          );
          const serverValue = settingsRows[0]?.data_sync_wifi_only;
          if (serverValue !== null && serverValue !== undefined) {
            syncNetworkController.setWifiOnlyPreference(serverValue === 1);
          }
        } catch (seedErr) {
          console.warn('[AuthContext] Could not seed data_sync_wifi_only:', seedErr);
        }

        syncNetworkController.start();

        const pendingCount = await offlineAccountSwitcher.getPendingCount();
        if (pendingCount > 0) {
          console.log('[AuthContext] Found', pendingCount, 'pending items, processing...');
          const result = await offlineAccountSwitcher.processPendingQueue();
          console.log('[AuthContext] ✅ Offline queue processed:', result);
        }
      })();

      try {
        await syncInitPromiseRef.current;
      } finally {
        syncInitPromiseRef.current = null;
      }

      await runQueuedModelDownloads(options);
    },
    [runQueuedModelDownloads],
  );

  const startDataSync = useCallback(
    async (options?: StartDataSyncOptions) => {
      if (!user?.id) return;
      await startDataSyncForUser(user.id, options);
    },
    [startDataSyncForUser, user?.id],
  );

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await getStoredToken();
        const storedUser = await getStoredUser();

        console.log('[AuthContext] Checking auth - Token exists:', !!token);
        console.log('[AuthContext] Checking auth - User exists:', !!storedUser);

        if (token && storedUser) {
          setIsAuthenticated(true);
          setUser(storedUser);
          console.log('[AuthContext] Session restored for:', storedUser.email);

          // Only start PowerSync if user is authorized (approved users always have an approval date)
          if (!storedUser.authorized) {
            console.log('[AuthContext] PowerSync skipped — user not yet authorized');
          } else if (hasCompletedDataOnboarding()) {
            setTimeout(() => {
              void startDataSyncForUser(storedUser.id).catch((error) => {
                console.warn(
                  '[AuthContext] ⚠️ Deferred PowerSync init failed:',
                  error instanceof Error ? error.message : error,
                );
              });
            }, 1000);
          } else {
            console.log('[AuthContext] PowerSync init deferred until data onboarding is confirmed');
          }
        }
      } catch (error) {
        console.error('[AuthContext] Error checking auth:', error);
      }
    };

    checkAuth();
  }, [startDataSyncForUser]);

  const login = useCallback(async (token: string, userData: any) => {
    try {
      console.log('[AuthContext] Logging in user:', userData.email);

      await setStoredToken(token);
      console.log('[AuthContext] Token stored');

      const userWithToken = { ...userData, token };
      await setStoredUser(userWithToken);
      console.log('[AuthContext] User data stored');

      setIsAuthenticated(true);
      setUser(userWithToken);

      console.log('[AuthContext] User logged in successfully:', userData.email);

      // Only start PowerSync if user is authorized (approved users always have an approval date)
      if (!userData.authorized) {
        console.log('[AuthContext] PowerSync skipped — user not yet authorized');
      } else if (hasCompletedDataOnboarding()) {
        setTimeout(() => {
          void startDataSyncForUser(userData.id).catch((error) => {
            console.warn(
              '[AuthContext] ⚠️ Deferred PowerSync init failed:',
              error instanceof Error ? error.message : error,
            );
          });
        }, 1000);
      } else {
        console.log('[AuthContext] PowerSync init deferred until data onboarding is confirmed');
      }
    } catch (error) {
      console.error('[AuthContext] Login error:', error);
      throw error;
    }
  }, [startDataSyncForUser]);

  const logout = useCallback(async () => {
    try {
      console.log('[AuthContext] Logging out user...');

      try {
        console.log('[AuthContext] Removing stored token...');
        await removeStoredToken();
        console.log('[AuthContext] Token removed successfully');
      } catch (tokenError) {
        console.error('[AuthContext] Error removing token:', tokenError);
      }

      try {
        console.log('[AuthContext] Removing stored user...');
        await removeStoredUser();
        console.log('[AuthContext] User removed successfully');
      } catch (userError) {
        console.error('[AuthContext] Error removing user:', userError);
      }

      syncNetworkController.stop();

      try {
        const powerSync = PowerSyncService.getInstance();
        if (powerSync.isReady()) {
          console.log('[AuthContext] Disconnecting PowerSync...');
          await powerSync.disconnect();
          console.log('[AuthContext] PowerSync disconnected');
        }
      } catch (error) {
        console.warn(
          '[AuthContext] PowerSync disconnect failed (non-blocking):',
          error instanceof Error ? error.message : error,
        );
      }

      setIsAuthenticated(false);
      setUser(null);

      console.log('[AuthContext] Logout successful');
    } catch (error) {
      console.error('[AuthContext] Logout error:', error);
      setIsAuthenticated(false);
      setUser(null);
      throw error;
    }
  }, []);

  const updateUser = useCallback(async (userData: any) => {
    try {
      const token = await getStoredToken();
      const userWithToken = { ...userData, token };

      await setStoredUser(userWithToken);
      setUser(userWithToken);
    } catch (error) {
      console.error('[AuthContext] Error updating user:', error);
      throw error;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, user, login, logout, updateUser, startDataSync }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
