export interface ProfileFormData {
  full_name: string;
  bio: string;
  work_email: string;
  years_of_experience: number;
  skills: string[];
  avatar_url?: string;
  resume_url?: string;
}

export const profileValidation = {
  full_name: {
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  bio: {
    required: true,
    minLength: 10,
    maxLength: 500,
  },
  work_email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  years_of_experience: {
    required: true,
    min: 0,
    max: 50,
  },
  skills: {
    required: true,
    minLength: 1,
    maxLength: 20,
  },
};