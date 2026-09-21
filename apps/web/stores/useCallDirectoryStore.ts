// apps/web/stores/useCallDirectoryStore.ts
//
// Caches the call directory so reopening the dialog doesn't start from a
// spinner.
//
// Mirrors apps/mobile/src/stores/useCallDirectoryStore.ts — same state shape,
// same staleness window. Only the storage adapter differs (localStorage here,
// MMKV on mobile), matching how useLanguageStore/useThemeStore already split.
//
// Both recents and contacts are persisted here. Unlike mobile there is no
// PowerSync store of record on web, so the directory list has no other home.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CallRecent, DirectoryUser } from "@fajr/shared/calls";

/**
 * How long cached data is served without revalidating. Short, because a
 * colleague coming online mid-shift should show up quickly — this exists to
 * kill the spinner, not to avoid the network.
 */
export const DIRECTORY_STALE_MS = 60_000;

interface CallDirectoryState {
  recents: CallRecent[];
  recentsFetchedAt: number | null;
  contacts: DirectoryUser[];
  contactsFetchedAt: number | null;

  setRecents: (recents: CallRecent[]) => void;
  setContacts: (users: DirectoryUser[]) => void;
  isRecentsStale: () => boolean;
  isContactsStale: () => boolean;
  clear: () => void;
}

export const useCallDirectoryStore = create<CallDirectoryState>()(
  persist(
    (set, get) => ({
      recents: [],
      recentsFetchedAt: null,
      contacts: [],
      contactsFetchedAt: null,

      setRecents: (recents) => set({ recents, recentsFetchedAt: Date.now() }),
      setContacts: (contacts) =>
        set({ contacts, contactsFetchedAt: Date.now() }),

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
          contacts: [],
          contactsFetchedAt: null,
        }),
    }),
    {
      name: "call-directory",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export default useCallDirectoryStore;
