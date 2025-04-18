import React, { createContext, useContext, useState, useEffect } from 'react';
import { ADMIN_CREDENTIALS } from '../constants/adminConfig';

interface AdminAuthContextType {
  isAdmin: boolean;
  loading: boolean;
  adminSignIn: (email: string, password: string) => Promise<void>;
  adminSignOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if admin session exists in localStorage
    const adminSession = localStorage.getItem('adminSession');
    setIsAdmin(!!adminSession);
    setLoading(false);
  }, []);

  const adminSignIn = async (email: string, password: string) => {
    if (
      email.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase() &&
      password === ADMIN_CREDENTIALS.password
    ) {
      localStorage.setItem('adminSession', 'true');
      setIsAdmin(true);
    } else {
      throw new Error('Invalid admin credentials');
    }
  };

  const adminSignOut = async () => {
    localStorage.removeItem('adminSession');
    setIsAdmin(false);
  };

  return (
    <AdminAuthContext.Provider value={{ isAdmin, loading, adminSignIn, adminSignOut }}>
      {children}
    </AdminAuthContext.Provider>
  );
}



