// apps/mobile/src/stores/useCallDirectoryStore.ts
//
// Caches the call directory so opening the sheet doesn't start from a spinner.
//
// Mirrors apps/web/stores/useCallDirectoryStore.ts — same state shape, same
// staleness window. Only the storage adapter differs (MMKV here, localStorage
// on web), which is the same split the theme/language stores already use.
//
// Recents is persisted; contacts is NOT. Contacts already has a store of
// record — PowerSync syncs the `staff_directory` bucket into local SQLite — so
// persisting it again would mean two copies that can disagree. What is held
// here is only the *API fallback* result, which exists for the window before
// that bucket has synced, and it is memory-only on purpose.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CallRecent, DirectoryUser } from '@fajr/shared/calls';
import { storage } from '../utils/mmkv';

/**
 * How long cached data is served without revalidating. Short, because a
 * colleague coming online mid-shift should show up quickly — this exists to
 * kill the spinner, not to avoid the network.
 */
export const DIRECTORY_STALE_MS = 60_000;

interface CallDirectoryState {
  recents: CallRecent[];
  recentsFetchedAt: number | null;
  /** API-fallback contacts only. PowerSync is authoritative when it has rows. */
  contactsFallback: DirectoryUser[];
  contactsFetchedAt: number | null;

  setRecents: (recents: CallRecent[]) => void;
  setContactsFallback: (users: DirectoryUser[]) => void;
  isRecentsStale: () => boolean;
  isContactsStale: () => boolean;
  clear: () => void;
}

// MMKV is synchronous, so zustand hydrates before first paint — no flash of
// empty state, which is the whole point of persisting here.
const mmkvJSONStorage = {
  getItem: (name: string) => storage.getString(name) ?? null,
  setItem: (name: string, value: string) => storage.set(name, value),
  removeItem: (name: string) => storage.remove(name),
};

export const useCallDirectoryStore = create<CallDirectoryState>()(
  persist(
    (set, get) => ({
      recents: [],
      recentsFetchedAt: null,
      contactsFallback: [],
      contactsFetchedAt: null,

      setRecents: recents => set({ recents, recentsFetchedAt: Date.now() }),
      setContactsFallback: users =>
        set({ contactsFallback: users, contactsFetchedAt: Date.now() }),

      isRecentsStale: () => {
        const at = get().recentsFetchedAt;
        return at === null || Date.now() - at > DIRECTORY_STALE_MS;
      },
      isContactsStale: () => {
        const at = get().contactsFetchedAt;
        return at === null || Date.now() - at > DIRECTORY_STALE_MS;
      },

      clear: () =>
        set({
          recents: [],
          recentsFetchedAt: null,
          contactsFallback: [],
          contactsFetchedAt: null,
        }),
    }),
    {
      name: 'call-directory',
      storage: createJSONStorage(() => mmkvJSONStorage),
      // Contacts is deliberately excluded — see the header.
      partialize: state => ({
        recents: state.recents,
        recentsFetchedAt: state.recentsFetchedAt,
      }),
    },
  ),
);

export default useCallDirectoryStore;
