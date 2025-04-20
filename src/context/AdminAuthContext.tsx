import React, { createContext, useContext, useState } from 'react';
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
  const [loading, setLoading] = useState(false);

  async function adminSignIn(email: string, password: string) {
    setLoading(true);
    try {
      if (email !== ADMIN_CREDENTIALS.email || password !== ADMIN_CREDENTIALS.password) {
        throw new Error('Invalid admin credentials');
      }
      
      // Store admin session in localStorage
      localStorage.setItem('adminSession', JSON.stringify({ 
        email: ADMIN_CREDENTIALS.email,
        isAdmin: true 
      }));
      
      setIsAdmin(true);
    } catch (error) {
      console.error('Admin sign in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function adminSignOut() {
    setLoading(true);
    try {
      localStorage.removeItem('adminSession');
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }

  // Check for existing admin session on mount
  React.useEffect(() => {
    const adminSession = localStorage.getItem('adminSession');
    if (adminSession) {
      const session = JSON.parse(adminSession);
      setIsAdmin(session.email === ADMIN_CREDENTIALS.email);
    }
    setLoading(false);
  }, []);

  const value = {
    isAdmin,
    loading,
    adminSignIn,
    adminSignOut,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}




