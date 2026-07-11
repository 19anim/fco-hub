import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const databaseFiltersInitialState = Object.freeze({
  position: '',
  minOverall: '',
  maxOverall: '',
  minPrice: '',
  maxPrice: '',
  minSalary: '',
  maxSalary: '',
  trait: '',
  minPace: '',
  minShooting: '',
  minPassing: '',
  minDribbling: '',
  minDefending: '',
  minPhysical: '',
});

export const databaseViewInitialState = Object.freeze({
  searchQuery: '',
  seasonSearch: '',
  selectedSeasonIds: [],
  sortBy: 'overall',
  tablePage: 1,
  filters: databaseFiltersInitialState,
});

export const useDatabaseViewStore = create()(
  persist(
    (set) => ({
      ...databaseViewInitialState,
      setSearchQuery: (searchQuery) => set({ searchQuery, tablePage: 1 }),
      setSeasonSearch: (seasonSearch) => set({ seasonSearch }),
      setSelectedSeasonIds: (selectedSeasonIds) => set({ selectedSeasonIds, tablePage: 1 }),
      toggleSeason: (seasonId) => set((state) => {
        const value = String(seasonId);
        return {
          selectedSeasonIds: state.selectedSeasonIds.includes(value)
            ? state.selectedSeasonIds.filter((item) => item !== value)
            : [...state.selectedSeasonIds, value],
          tablePage: 1,
        };
      }),
      setSortBy: (sortBy) => set({ sortBy, tablePage: 1 }),
      setTablePage: (tablePage) => set({ tablePage }),
      setFilter: (key, value) => set((state) => ({
        filters: { ...state.filters, [key]: value },
        tablePage: 1,
      })),
      resetFilters: () => set({ filters: { ...databaseFiltersInitialState }, tablePage: 1 }),
      resetDatabaseView: () => set({
        ...databaseViewInitialState,
        filters: { ...databaseFiltersInitialState },
        selectedSeasonIds: [],
      }),
    }),
    {
      name: 'fco-hub-database-view-v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        searchQuery: state.searchQuery,
        selectedSeasonIds: state.selectedSeasonIds,
        sortBy: state.sortBy,
        tablePage: state.tablePage,
        filters: state.filters,
      }),
    },
  ),
);
