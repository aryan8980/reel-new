import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, XCircle, Wifi, WifiOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { testStorageConnection } from "@/lib/firebaseService";
import { auth, db, storage } from "@/lib/firebase";

interface DebugInfo {
  timestamp: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export const ProductionDebugPanel = () => {
  const { user } = useAuth();
  const [debugInfo, setDebugInfo] = useState<DebugInfo[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [storageConnected, setStorageConnected] = useState<boolean | null>(null);

  const addDebugInfo = (type: DebugInfo['type'], message: string) => {
    const info: DebugInfo = {
      timestamp: new Date().toLocaleTimeString(),
      type,
      message
    };
    setDebugInfo(prev => [info, ...prev.slice(0, 9)]); // Keep last 10 entries
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addDebugInfo('success', 'Network connection restored');
    };

    const handleOffline = () => {
      setIsOnline(false);
      addDebugInfo('error', 'Network connection lost');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const runDiagnostics = async () => {
    addDebugInfo('info', 'Running production diagnostics...');

    // Test 1: Environment
    addDebugInfo('info', `Environment: ${import.meta.env.MODE}`);
    addDebugInfo('info', `Location: ${window.location.origin}`);
    
    // Test 2: Authentication
    if (user) {
      addDebugInfo('success', `User authenticated: ${user.email}`);
      addDebugInfo('info', `User ID: ${user.uid}`);
    } else {
      addDebugInfo('error', 'User not authenticated');
      return;
    }

    // Test 3: Firebase Config
    try {
      const authConfig = auth.app.options;
      addDebugInfo('success', `Firebase project: ${authConfig.projectId}`);
      addDebugInfo('success', `Storage bucket: ${storage.app.options.storageBucket}`);
    } catch (error) {
      addDebugInfo('error', `Firebase config error: ${error.message}`);
    }

    // Test 4: Storage Connection
    try {
      const storageTest = await testStorageConnection();
      setStorageConnected(storageTest);
      addDebugInfo(storageTest ? 'success' : 'error', 
        `Storage connection: ${storageTest ? 'OK' : 'Failed'}`);
    } catch (error) {
      setStorageConnected(false);
      addDebugInfo('error', `Storage test failed: ${error.message}`);
    }

    // Test 5: CORS Headers
    try {
      const headers = document.querySelector('meta[http-equiv="Cross-Origin-Embedder-Policy"]');
      addDebugInfo(headers ? 'success' : 'warning', 
        `CORS COEP header: ${headers ? 'Present' : 'Missing'}`);
    } catch (error) {
      addDebugInfo('warning', 'Could not check CORS headers');
    }

    // Test 6: File API Support
    const fileApiSupported = window.File && window.FileReader && window.FileList;
    addDebugInfo(fileApiSupported ? 'success' : 'error', 
      `File API support: ${fileApiSupported ? 'Yes' : 'No'}`);
  };

  const testFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        addDebugInfo('info', `Test file selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`);
        addDebugInfo('info', `File type: ${file.type}`);
        addDebugInfo('success', 'File selection working correctly');
      }
    };
    input.click();
  };

  const getStatusIcon = (type: DebugInfo['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <div className="h-4 w-4 rounded-full bg-blue-500" />;
    }
  };

  if (!user) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="text-yellow-800">⚠️ Debug Panel</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-yellow-700">Please sign in to access debug tools</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔧 Production Debug Panel
          <Badge variant={isOnline ? "default" : "destructive"} className="ml-auto">
            {isOnline ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={runDiagnostics} size="sm" variant="outline">
            Run Diagnostics
          </Button>
          <Button onClick={testFileUpload} size="sm" variant="outline">
            Test File Selection
          </Button>
          <Button onClick={() => setDebugInfo([])} size="sm" variant="ghost">
            Clear Log
          </Button>
        </div>

        {storageConnected !== null && (
          <div className={`p-2 rounded text-sm ${
            storageConnected 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            Storage Status: {storageConnected ? '✅ Connected' : '❌ Connection Failed'}
          </div>
        )}

        <div className="max-h-64 overflow-y-auto space-y-2">
          {debugInfo.length === 0 ? (
            <p className="text-gray-500 text-sm">Click "Run Diagnostics" to start debugging</p>
          ) : (
            debugInfo.map((info, index) => (
              <div key={index} className="flex items-start gap-2 text-sm p-2 rounded bg-white border">
                {getStatusIcon(info.type)}
                <div className="flex-1">
                  <span className="text-gray-500 text-xs">[{info.timestamp}]</span>
                  <div className="font-mono text-xs mt-1">{info.message}</div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="text-xs text-gray-600 space-y-1">
          <div><strong>Environment:</strong> {import.meta.env.MODE}</div>
          <div><strong>Origin:</strong> {window.location.origin}</div>
          <div><strong>User Agent:</strong> {navigator.userAgent.slice(0, 60)}...</div>
        </div>
      </CardContent>
    </Card>
  );
};
