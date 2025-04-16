import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { SignIn } from './pages/SignIn';
import { SignUp } from './pages/SignUp';
import { AuthCallback } from './pages/AuthCallback';
import { SelectRole } from './pages/SelectRole';
import { CreateProfile } from './pages/CreateProfile';
import { EmployerDashboard } from './pages/employer/Dashboard';
import { JobSeekerDashboard } from './components/JobSeekerDashboard';
import { EditProfile } from './pages/EditProfile';
import { RoleProtectedRoute } from './components/RoleProtectedRoute';
import { Toaster } from './components/ui/toaster';
import { JobSeekerApplicationsView } from './components/JobSeekerApplicationsView';
import { MessagesPage } from './pages/MessagesPage';
import { ChatPage } from './pages/ChatPage';
import { Briefcase, Users, MessageCircle } from 'lucide-react';
import { ResetPassword } from './pages/ResetPassword';
import { Welcome } from './pages/Welcome';
import { testSupabaseConnection } from './services/supabase';

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
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 overflow-hidden">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
        <h1 
          className="text-5xl font-extrabold text-gray-900 sm:text-6xl sm:tracking-tight lg:text-7xl animate-fade-in-up"
          style={{ animationDelay: '0.2s' }}
        >
          Welcome to TaskMatch
        </h1>
        <p 
          className="max-w-3xl mx-auto mt-6 text-xl text-gray-500 animate-fade-in-up"
          style={{ animationDelay: '0.4s' }}
        >
          Connect with top talent and opportunities. Your next career move starts here.
        </p>
        
        {!user && (
          <div 
            className="mt-10 flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up"
            style={{ animationDelay: '0.6s' }}
          >
            <button
              onClick={() => navigate('/signup')}
              className="group inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-all duration-200 ease-in-out shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
            >
              <span>Create Account</span>
              <svg 
                className="ml-2 h-4 w-4 transition-transform duration-200 ease-in-out group-hover:translate-x-1" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              onClick={() => navigate('/signin')}
              className="group inline-flex items-center justify-center px-8 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200 ease-in-out shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
            >
              <span>Sign In</span>
              <svg 
                className="ml-2 h-4 w-4 transition-transform duration-200 ease-in-out group-hover:translate-x-1" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        {user && (
          <div 
            className="mt-10 animate-fade-in-up"
            style={{ animationDelay: '0.6s' }}
          >
            <button
              onClick={() => navigate('/dashboard')}
              className="group inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-all duration-200 ease-in-out shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
            >
              <span>Go to Dashboard</span>
              <svg 
                className="ml-2 h-4 w-4 transition-transform duration-200 ease-in-out group-hover:translate-x-1" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: <Briefcase className="h-8 w-8" />,
              title: "Find Opportunities",
              description: "Discover relevant job opportunities tailored to your skills and experience."
            },
            {
              icon: <Users className="h-8 w-8" />,
              title: "Connect with Talent",
              description: "Build your network and connect with qualified professionals in your industry."
            },
            {
              icon: <MessageCircle className="h-8 w-8" />,
              title: "Easy Communication",
              description: "Seamless messaging system to facilitate efficient communication."
            }
          ].map((feature, index) => (
            <div 
              key={feature.title}
              className="relative p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 animate-fade-in-up transform hover:-translate-y-1"
              style={{ animationDelay: `${0.8 + index * 0.2}s` }}
            >
              <div className="text-blue-600 mb-4 animate-bounce-subtle">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
              <p className="mt-2 text-gray-500">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function App() {
  useEffect(() => {
    testSupabaseConnection().then(isConnected => {
      if (!isConnected) {
        console.error('Failed to connect to Supabase');
      }
    });
  }, []);
  
  return (
    <Router>
      <div className="relative min-h-screen">
        {/* Animated background */}
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50 animate-gradient-shift"></div>
          <div className="absolute inset-0 opacity-30">
            <div className="absolute w-full h-full bg-[radial-gradient(circle_500px_at_50%_50%,#4F46E5,transparent)]"></div>
          </div>
          <div className="absolute inset-0">
            <svg className="opacity-[0.15] w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path 
                d="M0,50 Q25,45 50,50 T100,50 L100,100 L0,100 Z" 
                fill="currentColor" 
                className="text-blue-600 animate-wave"
              />
              <path 
                d="M0,60 Q25,55 50,60 T100,60 L100,100 L0,100 Z" 
                fill="currentColor" 
                className="text-indigo-600 animate-wave [animation-delay:0.2s]"
              />
              <path 
                d="M0,70 Q25,65 50,70 T100,70 L100,100 L0,100 Z" 
                fill="currentColor" 
                className="text-purple-600 animate-wave [animation-delay:0.4s]"
              />
            </svg>
          </div>
        </div>

        {/* Main content */}
        <div className="relative z-0">
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route
                path="/welcome"
                element={
                  <ProtectedRoute>
                    <Welcome />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/create-profile"
                element={
                  <ProtectedRoute>
                    <CreateProfile />
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
                path="/select-role"
                element={
                  <ProtectedRoute>
                    <SelectRole />
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
              <Route
                path="/reset-password"
                element={<ResetPassword />}
              />
            </Routes>
            <Toaster />
          </AuthProvider>
        </div>
      </div>
    </Router>
  );
}

export default App;



















