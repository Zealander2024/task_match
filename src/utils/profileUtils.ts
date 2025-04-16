export const calculateProfileCompletion = (profile: Profile): number => {
  const requiredFields = [
    'full_name',
    'work_email',
    'bio',
    'years_of_experience',
    'skills',
    'avatar_url',
    'resume_url'
  ];

  const completedFields = requiredFields.filter(field => {
    const value = profile[field as keyof Profile];
    return value !== null && value !== undefined && value !== '' && 
      (Array.isArray(value) ? value.length > 0 : true);
  });

  return Math.round((completedFields.length / requiredFields.length) * 100);
};