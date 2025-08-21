import { useState, useEffect } from 'react';
import { isFirebaseConnected, retryFirebaseConnection } from '../lib/firebase';
import { AlertTriangle, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';

export const ConnectionStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isFirebaseOnline, setIsFirebaseOnline] = useState(isFirebaseConnected());
  const [isRetrying, setIsRetrying] = useState(false);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsFirebaseOnline(isFirebaseConnected());
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsFirebaseOnline(false);
      setShowStatus(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check Firebase connection status periodically
    const checkFirebaseConnection = () => {
      const connected = isFirebaseConnected();
      setIsFirebaseOnline(connected);
      
      // Show status if there's a connectivity issue
      if (!connected && isOnline) {
        setShowStatus(true);
      } else if (connected && isOnline) {
        // Hide status after successful connection
        setTimeout(() => setShowStatus(false), 3000);
      }
    };

    const connectionCheckInterval = setInterval(checkFirebaseConnection, 10000); // Check every 10 seconds

    // Initial check
    checkFirebaseConnection();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(connectionCheckInterval);
    };
  }, [isOnline]);

  const handleRetryConnection = async () => {
    setIsRetrying(true);
    try {
      const success = await retryFirebaseConnection();
      if (success) {
        setIsFirebaseOnline(true);
        setShowStatus(false);
      }
    } catch (error) {
      console.error('Failed to retry connection:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  // Don't show anything if everything is working fine
  if (!showStatus && isOnline && isFirebaseOnline) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      {!isOnline && (
        <Alert className="bg-red-50 border-red-200">
          <WifiOff className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-700">
            You're offline. Some features may not work properly.
          </AlertDescription>
        </Alert>
      )}

      {isOnline && !isFirebaseOnline && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="text-yellow-700 flex items-center justify-between">
            <span>Connection issues detected. Using cached data.</span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRetryConnection}
              disabled={isRetrying}
              className="ml-2 h-6 text-xs"
            >
              {isRetrying ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <Wifi className="h-3 w-3 mr-1" />
                  Retry
                </>
              )}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isOnline && isFirebaseOnline && showStatus && (
        <Alert className="bg-green-50 border-green-200">
          <Wifi className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-700">
            Connection restored. All features are now available.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
