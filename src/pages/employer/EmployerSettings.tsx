import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { 
  Bell, 
  User, 
  Mail, 
  Building,
  MessageSquare,
  AlertTriangle,
  Save,
  AlertCircle,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { EmployerIDVerification } from '../../components/EmployerIDVerification';
import { VerificationStatus } from '../../components/VerificationStatus';

interface NotificationSettings {
  newApplications: boolean;
  candidateMessages: boolean;
  jobAlerts: boolean;
  marketingEmails: boolean;
}

export function EmployerSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState<NotificationSettings>({
    newApplications: true,
    candidateMessages: true,
    jobAlerts: true,
    marketingEmails: false
  });
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        // Fetch employer profile
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

      if (error) throw error;
        setProfile(data);
        
        // Fetch notification settings
        const { data: settings, error: settingsError } = await supabase
          .from('employer_notification_settings')
          .select('*')
          .eq('employer_id', user.id)
          .single();
          
        if (settingsError && settingsError.code !== 'PGRST116') {
          throw settingsError;
        }
        
        if (settings && settings.settings) {
          setEmailNotifications(settings.settings);
        }
    } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error('Failed to load profile data');
    }
  };
    
    fetchProfile();
  }, [user]);

  const handleNotificationChange = (setting: keyof NotificationSettings) => {
    setEmailNotifications(prev => {
      const newSettings = {
        ...prev,
        [setting]: !prev[setting]
      };

      // Update in database
      supabase
        .from('employer_notification_settings')
        .upsert({
          employer_id: user?.id,
          settings: newSettings,
          updated_at: new Date().toISOString()
        })
        .then(({ error }) => {
          if (error) {
            toast.error('Failed to update notification settings');
            console.error('Error updating notifications:', error);
          }
        });

      return newSettings;
    });
  };
  
  const saveSettings = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('employer_notification_settings')
        .upsert({
          employer_id: user?.id,
          settings: emailNotifications,
          updated_at: new Date().toISOString()
        });
        
      if (error) throw error;
      
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Employer Settings</h1>

      <div className="grid grid-cols-1 gap-6">
        {/* Profile Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              Company Profile
            </CardTitle>
            <CardDescription>
              Manage your company information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-medium">{profile?.full_name || 'Company Name'}</h3>
                <p className="text-sm text-gray-500">{user?.email}</p>
                <VerificationStatus profile={profile} />
              </div>
              <div className="ml-auto">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.location.href = '/employer/company-profile'}
                >
                  Edit Company Profile
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ID Verification Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              ID Verification
            </CardTitle>
            <CardDescription>
              Verify your identity using any valid Philippine ID
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmployerIDVerification />
          </CardContent>
        </Card>

        {/* Notifications Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Control which notifications you receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-gray-500" />
                <Label htmlFor="new-applications">New Applications</Label>
              </div>
              <Switch
                id="new-applications"
                checked={emailNotifications.newApplications}
                onCheckedChange={() => handleNotificationChange('newApplications')}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4 text-gray-500" />
                <Label htmlFor="candidate-messages">Candidate Messages</Label>
              </div>
              <Switch
                id="candidate-messages"
                checked={emailNotifications.candidateMessages}
                onCheckedChange={() => handleNotificationChange('candidateMessages')}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bell className="h-4 w-4 text-gray-500" />
                <Label htmlFor="job-alerts">Job Alerts</Label>
              </div>
              <Switch
                id="job-alerts"
                checked={emailNotifications.jobAlerts}
                onCheckedChange={() => handleNotificationChange('jobAlerts')}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <Label htmlFor="marketing-emails">Marketing Emails</Label>
              </div>
              <Switch
                id="marketing-emails"
                checked={emailNotifications.marketingEmails}
                onCheckedChange={() => handleNotificationChange('marketingEmails')}
              />
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
              Once you delete your account, there is no going back. This will delete all of your data including job posts, applications, and company information.
            </p>
            <Button 
              variant="destructive"
              onClick={() => {
                if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                  // Implement account deletion logic
                  toast.error('Account deletion is not implemented yet');
                }
              }}
            >
              Delete Account
            </Button>
          </CardContent>
        </Card>
        
        {/* Save Button */}
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
    </div>
  );
}
