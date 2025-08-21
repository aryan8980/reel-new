import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Hash, Copy, Sparkles, TrendingUp, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateHashtags } from "@/lib/openai";

interface HashtagGroups {
  trending: string[];
  popular: string[];
}

const SECTIONS = ["trending", "popular"] as const;
type Section = typeof SECTIONS[number];

const HashtagGenerator = () => {
  const { toast } = useToast();
  const [description, setDescription] = useState("");
  const [activeTab, setActiveTab] = useState<Section>("trending");
  const [currentHashtags, setCurrentHashtags] = useState<HashtagGroups>({
    trending: [],
    popular: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerateHashtags = async () => {
    // Reset state
    setError("");
    setCurrentHashtags({ trending: [], popular: [] });
    
    if (!description.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a description of your video content",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('Calling generateHashtags with description:', description);
      const generatedHashtags = await generateHashtags(description);
      console.log('Received hashtags:', generatedHashtags);
      
      // Split hashtags into trending and popular
      const midPoint = Math.ceil(generatedHashtags.length / 2);
      const newHashtags = {
        trending: generatedHashtags.slice(0, midPoint),
        popular: generatedHashtags.slice(midPoint)
      };
      
      console.log('Setting hashtags:', newHashtags);
      setCurrentHashtags(newHashtags);
      
      toast({
        title: "Success!",
        description: `Generated ${generatedHashtags.length} hashtags`,
      });
      toast({
        title: "Success!",
        description: "Hashtags generated successfully",
      });
    } catch (err) {
      setError("Failed to generate hashtags. Please try again.");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate hashtags",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyHashtags = (hashtags: string[]) => {
    const text = hashtags.join(" ");
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${hashtags.length} hashtags copied to clipboard`,
    });
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hash className="w-5 h-5 text-accent" />
          AI Hashtag Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium">
            Video Description
          </label>
          <div className="flex gap-2">
            <Input
              id="description"
              placeholder="Describe your video content (e.g., 'Dance performance to latest pop song with urban style')"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={handleGenerateHashtags}
              disabled={isLoading || !description.trim()}
              className="btn-creative bg-gradient-to-r from-accent to-secondary hover:shadow-glow"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Generate
                </div>
              )}
            </Button>
          </div>
        </div>

        {error && (
          <div className="text-sm text-destructive">
            {error}
          </div>
        )}

        {(currentHashtags.trending.length > 0 || currentHashtags.popular.length > 0) && (
          <>
            <Tabs defaultValue="trending" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="trending" className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Trending
                </TabsTrigger>
                <TabsTrigger value="popular" className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Popular
                </TabsTrigger>
              </TabsList>

              <TabsContent value="trending" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-secondary" />
                    Trending Hashtags
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyHashtags(currentHashtags.trending)}
                    className="text-xs"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy All
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {currentHashtags.trending.map((hashtag, index) => (
                    <Badge
                      key={`trending-${index}`}
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary/20 transition-colors animate-glow-pulse"
                      onClick={() => {
                        navigator.clipboard.writeText(hashtag);
                        toast({
                          title: "Copied!",
                          description: `${hashtag} copied to clipboard`,
                        });
                      }}
                    >
                      {hashtag}
                    </Badge>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="popular" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-secondary" />
                    Popular Hashtags
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyHashtags(currentHashtags.popular)}
                    className="text-xs"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy All
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {currentHashtags.popular.map((hashtag, index) => (
                    <Badge
                      key={`popular-${index}`}
                      variant="outline"
                      className="cursor-pointer hover:bg-secondary/20 transition-colors"
                      onClick={() => {
                        navigator.clipboard.writeText(hashtag);
                        toast({
                          title: "Copied!",
                          description: `${hashtag} copied to clipboard`,
                        });
                      }}
                    >
                      {hashtag}
                    </Badge>
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            <div className="p-3 bg-muted/20 rounded-lg space-y-2">
              <h5 className="text-xs font-medium text-muted-foreground">Quick Actions</h5>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyHashtags([...currentHashtags.trending.slice(0, 5), ...currentHashtags.popular.slice(0, 5)])}
                  className="text-xs"
                >
                  Mix Top 10
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyHashtags(currentHashtags.trending.slice(0, 3))}
                  className="text-xs"
                >
                  Top 3 Trending
                </Button>
              </div>
            </div>

            <div className="mt-4 text-xs text-muted-foreground text-center p-2 bg-muted/10 rounded">
              💡 Tip: Click any hashtag to copy it individually, or use "Copy All" for the entire set
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default HashtagGenerator;