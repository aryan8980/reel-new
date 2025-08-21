import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const FirebaseDebugger = () => {
  const { user } = useAuth();
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, message]);
    console.log(message);
  };

  const runFirebaseTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    try {
      addResult('🧪 Starting Firebase tests...');
      
      // Test 1: Authentication
      addResult('1️⃣ Testing authentication...');
      if (!user) {
        addResult('❌ No user authenticated');
        return;
      }
      addResult(`✅ User authenticated: ${user.uid}`);
      
      // Test 2: Document read
      addResult('2️⃣ Testing document read...');
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        addResult('✅ Document read successful');
        addResult(`📄 Document data: ${JSON.stringify(userSnap.data(), null, 2)}`);
      } else {
        addResult('📄 Document does not exist (normal for new users)');
      }
      
      // Test 3: Document write
      addResult('3️⃣ Testing document write...');
      const testData = {
        name: 'Test User',
        email: user.email || 'test@example.com',
        testTimestamp: serverTimestamp(),
        uid: user.uid
      };
      
      await setDoc(userRef, testData, { merge: true });
      addResult('✅ Document write successful');
      
      // Test 4: Verify write
      addResult('4️⃣ Verifying written data...');
      const verifySnap = await getDoc(userRef);
      if (verifySnap.exists()) {
        const data = verifySnap.data();
        if (data.name === 'Test User') {
          addResult('✅ Data verification successful');
          addResult('🎉 All Firebase tests passed!');
        } else {
          addResult('❌ Data verification failed - data mismatch');
        }
      } else {
        addResult('❌ Data verification failed - document not found');
      }
      
    } catch (error: any) {
      addResult(`❌ Firebase test failed: ${error.message}`);
      addResult(`Error code: ${error.code}`);
      
      if (error.code === 'permission-denied') {
        addResult('🚨 PERMISSION DENIED: Check your Firestore security rules');
        addResult('You need to add rules allowing authenticated users to access their own documents');
      } else if (error.code === 'unavailable') {
        addResult('🚨 SERVICE UNAVAILABLE: Check if Firestore is enabled in your Firebase project');
      } else if (error.code === 'failed-precondition') {
        addResult('🚨 FAILED PRECONDITION: Database may not be initialized properly');
      }
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Firebase Connection Debugger</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={runFirebaseTests} 
            disabled={isRunning || !user}
            className="w-full"
          >
            {isRunning ? 'Running Tests...' : 'Run Firebase Tests'}
          </Button>
        </div>
        
        {testResults.length > 0 && (
          <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
            {testResults.map((result, index) => (
              <div key={index} className="mb-1">
                {result}
              </div>
            ))}
          </div>
        )}
        
        <div className="text-sm text-muted-foreground">
          <p><strong>Current User:</strong> {user ? user.email : 'Not authenticated'}</p>
          <p><strong>Project ID:</strong> reel-rush-221fd</p>
          <p><strong>Auth Domain:</strong> reel-rush-221fd.firebaseapp.com</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default FirebaseDebugger;
