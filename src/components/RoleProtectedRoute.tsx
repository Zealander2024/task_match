import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: ('employer' | 'job_seeker')[];
  fallbackPath: string;
}

export function RoleProtectedRoute({ children, allowedRoles, fallbackPath }: RoleProtectedRouteProps) {
  const { user, loading } = useAuth();
  const [userRole, setUserRole] = React.useState<string | null>(null);
  const [roleLoading, setRoleLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) return;
      
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
  }, [user]);

  if (loading || roleLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/signin" />;
  }

  if (!userRole || !allowedRoles.includes(userRole as 'employer' | 'job_seeker')) {
    return <Navigate to={fallbackPath} />;
  }

  return <>{children}</>;
} 
