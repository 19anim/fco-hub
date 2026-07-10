import { createContext, useContext } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminAuth } from '../services/adminAuth';
import { adminMeKey } from '../fco/queryKeys.js';

const AdminAuthContext = createContext(null);

async function getMeUser() {
  const result = await adminAuth.getMe();
  return result.success ? result.data.user : null;
}

export function AdminAuthProvider({ children }) {
  const queryClient = useQueryClient();
  const { data: user, isLoading: loading } = useQuery({
    queryKey: adminMeKey(),
    queryFn: getMeUser,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const login = (userData) => {
    queryClient.setQueryData(adminMeKey(), userData);
  };

  const logout = async () => {
    try {
      await adminAuth.logout();
    } finally {
      queryClient.setQueryData(adminMeKey(), null);
    }
  };

  const refetch = () => queryClient.invalidateQueries({ queryKey: adminMeKey() });

  return (
    <AdminAuthContext.Provider value={{ user: user ?? null, loading, login, logout, refetch }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
