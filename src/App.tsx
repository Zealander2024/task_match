import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { SignIn } from './pages/SignIn';
import { SignUp } from './pages/SignUp';
import { SelectRole } from './pages/SelectRole';
import { EmployerDashboard } from './pages/employer/Dashboard';
import { JobSeekerDashboard } from './components/JobSeekerDashboard';
import { EditProfile } from './pages/EditProfile';
import { RoleProtectedRoute } from './components/RoleProtectedRoute';
import { Toaster } from './components/ui/toaster';
import { JobSeekerApplicationsView } from './components/JobSeekerApplicationsView';
import { MessagesPage } from './pages/MessagesPage';
import { ChatPage } from './pages/ChatPage';

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/signin" />;
  }

  return <Layout>{children}</Layout>;
}

// Home page
function Home() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-4xl font-extrabold text-gray-900">
          Welcome to TaskMatch
        </h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          {user ? (
            <span>You are already logged in</span>
          ) : (
            <span>Find your next job or hire the perfect candidate</span>
          )}
        </p>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route
            path="/select-role"
            element={
              <ProtectedRoute>
                <SelectRole />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute
                  allowedRoles={['job_seeker']}
                  fallbackPath="/select-role"
                >
                  <JobSeekerDashboard />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/employer/dashboard"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute
                  allowedRoles={['employer']}
                  fallbackPath="/select-role"
                >
                  <EmployerDashboard />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/edit"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute
                  allowedRoles={['job_seeker']}
                  fallbackPath="/select-role"
                >
                  <EditProfile />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/employer/profile"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute
                  allowedRoles={['employer']}
                  fallbackPath="/select-role"
                >
                  <div>Employer Profile Page</div>
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/employer/candidates"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute
                  allowedRoles={['employer']}
                  fallbackPath="/select-role"
                >
                  <div>Candidates Page</div>
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/employer/settings"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute
                  allowedRoles={['employer']}
                  fallbackPath="/select-role"
                >
                  <div>Employer Settings Page</div>
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          // In the routes section, update the applications route:
                <Route
                  path="/applications"
                  element={
                    <ProtectedRoute>
                      <RoleProtectedRoute
                        allowedRoles={['job_seeker']}
                        fallbackPath="/select-role"
                      >
                        <JobSeekerApplicationsView />
                      </RoleProtectedRoute>
                    </ProtectedRoute>
                  }
                />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute
                  allowedRoles={['job_seeker']}
                  fallbackPath="/select-role"
                >
                  <div>Settings Page</div>
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <MessagesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages/:conversationId"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
        </Routes>
        <Toaster />
      </AuthProvider>
    </Router>
  );
}

export default App;