import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { HardDrive, AlertCircle, CheckCircle, ExternalLink, Copy } from "lucide-react";
import { testStorageConnection } from "@/lib/firebaseService";
import { useAuth } from "@/contexts/AuthContext";

const StorageSetup = () => {
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown');
  const { user } = useAuth();

  const testConnection = async () => {
    if (!user) {
      alert('Please sign in first');
      return;
    }

    setIsTestingConnection(true);
    try {
      const connected = await testStorageConnection();
      setConnectionStatus(connected ? 'connected' : 'failed');
    } catch (error) {
      console.error('Connection test error:', error);
      setConnectionStatus('failed');
    }
    setIsTestingConnection(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const storageRules = `rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/audio/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/videos/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}`;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Firebase Storage Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Test */}
          <div className="flex items-center gap-4">
            <Button 
              onClick={testConnection} 
              disabled={isTestingConnection || !user}
              variant="outline"
            >
              {isTestingConnection ? 'Testing...' : 'Test Storage Connection'}
            </Button>
            
            {connectionStatus === 'connected' && (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            )}
            
            {connectionStatus === 'failed' && (
              <Badge variant="destructive">
                <AlertCircle className="w-3 h-3 mr-1" />
                Failed
              </Badge>
            )}
          </div>

          {connectionStatus === 'failed' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Storage connection failed!</strong> Follow the setup steps below to enable Firebase Storage.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Setup Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h4 className="font-medium">Enable Firebase Storage</h4>
                <p className="text-sm text-muted-foreground">
                  Go to Firebase Console → Storage → Get started → Choose "Start in production mode"
                </p>
                <Button 
                  variant="link" 
                  className="p-0 h-auto"
                  onClick={() => window.open('https://console.firebase.google.com/project/reel-rush-221fd/storage', '_blank')}
                >
                  Open Firebase Console <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h4 className="font-medium">Update Security Rules</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Go to Storage → Rules and replace with these rules:
                </p>
                <div className="relative">
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                    <code>{storageRules}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(storageRules)}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h4 className="font-medium">Publish Rules</h4>
                <p className="text-sm text-muted-foreground">
                  Click "Publish" in the Firebase Console to apply the new security rules.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-bold">
                4
              </div>
              <div>
                <h4 className="font-medium">Test Connection</h4>
                <p className="text-sm text-muted-foreground">
                  Click "Test Storage Connection" above to verify everything is working.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="font-medium">Storage Bucket:</dt>
              <dd className="text-muted-foreground">reel-rush-221fd.firebasestorage.app</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium">User:</dt>
              <dd className="text-muted-foreground">{user?.email || 'Not signed in'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium">Max File Size:</dt>
              <dd className="text-muted-foreground">50MB per file</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
};

export default StorageSetup;
