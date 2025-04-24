import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CreateProfile } from '../pages/CreateProfile';

export function ProfileRoutes() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  return (
    <Routes>
      <Route path="/employer/create-profile" element={<CreateProfile type="employer" />} />
      <Route path="/create-profile" element={<CreateProfile type="job_seeker" />} />
    </Routes>
  );
}