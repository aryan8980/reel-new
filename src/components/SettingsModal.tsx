import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { X, Settings, Shield, Bell, RotateCcw, Moon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  getUserProfile, 
  updateUserSettings,
  UserData 
} from '@/lib/firebaseService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Settings state
  const [notifications, setNotifications] = useState(true);
  const [autoSync, setAutoSync] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  // Load user settings when modal opens
  useEffect(() => {
    if (isOpen && authUser) {
      loadUserSettings();
    }
  }, [isOpen, authUser]);

  const loadUserSettings = async () => {
    try {
      const userProfile = await getUserProfile();
      if (userProfile) {
        setUser(userProfile);
        setNotifications(userProfile.settings?.notifications ?? true);
        setAutoSync(userProfile.settings?.autoSync ?? false);
        setDarkMode(userProfile.settings?.darkMode ?? true);
      }
    } catch (error) {
      console.error('Failed to load user settings:', error);
    }
  };

  const handleSaveSettings = async (newSettings: { notifications: boolean; autoSync: boolean; darkMode: boolean }) => {
    if (!authUser || !user) return;
    
    setIsLoading(true);
    try {
      await updateUserSettings(newSettings);
      
      toast({
        title: "Settings Updated",
        description: "Your preferences have been saved successfully.",
      });
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b p-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Settings</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Preferences */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    <Label>Notifications</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications about project updates
                  </p>
                </div>
                <Switch 
                  checked={notifications} 
                  onCheckedChange={(checked) => {
                    setNotifications(checked);
                    if (user) {
                      handleSaveSettings({ 
                        notifications: checked, 
                        autoSync, 
                        darkMode 
                      });
                    }
                  }}
                  disabled={isLoading}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" />
                    <Label>Auto-sync Projects</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Automatically sync projects to cloud storage
                  </p>
                </div>
                <Switch 
                  checked={autoSync} 
                  onCheckedChange={(checked) => {
                    setAutoSync(checked);
                    if (user) {
                      handleSaveSettings({ 
                        notifications, 
                        autoSync: checked, 
                        darkMode 
                      });
                    }
                  }}
                  disabled={isLoading}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4" />
                    <Label>Dark Mode</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Use dark theme for the interface
                  </p>
                </div>
                <Switch 
                  checked={darkMode} 
                  onCheckedChange={(checked) => {
                    setDarkMode(checked);
                    if (user) {
                      handleSaveSettings({ 
                        notifications, 
                        autoSync, 
                        darkMode: checked 
                      });
                    }
                  }}
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>

          {/* Privacy & Security */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Privacy & Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full" disabled>
                Change Password
                <span className="text-xs text-muted-foreground ml-2">(Coming Soon)</span>
              </Button>
              <Button variant="outline" className="w-full" disabled>
                Two-Factor Authentication
                <span className="text-xs text-muted-foreground ml-2">(Coming Soon)</span>
              </Button>
              <Button variant="outline" className="w-full" disabled>
                Privacy Settings
                <span className="text-xs text-muted-foreground ml-2">(Coming Soon)</span>
              </Button>
            </CardContent>
          </Card>

          {/* User Info */}
          {user && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Email:</span>
                  <span className="text-sm">{user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Plan:</span>
                  <span className="text-sm">{user.plan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Member Since:</span>
                  <span className="text-sm">{user.joinDate}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-card border-t p-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
