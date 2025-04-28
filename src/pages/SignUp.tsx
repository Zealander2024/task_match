import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Check, X, Eye, EyeOff, AlertCircle, Mail, Lock, ArrowRight, User } from 'lucide-react';
import zxcvbn from 'zxcvbn';
import { supabase } from '../services/supabase';
import { toast } from 'sonner'; // Add toast for better notifications
import { motion, AnimatePresence } from 'framer-motion';

export function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordScore, setPasswordScore] = useState(0);
  const [passwordFeedback, setPasswordFeedback] = useState<string[]>([]);
  const navigate = useNavigate();

  // Add new state for typing animation
  const [displayedText, setDisplayedText] = useState('');
  const instructionText = `Welcome to our platform! 👋

Before you begin, please note:

1️⃣ Use your real full name
   • Required for identity verification
   • Will be used for professional networking

2️⃣ Work email preferred
   • Helps verify your professional status
   • Ensures secure communication

3️⃣ Strong password required
   • Protects your professional identity
   • Ensure verification increases trust
   • Real credentials enhance networking

5️⃣ Next steps:
   • Complete your profile
   • Add professional skills
   • Connect with peers

We're excited to have you join us! 🚀es account security

4️⃣ Important to know:
   • Our AI system will verify your identity
   • Profile`;

  useEffect(() => {
    let currentIndex = 0;
    const intervalId = setInterval(() => {
      if (currentIndex <= instructionText.length) {
        setDisplayedText(instructionText.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(intervalId);
      }
    }, 30); // Adjust speed here (lower = faster)

    return () => clearInterval(intervalId);
  }, []);

  const passwordRequirements = [
    { regex: /.{8,}/, text: 'At least 8 characters long' },
    { regex: /[A-Z]/, text: 'Contains uppercase letter' },
    { regex: /[a-z]/, text: 'Contains lowercase letter' },
    { regex: /[0-9]/, text: 'Contains number' },
    { regex: /[^A-Za-z0-9]/, text: 'Contains special character' },
  ];

  useEffect(() => {
    if (password) {
      const result = zxcvbn(password);
      setPasswordScore(result.score);
      setPasswordFeedback(result.feedback.suggestions);
    }
  }, [password]);

  const validatePassword = () => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }

    const requirements = [
      { regex: /[A-Z]/, message: 'Password must contain at least one uppercase letter' },
      { regex: /[a-z]/, message: 'Password must contain at least one lowercase letter' },
      { regex: /[0-9]/, message: 'Password must contain at least one number' },
      { regex: /[^A-Za-z0-9]/, message: 'Password must contain at least one special character' }
    ];

    for (const requirement of requirements) {
      if (!requirement.regex.test(password)) {
        return requirement.message;
      }
    }

    if (passwordScore < 3) {
      return 'Please choose a stronger password';
    }

    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);

      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError('Please enter a valid email address');
        return;
      }

      // Validate password
      const passwordError = validatePassword();
      if (passwordError) {
        setError(passwordError);
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      // Sign up the user
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName,
            created_at: new Date().toISOString(),
            profile_completed: false // Add this flag
          }
        }
      });

      if (error) throw error;

      if (!data.user) {
        throw new Error('Signup failed - no user data returned');
      }

      // Create initial profile entry
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: data.user.id,
            full_name: fullName,
            work_email: email.trim().toLowerCase(), // Changed to work_email to match schema
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            profile_completed: false,
            is_verified: false,
            skills: [] // Initialize empty skills array
          }
        ]);

      if (profileError) throw profileError;

      // After successful signup, sign in automatically
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });

      if (signInError) throw signInError;

      toast.success('Account created successfully!');
      navigate('/create-profile');

    } catch (err) {
      console.error('Signup error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create account');
      toast.error('Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrengthColor = () => {
    switch (passwordScore) {
      case 0:
        return 'bg-red-500';
      case 1:
        return 'bg-orange-500';
      case 2:
        return 'bg-yellow-500';
      case 3:
        return 'bg-green-500';
      case 4:
        return 'bg-green-600';
      default:
        return 'bg-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="flex w-full max-w-7xl gap-12 items-center justify-center">
        {/* Sign Up Form - Left Side */}
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center">
              <div className="p-4 bg-blue-100 rounded-full transform hover:scale-105 transition-transform duration-300">
                <UserPlus className="h-12 w-12 text-blue-600" />
              </div>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Create your account
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Join our professional network
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-lg p-8 rounded-2xl shadow-2xl shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-300">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg animate-shake">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <p className="ml-3 text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {/* Full Name Input */}
              <div className="space-y-2">
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="appearance-none block w-full pl-10 px-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              {/* Email Input */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Work Email
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full pl-10 px-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="you@company.com"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                
                {/* Password Strength Indicator */}
                {password && (
                  <div className="mt-2">
                    <div className="flex h-2 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className={`transition-all duration-300 ${getPasswordStrengthColor()}`}
                        style={{ width: `${(passwordScore + 1) * 20}%` }}
                      />
                    </div>
                    <div className="mt-2">
                      {passwordRequirements.map((req, index) => (
                        <div
                          key={index}
                          className="flex items-center text-sm"
                        >
                          {req.regex.test(password) ? (
                            <Check className="h-4 w-4 text-green-500 mr-2" />
                          ) : (
                            <X className="h-4 w-4 text-gray-300 mr-2" />
                          )}
                          <span className={req.regex.test(password) ? 'text-green-700' : 'text-gray-500'}>
                            {req.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="appearance-none block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:-translate-y-1"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating account...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      Create account
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </span>
                  )}
                </button>
              </div>

              {/* Sign In Link */}
              <div className="text-center">
                <Link
                  to="/signin"
                  className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                >
                  Already have an account? Sign in
                </Link>
              </div>
            </form>
          </div>
        </div>

        {/* Instructions Panel - Right Side */}
        <div className="hidden lg:block w-full max-w-md">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white/80 backdrop-blur-lg p-8 rounded-2xl shadow-2xl shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-300"
          >
            <div className="flex items-center space-x-3 mb-6">
              <div className="h-8 w-2 bg-blue-600 rounded-full animate-pulse" />
              <h3 className="text-2xl font-bold text-gray-900">Getting Started</h3>
            </div>

            <div className="prose prose-blue">
              <div className="font-mono text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                {displayedText}
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="inline-block w-2 h-4 bg-blue-500 ml-1"
                />
              </div>
            </div>

            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-blue-500" />
                </div>
                <p className="text-sm text-blue-700">
                  Our AI verification system helps maintain a trusted professional network.
                </p>
              </div>
            </div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
              className="mt-6 flex items-center justify-center space-x-2 text-sm text-gray-500"
            >
              <Check className="h-4 w-4 text-green-500" />
              <span>Trusted by professionals worldwide</span>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}




