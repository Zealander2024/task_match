import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { toast } from 'sonner';
import { User, Upload, X, Plus, Loader2, ArrowLeft, Camera } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Separator } from "../components/ui/separator";
import { JobSeekerPayPalSetup } from '../components/JobSeekerPayPalSetup';
import { UserVerification } from '../components/UserVerification';

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string;
  work_email: string;
  years_of_experience: number;
  skills: string[];
  role: string;
}

export function EditProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState({
    loading: true,
    saving: false,
    error: null as string | null,
    newSkill: '',
    previewUrl: null as string | null,
  });
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

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

  // Profile Management Functions
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

  // Form Handlers
  const handleInputChange = (name: string, value: string | number) => {
    setProfile(prev => prev ? { ...prev, [name]: value } : null);
  };

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

  if (state.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Profile</h1>
            <p className="text-muted-foreground">Update your personal information</p>
          </div>
        </div>
      </header>

      {state.error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
          {state.error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <ProfileSection title="Profile Picture" description="Choose a profile picture to help others recognize you">
          <div className="flex items-center gap-6">
            <AvatarUpload
              profile={profile}
              previewUrl={state.previewUrl}
              onAvatarChange={handleAvatarChange}
            />
          </div>
        </ProfileSection>

        <ProfileSection title="Basic Information">
          <div className="grid gap-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Full Name"
                name="full_name"
                value={profile?.full_name}
                onChange={handleInputChange}
              />
              <FormField
                label="Work Email"
                name="work_email"
                type="email"
                value={profile?.work_email}
                onChange={handleInputChange}
              />
            </div>

            <FormField
              label="Bio"
              name="bio"
              value={profile?.bio}
              onChange={handleInputChange}
              multiline
            />

            <FormField
              label="Years of Experience"
              name="years_of_experience"
              type="number"
              value={profile?.years_of_experience}
              onChange={handleInputChange}
              min={0}
            />
          </div>
        </ProfileSection>

        <ProfileSection title="Skills" description="Add your professional skills">
          <SkillsManager
            skills={profile?.skills || []}
            newSkill={state.newSkill}
            onNewSkillChange={(value) => setState(prev => ({ ...prev, newSkill: value }))}
            onAddSkill={handleSkillsManagement.add}
            onRemoveSkill={handleSkillsManagement.remove}
          />
        </ProfileSection>

        <ProfileSection title="Payment Settings" description="Set up your PayPal account to receive payments">
          <JobSeekerPayPalSetup />
        </ProfileSection>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={state.saving}
            className="min-w-[100px]"
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

        <div className="mt-8">
          <UserVerification />
        </div>
      </form>
    </div>
  );
}

// Component Extractions
const ProfileSection = ({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      {description && <CardDescription>{description}</CardDescription>}
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

const AvatarUpload = ({
  profile,
  previewUrl,
  onAvatarChange
}: {
  profile: Profile | null;
  previewUrl: string | null;
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => (
  <div className="relative group">
    <Avatar className="h-24 w-24">
      <AvatarImage
        src={previewUrl || profile?.avatar_url}
        alt={profile?.full_name}
      />
      <AvatarFallback>
        {profile?.full_name?.charAt(0) || <User />}
      </AvatarFallback>
    </Avatar>
    <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
      <Camera className="h-6 w-6" />
      <input
        type="file"
        className="hidden"
        accept="image/*"
        onChange={onAvatarChange}
      />
    </label>
  </div>
);

const FormField = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  multiline = false,
  min,
}: {
  label: string;
  name: string;
  value?: string | number;
  onChange: (name: string, value: string | number) => void;
  type?: string;
  multiline?: boolean;
  min?: number;
}) => (
  <div className="space-y-2">
    <Label htmlFor={name}>{label}</Label>
    {multiline ? (
      <Textarea
        id={name}
        value={value || ''}
        onChange={(e) => onChange(name, e.target.value)}
        rows={4}
      />
    ) : (
      <Input
        id={name}
        type={type}
        value={value || ''}
        onChange={(e) => onChange(name, type === 'number' ? parseInt(e.target.value) : e.target.value)}
        min={min}
      />
    )}
  </div>
);

const SkillsManager = ({
  skills,
  newSkill,
  onNewSkillChange,
  onAddSkill,
  onRemoveSkill
}: {
  skills: string[];
  newSkill: string;
  onNewSkillChange: (value: string) => void;
  onAddSkill: () => void;
  onRemoveSkill: (skill: string) => void;
}) => (
  <div className="space-y-4">
    <div className="flex gap-2">
      <Input
        value={newSkill}
        onChange={(e) => onNewSkillChange(e.target.value)}
        placeholder="Add a skill..."
        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), onAddSkill())}
      />
      <Button
        type="button"
        onClick={onAddSkill}
        variant="secondary"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
    
    <div className="flex flex-wrap gap-2">
      {skills.map((skill) => (
        <Badge
          key={skill}
          variant="secondary"
          className="group"
        >
          {skill}
          <button
            type="button"
            onClick={() => onRemoveSkill(skill)}
            className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
    </div>
  </div>
); 








