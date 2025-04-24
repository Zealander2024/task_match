export const handleSupabaseError = (error: any) => {
  if (error?.status === 401) {
    // Handle unauthorized access
    console.error('Authentication error:', error);
    return 'Please check your authentication credentials';
  }
  
  if (error?.code === 'PGRST116') {
    // Handle no results found
    return 'No data found';
  }
  
  // Handle other errors
  console.error('Supabase error:', error);
  return 'An unexpected error occurred';
};