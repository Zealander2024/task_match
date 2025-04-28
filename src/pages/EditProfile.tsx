import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { toast } from 'sonner';
import { User, X, Loader2, ArrowLeft, Camera, CheckCircle, Briefcase, Mail, Clock, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { JobSeekerPayPalSetup } from '../components/JobSeekerPayPalSetup';
import { UserVerification } from '../components/UserVerification';
import { VerificationStatus } from '../components/VerificationStatus';
import { motion } from 'framer-motion';

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string;
  work_email: string;
  years_of_experience: number;
  skills: string[];
  role: string;
  is_verified: boolean;
  verification_date: string | null;
  verification_document: string | null;
}

interface ProfileState {
  loading: boolean;
  saving: boolean;
  error: string | null;
  newSkill: string;
  previewUrl: string | null;
}

export function EditProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<ProfileState>({
    loading: true,
    saving: false,
    error: null,
    newSkill: '',
    previewUrl: null,
  });
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // Profile Data Management
  const fetchProfile = async () => {
    try {
      if (!user) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
      toast.error('Failed to load profile');
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleInputChange = (name: string, value: string | number) => {
    setProfile(prev => prev ? { ...prev, [name]: value } : null);
  };

  // Skills Management
  const handleSkillsManagement = {
    add: () => {
      if (!state.newSkill.trim()) return;
      setProfile(prev => {
        if (!prev) return prev;
        const updatedSkills = [...(prev.skills || []), state.newSkill.trim()];
        return { ...prev, skills: updatedSkills };
      });
      setState(prev => ({ ...prev, newSkill: '' }));
    },
    remove: (skillToRemove: string) => {
      setProfile(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          skills: prev.skills.filter(skill => skill !== skillToRemove)
        };
      });
    }
  };

  // Avatar Management
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      setAvatarFile(file);
    }
  };

  const uploadAvatar = async () => {
    if (!avatarFile || !user) return null;
    const fileExt = avatarFile.name.split('.').pop();
    const fileName = `${user.id}-${Math.random()}.${fileExt}`;

    const { error: uploadError, data } = await supabase.storage
      .from('avatars')
      .upload(fileName, avatarFile);

    if (uploadError) throw uploadError;
    return supabase.storage.from('avatars').getPublicUrl(fileName).data.publicUrl;
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    try {
      setState(prev => ({ ...prev, saving: true, error: null }));

      const avatarUrl = avatarFile ? await uploadAvatar() : profile.avatar_url;
      const { error } = await supabase
        .from('profiles')
        .update({
          ...profile,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      
      toast.success('Profile updated successfully');
      navigate('/dashboard');
    } catch (err) {
      console.error('Error updating profile:', err);
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to update profile'
      }));
      toast.error('Failed to update profile');
    } finally {
      setState(prev => ({ ...prev, saving: false }));
    }
  };

  // Effects
  useEffect(() => {
    fetchProfile();
  }, [user]);

  useEffect(() => {
    if (avatarFile) {
      const url = URL.createObjectURL(avatarFile);
      setState(prev => ({ ...prev, previewUrl: url }));
      return () => URL.revokeObjectURL(url);
    }
  }, [avatarFile]);

  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('profile_changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.id}`
      }, (payload) => {
        setProfile(prev => prev ? { ...prev, ...payload.new } : null);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  if (state.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-500" />
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-gradient-to-b from-gray-50 to-white"
    >
      <div className="container max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="shrink-0 hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Profile</h1>
              <p className="text-gray-500 mt-1">Update your personal information and preferences</p>
            </div>
          </div>
          <VerificationStatus profile={profile} className="mt-0" />
        </div>

        {state.error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2"
          >
            <X className="h-5 w-5" />
            {state.error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Profile Picture Card */}
          <Card className="overflow-hidden border-none shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 pb-8">
              <CardTitle>Profile Picture</CardTitle>
              <CardDescription>Choose a professional photo to represent you</CardDescription>
              <div className="mt-6 flex justify-center">
                <AvatarUpload
                  profile={profile}
                  previewUrl={state.previewUrl}
                  onAvatarChange={handleAvatarChange}
                />
              </div>
            </CardHeader>
          </Card>

          {/* Basic Information Card */}
          <Card className="shadow-lg border-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-500" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  label="Full Name"
                  name="full_name"
                  value={profile?.full_name}
                  onChange={handleInputChange}
                  icon={<User className="h-4 w-4 text-gray-500" />}
                />
                <FormField
                  label="Work Email"
                  name="work_email"
                  type="email"
                  value={profile?.work_email}
                  onChange={handleInputChange}
                  icon={<Mail className="h-4 w-4 text-gray-500" />}
                />
              </div>
              <FormField
                label="Bio"
                name="bio"
                value={profile?.bio}
                onChange={handleInputChange}
                multiline
                icon={<FileText className="h-4 w-4 text-gray-500" />}
              />
              <FormField
                label="Years of Experience"
                name="years_of_experience"
                type="number"
                value={profile?.years_of_experience}
                onChange={handleInputChange}
                min={0}
                icon={<Clock className="h-4 w-4 text-gray-500" />}
              />
            </CardContent>
          </Card>

          {/* Skills Card */}
          <Card className="shadow-lg border-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-blue-500" />
                Professional Skills
              </CardTitle>
              <CardDescription>Add skills that showcase your expertise</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={state.newSkill}
                    onChange={(e) => setState(prev => ({ ...prev, newSkill: e.target.value }))}
                    placeholder="Add a skill..."
                    className="flex-1"
                    onKeyPress={(e) => e.key === 'Enter' && handleSkillsManagement.add()}
                  />
                  <Button 
                    type="button" 
                    onClick={handleSkillsManagement.add}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile?.skills?.map((skill) => (
                    <motion.div
                      key={skill}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                    >
                      <Badge 
                        variant="secondary" 
                        className="group px-3 py-1 text-sm bg-blue-50 hover:bg-blue-100"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => handleSkillsManagement.remove(skill)}
                          className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Settings Card */}
          <Card className="shadow-lg border-none">
            <CardHeader>
              <CardTitle>Payment Settings</CardTitle>
              <CardDescription>Configure your payment preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <JobSeekerPayPalSetup />
            </CardContent>
          </Card>

          {/* Verification Card */}
          <Card className="shadow-lg border-none">
            <CardHeader>
              <CardTitle>Account Verification</CardTitle>
              <CardDescription>Verify your account to unlock all features</CardDescription>
            </CardHeader>
            <CardContent>
              <UserVerification />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              className="min-w-[100px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={state.saving}
              className="min-w-[100px] bg-blue-500 hover:bg-blue-600"
            >
              {state.saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}

// Enhanced FormField component
const FormField = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  multiline = false,
  min,
  icon
}: {
  label: string;
  name: string;
  value?: string | number;
  onChange: (name: string, value: string | number) => void;
  type?: string;
  multiline?: boolean;
  min?: number;
  icon?: React.ReactNode;
}) => (
  <div className="space-y-2">
    <Label htmlFor={name} className="flex items-center gap-2 text-gray-700">
      {icon}
      {label}
    </Label>
    {multiline ? (
      <Textarea
        id={name}
        value={value || ''}
        onChange={(e) => onChange(name, e.target.value)}
        rows={4}
        className="resize-none"
      />
    ) : (
      <Input
        id={name}
        type={type}
        value={value || ''}
        onChange={(e) => onChange(name, type === 'number' ? parseInt(e.target.value) : e.target.value)}
        min={min}
        className="bg-white"
      />
    )}
  </div>
);

// Enhanced AvatarUpload component
const AvatarUpload = ({
  profile,
  previewUrl,
  onAvatarChange
}: {
  profile: Profile | null;
  previewUrl: string | null;
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => (
  <div className="relative">
    <motion.div 
      whileHover={{ scale: 1.05 }}
      className="relative group"
    >
      <Avatar className="h-32 w-32 ring-4 ring-white shadow-lg">
        <AvatarImage
          src={previewUrl || profile?.avatar_url}
          alt={profile?.full_name}
          className="object-cover"
        />
        <AvatarFallback className="bg-blue-50 text-blue-500 text-2xl">
          {profile?.full_name?.charAt(0) || <User className="h-12 w-12" />}
        </AvatarFallback>
      </Avatar>
      <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
        <Camera className="h-8 w-8" />
        <input
          type="file"
          className="hidden"
          accept="image/*"
          onChange={onAvatarChange}
        />
      </label>
    </motion.div>
    {profile?.is_verified && (
      <motion.div 
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-lg"
      >
        <Badge variant="default" className="bg-blue-500 hover:bg-blue-500 h-8 w-8 rounded-full p-1">
          <CheckCircle className="h-5 w-5 text-white" />
        </Badge>
      </motion.div>
    )}
  </div>
); 



















