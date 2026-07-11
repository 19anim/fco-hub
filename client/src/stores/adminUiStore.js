import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const adminUiInitialState = Object.freeze({
  auditLogPage: 1,
  auditLogActionFilter: '',
  analyticsRange: 30,
});

export const useAdminUiStore = create()(
  persist(
    (set) => ({
      ...adminUiInitialState,
      setAuditLogPage: (auditLogPage) => set({ auditLogPage }),
      setAuditLogActionFilter: (auditLogActionFilter) => set({ auditLogActionFilter, auditLogPage: 1 }),
      setAnalyticsRange: (analyticsRange) => set({ analyticsRange }),
      resetAdminUi: () => set({ ...adminUiInitialState }),
    }),
    {
      name: 'fco-hub-admin-ui-v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        auditLogPage: state.auditLogPage,
        auditLogActionFilter: state.auditLogActionFilter,
        analyticsRange: state.analyticsRange,
      }),
    },
  ),
);
