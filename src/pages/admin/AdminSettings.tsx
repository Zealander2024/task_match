import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { toast } from '../../components/ui/use-toast';
import { ThemeToggle } from '../../components/ThemeToggle';
import { useTheme } from '../../contexts/ThemeContext';

export function AdminSettings() {
  const { isDarkMode, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [reducedMotion, setReducedMotion] = useState(false);

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "Settings saved",
        description: "Your settings have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 transition-colors duration-200 dark:bg-gray-900 dark:text-white">
      <h1 className="text-2xl font-bold mb-6">Admin Settings</h1>

      <Card className="dark:bg-gray-800 dark:text-white">
        <CardHeader>
          <CardTitle>Theme Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="dark-mode" className="text-lg">Theme Mode</Label>
            <ThemeToggle isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}







