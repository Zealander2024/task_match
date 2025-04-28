import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { toast } from 'sonner';
import { User, Camera, Loader2, ArrowRight, ArrowLeft, X, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

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

interface ProfileCreationState {
  loading: boolean;
  saving: boolean;
  error: string | null;
  newSkill: string;
  previewUrl: string | null;
  currentStep: number;
}

export function ProfileCreation() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<ProfileCreationState>({
    loading: true,
    saving: false,
    error: null,
    newSkill: '',
    previewUrl: null,
    currentStep: 1,
  });
  const [profile, setProfile] = useState<Partial<Profile>>({
    full_name: '',
    bio: '',
    work_email: '',
    years_of_experience: 0,
    skills: [],
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }
    checkProfileStatus();
  }, [user]);

  const checkProfileStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      if (data.profile_completed) {
        navigate('/dashboard');
        return;
      }

      if (data) {
        setProfile(data);
      }
      setState(prev => ({ ...prev, loading: false }));
    } catch (err) {
      console.error('Error checking profile:', err);
      setState(prev => ({ ...prev, loading: false, error: 'Failed to load profile' }));
    }
  };

  const handleInputChange = (name: string, value: any) => {
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      setAvatarFile(file);
      const url = URL.createObjectURL(file);
      setState(prev => ({ ...prev, previewUrl: url }));
    }
  };

  const handleSkillAdd = () => {
    if (state.newSkill.trim() && profile.skills) {
      if (!profile.skills.includes(state.newSkill.trim())) {
        setProfile(prev => ({
          ...prev,
          skills: [...(prev.skills || []), state.newSkill.trim()]
        }));
      }
      setState(prev => ({ ...prev, newSkill: '' }));
    }
  };

  const handleSkillRemove = (skillToRemove: string) => {
    setProfile(prev => ({
      ...prev,
      skills: (prev.skills || []).filter(skill => skill !== skillToRemove)
    }));
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

  const handleNextStep = () => {
    setState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
  };

  const handlePrevStep = () => {
    setState(prev => ({ ...prev, currentStep: prev.currentStep - 1 }));
  };

  const handleSubmit = async () => {
    if (!user) return;

    try {
      setState(prev => ({ ...prev, saving: true }));

      const avatarUrl = avatarFile ? await uploadAvatar() : profile.avatar_url;

      const { error } = await supabase
        .from('profiles')
        .update({
          ...profile,
          avatar_url: avatarUrl,
          profile_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      // Show success screen and trigger confetti
      setShowSuccess(true);
      triggerConfetti();
      
      // Navigate after a delay
      setTimeout(() => {
        navigate('/select-role');
      }, 5000);

    } catch (err) {
      console.error('Error saving profile:', err);
      setState(prev => ({ ...prev, error: 'Failed to save profile' }));
      toast.error('Failed to save profile');
    } finally {
      setState(prev => ({ ...prev, saving: false }));
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center px-4"
        >
          <motion.div
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            className="mb-8"
          >
            <div className="w-24 h-24 bg-green-100 rounded-full mx-auto flex items-center justify-center mb-6">
              <Check className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Congratulations, {profile.full_name}! 🎉
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Your profile has been created successfully
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="space-y-6"
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="flex items-center space-x-2 text-green-600">
                <Check className="w-5 h-5" />
                <span>Profile Information Saved</span>
              </div>
              <div className="flex items-center space-x-2 text-green-600">
                <Check className="w-5 h-5" />
                <span>Avatar Uploaded</span>
              </div>
              {profile.skills?.length > 0 && (
                <div className="flex items-center space-x-2 text-green-600">
                  <Check className="w-5 h-5" />
                  <span>{profile.skills.length} Skills Added</span>
                </div>
              )}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-8"
            >
              <p className="text-gray-600 mb-4">
                Redirecting you to select your role...
              </p>
              <div className="w-full max-w-xs mx-auto bg-gray-200 rounded-full h-1">
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 4 }}
                  className="bg-blue-600 h-1 rounded-full"
                />
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (state.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const renderStep = () => {
    switch (state.currentStep) {
      case 1:
        return (
          <Card className="shadow-lg border-0">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Basic Information</CardTitle>
              <CardDescription>Let's start with your basic details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-sm font-medium">Full Name</Label>
                  <Input
                    id="full_name"
                    value={profile.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    placeholder="Enter your full name"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="work_email" className="text-sm font-medium">Work Email</Label>
                  <Input
                    id="work_email"
                    type="email"
                    value={profile.work_email}
                    onChange={(e) => handleInputChange('work_email', e.target.value)}
                    placeholder="Enter your work email"
                    className="h-11"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card className="shadow-lg border-0">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Profile Picture</CardTitle>
              <CardDescription>Add a profile picture to help others recognize you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="relative group">
                  <Avatar className="h-32 w-32 ring-4 ring-blue-50">
                    <AvatarImage
                      src={state.previewUrl || profile.avatar_url}
                      alt={profile.full_name}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      <User className="h-16 w-16" />
                    </AvatarFallback>
                  </Avatar>
                  <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="h-8 w-8" />
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleAvatarChange}
                    />
                  </label>
                </div>
                {state.previewUrl && (
                  <div className="text-center text-sm text-gray-600">
                    <p>Profile picture selected</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAvatarFile(null);
                        setState(prev => ({ ...prev, previewUrl: null }));
                      }}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      Remove photo
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card className="shadow-lg border-0">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Professional Details</CardTitle>
              <CardDescription>Tell us about your professional background</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-sm font-medium">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profile.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    placeholder="Write a short bio about yourself"
                    className="h-32"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="years_of_experience" className="text-sm font-medium">Years of Experience</Label>
                  <Input
                    id="years_of_experience"
                    type="number"
                    min="0"
                    value={profile.years_of_experience}
                    onChange={(e) => handleInputChange('years_of_experience', parseInt(e.target.value))}
                    className="h-11"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 4:
        return (
          <Card className="shadow-lg border-0">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Skills</CardTitle>
              <CardDescription>Add your professional skills</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex space-x-2">
                <Input
                  value={state.newSkill}
                  onChange={(e) => setState(prev => ({ ...prev, newSkill: e.target.value }))}
                  placeholder="Add a skill"
                  onKeyPress={(e) => e.key === 'Enter' && handleSkillAdd()}
                  className="h-11"
                />
                <Button onClick={handleSkillAdd}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.skills?.map((skill) => (
                  <div
                    key={skill}
                    className="bg-primary/10 text-primary px-3 py-1 rounded-full flex items-center space-x-2"
                  >
                    <span>{skill}</span>
                    <button
                      onClick={() => handleSkillRemove(skill)}
                      className="text-primary hover:text-primary/80"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container max-w-2xl mx-auto p-4 py-12">
        {/* Progress Bar */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Profile</h1>
            <p className="text-gray-600">Step {state.currentStep} of 4</p>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full">
            <div 
              className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-in-out"
              style={{ width: `${(state.currentStep / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Indicators */}
        <div className="flex justify-between mb-8 relative">
          {[1, 2, 3, 4].map((step) => (
            <div 
              key={step}
              className={`flex flex-col items-center relative z-10 ${
                step <= state.currentStep ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  step <= state.currentStep 
                    ? 'border-blue-600 bg-blue-50' 
                    : 'border-gray-300 bg-white'
                }`}
              >
                {step < state.currentStep ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="font-semibold">{step}</span>
                )}
              </div>
              <span className="text-xs mt-2 font-medium">
                {step === 1 && "Basic Info"}
                {step === 2 && "Photo"}
                {step === 3 && "Professional"}
                {step === 4 && "Skills"}
              </span>
            </div>
          ))}
          {/* Connection line */}
          <div className="absolute top-5 left-0 w-full h-[2px] bg-gray-200 -z-10">
            <div 
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${((state.currentStep - 1) / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="transition-all duration-300 transform">
          {renderStep()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          {state.currentStep > 1 && (
            <Button
              variant="outline"
              onClick={handlePrevStep}
              className="flex items-center px-6 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
          )}
          
          {state.currentStep < 4 ? (
            <Button
              onClick={handleNextStep}
              className={`flex items-center px-6 ml-auto bg-blue-600 hover:bg-blue-700 transition-colors ${
                state.currentStep === 1 && 'ml-0'
              }`}
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={state.saving}
              className="flex items-center px-6 ml-auto bg-green-600 hover:bg-green-700 transition-colors"
            >
              {state.saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Complete Profile
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}



