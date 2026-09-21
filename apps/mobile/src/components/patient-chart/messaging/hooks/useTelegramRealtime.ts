// apps/mobile/src/components/patient-chart/messaging/hooks/useTelegramRealtime.ts
// Simplified hook — PowerSync handles real-time sync automatically
// This hook now just wraps useSyncConnection for compatibility with the view model

import { useCallback } from 'react';
import { useSyncConnection } from '../../../../hooks/powersync';

interface UseTelegramRealtimeParams {
  chatId: string;
  enabled?: boolean;
  pollInterval?: number;
  onUpdate: () => void;
}

interface UseTelegramRealtimeReturn {
  isConnected: boolean;
  lastPollTime: Date | null;
  forceRefresh: () => void;
}

export function useTelegramRealtime({
  chatId,
  enabled = true,
  onUpdate,
}: UseTelegramRealtimeParams): UseTelegramRealtimeReturn {
  const { isConnected } = useSyncConnection();

  // Manual refresh trigger — delegates to parent's onUpdate
  const forceRefresh = useCallback(() => {
    if (enabled && chatId) {
      onUpdate();
    }
  }, [enabled, chatId, onUpdate]);

  return {
    isConnected,
    lastPollTime: null,
    forceRefresh,
  };
}

export default useTelegramRealtime;
