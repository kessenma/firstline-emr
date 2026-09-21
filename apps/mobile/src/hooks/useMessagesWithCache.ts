// apps/mobile/src/hooks/useMessagesWithCache.ts
// Enhanced messages hook with Couchbase Lite caching for offline support

import { useState, useEffect, useCallback, useRef } from 'react';
import { getApiUrl } from '../config';
import { Thread } from '../types/messages';
import { storageUtils } from '../utils/storage';
import { MessageCacheService } from '../services/MessageCacheService';
import { DatabaseService } from '../services/DatabaseService';

interface UseMessagesWithCacheReturn {
  threads: Thread[];
  groupThreads: Thread[];
  telegramThreads: Thread[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markThreadAsRead: (
    threadId: string,
    type: 'internal' | 'telegram',
  ) => Promise<void>;
  isFromCache: boolean;
  lastFetchTime: number | null;
}

let messageCacheService: MessageCacheService | null = null;
let cacheInitialized = false;

export function useMessagesWithCache(): UseMessagesWithCacheReturn {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);
  const isFetchingRef = useRef(false);

  // Initialize cache service
  const initializeCache = useCallback(async () => {
    if (cacheInitialized && messageCacheService) {
      return messageCacheService;
    }

    try {
      const databaseService = new DatabaseService();
      await databaseService.initializeDatabase();

      messageCacheService = new MessageCacheService(databaseService);
      await messageCacheService.initialize();

      cacheInitialized = true;
      console.log('✅ Message cache initialized');

      // Clear expired cache entries on startup
      await messageCacheService.clearExpiredCache();

      return messageCacheService;
    } catch (error) {
      console.error('❌ Failed to initialize message cache:', error);
      return null;
    }
  }, []);

  // Load cached threads first for instant display
  const loadFromCache = useCallback(async () => {
    try {
      const cacheService = await initializeCache();
      if (!cacheService) {
        console.log('⚠️ Cache service not available, skipping cache load');
        return [];
      }

      console.log('📦 Loading threads from cache...');
      const cachedThreads = await cacheService.getCachedThreads();

      if (cachedThreads.length > 0) {
        console.log(`✅ Loaded ${cachedThreads.length} threads from cache`);
        setThreads(cachedThreads);
        setIsFromCache(true);
        setLoading(false);
        return cachedThreads;
      } else {
        console.log('ℹ️ No cached threads found');
        return [];
      }
    } catch (err) {
      console.error('❌ Error loading from cache:', err);
      return [];
    }
  }, [initializeCache]);

  // Fetch threads from network
  const fetchThreadsFromNetwork = useCallback(
    async (skipCache = false) => {
      // Prevent duplicate fetches
      if (isFetchingRef.current) {
        console.log('⚠️ Fetch already in progress, skipping...');
        return;
      }
      isFetchingRef.current = true;

      try {
        setError(null);

        // If not skipping cache, load from cache first
        if (!skipCache) {
          await loadFromCache();
        }

        // Get the stored user data which contains the JWT token
        const userData = storageUtils.getUser();
        const token = userData?.token;

        console.log('🌐 Fetching threads from network...');

        if (!token) {
          throw new Error('No authentication token found. Please login again.');
        }

        const headers = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        };

        const internalUrl = getApiUrl('/internal-messages');
        const messagesUrl = getApiUrl('/messages');

        console.log('📡 Fetching from URLs:');
        console.log('  Internal:', internalUrl);
        console.log('  Messages:', messagesUrl);

        const [internalRes, telegramRes] = await Promise.all([
          fetch(internalUrl, {
            method: 'GET',
            headers,
          }).catch(err => {
            console.error('❌ Internal messages fetch error:', err);
            throw err;
          }),
          fetch(messagesUrl, {
            method: 'GET',
            headers,
          }).catch(err => {
            console.error('❌ Telegram messages fetch error:', err);
            throw err;
          }),
        ]);

        console.log('📥 Internal response status:', internalRes.status);
        console.log('📥 Telegram response status:', telegramRes.status);

        if (!internalRes.ok || !telegramRes.ok) {
          console.error('❌ Response not OK:');
          console.error(
            '  Internal:',
            internalRes.status,
            internalRes.statusText,
          );
          console.error(
            '  Telegram:',
            telegramRes.status,
            telegramRes.statusText,
          );

          // If we have cached data, continue using it
          if (threads.length > 0 && isFromCache) {
            console.log('ℹ️ Using cached data due to network error');
            setError('Using cached data. Network unavailable.');
            return;
          }

          throw new Error('Failed to fetch messages');
        }

        const internalData = await internalRes.json();
        const telegramData = await telegramRes.json();

        const internalThreads: Thread[] = (internalData.threads || []).map(
          (t: any) => ({
            id: t.id,
            slug: t.slug,
            participants: t.participants,
            unreadCount: t.unreadCount || 0,
            messages: (t.messages || []).map((m: any) => ({
              id: m.id ?? m.message_id?.toString?.(),
              text: m.text,
              sender: m.sender,
              senderId: m.senderId ?? m.sender_id,
              timestamp: m.timestamp,
              type: m.type,
              mediaUrl: m.mediaUrl ?? m.media_url,
              signedUrl: m.signedUrl ?? m.signed_url,
              isSelf: m.isSelf ?? m.is_self,
              fileName: m.fileName ?? m.file_name,
            })),
            title: t.title,
            type: 'internal' as const,
            isGroupChat: t.isGroupChat === true,
            lastActivity: t.lastActivity,
          }),
        );

        const telegramThreads: Thread[] = (telegramData.threads || []).map(
          (t: any) => ({
            id: t.id,
            chatId: t.chatId,
            participants:
              t.participants?.map((p: any) => p.toString?.() ?? p) ?? [],
            unreadCount: t.unreadCount || 0,
            messages: (t.messages || []).map((m: any) => ({
              id: m.id ?? m.message_id?.toString?.(),
              text: m.text,
              sender: m.sender,
              senderId: m.senderId ?? m.from?.id?.toString?.(),
              timestamp: m.timestamp,
              type: m.type,
              mediaUrl: m.mediaUrl ?? m.media_url,
              signedUrl: m.signedUrl ?? m.signed_url,
              isSelf: false,
              fileName: m.fileName ?? m.file_name,
            })),
            type: 'telegram' as const,
          }),
        );

        const merged = [...internalThreads, ...telegramThreads];

        // Sort by last activity
        merged.sort((a, b) => {
          const aTime =
            a.type === 'internal'
              ? a.lastActivity ?? a.messages[0]?.timestamp ?? 0
              : a.messages[0]?.timestamp ?? 0;
          const bTime =
            b.type === 'internal'
              ? b.lastActivity ?? b.messages[0]?.timestamp ?? 0
              : b.messages[0]?.timestamp ?? 0;
          return (
            new Date(bTime as any).getTime() - new Date(aTime as any).getTime()
          );
        });

        // Cache the fetched threads
        const cacheService = await initializeCache();
        if (cacheService) {
          await cacheService.cacheThreads(merged);
          console.log('💾 Threads cached successfully');
        }

        setThreads(merged);
        setIsFromCache(false);
        setLastFetchTime(Date.now());
        setLoading(false);
        console.log(
          '✅ Threads loaded from network:',
          merged.length,
          'threads',
        );
      } catch (fetchError) {
        console.error('❌ Error fetching threads:', fetchError);
        console.error('❌ Error details:', {
          name: fetchError instanceof Error ? fetchError.name : 'Unknown',
          message:
            fetchError instanceof Error
              ? fetchError.message
              : String(fetchError),
          stack: fetchError instanceof Error ? fetchError.stack : undefined,
        });

        // If we have cached data, keep using it
        if (threads.length > 0 && isFromCache) {
          console.log('ℹ️ Continuing with cached data');
          setError('Using cached data. Failed to update from network.');
        } else {
          setError('Failed to load messages. Please try again later.');
        }
        setLoading(false);
      } finally {
        isFetchingRef.current = false;
      }
    },
    [threads.length, isFromCache, initializeCache, loadFromCache],
  );

  // Initial load: cache first, then network
  useEffect(() => {
    const loadData = async () => {
      // Load from cache immediately
      await loadFromCache();

      // Then fetch from network to update
      await fetchThreadsFromNetwork(true);
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh: force network fetch and update cache
  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchThreadsFromNetwork(true);
  }, [fetchThreadsFromNetwork]);

  // Mark thread as read
  const markThreadAsRead = useCallback(
    async (threadId: string, type: 'internal' | 'telegram') => {
      try {
        // Get the stored user data which contains the JWT token
        const userData = storageUtils.getUser();
        const token = userData?.token;

        if (!token) {
          console.error(
            'No authentication token found for marking thread as read',
          );
          return;
        }

        const url =
          type === 'internal'
            ? getApiUrl(`/internal-messages/mark-read/${threadId}`)
            : getApiUrl(`/messages/mark-read/${threadId}`);

        await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        // Optimistically update UI
        setThreads(prevThreads =>
          prevThreads.map(thread =>
            thread.id === threadId ? { ...thread, unreadCount: 0 } : thread,
          ),
        );

        // Update cache
        const cacheService = await initializeCache();
        if (cacheService) {
          const updatedThreads = threads.map(thread =>
            thread.id === threadId ? { ...thread, unreadCount: 0 } : thread,
          );
          await cacheService.cacheThreads(updatedThreads);
        }
      } catch (err) {
        console.error('Error marking thread as read:', err);
      }
    },
    [threads, initializeCache],
  );

  // Filter threads by type
  const groupThreads = threads.filter(
    t => t.type === 'internal' && t.isGroupChat,
  );
  const telegramThreads = threads.filter(t => t.type === 'telegram');

  return {
    threads,
    groupThreads,
    telegramThreads,
    loading,
    error,
    refresh,
    markThreadAsRead,
    isFromCache,
    lastFetchTime,
  };
}
