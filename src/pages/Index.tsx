import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { 
  Wand2, 
  Music, 
  Video, 
  Zap, 
  Sparkles, 
  ArrowRight,
  Play,
  TrendingUp,
  Hash,
  LogOut,
  User,
  X,
  ExternalLink,
  Clock,
  Eye,
  Heart
} from "lucide-react";

const Index = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showExamples, setShowExamples] = useState(false);

  const handleGetStarted = () => {
    if (user) {
      navigate("/editor");
    } else {
      navigate("/auth");
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      window.location.reload(); // Force a refresh to clear any cached state
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Example videos and use cases
  const examples = [
    {
      id: 1,
      title: "Dance Challenge Reel",
      description: "Perfect beat sync for viral dance moves with smooth transitions",
      thumbnail: "/api/placeholder/300/200",
      duration: "0:15",
      views: "2.4M",
      likes: "156K",
      category: "Dance",
      features: ["Beat Detection", "Auto-Sync", "Smooth Transitions"],
      difficulty: "Easy"
    },
    {
      id: 2,
      title: "Product Showcase",
      description: "Dynamic product reveals synced to music beats for maximum impact",
      thumbnail: "/api/placeholder/300/200",
      duration: "0:30",
      views: "890K",
      likes: "67K",
      category: "Business",
      features: ["Quick Cuts", "Beat Timing", "Professional Look"],
      difficulty: "Medium"
    },
    {
      id: 3,
      title: "Travel Montage",
      description: "Epic travel moments perfectly timed to cinematic soundtrack",
      thumbnail: "/api/placeholder/300/200",
      duration: "0:45",
      views: "1.2M",
      likes: "98K",
      category: "Travel",
      features: ["Scene Transitions", "Music Sync", "Cinematic Flow"],
      difficulty: "Medium"
    },
    {
      id: 4,
      title: "Food Preparation",
      description: "Cooking steps synced to upbeat music - recipe meets rhythm",
      thumbnail: "/api/placeholder/300/200",
      duration: "0:20",
      views: "650K",
      likes: "45K",
      category: "Food",
      features: ["Step-by-Step", "Beat Matching", "Appetite Appeal"],
      difficulty: "Easy"
    },
    {
      id: 5,
      title: "Workout Motivation",
      description: "High-energy fitness routine with perfect timing to pump you up",
      thumbnail: "/api/placeholder/300/200",
      duration: "0:25",
      views: "1.8M",
      likes: "234K",
      category: "Fitness",
      features: ["Energy Boost", "Rhythm Sync", "Motivation Factor"],
      difficulty: "Easy"
    },
    {
      id: 6,
      title: "Art Process Timelapse",
      description: "Time-lapse art creation with musical storytelling and reveals",
      thumbnail: "/api/placeholder/300/200",
      duration: "0:35",
      views: "420K",
      likes: "89K",
      category: "Art",
      features: ["Time-lapse", "Creative Flow", "Artistic Rhythm"],
      difficulty: "Medium"
    },
    {
      id: 7,
      title: "Before & After",
      description: "Transformation reveal synced to dramatic music drop",
      thumbnail: "/api/placeholder/300/200",
      duration: "0:12",
      views: "3.1M",
      likes: "287K",
      category: "Lifestyle",
      features: ["Reveal Effect", "Music Drop", "Impact Timing"],
      difficulty: "Easy"
    },
    {
      id: 8,
      title: "Tech Review",
      description: "Product features showcased with dynamic beat-synced editing",
      thumbnail: "/api/placeholder/300/200",
      duration: "0:40",
      views: "756K",
      likes: "123K",
      category: "Tech",
      features: ["Feature Highlights", "Dynamic Cuts", "Info Graphics"],
      difficulty: "Hard"
    }
  ];

  const categories = ["All", "Dance", "Business", "Travel", "Food", "Fitness", "Art", "Lifestyle", "Tech"];
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredExamples = selectedCategory === "All" 
    ? examples 
    : examples.filter(example => example.category === selectedCategory);
  
  const features = [
    {
      icon: <Music className="w-6 h-6" />,
      title: "Audio Beat Detection",
      description: "Upload your audio and tap to mark beat points with precision"
    },
    {
      icon: <Video className="w-6 h-6" />,
      title: "Smart Video Trimming",
      description: "Automatically trim video clips at your marked beat points"
    },
    {
      icon: <Wand2 className="w-6 h-6" />,
      title: "AI-Powered Merging",
      description: "Seamlessly merge video clips with your audio track"
    },
    {
      icon: <Hash className="w-6 h-6" />,
      title: "Trending Hashtags",
      description: "Get trending hashtags by category to boost your reach"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      {user && (
        <header className="p-4 border-b border-border/50">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5" />
              <span>Welcome, {user.displayName || user.email}</span>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => navigate("/account")}
              >
                Account
              </Button>
              <Button 
                variant="outline" 
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </header>
      )}
      
      {/* Hero Section */}
      <section className="px-4 pt-20 pb-16">
        <div className="max-w-6xl mx-auto text-center">
          {/* Hero Header */}
          <div className="animate-slide-down">
            <Badge 
              variant="outline" 
              className="mb-4 px-4 py-1 bg-primary/10 text-primary border-primary/20"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Aryan-Powered Video Editing
            </Badge>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
              Create Viral Reels
              <br />
              <span className="text-foreground">Beat by Beat</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Upload your audio, mark the beats, and let ReelEditr automatically create perfectly synced video content that goes viral.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-scale-bounce">
            <Button 
              size="lg"
              className="btn-creative bg-gradient-primary hover:shadow-glow text-lg px-8 py-6"
              onClick={() => window.location.href = "/auth"}
            >
              <Play className="w-5 h-5 mr-2" />
              Start Creating
            </Button>
            
            <Button 
              variant="outline" 
              size="lg"
              className="glass-card text-lg px-8 py-6"
              onClick={() => setShowExamples(true)}
            >
              <TrendingUp className="w-5 h-5 mr-2" />
              See Examples
            </Button>
          </div>

          {/* Feature Preview */}
          <div className="relative animate-float">
            <div className="glass-card p-8 max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-primary/20">
                    <Music className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Upload Audio</h3>
                    <p className="text-sm text-muted-foreground">Any format supported</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-secondary/20">
                    <Zap className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Mark Beats</h3>
                    <p className="text-sm text-muted-foreground">Tap to sync perfectly</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-accent/20">
                    <Video className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Export Reel</h3>
                    <p className="text-sm text-muted-foreground">Ready for social media</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-16 bg-card/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to Create
            </h2>
            <p className="text-xl text-muted-foreground">
              Professional video editing tools designed for creators
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="glass-card hover:shadow-float transition-all duration-300 group">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-gradient-primary/20 group-hover:bg-gradient-primary/30 transition-colors">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <Card className="glass-card bg-gradient-card">
            <CardContent className="p-12">
              <div className="animate-glow-pulse">
                <Wand2 className="w-16 h-16 text-primary mx-auto mb-6" />
              </div>
              
              <h2 className="text-3xl font-bold mb-4">
                Ready to Create Your First Reel?
              </h2>
              
              <p className="text-xl text-muted-foreground mb-8">
                Join thousands of creators using ReelEditr to make viral content
              </p>
              
              <Button 
                size="lg"
                className="btn-creative bg-gradient-primary hover:shadow-glow text-lg px-8 py-6"
                onClick={handleGetStarted}
              >
                {user ? "Go to Editor" : "Get Started Free"}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 border-t border-border/50">
        <div className="max-w-6xl mx-auto text-center text-muted-foreground">
          <p>&copy; 2024 ReelEditr. Made by Aryan for creators.</p>
        </div>
      </footer>

      {/* Examples Modal */}
      <Dialog open={showExamples} onOpenChange={setShowExamples}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-primary" />
              Viral Reel Examples
            </DialogTitle>
            <p className="text-muted-foreground">
              See what you can create with ReelEditr - perfect beat sync for maximum engagement!
            </p>
          </DialogHeader>
          
          {/* Category Filters */}
          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="h-8"
              >
                {category}
              </Button>
            ))}
          </div>

          {/* Examples Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExamples.map((example) => (
              <Card key={example.id} className="glass-card overflow-hidden hover:shadow-lg transition-all duration-300 group">
                <div className="relative">
                  {/* Thumbnail */}
                  <div className="aspect-video bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center relative overflow-hidden">
                    {/* Animated background pattern */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary animate-pulse" />
                      <div 
                        className="absolute inset-0 bg-gradient-to-br from-transparent via-white/20 to-transparent"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                        }}
                      />
                    </div>
                    
                    {/* Play button */}
                    <div className="relative z-10 bg-black/30 rounded-full p-4 group-hover:bg-black/50 transition-colors duration-300 backdrop-blur-sm">
                      <Play className="w-8 h-8 text-white group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    
                    {/* Category-specific visual elements */}
                    {example.category === 'Dance' && (
                      <div className="absolute bottom-2 left-2 flex space-x-1">
                        <div className="w-2 h-8 bg-primary/40 rounded animate-pulse" style={{animationDelay: '0ms'}} />
                        <div className="w-2 h-12 bg-primary/60 rounded animate-pulse" style={{animationDelay: '200ms'}} />
                        <div className="w-2 h-6 bg-primary/40 rounded animate-pulse" style={{animationDelay: '400ms'}} />
                        <div className="w-2 h-10 bg-primary/60 rounded animate-pulse" style={{animationDelay: '600ms'}} />
                      </div>
                    )}
                    
                    {example.category === 'Business' && (
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-20">
                        <TrendingUp className="w-16 h-16 text-white" />
                      </div>
                    )}
                    
                    {example.category === 'Food' && (
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-20">
                        <Sparkles className="w-16 h-16 text-white" />
                      </div>
                    )}
                    
                    {example.category === 'Lifestyle' && (
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-20">
                        <Heart className="w-16 h-16 text-white" />
                      </div>
                    )}
                    
                    {example.category === 'Tech' && (
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-20">
                        <Zap className="w-16 h-16 text-white" />
                      </div>
                    )}
                    
                    {/* Duration Badge */}
                    <Badge className="absolute top-2 right-2 bg-black/50 text-white">
                      {example.duration}
                    </Badge>
                    
                    {/* Category Badge */}
                    <Badge variant="secondary" className="absolute top-2 left-2">
                      {example.category}
                    </Badge>
                    
                    {/* Difficulty Badge */}
                    <Badge 
                      variant={example.difficulty === 'Easy' ? 'default' : 
                               example.difficulty === 'Medium' ? 'secondary' : 'destructive'} 
                      className="absolute bottom-2 right-2 text-xs"
                    >
                      {example.difficulty}
                    </Badge>
                  </div>
                  
                  {/* Content */}
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-2">{example.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{example.description}</p>
                    
                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {example.views}
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        {example.likes}
                      </div>
                    </div>
                    
                    {/* Features */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {example.features.map((feature, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                    
                    {/* Action Button */}
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={() => {
                        setShowExamples(false);
                        handleGetStarted();
                      }}
                    >
                      <Wand2 className="w-4 h-4 mr-2" />
                      Create Similar
                    </Button>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>

          {/* CTA Section */}
          <div className="mt-8 p-6 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg text-center">
            <h3 className="text-xl font-semibold mb-2">Ready to Create Your Own?</h3>
            <p className="text-muted-foreground mb-4">
              Join thousands of creators making viral content with perfect beat sync
            </p>
            <div className="flex gap-3 justify-center">
              <Button 
                onClick={() => {
                  setShowExamples(false);
                  handleGetStarted();
                }}
                className="bg-gradient-primary"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Creating Now
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.open('https://youtube.com/watch?v=demoVideo', '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Watch Tutorial
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
