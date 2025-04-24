import { supabase } from './supabase';
import { LOCAL_STORAGE_KEYS } from '../constants/adminConfig';

const getAdminSession = () => {
  const session = localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_SESSION);
  return session ? JSON.parse(session) : null;
};

const validateAdminAccess = () => {
  const session = getAdminSession();
  if (!session) throw new Error('Not authenticated');
  if (Date.now() - session.timestamp > 24 * 60 * 60 * 1000) {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.ADMIN_SESSION);
    throw new Error('Session expired');
  }
};

const getJobSeekers = async () => {
  validateAdminAccess();
  
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      role,
      bio,
      work_email,
      years_of_experience,
      skills,
      avatar_url,
      resume_url,
      portfolio_images,
      created_at,
      updated_at
    `)
    .eq('role', 'job_seeker')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

const updateJobSeeker = async (id: string, updateData: any) => {
  validateAdminAccess();
  
  const { data, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

const deleteJobSeeker = async (id: string) => {
  validateAdminAccess();
  
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// Export the service after defining all functions
export const adminService = {
  getJobSeekers,
  updateJobSeeker,
  deleteJobSeeker
};


