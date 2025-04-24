import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Correct way to set up realtime subscription
const channel = supabase.channel('profiles_changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'profiles'
    },
    (payload) => {
      console.log('Realtime change:', payload);
    }
  )
  .subscribe();

// Test connection
supabase
  .from('profiles')
  .select('count')
  .limit(1)
  .then(({ data, error }) => {
    if (error) {
      console.error('Supabase connection test failed:', error);
    } else {
      console.log('Supabase connection test successful:', data);
    }
  });

// Test function to verify configuration
export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('profiles').select('count');
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    console.log('Supabase connection test succeeded:', data);
    return true;
  } catch (err) {
    console.error('Supabase connection test error:', err);
    return false;
  }
};





