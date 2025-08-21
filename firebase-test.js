// Firebase Configuration Test
// Run this in browser console to test Firebase connectivity

async function testFirebaseSetup() {
  console.log('🧪 Testing Firebase Setup...');
  
  try {
    // Test 1: Check if Firebase is initialized
    console.log('1️⃣ Testing Firebase initialization...');
    console.log('Auth ready:', auth.currentUser ? 'User logged in' : 'No user');
    console.log('Database:', db ? 'Initialized' : 'Not initialized');
    
    // Test 2: Check current user
    if (!auth.currentUser) {
      console.log('❌ No user authenticated. Please log in first.');
      return;
    }
    
    console.log('✅ User authenticated:', auth.currentUser.uid);
    
    // Test 3: Simple read test
    console.log('2️⃣ Testing Firestore read access...');
    const testDoc = doc(db, 'users', auth.currentUser.uid);
    const docSnap = await getDoc(testDoc);
    
    if (docSnap.exists()) {
      console.log('✅ Document exists and readable');
      console.log('Document data:', docSnap.data());
    } else {
      console.log('📄 Document does not exist (this is normal for new users)');
    }
    
    // Test 4: Write permission test
    console.log('3️⃣ Testing Firestore write access...');
    const testData = {
      testField: 'test-value',
      timestamp: new Date().toISOString(),
      uid: auth.currentUser.uid
    };
    
    await setDoc(testDoc, testData, { merge: true });
    console.log('✅ Write test successful');
    
    // Test 5: Read back the written data
    console.log('4️⃣ Verifying written data...');
    const verifySnap = await getDoc(testDoc);
    if (verifySnap.exists() && verifySnap.data().testField === 'test-value') {
      console.log('✅ Data verification successful');
      console.log('All Firebase tests passed! 🎉');
    } else {
      console.log('❌ Data verification failed');
    }
    
  } catch (error) {
    console.error('❌ Firebase test failed:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    // Common error explanations
    if (error.code === 'permission-denied') {
      console.log(`
🚨 PERMISSION DENIED ERROR
This means your Firestore security rules are blocking the operation.

SOLUTION: Add these rules to your Firestore Database:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow users to read/write their own projects
    match /projects/{projectId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
      `);
    } else if (error.code === 'unavailable') {
      console.log(`
🚨 SERVICE UNAVAILABLE ERROR
This could mean:
1. Firebase project doesn't exist or is disabled
2. Internet connection issues
3. Firebase services are down

SOLUTIONS:
1. Check if your Firebase project exists at: https://console.firebase.google.com/
2. Verify your internet connection
3. Check Firebase status at: https://status.firebase.google.com/
      `);
    }
  }
}

// Export for use
window.testFirebaseSetup = testFirebaseSetup;
console.log('Run: testFirebaseSetup() to test your Firebase setup');
