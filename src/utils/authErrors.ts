export const handleSupabaseError = (error: any): string => {
  if (!error) return 'An unexpected error occurred';

  // Common Supabase error codes and messages
  const errorMap: Record<string, string> = {
    'auth/invalid-email': 'Invalid email address',
    'auth/user-disabled': 'This account has been disabled',
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Invalid password',
    'auth/email-already-in-use': 'An account already exists with this email',
    'auth/weak-password': 'Password is too weak',
    'auth/invalid-login-credentials': 'Invalid email or password',
    '23505': 'An account with this email already exists', // Postgres unique constraint violation
  };

  const errorCode = error.code || error.message;
  return errorMap[errorCode] || error.message || 'An unexpected error occurred';
};