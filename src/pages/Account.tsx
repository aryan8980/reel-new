import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { 
  getUserProfile, 
  saveUserProfile, 
  updateUserSettings, 
  getUserProjects,
  deleteProject,
  subscribeToUserData,
  checkFirebaseConnection,
  getNetworkStatus,
  refreshFirebaseConnection,
  UserData,
  ProjectData 
} from "@/lib/firebaseService";
import { 
  User, 
  Settings, 
  Video, 
  Download, 
  Upload,
  Edit,
  Trash2,
  Bell,
  Shield,
  CreditCard,
  LogOut,
  Home,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Star,
  Save,
  Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const Account = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: authUser, loading: authLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  
  // User data state
  const [user, setUser] = useState<UserData | null>(null);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  
  // Form data state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    location: ""
  });
  
  // Settings state
  const [notifications, setNotifications] = useState(true);
  const [autoSync, setAutoSync] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authUser && !authLoading && !dataLoading) {
      navigate("/auth");
    }
  }, [authUser, authLoading, navigate, dataLoading]);

  // Load user data from Firebase
  useEffect(() => {
    if (!authUser) {
      setDataLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    const loadUserData = async () => {
      try {
        // Load user profile data first (fastest)
        console.log('🔄 Loading user profile...');
        const userProfile = await getUserProfile();
        if (userProfile) {
          setUser(userProfile);
          setFormData({
            name: userProfile.name || "",
            email: userProfile.email || "",
            phone: userProfile.phone || "",
            location: userProfile.location || ""
          });
          setNotifications(userProfile.settings?.notifications ?? true);
          setAutoSync(userProfile.settings?.autoSync ?? false);
          setDarkMode(userProfile.settings?.darkMode ?? true);
          setHasUnsavedChanges(false); // Reset unsaved changes flag
        } else {
          // Create a minimal fallback profile if Firebase is completely unavailable
          console.log('📋 Creating fallback user profile...');
          const fallbackProfile: UserData = {
            uid: authUser.uid,
            name: authUser.displayName || '',
            email: authUser.email || '',
            phone: authUser.phoneNumber || '',
            location: '',
            joinDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
            plan: 'Free',
            avatar: authUser.photoURL || '',
            stats: {
              videosCreated: 0,
              totalViews: '0',
              averageRating: 0,
              storageUsed: '0MB',
              storageLimit: '1GB'
            },
            settings: {
              notifications: true,
              autoSync: false,
              darkMode: true
            }
          };
          setUser(fallbackProfile);
          setFormData({
            name: fallbackProfile.name,
            email: fallbackProfile.email,
            phone: fallbackProfile.phone,
            location: fallbackProfile.location
          });
        }
        
        // Mark initial loading as complete
        setDataLoading(false);

        // Set up real-time subscription for updates (non-blocking)
        unsubscribe = subscribeToUserData((userData) => {
          if (userData) {
            setUser(userData);
            setFormData({
              name: userData.name || "",
              email: userData.email || "",
              phone: userData.phone || "",
              location: userData.location || ""
            });
            setNotifications(userData.settings?.notifications ?? true);
            setAutoSync(userData.settings?.autoSync ?? false);
            setDarkMode(userData.settings?.darkMode ?? true);
            // Reset unsaved changes when fresh data comes from server
            setHasUnsavedChanges(false);
          }
        });

        // Load projects in the background only if projects tab is active or after delay
        if (activeTab === 'projects') {
          loadProjects();
        } else {
          // Load projects after a short delay for better UX
          setTimeout(loadProjects, 2000);
        }

      } catch (error) {
        console.error('Error loading user data:', error);
        
        // Even if Firebase fails, show a basic profile
        const fallbackProfile: UserData = {
          uid: authUser.uid,
          name: authUser.displayName || 'User',
          email: authUser.email || '',
          phone: '',
          location: '',
          joinDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
          plan: 'Free',
          avatar: authUser.photoURL || '',
          stats: {
            videosCreated: 0,
            totalViews: '0',
            averageRating: 0,
            storageUsed: '0MB',
            storageLimit: '1GB'
          },
          settings: {
            notifications: true,
            autoSync: false,
            darkMode: true
          }
        };
        setUser(fallbackProfile);
        
        toast({
          title: "Connection Issue",
          description: "Some features may be limited due to connectivity issues.",
          variant: "destructive"
        });
        setDataLoading(false);
      }
    };

    const loadProjects = async () => {
      if (projects.length > 0) return; // Already loaded
      
      setProjectsLoading(true);
      try {
        console.log('🔄 Loading user projects...');
        const userProjects = await getUserProjects();
        setProjects(userProjects.filter(p => !p.deleted));
      } catch (projectError) {
        console.warn('Failed to load projects:', projectError);
        // Don't show error toast for projects - it's not critical
        // Just keep projects as empty array
      } finally {
        setProjectsLoading(false);
      }
    };

    loadUserData();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [authUser, toast]);

  // Monitor network connectivity
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setConnectionStatus('checking');
      checkFirebaseConnection().then(isConnected => {
        setConnectionStatus(isConnected ? 'connected' : 'disconnected');
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      setConnectionStatus('disconnected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial connection check
    if (authUser) {
      checkFirebaseConnection().then(isConnected => {
        setConnectionStatus(isConnected ? 'connected' : 'disconnected');
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [authUser]);

  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };
      
      // Check if there are unsaved changes
      if (user) {
        const hasChanges = 
          newData.name !== (user.name || '') ||
          newData.email !== (user.email || '') ||
          newData.phone !== (user.phone || '') ||
          newData.location !== (user.location || '');
        setHasUnsavedChanges(hasChanges);
      }
      
      return newData;
    });
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    if (!authUser) return;
    
    // Basic validation
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Name is required.",
        variant: "destructive"
      });
      return;
    }
    
    if (!formData.email.trim()) {
      toast({
        title: "Validation Error",
        description: "Email is required.",
        variant: "destructive"
      });
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }
    
    // Phone validation (if provided)
    if (formData.phone && formData.phone.length > 0 && formData.phone.length < 10) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid phone number (at least 10 digits).",
        variant: "destructive"
      });
      return;
    }

    // Check network connectivity first
    if (!getNetworkStatus()) {
      toast({
        title: "No Internet Connection",
        description: "Please check your internet connection and try again.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('🔍 Checking Firebase connection before save...');
      
      // Check Firebase connection with retry
      let isConnected = await checkFirebaseConnection();
      if (!isConnected) {
        console.log('🔄 Connection failed, attempting refresh...');
        await refreshFirebaseConnection();
        isConnected = await checkFirebaseConnection();
        
        if (!isConnected) {
          throw new Error('Unable to connect to the database. Please check your connection and try again.');
        }
      }
      
      // Prepare clean data for saving
      const cleanFormData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        location: formData.location.trim()
      };
      
      console.log('💾 Saving profile data:', cleanFormData);
      
      // Update the profile in Firebase with retry mechanism
      await saveUserProfile(cleanFormData);
      
      // Update the local user state immediately for better UX
      if (user) {
        setUser({
          ...user,
          name: cleanFormData.name,
          email: cleanFormData.email,
          phone: cleanFormData.phone,
          location: cleanFormData.location
        });
      }
      
      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved successfully.",
      });
      
      // Reset unsaved changes flag
      setHasUnsavedChanges(false);
      
      // Log success for debugging
      console.log('✅ Profile updated successfully:', cleanFormData);
      
    } catch (error: any) {
      console.error('❌ Error saving profile:', error);
      
      // Provide more specific error messages based on error type
      let errorMessage = "Failed to save profile. Please try again.";
      let errorTitle = "Save Failed";
      
      if (error.message?.includes('Unable to connect')) {
        errorTitle = "Connection Error";
        errorMessage = error.message;
      } else if (error.message?.includes('Permission denied')) {
        errorTitle = "Permission Error"; 
        errorMessage = "You don't have permission to update this profile.";
      } else if (error.message?.includes('unavailable')) {
        errorTitle = "Service Unavailable";
        errorMessage = "The database service is temporarily unavailable. Please try again in a few moments.";
      } else if (error.message?.includes('timeout')) {
        errorTitle = "Request Timeout";
        errorMessage = "The request timed out. Please check your connection and try again.";
      } else if (error.message?.includes('Authentication expired')) {
        errorTitle = "Session Expired";
        errorMessage = "Your session has expired. Please sign in again.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive"
      });
      
      // If it's an authentication error, consider redirecting to login
      if (error.message?.includes('Authentication expired')) {
        setTimeout(() => {
          logout();
          navigate('/auth');
        }, 3000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel profile changes
  const handleCancelProfile = () => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        location: user.location || ""
      });
    }
    setHasUnsavedChanges(false);
    toast({
      title: "Changes Cancelled",
      description: "Your changes have been reverted.",
    });
  };

  // Handle tab change with lazy loading
  const handleTabChange = async (tabId: string) => {
    setActiveTab(tabId);
    
    // Load projects when projects tab is first opened
    if (tabId === 'projects' && projects.length === 0 && !projectsLoading) {
      setProjectsLoading(true);
      try {
        console.log('🔄 Loading projects for tab...');
        const userProjects = await getUserProjects();
        setProjects(userProjects.filter(p => !p.deleted));
      } catch (error) {
        console.warn('Failed to load projects:', error);
        // Don't show error for projects loading - show empty state instead
      } finally {
        setProjectsLoading(false);
      }
    }
  };

  // Save settings
  const handleSaveSettings = async (newSettings: Partial<UserData['settings']>) => {
    if (!authUser) return;

    try {
      await updateUserSettings(newSettings);
      toast({
        title: "Settings Saved",
        description: "Your preferences have been updated.",
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Delete project
  const handleDeleteProject = async (projectId: string) => {
    try {
      await deleteProject(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      toast({
        title: "Project Deleted",
        description: "Project has been deleted successfully.",
      });
    } catch (error: any) {
      console.error('Error deleting project:', error);
      toast({
        title: "Error",
        description: "Failed to delete project. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged Out",
        description: "You have been logged out successfully.",
      });
      navigate("/");
    } catch (error: any) {
      console.error('Error logging out:', error);
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Show loading state
  if (dataLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your account...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!authUser || !user) {
    return null;
  }

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "projects", label: "My Projects", icon: Video },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "billing", label: "Billing", icon: CreditCard },
  ];

  // Show loading state while checking auth or loading data
  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading account...</p>
        </div>
      </div>
    );
  }

  // Show error state if not authenticated
  if (!authUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <p className="text-muted-foreground">Please log in to access your account.</p>
          <Button onClick={() => navigate("/auth")}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center justify-between p-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate("/")}
            >
              <Home className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">My Account</h1>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <div className="p-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="glass-card">
              <CardContent className="p-4">
                {/* User Avatar */}
                  <div className="text-center mb-6">
                  <Avatar className="w-20 h-20 mx-auto mb-3">
                    <AvatarImage src={authUser.photoURL || user.avatar} />
                    <AvatarFallback className="text-lg">
                      {(authUser.displayName || user.name) ? (authUser.displayName || user.name).split(" ").map(n => n[0]).join("") : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold">{authUser.displayName || user.name || "User Name"}</h3>
                  <p className="text-sm text-muted-foreground">{authUser.email || "user@example.com"}</p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {user.plan} Plan
                    </Badge>
                    {authUser.emailVerified && (
                      <Badge variant="default" className="text-xs">
                        ✓ Verified
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Member since {authUser.metadata.creationTime ? 
                      new Date(authUser.metadata.creationTime).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 
                      'Unknown'}
                  </div>
                </div>

                <Separator className="mb-4" />

                {/* Navigation */}
                <nav className="space-y-2">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <Button
                        key={tab.id}
                        variant={activeTab === tab.id ? "default" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => handleTabChange(tab.id)}
                      >
                        <Icon className="w-4 h-4 mr-2" />
                        {tab.label}
                      </Button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === "profile" && (
              <div className="space-y-6">
                {/* Profile Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="glass-card">
                    <CardContent className="p-4 text-center">
                      <Video className="w-8 h-8 text-primary mx-auto mb-2" />
                      <div className="text-2xl font-bold">{user.stats.videosCreated}</div>
                      <p className="text-sm text-muted-foreground">Videos Created</p>
                    </CardContent>
                  </Card>
                  <Card className="glass-card">
                    <CardContent className="p-4 text-center">
                      <Star className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold">{user.stats.averageRating}</div>
                      <p className="text-sm text-muted-foreground">Avg Rating</p>
                    </CardContent>
                  </Card>
                  <Card className="glass-card">
                    <CardContent className="p-4 text-center">
                      <Download className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold">{user.stats.totalViews}</div>
                      <p className="text-sm text-muted-foreground">Total Views</p>
                    </CardContent>
                  </Card>
                  <Card className="glass-card">
                    <CardContent className="p-4 text-center">
                      <Upload className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold">{user.stats.storageUsed}</div>
                      <p className="text-sm text-muted-foreground">Storage Used</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Profile Information */}
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Profile Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Full Name</Label>
                        <Input 
                          id="name" 
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          placeholder="Enter your full name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input 
                          id="email" 
                          type="email" 
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          placeholder="Enter your email address"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input 
                          id="phone" 
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          placeholder="Enter your phone number"
                        />
                      </div>
                      <div>
                        <Label htmlFor="location">Location</Label>
                        <Input 
                          id="location" 
                          value={formData.location}
                          onChange={(e) => handleInputChange('location', e.target.value)}
                          placeholder="Enter your location"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-4">
                      <Button 
                        onClick={handleSaveProfile}
                        disabled={isLoading || !hasUnsavedChanges || connectionStatus === 'disconnected'}
                        className={hasUnsavedChanges && connectionStatus === 'connected' ? "bg-primary" : ""}
                      >
                        {isLoading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            {hasUnsavedChanges ? "Save Changes*" : "Save Changes"}
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={handleCancelProfile}
                        disabled={isLoading || !hasUnsavedChanges}
                      >
                        Cancel
                      </Button>
                      
                      {/* Connection Status Indicator */}
                      <div className="flex items-center gap-2 ml-2">
                        <div className="flex items-center gap-1 text-sm">
                          {connectionStatus === 'connected' && (
                            <>
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                              <span className="text-green-600 text-xs">Connected</span>
                            </>
                          )}
                          {connectionStatus === 'disconnected' && (
                            <>
                              <div className="w-2 h-2 bg-red-500 rounded-full" />
                              <span className="text-red-600 text-xs">Offline</span>
                            </>
                          )}
                          {connectionStatus === 'checking' && (
                            <>
                              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                              <span className="text-yellow-600 text-xs">Checking...</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {hasUnsavedChanges && connectionStatus === 'connected' && (
                        <span className="text-sm text-muted-foreground">
                          * You have unsaved changes
                        </span>
                      )}
                      {hasUnsavedChanges && connectionStatus === 'disconnected' && (
                        <span className="text-sm text-red-500">
                          * Cannot save while offline
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Firebase User Details */}
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Account Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Quick Actions */}
                    <div className="flex gap-2 mb-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(authUser.uid);
                          toast({ title: "Copied!", description: "User ID copied to clipboard" });
                        }}
                      >
                        Copy User ID
                      </Button>
                      {!authUser.emailVerified && (
                        <Button variant="outline" size="sm">
                          Verify Email
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                          <span className="text-sm font-medium">User ID</span>
                          <span className="text-sm text-muted-foreground font-mono">
                            {authUser.uid.slice(0, 12)}...
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                          <span className="text-sm font-medium">Email Verified</span>
                          <Badge variant={authUser.emailVerified ? "default" : "destructive"}>
                            {authUser.emailVerified ? "Verified" : "Unverified"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                          <span className="text-sm font-medium">Account Created</span>
                          <span className="text-sm text-muted-foreground">
                            {authUser.metadata.creationTime ? new Date(authUser.metadata.creationTime).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short', 
                              day: 'numeric'
                            }) : 'Unknown'}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                          <span className="text-sm font-medium">Last Sign In</span>
                          <span className="text-sm text-muted-foreground">
                            {authUser.metadata.lastSignInTime ? new Date(authUser.metadata.lastSignInTime).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            }) : 'Unknown'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                          <span className="text-sm font-medium">Provider</span>
                          <Badge variant="outline">
                            {authUser.providerData[0]?.providerId === 'password' ? 'Email/Password' : 
                             authUser.providerData[0]?.providerId === 'google.com' ? 'Google' :
                             authUser.providerData[0]?.providerId === 'github.com' ? 'GitHub' :
                             authUser.providerData[0]?.providerId || 'Unknown'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                          <span className="text-sm font-medium">Account Status</span>
                          <Badge variant="default">
                            Active
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    {/* Additional Firebase Info */}
                    <Separator />
                    <div className="pt-2">
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Contact Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 bg-muted/20 rounded-lg">
                          <span className="text-sm font-medium block">Email Address</span>
                          <span className="text-sm text-muted-foreground">{authUser.email || 'Not provided'}</span>
                        </div>
                        <div className="p-3 bg-muted/20 rounded-lg">
                          <span className="text-sm font-medium block">Display Name</span>
                          <span className="text-sm text-muted-foreground">{authUser.displayName || user.name || 'Not set'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Firebase Storage Info */}
                    <div className="pt-2">
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        Storage & Usage
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-3 bg-muted/20 rounded-lg text-center">
                          <div className="text-lg font-semibold text-primary">{user.stats.videosCreated || 0}</div>
                          <div className="text-sm text-muted-foreground">Videos Created</div>
                        </div>
                        <div className="p-3 bg-muted/20 rounded-lg text-center">
                          <div className="text-lg font-semibold text-secondary">{user.stats.totalViews || '0'}</div>
                          <div className="text-sm text-muted-foreground">Total Views</div>
                        </div>
                        <div className="p-3 bg-muted/20 rounded-lg text-center">
                          <div className="text-lg font-semibold text-accent">{user.stats.storageUsed || '0 MB'}</div>
                          <div className="text-sm text-muted-foreground">Storage Used</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "projects" && (
              <div className="space-y-6">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Video className="w-5 h-5" />
                        My Projects
                      </div>
                      <Button onClick={() => navigate("/editor")}>
                        <Upload className="w-4 h-4 mr-2" />
                        New Project
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {projectsLoading ? (
                      <div className="text-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                        <p className="text-muted-foreground">Loading your projects...</p>
                      </div>
                    ) : projects.length === 0 ? (
                      <div className="text-center py-12">
                        <Video className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Projects Yet</h3>
                        <p className="text-muted-foreground mb-4">
                          Start creating your first reel to see it here
                        </p>
                        <Button onClick={() => navigate("/editor")}>
                          <Upload className="w-4 h-4 mr-2" />
                          Create Your First Project
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {projects.map((project) => (
                          <div
                            key={project.id}
                            className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-muted/20 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-primary/20">
                                <Video className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <h4 className="font-medium">{project.name}</h4>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span>Created: {new Date(project.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                                  <span>Size: {project.size}</span>
                                  <span>Duration: {project.duration}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={project.status === "Completed" ? "default" : "secondary"}
                              >
                                {project.status}
                              </Badge>
                              <Button variant="ghost" size="icon">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon">
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDeleteProject(project.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="space-y-6">
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
                        <Label>Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive notifications about project updates
                        </p>
                      </div>
                      <Switch 
                        checked={notifications} 
                        onCheckedChange={(checked) => {
                          setNotifications(checked);
                          handleSaveSettings({ ...user.settings, notifications: checked });
                        }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Auto-sync Projects</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically sync projects to cloud storage
                        </p>
                      </div>
                      <Switch 
                        checked={autoSync} 
                        onCheckedChange={(checked) => {
                          setAutoSync(checked);
                          handleSaveSettings({ ...user.settings, autoSync: checked });
                        }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Dark Mode</Label>
                        <p className="text-sm text-muted-foreground">
                          Use dark theme for the interface
                        </p>
                      </div>
                      <Switch 
                        checked={darkMode} 
                        onCheckedChange={(checked) => {
                          setDarkMode(checked);
                          handleSaveSettings({ ...user.settings, darkMode: checked });
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Privacy & Security
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button variant="outline" className="w-full">
                      Change Password
                    </Button>
                    <Button variant="outline" className="w-full">
                      Two-Factor Authentication
                    </Button>
                    <Button variant="outline" className="w-full">
                      Privacy Settings
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "billing" && (
              <div className="space-y-6">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      Current Plan
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{user.plan} Plan</h3>
                        <p className="text-muted-foreground">
                          {user.plan === "Free" ? "Free forever" : "$29.99/month"}
                        </p>
                      </div>
                      <Badge variant={user.plan === "Free" ? "secondary" : "default"}>
                        {user.plan === "Free" ? "Free" : "Active"}
                      </Badge>
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span>Storage Used</span>
                        <span>{user.stats.storageUsed} / {user.stats.storageLimit}</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ 
                            width: user.plan === "Free" ? "0%" : "12%" 
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {user.plan === "Free" ? (
                        <Button>Upgrade to Pro</Button>
                      ) : (
                        <>
                          <Button variant="outline">Upgrade Plan</Button>
                          <Button variant="outline">Manage Subscription</Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>Billing History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {user.plan === "Free" ? (
                      <div className="text-center py-8">
                        <CreditCard className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Billing History</h3>
                        <p className="text-muted-foreground mb-4">
                          You're currently on the free plan. Upgrade to Pro to see billing history.
                        </p>
                        <Button>Upgrade to Pro</Button>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No billing history available yet.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Account;
