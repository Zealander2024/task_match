import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Remove the channel initialization if not needed

export async function checkEmailVerificationStatus(userId: string) {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error checking verification status:', error);
      return false;
    }

    // Check both email_confirmed_at and confirmed_at
    return Boolean(user?.email_confirmed_at || user?.confirmed_at);
  } catch (error) {
    console.error('Verification status check error:', error);
    return false;
  }
}

export async function resendVerificationEmail(email: string) {
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email
    });

    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error('Error resending verification email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to resend verification email' 
    };
  }
}
