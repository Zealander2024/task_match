import React, { createContext, useContext, useState, useEffect } from 'react';
import { ADMIN_CREDENTIALS, LOCAL_STORAGE_KEYS } from '../constants/adminConfig';

interface AdminAuthContextType {
  isAdmin: boolean;
  loading: boolean;
  adminSignIn: (email: string, password: string) => Promise<void>;
  adminSignOut: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for admin session on mount
    const adminSession = localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_SESSION);
    if (adminSession) {
      const session = JSON.parse(adminSession);
      const isValid = validateAdminSession(session);
      setIsAdmin(isValid);
    }
    setLoading(false);
  }, []);

  function validateAdminSession(session: any) {
    if (!session) return false;
    // Session expires after 24 hours
    const isExpired = Date.now() - session.timestamp > 24 * 60 * 60 * 1000;
    return !isExpired && session.token === ADMIN_CREDENTIALS.token;
  }

  async function adminSignIn(email: string, password: string) {
    setLoading(true);
    try {
      if (email !== ADMIN_CREDENTIALS.email || password !== ADMIN_CREDENTIALS.password) {
        throw new Error('Invalid admin credentials');
      }
      
      // Store admin session
      const sessionData = {
        email: ADMIN_CREDENTIALS.email,
        timestamp: Date.now(),
        token: ADMIN_CREDENTIALS.token,
      };
      
      localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_SESSION, JSON.stringify(sessionData));
      setIsAdmin(true);
    } catch (error) {
      console.error('Admin sign in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  function adminSignOut() {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.ADMIN_SESSION);
    setIsAdmin(false);
  }

  return (
    <AdminAuthContext.Provider value={{ isAdmin, loading, adminSignIn, adminSignOut }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}


