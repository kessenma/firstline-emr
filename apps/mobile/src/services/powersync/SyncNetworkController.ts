// apps/mobile/src/services/powersync/SyncNetworkController.ts
// Network-aware sync controller: disconnects PowerSync on cellular when WiFi-only is enabled

import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';
import { storage } from '../../utils/mmkv';
import { PowerSyncService } from './PowerSyncService';

const MMKV_KEY = 'data_sync_wifi_only';

export class SyncNetworkController {
  private static instance: SyncNetworkController;
  private unsubscribeNetInfo: (() => void) | null = null;
  private isActive = false;
  // Track whether WE disconnected sync (vs user logout or other disconnect)
  private syncPausedByController = false;
  // Debounce timer for rapid NetInfo events (WiFi toggling, hot reload)
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private static readonly DEBOUNCE_MS = 500;

  static getInstance(): SyncNetworkController {
    if (!SyncNetworkController.instance) {
      SyncNetworkController.instance = new SyncNetworkController();
    }
    return SyncNetworkController.instance;
  }

  /**
   * Start monitoring network changes.
   * Call AFTER PowerSync has been initialized.
   */
  start(): void {
    if (this.isActive) return;
    this.isActive = true;

    this.unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
      // Debounce: rapid NetInfo events (WiFi toggling, hot reload) won't spam connect/disconnect
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      this.debounceTimer = setTimeout(() => {
        this.handleNetworkChange(state);
      }, SyncNetworkController.DEBOUNCE_MS);
    });

    console.log('[SyncNetworkController] Started monitoring');
  }

  /**
   * Stop monitoring. Call on logout before PowerSync disconnect.
   */
  stop(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
    }
    this.isActive = false;
    this.syncPausedByController = false;
    console.log('[SyncNetworkController] Stopped monitoring');
  }

  /**
   * Read WiFi-only preference from MMKV (not PowerSync — avoids chicken-and-egg).
   */
  getWifiOnlyPreference(): boolean {
    const value = storage.getString(MMKV_KEY);
    return value === 'true';
  }

  /**
   * Update preference in MMKV and immediately re-evaluate sync state.
   */
  setWifiOnlyPreference(enabled: boolean): void {
    storage.set(MMKV_KEY, enabled ? 'true' : 'false');
    console.log('[SyncNetworkController] WiFi-only preference set to:', enabled);
    this.evaluateNow();
  }

  /**
   * Force re-evaluation with current network state.
   */
  private async evaluateNow(): Promise<void> {
    try {
      const state = await NetInfo.fetch();
      await this.handleNetworkChange(state);
    } catch (error) {
      console.warn('[SyncNetworkController] evaluateNow failed:', error);
    }
  }

  private async handleNetworkChange(state: NetInfoState): Promise<void> {
    const powerSync = PowerSyncService.getInstance();

    // If PowerSync was never initialized, nothing to do
    if (!powerSync.hasDatabase) return;

    const isWifi = state.type === NetInfoStateType.wifi;
    const isCellular = state.type === NetInfoStateType.cellular;
    const isConnected = state.isConnected;
    const wifiOnly = this.getWifiOnlyPreference();

    console.log('[SyncNetworkController] Network changed:', {
      type: state.type,
      isConnected,
      wifiOnly,
      syncPausedByController: this.syncPausedByController,
    });

    if (!wifiOnly) {
      // Setting is OFF: if we previously paused sync, resume it
      if (this.syncPausedByController && isConnected) {
        console.log('[SyncNetworkController] WiFi-only disabled, reconnecting...');
        try {
          await powerSync.reconnect();
          this.syncPausedByController = false;
        } catch (e) {
          console.error('[SyncNetworkController] Reconnect failed:', e);
        }
      }
      return;
    }

    // WiFi-only is ON
    if (isWifi && isConnected) {
      // On WiFi: ensure sync is running
      if (this.syncPausedByController) {
        console.log('[SyncNetworkController] WiFi detected, reconnecting...');
        try {
          await powerSync.reconnect();
          this.syncPausedByController = false;
        } catch (e) {
          console.error('[SyncNetworkController] Reconnect on WiFi failed:', e);
        }
      }
    } else if (isCellular || (!isWifi && isConnected)) {
      // On cellular or other non-WiFi: pause sync
      if (!this.syncPausedByController && powerSync.isConnected()) {
        console.log('[SyncNetworkController] Non-WiFi detected with WiFi-only enabled, disconnecting sync...');
        try {
          await powerSync.disconnectSync();
          this.syncPausedByController = true;
        } catch (e) {
          console.error('[SyncNetworkController] Disconnect on cellular failed:', e);
        }
      }
    }
    // If no internet at all, PowerSync handles its own reconnection.
    // NetInfo will fire again when connectivity returns, and we re-evaluate.
  }

  destroy(): void {
    this.stop();
    SyncNetworkController.instance = null as any;
  }
}

export const syncNetworkController = SyncNetworkController.getInstance();
