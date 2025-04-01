import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallbackPath: string;
}

export function RoleProtectedRoute({ children, allowedRoles, fallbackPath }: RoleProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/signin" />;
  }

  // Fetch user's role from profiles table
  const [userRole, setUserRole] = React.useState<string | null>(null);
  const [roleLoading, setRoleLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setUserRole(data?.role);
      } catch (err) {
        console.error('Error fetching user role:', err);
      } finally {
        setRoleLoading(false);
      }
    };

    fetchUserRole();
  }, [user.id]);

  if (roleLoading) {
    return <div>Loading...</div>;
  }

  // Check if user has the required role
  const hasRequiredRole = allowedRoles.includes(userRole || '');

  if (!hasRequiredRole) {
    return <Navigate to={fallbackPath} />;
  }

  return <>{children}</>;
} 