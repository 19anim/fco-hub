import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const assetsFiltersInitialState = Object.freeze({
  search: '',
  category: 'all',
  status: 'active',
  page: 1,
  limit: 24,
});

export const assetsIdentityInitialState = Object.freeze({
  category: 'cardTheme',
  key: 'ng',
});

export const assetsViewInitialState = Object.freeze({
  filters: assetsFiltersInitialState,
  selectedAssetId: '',
  identity: assetsIdentityInitialState,
  uploadMode: 'replace',
});

export const useAssetsViewStore = create()(
  persist(
    (set) => ({
      ...assetsViewInitialState,
      setFilters: (filters) => set({ filters }),
      patchFilters: (patch) => set((state) => ({
        filters: { ...state.filters, ...patch },
      })),
      setSelectedAssetId: (selectedAssetId) => set({ selectedAssetId: selectedAssetId || '' }),
      setIdentity: (identity) => set({ identity }),
      patchIdentity: (patch) => set((state) => ({
        identity: { ...state.identity, ...patch },
      })),
      setUploadMode: (uploadMode) => set({ uploadMode }),
      resetAssetsView: () => set({
        filters: { ...assetsFiltersInitialState },
        selectedAssetId: '',
        identity: { ...assetsIdentityInitialState },
        uploadMode: 'replace',
      }),
    }),
    {
      name: 'fco-hub-assets-view-v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        filters: state.filters,
        selectedAssetId: state.selectedAssetId,
        identity: state.identity,
        uploadMode: state.uploadMode,
      }),
    },
  ),
);
