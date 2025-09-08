import { useState, useEffect } from 'react';
import { auth, storage, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, Upload } from 'lucide-react';

const FirebaseDebugPanel = () => {
  const [status, setStatus] = useState({
    auth: 'checking',
    storage: 'checking',
    firestore: 'checking',
    user: null as any
  });
  const [testResults, setTestResults] = useState<string[]>([]);

  useEffect(() => {
    // Test Auth
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setStatus(prev => ({
        ...prev,
        auth: 'connected',
        user: user ? { uid: user.uid, email: user.email } : null
      }));
    });

    // Test Firestore
    try {
      // Just checking if we can create a collection reference
      collection(db, 'test');
      setStatus(prev => ({ ...prev, firestore: 'connected' }));
    } catch (error) {
      setStatus(prev => ({ ...prev, firestore: 'error' }));
      console.error('Firestore error:', error);
    }

    // Test Storage (just connection, not upload)
    try {
      ref(storage, 'test');
      setStatus(prev => ({ ...prev, storage: 'connected' }));
    } catch (error) {
      setStatus(prev => ({ ...prev, storage: 'error' }));
      console.error('Storage error:', error);
    }

    return () => unsubscribe();
  }, []);

  const testFileUpload = async () => {
    if (!status.user) {
      setTestResults(prev => [...prev, '❌ No user logged in']);
      return;
    }

    try {
      setTestResults(prev => [...prev, '🧪 Starting upload test...']);
      
      // Create a small test file
      const testFile = new Blob(['test data'], { type: 'text/plain' });
      const fileName = `test-${Date.now()}.txt`;
      const storageRef = ref(storage, `uploads/${status.user.uid}/${fileName}`);
      
      setTestResults(prev => [...prev, '📤 Uploading test file...']);
      const snapshot = await uploadBytes(storageRef, testFile);
      
      setTestResults(prev => [...prev, '🔗 Getting download URL...']);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      setTestResults(prev => [...prev, '💾 Saving to Firestore...']);
      await addDoc(collection(db, 'test_uploads'), {
        fileName,
        downloadURL,
        userId: status.user.uid,
        timestamp: new Date()
      });
      
      setTestResults(prev => [...prev, '✅ Upload test successful!']);
      setTestResults(prev => [...prev, `📄 File URL: ${downloadURL}`]);
      
    } catch (error: any) {
      setTestResults(prev => [...prev, `❌ Upload test failed: ${error.message}`]);
      console.error('Upload test error:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Firebase Debug Panel
        </CardTitle>
        <CardDescription>
          Debug Firebase connectivity and upload functionality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            {getStatusIcon(status.auth)}
            <span className="font-medium">Auth</span>
            <Badge className={getStatusColor(status.auth)}>
              {status.auth}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            {getStatusIcon(status.storage)}
            <span className="font-medium">Storage</span>
            <Badge className={getStatusColor(status.storage)}>
              {status.storage}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            {getStatusIcon(status.firestore)}
            <span className="font-medium">Firestore</span>
            <Badge className={getStatusColor(status.firestore)}>
              {status.firestore}
            </Badge>
          </div>
        </div>

        {status.user && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm"><strong>User:</strong> {status.user.email}</p>
            <p className="text-sm"><strong>UID:</strong> {status.user.uid}</p>
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={testFileUpload} disabled={!status.user} className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Test File Upload
          </Button>
        </div>

        {testResults.length > 0 && (
          <div className="p-3 bg-black text-green-400 rounded-lg font-mono text-sm max-h-40 overflow-y-auto">
            {testResults.map((result, index) => (
              <div key={index}>{result}</div>
            ))}
          </div>
        )}

        <div className="text-sm text-gray-600">
          <p><strong>Environment:</strong> {window.location.hostname}</p>
          <p><strong>Firebase Project:</strong> reel-rush-221fd</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default FirebaseDebugPanel;
