// apps/mobile/src/hooks/useMediaManager.ts
// Hook that resolves signed URLs for media messages (images, audio, files).
// Uses the centralized MediaService for auth, caching, and download.

import { useEffect, useRef } from 'react';
import { fetchMedia } from '../services/MediaService';
import { PowerSyncService } from '../services/powersync/PowerSyncService';
import { Message } from '../types/messages';

export const useMediaManager = (
  messages: Message[],
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
) => {
  const isLoadingRef = useRef(false);

  useEffect(() => {
    const resolveMedia = async () => {
      // Filter messages that need media resolved
      const mediaMessages = messages.filter(
        (message) =>
          (message.type === 'image' ||
            message.type === 'audio' ||
            message.type === 'file') &&
          typeof message.mediaUrl === 'string' &&
          message.mediaUrl.trim() !== '' &&
          !message.signedUrl,
      );

      if (mediaMessages.length === 0 || isLoadingRef.current) return;

      isLoadingRef.current = true;
      console.log('[MediaManager] Resolving ' + mediaMessages.length + ' media messages:',
        mediaMessages.map(m => m.type + ':' + (m.mediaUrl || '').substring(0, 60)).join(', '));

      try {
        const service = PowerSyncService.getInstance();
        if (!service.hasDatabase) {
          console.warn('[MediaManager] PowerSync has no database, skipping');
          return;
        }

        const updates: { id: string; dataUri: string }[] = [];

        for (const message of mediaMessages) {
          const dataUri = await fetchMedia(message.mediaUrl!, service);
          if (dataUri) {
            updates.push({ id: message.id, dataUri });
          } else {
            console.warn('[MediaManager] fetchMedia returned null for: ' + (message.mediaUrl || '').substring(0, 80));
          }
        }

        if (updates.length > 0) {
          setMessages((prev) =>
            prev.map((msg) => {
              const update = updates.find((u) => u.id === msg.id);
              return update ? { ...msg, signedUrl: update.dataUri } : msg;
            }),
          );
        }
      } catch (error) {
        console.error('[MediaManager] Error resolving media:', error);
      } finally {
        isLoadingRef.current = false;
      }
    };

    resolveMedia();
  }, [messages, setMessages]);
};
