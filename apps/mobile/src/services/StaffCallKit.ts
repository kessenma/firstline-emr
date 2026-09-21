// apps/mobile/src/services/StaffCallKit.ts
//
// Thin JS wrapper over the native StaffCallKit module (PushKit + CallKit).
//
// The native side is authoritative for anything time-critical: it reports the
// incoming call to CallKit before the VoIP push's completion handler returns,
// long before this file is even loaded on a cold launch. Everything here is
// after-the-fact — receiving drained events and telling CallKit what JS decided.
//
// iOS only. Android has no PushKit equivalent and is out of scope: the manifest
// declares only INTERNET, and FCM is disabled in Gorush.

import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

interface StaffCallKitNative {
  getVoipToken(): Promise<string | null>;
  endCall(callId: string): Promise<void>;
  reportConnected(callId: string): Promise<void>;
}

const native: StaffCallKitNative | undefined =
  NativeModules.StaffCallKit as StaffCallKitNative | undefined;

export interface CallInviteEvent {
  callId: string;
  callerId: string;
  callerName: string;
}

export interface CallEndedEvent {
  callId: string;
  reason: string;
}

export interface CallAnsweredEvent {
  callId: string;
}

export interface CallCancelledEvent {
  callId: string;
  reason: string;
}

type EventMap = {
  voipTokenReceived: { token: string };
  voipTokenInvalidated: Record<string, never>;
  callInvite: CallInviteEvent;
  callAnswered: CallAnsweredEvent;
  callEnded: CallEndedEvent;
  callCancelled: CallCancelledEvent;
  callMuteChanged: { callId: string; muted: boolean };
};

class StaffCallKitService {
  private emitter: NativeEventEmitter | null = null;

  isAvailable(): boolean {
    return Platform.OS === 'ios' && !!native;
  }

  private getEmitter(): NativeEventEmitter | null {
    if (!this.isAvailable()) return null;
    if (!this.emitter) {
      this.emitter = new NativeEventEmitter(
        NativeModules.StaffCallKit as never,
      );
    }
    return this.emitter;
  }

  /**
   * Subscribe to a native call event.
   *
   * Subscribing is also what causes the native queue to drain: RCTEventEmitter
   * calls startObserving on the first listener, and StaffCallManager replays
   * anything that happened before JS existed. That replay is what makes
   * answering from the lock screen on a cold launch work.
   */
  addListener<K extends keyof EventMap>(
    event: K,
    handler: (payload: EventMap[K]) => void,
  ): { remove: () => void } {
    const emitter = this.getEmitter();
    if (!emitter) return { remove: () => {} };
    const sub = emitter.addListener(event as string, handler as never);
    return { remove: () => sub.remove() };
  }

  /** The PushKit token, once iOS has issued one. Null before then. */
  async getVoipToken(): Promise<string | null> {
    if (!native) return null;
    try {
      return await native.getVoipToken();
    } catch (err) {
      console.warn('[StaffCallKit] getVoipToken failed:', err);
      return null;
    }
  }

  /** Dismiss the CallKit UI for a call JS has finished with. */
  async endCall(callId: string): Promise<void> {
    if (!native) return;
    try {
      await native.endCall(callId);
    } catch (err) {
      console.warn('[StaffCallKit] endCall failed:', err);
    }
  }

  /** Stop CallKit showing "connecting" once the media path is actually up. */
  async reportConnected(callId: string): Promise<void> {
    if (!native) return;
    try {
      await native.reportConnected(callId);
    } catch (err) {
      console.warn('[StaffCallKit] reportConnected failed:', err);
    }
  }
}

export const staffCallKit = new StaffCallKitService();
export default staffCallKit;
