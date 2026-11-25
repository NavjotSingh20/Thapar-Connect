import { create } from 'zustand';
import { marketplaceService } from '@/services/marketplaceService';

interface SavedListingsState {
  savedIds: string[];
  loaded: boolean;
  loading: boolean;
  fetchSavedIds: () => Promise<void>;
  toggleSave: (listingId: string) => Promise<boolean>;
  clearSaved: () => void;
}

export const useSavedListingsStore = create<SavedListingsState>((set, get) => ({
  savedIds: [],
  loaded: false,
  loading: false,

  fetchSavedIds: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const ids = await marketplaceService.getSavedListingIds();
      set({ savedIds: ids, loaded: true, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  toggleSave: async (listingId: string) => {
    const isCurrentlySaved = get().savedIds.includes(listingId);
    const nextIds = isCurrentlySaved
      ? get().savedIds.filter((id) => id !== listingId)
      : [...get().savedIds, listingId];

    // Optimistic update
    set({ savedIds: nextIds });

    try {
      if (isCurrentlySaved) {
        await marketplaceService.unsaveListing(listingId);
      } else {
        await marketplaceService.saveListing(listingId);
      }
      return !isCurrentlySaved;
    } catch (err) {
      // Revert on failure
      set({
        savedIds: isCurrentlySaved
          ? [...get().savedIds, listingId]
          : get().savedIds.filter((id) => id !== listingId),
      });
      throw err;
    }
  },

  clearSaved: () => set({ savedIds: [], loaded: false, loading: false }),
}));
