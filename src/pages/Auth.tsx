import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Film, Music, Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const { user, loading, signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [error, setError] = useState("");

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !loading) {
      navigate("/editor");
    }
  }, [user, navigate, loading]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    try {
      await signIn(loginEmail, loginPassword);
      toast({
        title: "Welcome back!",
        description: "You have been successfully logged in.",
      });
      navigate("/editor");
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Login Failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    try {
      await signUp(signupEmail, signupPassword, signupName);
      toast({
        title: "Account Created!",
        description: "Welcome to ReelEditr! Your account has been created successfully.",
      });
      navigate("/editor");
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Sign Up Failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError("");
    
    try {
      await signInWithGoogle();
      toast({
        title: "Welcome!",
        description: "You have been successfully signed in with Google.",
      });
      navigate("/editor");
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Google Sign In Failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8 animate-slide-down">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="p-3 rounded-xl bg-gradient-primary shadow-glow">
              <Film className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              ReelEditr
            </h1>
          </div>
          <p className="text-muted-foreground">
            Create stunning videos with AI-powered editing
          </p>
        </div>

        {/* Auth Card */}
        <Card className="glass-card animate-scale-bounce">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Welcome
            </CardTitle>
            <CardDescription>
              Sign in or create an account to start editing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      className="bg-muted/50"
                      required
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      className="bg-muted/50"
                      required
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                    />
                  </div>
                  {error && (
                    <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded">
                      {error}
                    </div>
                  )}
                  <Button 
                    type="submit" 
                    className="w-full btn-creative bg-gradient-primary hover:shadow-glow"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Signing In...
                      </div>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or continue with
                      </span>
                    </div>
                  </div>
                  
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Google
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="Your name"
                      className="bg-muted/50"
                      required
                      value={signupName}
                      onChange={e => setSignupName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@email.com"
                      className="bg-muted/50"
                      required
                      value={signupEmail}
                      onChange={e => setSignupEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Choose a strong password"
                      className="bg-muted/50"
                      required
                      value={signupPassword}
                      onChange={e => setSignupPassword(e.target.value)}
                    />
                  </div>
                  {error && (
                    <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded">
                      {error}
                    </div>
                  )}
                  <Button 
                    type="submit" 
                    className="w-full btn-creative bg-gradient-primary hover:shadow-glow"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creating Account...
                      </div>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or continue with
                      </span>
                    </div>
                  </div>
                  
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Google
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-1">
              <Music className="w-4 h-4" />
              <span>Beat Detection</span>
            </div>
            <div className="flex items-center gap-1">
              <Film className="w-4 h-4" />
              <span>AI Editing</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
