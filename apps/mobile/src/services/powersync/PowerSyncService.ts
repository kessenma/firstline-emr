// apps/mobile/src/services/powersync/PowerSyncService.ts
// Comprehensive PowerSync service for offline-first data synchronization

import {
  PowerSyncDatabase,
  SyncStatus,
  CrudEntry,
  UploadQueueStats,
  CommonPowerSyncDatabase,
  LogLevels,
  type PowerSyncLogger,
  SyncStreamConnectionMethod,
} from '@powersync/react-native';
import { storageUtils } from '../../utils/storage';
import { TokenStorage } from '../TokenStorage';
import { getOrCreateEncryptionKey, deleteEncryptionKey } from '../EncryptionKeyManager';
import { migrateToCipherDb } from './migrateToCipherDb';
import { DB_NAME, deleteDbFiles } from './dbFiles';

/**
 * Raised when an operation exceeds its bound. Distinct from a real failure:
 * a hang and an error need different recovery, so callers must be able to tell
 * them apart.
 */
class PowerSyncTimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`${label} did not complete within ${ms}ms`);
    this.name = 'PowerSyncTimeoutError';
  }
}

/**
 * Race a promise against a timeout.
 *
 * Hermes has no AbortSignal.timeout(), hence the manual race. A late
 * settlement is deliberately swallowed — once the race is lost nobody is
 * listening, and an unhandled rejection surfacing minutes later as a redbox is
 * worse than no signal at all.
 */
function withTimeout<T>(operation: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new PowerSyncTimeoutError(label, ms)), ms);
  });
  operation.catch(() => {});
  return Promise.race([operation, timeout]).finally(() => clearTimeout(timer));
}

// Opening a database is lazy: the PowerSyncDatabase constructor returns before
// SQLite has touched the file, so a database the native layer cannot read does
// NOT throw there. It surfaces as initialization never completing — observed
// 2026-08-22, where a stale DB left db.connect() pending forever with no error,
// fetchCredentials never reached, and an app that looked healthy but silently
// never synced. Proving readiness explicitly, with a bound, is what makes that
// state recoverable instead of terminal.
//
// Generous relative to reality (a healthy open completes in ~1s) because the
// recovery is destructive: crossing it deletes the database, losing any
// un-uploaded ps_crud rows. Prefer a long wait over wiping a working database
// on a loaded device.
const DB_READY_TIMEOUT_MS = 45_000;

// Non-destructive. A stalled connect is a network condition, not a corrupt
// database, and the SDK retries on its own — so this only stops a hang from
// blocking the steps that run after initialize().
const CONNECT_TIMEOUT_MS = 60_000;

// PowerSync Service Events
export interface PowerSyncServiceEvents {
  onSyncStatusChange: (status: SyncStatus) => void;
  onUploadQueueChange: (stats: UploadQueueStats) => void;
  onConflict: (conflict: any) => void;
  onError: (error: Error) => void;
  onConnected: () => void;
  onDisconnected: () => void;
}

// PowerSync Configuration
export interface PowerSyncConfig {
  serverUrl: string;
  authToken?: string;
  schema: any; // PowerSync schema
  syncIntervalMs?: number;
  retryAttempts?: number;
  uploadChunkSize?: number;
}

// Conflict Resolution Strategy
export enum ConflictResolutionStrategy {
  CLIENT_WINS = 'client_wins',
  SERVER_WINS = 'server_wins',
  MANUAL = 'manual',
  MERGE = 'merge',
}

// Conflict Resolution Result
export interface ConflictResolutionResult {
  resolved: boolean;
  data?: any;
  strategy: ConflictResolutionStrategy;
  error?: string;
}

// Sync Statistics
export interface SyncStatistics {
  totalSyncTime: number;
  recordsSynced: number;
  conflictsResolved: number;
  errors: number;
  lastSyncTimestamp: Date;
  averageSyncDuration: number;
}

// PowerSync Service Class
export class PowerSyncService {
  private db: PowerSyncDatabase | null = null;
  private config: PowerSyncConfig | null = null;
  private isInitialized = false;
  private isConnecting = false;
  private busyErrorCount = 0;
  private isResettingDb = false;
  private isReconnecting = false;       // Guard against duplicate reconnect() calls
  private reconnectAttempts = 0;        // Exponential backoff counter
  private lastDisconnectTime: number | null = null; // Cooldown after disconnect
  private syncStatus: SyncStatus = {
    connected: false,
    options: {},
    clientImplementation: 'mock',
    connecting: false,
    lastSyncedAt: undefined,
    dataFlowStatus: 'stopped',
    crudUploadStatus: 'stopped',
    clientId: 'mock-client',
  } as any;
  private eventListeners: Partial<PowerSyncServiceEvents> = {};
  // Multi-subscriber status fan-out.
  //
  // Separate from `eventListeners` above, which is a single-slot map: registering
  // 'onSyncStatusChange' twice silently replaces the first handler, and removing
  // it clears the slot for every consumer. That is fine for the one-off internal
  // hooks it was built for, but useSyncStatus is mounted concurrently by several
  // components, so it needs a real set.
  //
  // Subscribing here rather than to db.registerListener() directly also survives
  // resetDatabase(), which swaps in a brand-new PowerSyncDatabase — a listener
  // held on the old instance would silently go dead.
  private statusSubscribers = new Set<(status: SyncStatus) => void>();
  // Dev-only: timestamp of the last status log, to show the interval between changes
  private lastStatusLogAt = 0;
  private conflictResolvers: Map<
    string,
    (conflict: any) => Promise<ConflictResolutionResult>
  > = new Map();
  private syncStatistics: SyncStatistics = {
    totalSyncTime: 0,
    recordsSynced: 0,
    conflictsResolved: 0,
    errors: 0,
    lastSyncTimestamp: new Date(),
    averageSyncDuration: 0,
  };

  // Registry for note deletes — stores patient_id before DELETE so upload handler can use it
  private pendingNoteDeletes = new Map<string, string>();

  /** Call before deleting a note so the upload handler knows the patient_id */
  registerPendingNoteDelete(noteId: string, patientId: string) {
    this.pendingNoteDeletes.set(noteId, patientId);
  }

  /** Peek at the pending patient_id without removing it (retry-safe) */
  private getPendingNoteDelete(noteId: string): string | undefined {
    return this.pendingNoteDeletes.get(noteId);
  }

  /** Remove entry only after successful upload */
  private clearPendingNoteDelete(noteId: string): void {
    this.pendingNoteDeletes.delete(noteId);
  }

  // Singleton instance
  private static instance: PowerSyncService;
  static getInstance(): PowerSyncService {
    if (!PowerSyncService.instance) {
      PowerSyncService.instance = new PowerSyncService();
    }
    return PowerSyncService.instance;
  }

  // Initialize PowerSync
  async initialize(config: PowerSyncConfig): Promise<void> {
    // If already initialized with a different server URL, force reinitialize
    if (this.config && this.config.serverUrl !== config.serverUrl) {
      console.log('[PowerSync] Server URL changed from', this.config.serverUrl, 'to', config.serverUrl, '— reinitializing');
      try {
        if (this.db) {
          await this.db.disconnect();
        }
      } catch {
        // Ignore disconnect errors during reinit
      }
      this.db = null;
      this.isInitialized = false;
      this.isConnecting = false;
      this.config = null;
    } else if (this.isInitialized || this.isConnecting) {
      // Hot-reload resilience: if initialized but DB is disconnected,
      // the JS runtime restarted while the native SQLite handle survived.
      // Do a clean reconnect instead of returning early.
      if (this.isInitialized && this.db && !this.db.connected) {
        console.log('[PowerSync] Stale singleton detected (initialized but disconnected) — reconnecting');
        try {
          await this.reconnect();
        } catch (error) {
          console.error('[PowerSync] Stale singleton reconnect failed:', error);
        }
        return;
      }
      console.warn('PowerSyncService already initialized or initializing');
      return;
    }

    try {
      this.isConnecting = true;
      this.config = config;

      // Migrate from unencrypted DB (one-time, deletes old fajr-emr.db)
      await migrateToCipherDb();

      // Initialize PowerSync with encrypted SQLite database (SQLCipher via op-sqlite)
      const encryptionKey = await getOrCreateEncryptionKey();

      try {
        // v2 removed the open-factory from the public API: op-sqlite is bundled
        // into @powersync/react-native and open options move onto `database`
        // directly. SQLCipher is unchanged — same sqliteOptions.encryptionKey,
        // same "op-sqlite": { "sqlcipher": true } in package.json.
        this.db = new PowerSyncDatabase({
          schema: config.schema,
          database: { dbFilename: DB_NAME, sqliteOptions: { encryptionKey } },
          logger: this.createSdkLogger(),
        });
        // Not redundant with the constructor above: this is where an unreadable
        // database actually reveals itself, either by throwing or by never
        // settling. Without the bound, the latter is indistinguishable from a
        // slow start and initialization simply never returns.
        await withTimeout(
          this.db.waitForReady(),
          DB_READY_TIMEOUT_MS,
          'Database initialization',
        );
      } catch (dbError) {
        // Reached when the database cannot be opened or read — a lost or
        // rotated encryption key, or a native SQLCipher change the existing
        // file predates.
        const hung = dbError instanceof PowerSyncTimeoutError;
        console.warn(
          hung
            ? '[PowerSync] Database did not become ready — treating as unreadable and resetting'
            : '[PowerSync] Encrypted DB failed to open — resetting:',
          dbError,
        );

        // Delete before discarding the key. These paths used to be built from
        // DocumentDirectoryPath while op-sqlite writes under Library, so nothing
        // was removed — and dropping the key then left the surviving database
        // permanently unopenable.
        const removed = await deleteDbFiles(DB_NAME);
        console.warn(`[PowerSync] Removed ${removed.length} unreadable DB file(s)`);
        await deleteEncryptionKey();
        const newKey = await getOrCreateEncryptionKey();
        this.db = new PowerSyncDatabase({
          schema: config.schema,
          database: { dbFilename: DB_NAME, sqliteOptions: { encryptionKey: newKey } },
          logger: this.createSdkLogger(),
        });

        // If a database we just created from nothing still will not come ready,
        // the problem is not the file. Fail loudly rather than looping.
        await withTimeout(
          this.db.waitForReady(),
          DB_READY_TIMEOUT_MS,
          'Database initialization (after reset)',
        );
        console.log('[PowerSync] Recovered with fresh encrypted DB');
      }

      console.log('[PowerSync] Database initialized with SQLCipher encryption');

      // Set up event listeners
      this.setupEventListeners();

      // Connect to PowerSync server
      await this.connect();

      this.isInitialized = true;
      this.isConnecting = false;

      console.log('✅ PowerSyncService initialized successfully');
      this.eventListeners.onConnected?.();
    } catch (error) {
      this.isConnecting = false;
      console.error('❌ PowerSyncService initialization failed:', error);
      this.eventListeners.onError?.(error as Error);
      throw error;
    }
  }

  // Transport for the sync stream.
  //
  // The SDK defaults to WEB_SOCKET (RSocket over WS). On that transport the
  // stream is torn down every ~4-40s with `Closed. Original cause [Error: Stream
  // end encountered]` and no download/upload error, then reconnects on the SDK's
  // 5s retry — the server sees it as "client closing stream", the client sees the
  // socket closed by the peer, and neither side reports a fault.
  //
  // The same server holds an HTTP sync stream open indefinitely (verified: 150s
  // with clean ~20s keepalives), so HTTP is the natural A/B to localise the fault
  // — but switching to it is NOT just this constant. AbstractRemote.postStreamRaw
  // throws on `!res.body`, and React Native's built-in fetch never populates
  // `body`; that requires the `react-native-fetch-api` polyfill (plus a streams
  // polyfill) installed and applied in index.js, which this app does not have.
  // Setting HTTP without those breaks sync entirely rather than degrading.
  private static readonly CONNECTION_METHOD = SyncStreamConnectionMethod.WEB_SOCKET;

  // Single source of truth for connect arguments — initialize(), reconnect() and
  // resetDatabase() all connect, and they must not drift apart on transport.
  //
  // These are two separate arguments: db.connect(connector, options). They used to
  // be merged into one object passed as the connector, which meant
  // connectionMethod was never read — the SDK only duck-types fetchCredentials /
  // uploadData off the first argument. That happened to be harmless because
  // WEB_SOCKET is the SDK default anyway, but it silently discarded anything put
  // there, so keep them apart.
  private buildConnector() {
    return {
      fetchCredentials: this.fetchCredentials.bind(this),
      uploadData: this.uploadData.bind(this),
    };
  }

  private buildConnectOptions() {
    return {
      connectionMethod: PowerSyncService.CONNECTION_METHOD,
    };
  }

  // Dev-only: surface the PowerSync SDK's own connection diagnostics.
  //
  // The SDK explains every stream teardown through its internal logger
  // ('Stream input empty', 'Token will expire soon; reconnect', 'No data received
  // on WebSocket in 30000ms, closing connection', ...), but nothing in this app
  // ever configured that logger, so those messages were being discarded — which
  // is why a graceful disconnect looks like it comes from nowhere.
  //
  // DEBUG level is a firehose (every sync line), so the handler forwards only
  // connection-relevant messages.
  private static readonly RELEVANT_LOG =
    /stream|socket|token|reconnect|credential|connect|abort|clos|retry|expir/i;

  private static readonly LEVEL_NAMES: Record<number, string> = {
    [LogLevels.trace]: 'TRACE',
    [LogLevels.debug]: 'DEBUG',
    [LogLevels.info]: 'INFO',
    [LogLevels.warn]: 'WARN',
    [LogLevels.error]: 'ERROR',
  };

  /**
   * The logger handed to PowerSyncDatabase.
   *
   * v2 dropped the js-logger dependency: there is no global logger to
   * configure and no setHandler, so this is passed per database rather than
   * installed once. That is an improvement — the previous version mutated a
   * global base logger through an `any` cast, which is why nothing in this app
   * reliably received the SDK's own diagnostics.
   *
   * DEBUG is a firehose (every sync line), so in dev only connection-relevant
   * messages are forwarded. In production the SDK's chatter would be noise, so
   * only warnings and above pass, unfiltered.
   */
  private createSdkLogger(): PowerSyncLogger {
    if (!__DEV__) {
      return {
        log: ({ level, message, error }) => {
          if (level < LogLevels.warn) return;
          console.warn(`[PowerSyncSDK] ${message}`, error ?? '');
        },
      };
    }

    console.log('🛰️ PowerSync SDK connection logging enabled (dev only)');
    return {
      log: ({ level, message, error }) => {
        const text = error ? `${message} ${String(error)}` : message;
        if (!PowerSyncService.RELEVANT_LOG.test(text)) return;
        const name = PowerSyncService.LEVEL_NAMES[level] ?? String(level);
        console.log(`🛰️ [PowerSyncSDK/${name}] ${text}`);
      },
    };
  }

  // Connect to PowerSync server
  private async connect(): Promise<void> {
    if (!this.db || !this.config) {
      throw new Error('PowerSyncService not initialized');
    }

    try {
      console.log('🔌 Attempting to connect to PowerSync...');
      console.log('🌐 Server URL:', this.config.serverUrl);

      // Test server accessibility first
      try {
        console.log('🔍 Testing PowerSync server accessibility...');
        const testController = new AbortController();
        const testTimeoutId = setTimeout(() => testController.abort(), 5000);
        const testResponse = await fetch(
          `${this.config.serverUrl}/probes/liveness`,
          {
            method: 'GET',
            signal: testController.signal,
          },
        );
        clearTimeout(testTimeoutId);
        console.log(
          '✅ PowerSync server is accessible, status:',
          testResponse.status,
        );
      } catch (testError) {
        console.warn(
          '⚠️ PowerSync server accessibility test failed:',
          testError instanceof Error ? testError.message : testError,
        );
        console.warn(
          '⚠️ This might be OK if server does not expose health endpoint',
        );
      }

      // Connect to PowerSync server.
      //
      // Bounded but non-fatal: a stalled connect used to leave initialize()
      // pending forever, which silently skipped everything downstream of it —
      // the user_settings seeding of data_sync_wifi_only and
      // SyncNetworkController.start() among them. The SDK keeps retrying in the
      // background, so carrying on with local data beats blocking on it.
      try {
        await withTimeout(
          this.db.connect(this.buildConnector(), this.buildConnectOptions()),
          CONNECT_TIMEOUT_MS,
          'Connect',
        );
      } catch (connectError) {
        if (!(connectError instanceof PowerSyncTimeoutError)) throw connectError;
        console.warn(
          '[PowerSync] Connect timed out — continuing offline; the SDK will keep retrying',
        );
      }

      // Report what is actually true, not what was attempted. connect() can
      // return having timed out, and claiming success there is exactly how a
      // silently-never-syncing state stays invisible in the logs.
      console.log(
        this.db.connected
          ? '🔗 Connected to PowerSync server'
          : '🔌 PowerSync not connected yet — proceeding with local data',
      );
    } catch (error) {
      console.error('❌ PowerSync connection failed:', error);
      console.error('📋 Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        serverUrl: this.config.serverUrl,
        hasToken: !!this.config.authToken,
      });
      console.error(
        '💡 Troubleshooting tips:',
        '\n  1. Check PowerSync server is running: docker ps | grep powersync',
        '\n  2. Verify server URL is correct for your platform',
        '\n  3. Check JWT token is valid and includes admin claim',
        '\n  4. Review PowerSync server logs: docker logs powersync-server',
      );
      throw error;
    }
  }

  // Refresh the PowerSync token using the auth token
  private async refreshPowerSyncToken(): Promise<string | null> {
    const authToken = TokenStorage.getAuthToken();
    if (!authToken) {
      console.warn('⚠️ No auth token available to refresh PowerSync token');
      return null;
    }

    try {
      const { getApiUrl } = await import('../../config');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(getApiUrl('/auth/refresh-powersync'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error('❌ PowerSync token refresh failed:', response.status);
        return null;
      }

      const data = await response.json();
      if (data.success && data.powerSyncToken) {
        TokenStorage.setPowerSyncToken(data.powerSyncToken);
        console.log('✅ PowerSync token refreshed successfully');
        return data.powerSyncToken;
      }

      console.error('❌ PowerSync token refresh returned no token');
      return null;
    } catch (error) {
      console.error(
        '❌ PowerSync token refresh error:',
        error instanceof Error ? error.message : error,
      );
      return null;
    }
  }

  // Fetch authentication credentials
  private async fetchCredentials(): Promise<{
    endpoint: string;
    token: string;
  }> {
    if (!this.config) {
      throw new Error('PowerSyncService not configured');
    }

    // Get PowerSync-specific token from secure storage
    let token: string | undefined =
      TokenStorage.getPowerSyncToken() || undefined;

    // If no token or token needs refresh, try to refresh it
    if (!token || TokenStorage.needsPowerSyncRefresh()) {
      console.log('🔄 PowerSync token missing or needs refresh, refreshing...');
      const refreshedToken = await this.refreshPowerSyncToken();
      if (refreshedToken) {
        token = refreshedToken;
      }
    }

    // Fallback 1: Try config token (for backward compatibility)
    if (!token) {
      token = this.config.authToken;
      if (token) {
        console.log('⚠️ Using config.authToken (fallback)');
      }
    }

    // Fallback 2: Try legacy storage (for backward compatibility)
    if (!token) {
      token = storageUtils.getToken() || undefined;
      if (token) {
        console.log('⚠️ Using legacy storage token (fallback)');
      }
    }

    if (!token) {
      console.error('❌ No PowerSync token available');
      console.error(
        '💡 Tip: User may need to log out and log back in to get PowerSync token',
      );
      throw new Error('No PowerSync token available');
    }

    return {
      endpoint: this.config.serverUrl,
      token,
    };
  }

  // Handle data uploads — with per-table error isolation (Phase 3.1)
  private async uploadData(db: CommonPowerSyncDatabase): Promise<void> {
    try {
      const batch = await db.getCrudBatch();
      if (!batch || batch.crud.length === 0) {
        return;
      }

      console.log(`📤 Uploading ${batch.crud.length} changes to server`);

      // Group changes by table for batch processing
      const changesByTable = this.groupChangesByTable(batch.crud);

      let tablesSucceeded = 0;
      let tablesFailed = 0;
      const failedTables: string[] = [];

      // Process each table's changes with error isolation
      for (const [table, changes] of changesByTable.entries()) {
        try {
          await this.processTableChanges(table, changes);
          tablesSucceeded++;
        } catch (error) {
          tablesFailed++;
          failedTables.push(table);
          console.error(`❌ Upload failed for table '${table}':`, error);
          // Continue processing other tables
        }
      }

      // Only complete the batch if at least one table succeeded
      if (tablesSucceeded > 0) {
        await batch.complete();
        console.log(
          `✅ Upload batch completed: ${tablesSucceeded} tables succeeded` +
            (tablesFailed > 0
              ? `, ${tablesFailed} failed (${failedTables.join(', ')})`
              : ''),
        );
      } else {
        // ALL tables failed — throw so PowerSync retries the whole batch
        console.error(
          `❌ Upload batch FAILED: all ${tablesFailed} tables errored (${failedTables.join(', ')})`,
        );
        throw new Error(`All ${tablesFailed} table uploads failed`);
      }
    } catch (error) {
      console.error('❌ Upload failed:', error);
      throw error;
    }
  }

  // Group CRUD changes by table
  private groupChangesByTable(changes: CrudEntry[]): Map<string, CrudEntry[]> {
    const grouped = new Map<string, CrudEntry[]>();

    for (const change of changes) {
      const table = change.table;
      if (!grouped.has(table)) {
        grouped.set(table, []);
      }
      grouped.get(table)!.push(change);
    }

    return grouped;
  }

  // Process changes for a specific table — with per-record error tolerance (Phase 3.2)
  private async processTableChanges(
    table: string,
    changes: CrudEntry[],
  ): Promise<void> {
    console.log(`📤 Processing ${changes.length} changes for table: ${table}`);

    // Get auth token for API calls
    const token = TokenStorage.getAuthToken();
    if (!token) {
      console.error('❌ No auth token available for upload');
      throw new Error('No authentication token available');
    }

    // Import getApiUrl dynamically to avoid circular dependency
    const { getApiUrl } = await import('../../config');

    let succeeded = 0;
    let failed = 0;

    for (const change of changes) {
      try {
        await this.processChange(table, change, token, getApiUrl);
        succeeded++;
      } catch (error) {
        failed++;
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`❌ Record ${change.id} in ${table} failed: ${msg}`);
        // Continue processing remaining records
      }
    }

    console.log(
      `📤 Table '${table}': ${succeeded} succeeded, ${failed} failed out of ${changes.length}`,
    );

    // Throw if > 50% of the batch failed — signals a systemic issue
    const total = succeeded + failed;
    if (total > 0 && failed / total > 0.5) {
      throw new Error(
        `Table '${table}' upload: ${failed}/${total} records failed (>50% threshold)`,
      );
    }
  }

  // Process a single change and sync to API
  private async processChange(
    table: string,
    change: CrudEntry,
    token: string,
    getApiUrl: (path: string) => string,
  ): Promise<void> {
    const { op, opData } = change;
    const recordId = change.id;

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // Notes require special handling: API uses /patient/{patientId}/notes/doctor-notes
    if (table === 'notes') {
      await this.processNoteChange(op, opData, recordId, headers, getApiUrl);
      return;
    }

    // Care team requires special handling: API uses /patient/care-team
    if (table === 'patient_care_team') {
      await this.processCareTeamChange(op, opData, recordId, headers, getApiUrl);
      return;
    }

    // Care team conflicts are server-written only — skip upload
    if (table === 'care_team_conflicts') {
      console.log('⏭️ Skipping care_team_conflicts upload (server-written only)');
      return;
    }

    // Profile update requests are read-only on device: approve/deny/delete all
    // go through /api/admin/profile-update-requests/{id} and sync back.
    if (table === 'user_profile_update_requests') {
      console.log(
        '⏭️ Skipping user_profile_update_requests upload (server-written only)',
      );
      return;
    }

    // Telegram link codes: POST to /patient/{patientId}/generate-telegram-link-code
    if (table === 'telegram_link_codes') {
      if (op === 'PUT') {
        const patientId = opData?.patient_id;
        if (!patientId) {
          console.warn('⚠️ telegram_link_codes record missing patient_id, skipping');
          return;
        }
        const url = getApiUrl(`/patient/${patientId}/generate-telegram-link-code`);
        console.log(`📤 Syncing link code for patient ${patientId}`);
        const response = await fetch(url, { method: 'POST', headers });
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Failed to sync link code: ${response.status} ${errorText}`);
        } else {
          console.log(`✅ Link code synced for patient ${patientId}`);
        }
      }
      // PATCH/DELETE not needed for link codes — server manages state
      return;
    }

    // Map table names to API endpoints
    const tableToEndpoint: Record<string, string> = {
      patients: '/patient',
      users: '/user',
    };

    const endpoint = tableToEndpoint[table];
    if (!endpoint) {
      console.warn(`⚠️ No API endpoint mapped for table: ${table}, skipping sync`);
      return;
    }

    try {
      switch (op) {
        case 'PUT': { // New record created locally — POST to create on server
          const apiData = this.convertToApiFormat(table, opData);
          apiData.id = recordId; // include the local ID so server uses it

          // Patients created locally (drafts or published) need POST, not PATCH
          if (table === 'patients') {
            console.log(`📤 Syncing CREATE to POST ${endpoint} (id: ${recordId})`);
            const createResponse = await fetch(getApiUrl(endpoint), {
              method: 'POST',
              headers,
              body: JSON.stringify(apiData),
            });
            if (!createResponse.ok) {
              const errorText = await createResponse.text();
              // If 409 conflict (already exists), fall through to PATCH
              if (createResponse.status === 409) {
                console.log(`⚠️ Patient ${recordId} already exists, falling back to PATCH`);
                const patchResponse = await fetch(getApiUrl(`${endpoint}/${recordId}`), {
                  method: 'PATCH',
                  headers,
                  body: JSON.stringify(apiData),
                });
                if (!patchResponse.ok) {
                  const patchError = await patchResponse.text();
                  console.error(`❌ Fallback PATCH failed for ${table}:`, patchResponse.status, patchError);
                  throw new Error(`Fallback PATCH failed: ${patchResponse.statusText}`);
                }
              } else {
                console.error(`❌ Create failed for ${table}:`, createResponse.status, errorText);
                throw new Error(`Create failed: ${createResponse.statusText}`);
              }
            }
            console.log(`✅ CREATE synced successfully for ${table}/${recordId}`);
          } else {
            // Other tables: keep original PUT → PATCH behavior
            console.log(`📤 Syncing UPDATE to ${endpoint}/${recordId}`);
            const updateResponse = await fetch(getApiUrl(`${endpoint}/${recordId}`), {
              method: 'PATCH',
              headers,
              body: JSON.stringify(apiData),
            });
            if (!updateResponse.ok) {
              const errorText = await updateResponse.text();
              console.error(`❌ Update failed for ${table}:`, updateResponse.status, errorText);
              throw new Error(`Update failed: ${updateResponse.statusText}`);
            }
            console.log(`✅ UPDATE synced successfully for ${table}/${recordId}`);
          }
          break;
        }

        case 'PATCH': // Partial update
          console.log(`📤 Syncing PATCH to ${endpoint}/${recordId}`);
          const patchResponse = await fetch(getApiUrl(`${endpoint}/${recordId}`), {
            method: 'PATCH',
            headers,
            body: JSON.stringify(this.convertToApiFormat(table, opData)),
          });
          if (!patchResponse.ok) {
            const errorText = await patchResponse.text();
            console.error(`❌ Patch failed for ${table}:`, patchResponse.status, errorText);
            throw new Error(`Patch failed: ${patchResponse.statusText}`);
          }
          console.log(`✅ PATCH synced successfully for ${table}/${recordId}`);
          break;

        case 'DELETE':
          console.log(`📤 Syncing DELETE to ${endpoint}/${recordId}`);
          const deleteResponse = await fetch(getApiUrl(`${endpoint}/${recordId}`), {
            method: 'DELETE',
            headers,
          });
          if (!deleteResponse.ok && deleteResponse.status !== 404) {
            // 404 = already deleted on server, treat as success
            const errorText = await deleteResponse.text();
            console.error(`❌ Delete failed for ${table}:`, deleteResponse.status, errorText);
            throw new Error(`Delete failed: ${deleteResponse.statusText}`);
          }
          console.log(`✅ DELETE synced successfully for ${table}/${recordId}`);
          break;

        default:
          console.warn(`⚠️ Unknown operation type: ${op} for table ${table}`);
      }
    } catch (error) {
      console.error(`❌ Failed to sync ${op} for ${table}:`, error);
      throw error;
    }
  }

  // Special handler for notes: API endpoint requires patient_id in URL path
  private async processNoteChange(
    op: string,
    opData: any,
    recordId: string,
    headers: Record<string, string>,
    getApiUrl: (path: string) => string,
  ): Promise<void> {
    // For DELETE ops, opData is null — use pre-registered lookup (peek, don't consume yet)
    let patientId = opData?.patient_id;
    if (!patientId && op === 'DELETE') {
      patientId = this.getPendingNoteDelete(recordId);
    }

    // For PATCH ops, opData only has changed columns — query local DB for patient_id
    if (!patientId && op === 'PATCH' && this.db) {
      try {
        const rows = await this.db.getAll<{ patient_id: string }>(
          `SELECT patient_id FROM notes WHERE id = ? LIMIT 1`,
          [recordId],
        );
        patientId = rows[0]?.patient_id;
      } catch (e) {
        console.warn('Could not query patient_id for note PATCH:', e);
      }
    }

    if (!patientId) {
      console.error(`❌ Notes record missing patient_id for ${op}, cannot sync (id: ${recordId})`);
      return;
    }

    const noteId = opData?.id || recordId;
    const noteEndpoint = `/patient/${patientId}/notes/doctor-notes`;

    try {
      switch (op) {
        case 'PUT': // New note created locally
        case 'PATCH': { // Note updated locally
          console.log(`📤 Syncing note ${op} to ${noteEndpoint}`);
          const apiData = this.convertToApiFormat('notes', opData);
          apiData.noteId = noteId;
          const response = await fetch(getApiUrl(noteEndpoint), {
            method: 'PATCH',
            headers,
            body: JSON.stringify(apiData),
          });
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Note sync failed:`, response.status, errorText);
            throw new Error(`Note sync failed: ${response.statusText}`);
          }
          console.log(`✅ Note synced successfully: ${noteId}`);
          break;
        }
        case 'DELETE': {
          console.log(`📤 Syncing note DELETE to ${noteEndpoint}`);
          const response = await fetch(getApiUrl(noteEndpoint), {
            method: 'DELETE',
            headers,
            body: JSON.stringify({ noteId }),
          });
          // 404 = note already gone on server → treat as success (idempotent delete)
          if (!response.ok && response.status !== 404) {
            const errorText = await response.text();
            console.error(`❌ Note delete failed:`, response.status, errorText);
            throw new Error(`Note delete failed: ${response.statusText}`);
          }
          this.clearPendingNoteDelete(recordId);
          console.log(`✅ Note deleted successfully: ${noteId}`);
          break;
        }
        default:
          console.warn(`⚠️ Unknown operation type: ${op} for notes`);
      }
    } catch (error) {
      console.error(`❌ Failed to sync note ${op}:`, error);
      throw error;
    }
  }

  // Special handler for care team: API endpoint at /patient/care-team
  private async processCareTeamChange(
    op: string,
    opData: any,
    recordId: string,
    headers: Record<string, string>,
    getApiUrl: (path: string) => string,
  ): Promise<void> {
    const careTeamEndpoint = '/patient/care-team';

    try {
      switch (op) {
        case 'PUT':
        case 'PATCH': {
          console.log(`📤 Syncing care team ${op} to ${careTeamEndpoint}`);
          const apiData = this.convertToApiFormat('patient_care_team', opData);
          apiData.id = recordId;
          const method = op === 'PUT' ? 'POST' : 'PATCH';
          const response = await fetch(getApiUrl(careTeamEndpoint), {
            method,
            headers,
            body: JSON.stringify(apiData),
          });
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Care team sync failed:`, response.status, errorText);
            throw new Error(`Care team sync failed: ${response.statusText}`);
          }
          const result = await response.json();
          if (result.conflict) {
            console.warn(
              `⚠️ Care team conflict detected for patient ${opData?.patient_id}:`,
              result.conflict,
            );
          }
          console.log(`✅ Care team synced successfully: ${recordId}`);
          break;
        }
        case 'DELETE': {
          console.log(`📤 Syncing care team DELETE`);
          const response = await fetch(
            getApiUrl(`${careTeamEndpoint}?id=${recordId}`),
            {
              method: 'DELETE',
              headers,
            },
          );
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Care team delete failed:`, response.status, errorText);
            throw new Error(`Care team delete failed: ${response.statusText}`);
          }
          console.log(`✅ Care team deleted successfully: ${recordId}`);
          break;
        }
        default:
          console.warn(`⚠️ Unknown operation type: ${op} for patient_care_team`);
      }
    } catch (error) {
      console.error(`❌ Failed to sync care team ${op}:`, error);
      throw error;
    }
  }

  // Convert SQLite column names (snake_case) to API format (camelCase)
  private convertToApiFormat(table: string, data: any): any {
    if (!data) return data;

    const converted: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      // Skip internal fields
      if (key === 'id' || key.startsWith('_')) continue;

      // Convert snake_case to camelCase
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

      // Parse content JSON for notes (stored as string in SQLite, needs to be object for API)
      if (table === 'notes' && key === 'content' && typeof value === 'string') {
        try {
          converted[camelKey] = JSON.parse(value);
        } catch {
          converted[camelKey] = value;
        }
        continue;
      }

      converted[camelKey] = value;
    }
    return converted;
  }

  // Set up event listeners
  private setupEventListeners(): void {
    if (!this.db) return;

    // TODO: Replace with actual PowerSync listeners when dependencies are installed
    // Sync status listener
    this.db.registerListener({
      statusChanged: (status: SyncStatus) => {
        this.syncStatus = status;
        this.eventListeners.onSyncStatusChange?.(status);
        this.statusSubscribers.forEach(cb => {
          try {
            cb(status);
          } catch (err) {
            console.error('[PowerSync] status subscriber threw:', err);
          }
        });
        if (__DEV__) {
          // Flat string, not an object — the Metro/debugger log bridge renders a
          // nested object as a bare "Object", which makes this line useless when
          // diagnosing connection flapping.
          const df: any = status.dataFlowStatus ?? {};
          const sinceLast =
            this.lastStatusLogAt > 0
              ? `+${((Date.now() - this.lastStatusLogAt) / 1000).toFixed(1)}s`
              : 'first';
          this.lastStatusLogAt = Date.now();
          console.log(
            `🔄 Sync status [${sinceLast}] connected=${status.connected} connecting=${status.connecting} ` +
              `hasSynced=${status.hasSynced} down=${df.downloading} up=${df.uploading} ` +
              `dlErr=${df.downloadError?.message ?? '-'} ulErr=${df.uploadError?.message ?? '-'}`,
          );
        }

        // Log successful connection and reset BUSY counter
        if (status.connected && !status.connecting) {
          console.log('✅ PowerSync fully connected and ready');
          this.busyErrorCount = 0;
          this.reconnectAttempts = 0;
        }

        // Log connection errors — auto-reset DB on persistent SQLite BUSY
        if (status.dataFlowStatus?.downloadError) {
          const errMsg = status.dataFlowStatus.downloadError?.message || '';
          if (errMsg.includes('BUSY')) {
            this.busyErrorCount++;
            if (this.busyErrorCount <= 3) {
              console.warn(`⚠️ PowerSync SQLite BUSY (${this.busyErrorCount}/3)`);
            }
            if (this.busyErrorCount === 3 && !this.isResettingDb) {
              console.warn('🗑️ Persistent SQLite BUSY — resetting local database...');
              this.resetDatabase();
            }
          } else {
            console.error(
              '❌ PowerSync download error:',
              status.dataFlowStatus.downloadError,
            );
          }
        }
        if (status.dataFlowStatus?.uploadError) {
          console.error(
            '❌ PowerSync upload error:',
            status.dataFlowStatus.uploadError,
          );
        }

        // Log first successful sync
        if (status.hasSynced && this.syncStatistics.recordsSynced === 0) {
          console.log('🎉 PowerSync completed first sync successfully!');
        }
      },
    });

    // Upload queue listener
    this.db.registerListener({
      uploadQueueStatsChanged: (stats: UploadQueueStats) => {
        this.eventListeners.onUploadQueueChange?.(stats);
        if (__DEV__) {
          console.log('📤 Upload queue stats:', stats);
        }
      },
    });
  }

  // Register conflict resolver for a table
  registerConflictResolver(
    table: string,
    resolver: (conflict: any) => Promise<ConflictResolutionResult>,
  ): void {
    this.conflictResolvers.set(table, resolver);
  }

  // Resolve conflicts
  private async resolveConflict(
    table: string,
    conflict: any,
  ): Promise<ConflictResolutionResult> {
    // Notify listeners
    this.eventListeners.onConflict?.(conflict);

    // Check if custom resolver exists
    const customResolver = this.conflictResolvers.get(table);
    if (customResolver) {
      try {
        const result = await customResolver(conflict);
        if (result.resolved) {
          this.syncStatistics.conflictsResolved++;
          return result;
        }
      } catch (error) {
        console.error(`Custom conflict resolver failed for ${table}:`, error);
      }
    }

    // Default resolution: client wins
    console.warn(
      `Using default conflict resolution (client wins) for ${table}`,
    );
    return {
      resolved: true,
      data: conflict.clientData,
      strategy: ConflictResolutionStrategy.CLIENT_WINS,
    };
  }

  // Add event listener
  addEventListener<K extends keyof PowerSyncServiceEvents>(
    event: K,
    listener: PowerSyncServiceEvents[K],
  ): void {
    this.eventListeners[event] = listener;
  }

  // Remove event listener
  removeEventListener<K extends keyof PowerSyncServiceEvents>(event: K): void {
    delete this.eventListeners[event];
  }

  // Watch a query reactively — re-runs whenever underlying tables change.
  // Uses the callback-based watch() overload directly (async iterables are NOT
  // supported in Hermes / React Native without a polyfill for Symbol.asyncIterator).
  watch<T = any>(
    sql: string,
    params?: any[],
    handler?: { onResult: (rows: T[]) => void; onError?: (error: Error) => void },
    options?: { tables?: string[]; signal?: AbortSignal },
  ): void {
    if (!this.db) throw new Error('PowerSyncService not initialized');

    this.db.watch(
      sql,
      params,
      {
        onResult: (result: any) => {
          const rows = (result.rows?._array ?? result) as T[];
          handler?.onResult(rows);
        },
        onError: (error: Error) => {
          handler?.onError?.(error);
        },
      },
      options,
    );
  }

  // Database operations
  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    if (!this.db) {
      throw new Error('PowerSyncService not initialized');
    }

    try {
      const result = await this.db.getAll<T>(sql, params);
      return result;
    } catch (error) {
      console.error('Query failed:', sql, params, error);
      throw error;
    }
  }

  // CRUD Helper Methods

  /**
   * Get a single record by ID
   */
  async getById<T = any>(tableName: string, id: string): Promise<T | null> {
    const sql = `SELECT * FROM ${tableName} WHERE id = ? LIMIT 1`;
    const results = await this.query<T>(sql, [id]);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Get multiple records with optional WHERE clause
   */
  async getAll<T = any>(
    tableName: string,
    whereClause?: string,
    params?: any[],
    orderBy?: string,
    limit?: number,
    offset?: number,
  ): Promise<T[]> {
    let sql = `SELECT * FROM ${tableName}`;

    if (whereClause) {
      sql += ` WHERE ${whereClause}`;
    }

    if (orderBy) {
      sql += ` ORDER BY ${orderBy}`;
    }

    if (limit !== undefined) {
      sql += ` LIMIT ${limit}`;
    }

    if (offset !== undefined) {
      sql += ` OFFSET ${offset}`;
    }

    return this.query<T>(sql, params);
  }

  /**
   * Count records in a table
   */
  async count(
    tableName: string,
    whereClause?: string,
    params?: any[],
  ): Promise<number> {
    let sql = `SELECT COUNT(*) as count FROM ${tableName}`;

    if (whereClause) {
      sql += ` WHERE ${whereClause}`;
    }

    const result = await this.query<{ count: number }>(sql, params);
    return result[0]?.count || 0;
  }

  /**
   * Insert a record
   */
  async insert(tableName: string, data: Record<string, any>): Promise<void> {
    const fields = Object.keys(data);
    const placeholders = fields.map(() => '?').join(', ');
    const values = Object.values(data);

    const sql = `INSERT INTO ${tableName} (${fields.join(
      ', ',
    )}) VALUES (${placeholders})`;

    await this.execute(sql, values);
  }

  /**
   * Update a record
   */
  async update(
    tableName: string,
    id: string,
    data: Record<string, any>,
  ): Promise<void> {
    const fields = Object.keys(data);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = [...Object.values(data), id];

    const sql = `UPDATE ${tableName} SET ${setClause} WHERE id = ?`;

    await this.execute(sql, values);
  }

  /**
   * Delete a record
   */
  async delete(tableName: string, id: string): Promise<void> {
    const sql = `DELETE FROM ${tableName} WHERE id = ?`;
    await this.execute(sql, [id]);
  }

  /**
   * Get pending changes count
   */
  async getPendingChangesCount(): Promise<number> {
    if (!this.db) {
      return 0;
    }

    try {
      // All rows in ps_crud are pending — PowerSync removes them after upload
      const result = await this.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM ps_crud',
      );
      return result[0]?.count || 0;
    } catch (error) {
      console.warn('Could not get pending changes count:', error);
      return 0;
    }
  }

  async execute(sql: string, params?: any[]): Promise<void> {
    if (!this.db) {
      throw new Error('PowerSyncService not initialized');
    }

    try {
      await this.db.execute(sql, params);
    } catch (error) {
      console.error('Execute failed:', sql, params, error);
      throw error;
    }
  }

  // Get sync status
  getSyncStatus(): SyncStatus {
    return this.syncStatus as SyncStatus;
  }

  /**
   * The live SyncStatus straight off the current database, or null before one
   * exists.
   *
   * Prefer this over getSyncStatus() when seeding UI state: that returns a
   * mirrored copy whose initial value is a placeholder in which dataFlowStatus is
   * the string 'stopped', so `dataFlowStatus?.downloading` reads as undefined
   * until the first real event arrives.
   */
  getLiveSyncStatus(): SyncStatus | null {
    return this.db?.currentStatus ?? null;
  }

  /**
   * Subscribe to sync status changes. Returns an unsubscribe function.
   *
   * Unlike addEventListener('onSyncStatusChange', ...) this supports any number
   * of concurrent subscribers, and it keeps working across resetDatabase() —
   * the fan-out is re-attached to the new database by setupEventListeners().
   */
  subscribeToSyncStatus(callback: (status: SyncStatus) => void): () => void {
    this.statusSubscribers.add(callback);
    return () => {
      this.statusSubscribers.delete(callback);
    };
  }

  // Get sync statistics
  getSyncStatistics(): SyncStatistics {
    return { ...this.syncStatistics };
  }

  // Force sync
  async sync(): Promise<void> {
    if (!this.db) {
      throw new Error('PowerSyncService not initialized');
    }

    try {
      await this.db.waitForReady();
      console.log('🔄 Manual sync completed');
    } catch (error) {
      console.error('Manual sync failed:', error);
      throw error;
    }
  }

  // Check if the database instance exists (regardless of connection state)
  get hasDatabase(): boolean {
    return this.db !== null;
  }

  // Disconnect sync stream only — keeps DB initialized and readable.
  // Used by SyncNetworkController to pause sync on cellular.
  // Unlike disconnect(), does NOT set isInitialized = false.
  async disconnectSync(): Promise<void> {
    if (!this.db) {
      return;
    }
    try {
      await this.db.disconnect();
      this.lastDisconnectTime = Date.now();
      this.eventListeners.onDisconnected?.();
      console.log('[PowerSync] Sync stream disconnected (DB still active)');
    } catch (error) {
      console.error('[PowerSync] disconnectSync failed:', error);
      throw error;
    }
  }

  // Reconnect sync stream on an already-initialized database.
  // Used by SyncNetworkController to resume sync when WiFi returns.
  // Guarded against duplicate calls, with exponential backoff and cooldown.
  async reconnect(): Promise<void> {
    if (!this.db || !this.config) {
      console.warn('[PowerSync] Cannot reconnect: DB not initialized');
      return;
    }
    if (this.isReconnecting) {
      console.log('[PowerSync] Already reconnecting, skipping');
      return;
    }
    if (this.db.connected) {
      console.log('[PowerSync] Already connected, skipping reconnect');
      return;
    }

    this.isReconnecting = true;
    try {
      // Exponential backoff delay (Phase 1.2)
      if (this.reconnectAttempts > 0) {
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        console.log(`[PowerSync] Backoff: waiting ${delay}ms (attempt ${this.reconnectAttempts})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Connection cooldown after disconnect (Phase 2.1)
      if (this.lastDisconnectTime) {
        const elapsed = Date.now() - this.lastDisconnectTime;
        const COOLDOWN_MS = 2000;
        if (elapsed < COOLDOWN_MS) {
          const remaining = COOLDOWN_MS - elapsed;
          console.log(`[PowerSync] Cooldown: waiting ${remaining}ms after disconnect`);
          await new Promise(resolve => setTimeout(resolve, remaining));
        }
      }

      console.log('[PowerSync] Reconnecting sync stream...');
      await this.db.connect(this.buildConnector(), this.buildConnectOptions());
      this.reconnectAttempts = 0;
      this.eventListeners.onConnected?.();
      console.log('[PowerSync] Sync stream reconnected');
    } catch (error) {
      this.reconnectAttempts++;
      console.error('[PowerSync] Reconnect failed:', error);
      throw error;
    } finally {
      this.isReconnecting = false;
    }
  }

  // Public wrapper: allow users to manually trigger a full local data reset + resync.
  async resetLocalDatabase(): Promise<void> {
    return this.resetDatabase();
  }

  // Reset the local database when it's in a permanently broken state (e.g. persistent SQLite BUSY).
  // Closes the current DB, deletes it, and re-initializes from scratch. Data re-syncs from server.
  private async resetDatabase(): Promise<void> {
    if (this.isResettingDb || !this.db || !this.config) return;
    this.isResettingDb = true;
    try {
      // 1. Disconnect sync stream
      try { await this.db.disconnect(); } catch { /* ignore */ }

      // 2. Close and delete the database
      // PowerSyncDatabase.close() releases the SQLite handle before we unlink,
      // otherwise SQLite can recreate the file from the still-open handle.
      try { await (this.db as any).close?.(); } catch { /* ignore */ }

      // This deletion is the whole point of a reset and was previously missing:
      // the old code closed and reopened the same file, so "Reset Local Data"
      // left every row in place. Any un-uploaded ps_crud rows are lost here —
      // that is inherent to a reset, and the data re-syncs from the server.
      const removed = await deleteDbFiles(DB_NAME);
      console.log(`🗄️ Deleted ${removed.length} local DB file(s) for reset`);

      // 3. Re-create encrypted database and reconnect.
      // Keep the existing key — the database is being replaced, not recovered
      // from an unreadable state, so there is no reason to rotate it.
      const encryptionKey = await getOrCreateEncryptionKey();
      this.db = new PowerSyncDatabase({
        schema: this.config.schema,
        database: { dbFilename: DB_NAME, sqliteOptions: { encryptionKey } },
        logger: this.createSdkLogger(),
      });
      console.log('🗄️ PowerSync database re-created after reset');

      this.setupEventListeners();

      await this.db.connect(this.buildConnector(), this.buildConnectOptions());

      this.busyErrorCount = 0;
      this.isResettingDb = false;
      console.log('✅ PowerSync database reset and reconnected');
    } catch (error) {
      this.isResettingDb = false;
      console.error('❌ PowerSync database reset failed:', error);
    }
  }

  // Disconnect
  async disconnect(): Promise<void> {
    if (!this.db) {
      return;
    }

    try {
      await this.db.disconnect();
      this.lastDisconnectTime = Date.now();
      this.isInitialized = false;
      this.eventListeners.onDisconnected?.();
      console.log('🔌 Disconnected from PowerSync');
    } catch (error) {
      console.error('Disconnect failed:', error);
      throw error;
    }
  }

  // Check if connected
  isConnected(): boolean {
    return this.syncStatus.connected;
  }

  // Check if initialized
  isReady(): boolean {
    return this.isInitialized && !this.isConnecting;
  }

  // Get database instance (for advanced operations)
  getDatabase(): PowerSyncDatabase | null {
    return this.db;
  }

  // Clean up resources
  async destroy(): Promise<void> {
    await this.disconnect();
    this.eventListeners = {};
    this.conflictResolvers.clear();
    PowerSyncService.instance = null as any;
  }

  // Development helpers
  getDebugInfo(): any {
    return {
      isInitialized: this.isInitialized,
      isConnecting: this.isConnecting,
      syncStatus: this.syncStatus,
      syncStatistics: this.syncStatistics,
      config: this.config ? { ...this.config, authToken: '[REDACTED]' } : null,
      conflictResolvers: Array.from(this.conflictResolvers.keys()),
      eventListeners: Object.keys(this.eventListeners),
    };
  }
}

// Export singleton instance
export const powerSyncService = PowerSyncService.getInstance();
