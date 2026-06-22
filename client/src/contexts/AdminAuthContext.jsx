import { createContext, useContext, useEffect, useState } from 'react';
import { adminAuth } from '../services/adminAuth';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = async () => {
    try {
      const result = await adminAuth.getMe();
      if (result.success) {
        setUser(result.data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  const login = (userData) => {
    setUser(userData);
  };

  const logout = async () => {
    try {
      await adminAuth.logout();
    } finally {
      setUser(null);
    }
  };

  return (
    <AdminAuthContext.Provider value={{ user, loading, login, logout, refetch: fetchMe }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
