import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { 
  Bell, 
  Lock, 
  User, 
  Mail, 
  Shield,
  Smartphone, 
  Save, 
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { UserVerification } from './UserVerification';

interface SettingsState {
  emailNotifications: boolean;
  applicationUpdates: boolean;
  messageNotifications: boolean;
  profilePrivacy: 'public' | 'limited' | 'private';
  showVerification: boolean;
}

export function JobSeekerSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SettingsState>({
    emailNotifications: true,
    applicationUpdates: true,
    messageNotifications: true,
    profilePrivacy: 'public',
    showVerification: false
  });
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) return;
      
      try {
        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (profileError) throw profileError;
        setUserProfile(profile);
        
        // Fetch user settings
        const { data: userSettings, error: settingsError } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        if (settingsError && settingsError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          throw settingsError;
        }
        
        if (userSettings) {
          setSettings({
            emailNotifications: userSettings.email_notifications || true,
            applicationUpdates: userSettings.application_updates || true,
            messageNotifications: userSettings.message_notifications || true,
            profilePrivacy: userSettings.profile_privacy || 'public',
            showVerification: false
          });
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        toast.error('Failed to load settings');
      }
    };
    
    fetchSettings();
  }, [user]);
  
  const saveSettings = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const { error } = await supabase.from('user_settings')
        .upsert({
          user_id: user.id,
          email_notifications: settings.emailNotifications,
          application_updates: settings.applicationUpdates,
          message_notifications: settings.messageNotifications,
          profile_privacy: settings.profilePrivacy,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
        
      if (error) throw error;
      
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSwitchChange = (setting: keyof SettingsState) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting as keyof typeof prev]
    }));
  };
  
  const handlePrivacyChange = (value: 'public' | 'limited' | 'private') => {
    setSettings(prev => ({
      ...prev,
      profilePrivacy: value
    }));
  };
  
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Account Settings</h1>
      
      {settings.showVerification ? (
        <UserVerification />
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {/* Profile Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Profile Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-medium">{userProfile?.full_name || 'User'}</h3>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                </div>
                <div className="ml-auto">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => window.location.href = '/profile/edit'}
                  >
                    Edit Profile
                  </Button>
                </div>
              </div>
              
              <div className="mt-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-yellow-500" />
                <span className="text-sm">
                  Account Verification: {userProfile?.is_verified ? 
                    <span className="text-green-600 font-medium">Verified</span> : 
                    <span className="text-yellow-600 font-medium">Not Verified</span>
                  }
                </span>
                {!userProfile?.is_verified && (
                  <Button 
                    variant="link" 
                    className="text-blue-600 p-0 h-auto text-sm"
                    onClick={() => setSettings(prev => ({ ...prev, showVerification: true }))}
                  >
                    Verify Now
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Configure how and when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                </div>
                <Switch
                  id="email-notifications"
                  checked={settings.emailNotifications}
                  onCheckedChange={() => handleSwitchChange('emailNotifications')}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bell className="h-4 w-4 text-gray-500" />
                  <Label htmlFor="application-updates">Application Updates</Label>
                </div>
                <Switch
                  id="application-updates"
                  checked={settings.applicationUpdates}
                  onCheckedChange={() => handleSwitchChange('applicationUpdates')}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Smartphone className="h-4 w-4 text-gray-500" />
                  <Label htmlFor="message-notifications">Message Notifications</Label>
                </div>
                <Switch
                  id="message-notifications"
                  checked={settings.messageNotifications}
                  onCheckedChange={() => handleSwitchChange('messageNotifications')}
                />
              </div>
            </CardContent>
          </Card>
          
          {/* Privacy Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                Privacy Settings
              </CardTitle>
              <CardDescription>
                Control who can see your profile and information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={settings.profilePrivacy === 'public' ? 'default' : 'outline'}
                    onClick={() => handlePrivacyChange('public')}
                    className="flex flex-col gap-2 h-auto py-3"
                  >
                    <span>Public</span>
                    <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                      All users can see your profile
                    </span>
                  </Button>
                  <Button
                    variant={settings.profilePrivacy === 'limited' ? 'default' : 'outline'}
                    onClick={() => handlePrivacyChange('limited')}
                    className="flex flex-col gap-2 h-auto py-3"
                  >
                    <span>Limited</span>
                    <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                      Only employers can contact you
                    </span>
                  </Button>
                  <Button
                    variant={settings.profilePrivacy === 'private' ? 'default' : 'outline'}
                    onClick={() => handlePrivacyChange('private')}
                    className="flex flex-col gap-2 h-auto py-3"
                  >
                    <span>Private</span>
                    <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                      Only visible when you apply
                    </span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Delete Account */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <Button variant="destructive">
                Delete Account
              </Button>
            </CardContent>
          </Card>
          
          <div className="flex justify-end">
            <Button 
              onClick={saveSettings} 
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 