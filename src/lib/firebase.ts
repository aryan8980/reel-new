import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, enableNetwork, disableNetwork } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCFES72xBjelhfWwK4WIP9UVQMBH91ylkU",
  authDomain: "reel-rush-221fd.firebaseapp.com",
  projectId: "reel-rush-221fd",
  storageBucket: "reel-rush-221fd.firebasestorage.app", // Alternative format
  messagingSenderId: "411692873627",
  appId: "1:411692873627:web:0e793f30f6215e506ad33e",
  measurementId: "G-KH42LLLX89"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
const auth = getAuth(app);

// Initialize Firestore with offline support
const db = getFirestore(app);

// Initialize Storage
const storage = getStorage(app);

// Test Storage connection
const testStorageConnection = async () => {
  try {
    console.log('🔥 Testing Firebase Storage connection...');
    console.log('Storage bucket:', storage.app.options.storageBucket);
    console.log('✅ Storage initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Storage initialization error:', error);
    return false;
  }
};

// Run test on initialization
testStorageConnection();

// Connection management
let isNetworkEnabled = true;

// Handle network status changes
const handleNetworkChange = () => {
  if (navigator.onLine && !isNetworkEnabled) {
    console.log('🟢 Network restored, enabling Firestore');
    enableNetwork(db)
      .then(() => {
        isNetworkEnabled = true;
        console.log('✅ Firestore network enabled');
      })
      .catch((error) => {
        console.warn('⚠️ Failed to enable Firestore network:', error);
      });
  } else if (!navigator.onLine && isNetworkEnabled) {
    console.log('🔴 Network lost, disabling Firestore');
    disableNetwork(db)
      .then(() => {
        isNetworkEnabled = false;
        console.log('✅ Firestore network disabled - using cache only');
      })
      .catch((error) => {
        console.warn('⚠️ Failed to disable Firestore network:', error);
      });
  }
};

// Add network event listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', handleNetworkChange);
  window.addEventListener('offline', handleNetworkChange);
}

// Initial network check
if (!navigator.onLine) {
  disableNetwork(db).catch((error) => {
    console.warn('⚠️ Could not disable Firestore network on init:', error);
  });
  isNetworkEnabled = false;
}

// Enable network connectivity logs
if (import.meta.env.DEV) {
  console.log('🔥 Firebase initialized in development mode');
  console.log('📡 Auth domain:', firebaseConfig.authDomain);
  console.log('🗄️ Project ID:', firebaseConfig.projectId);
  console.log('🌐 Network status:', navigator.onLine ? 'Online' : 'Offline');
  
  // Conservative connectivity test
  setTimeout(async () => {
    try {
      console.log('🔍 Testing Firebase Auth connectivity...');
      await auth.authStateReady;
      console.log('✅ Firebase Auth is ready');
      
      // Skip aggressive Firestore testing that causes errors
      if (navigator.onLine && isNetworkEnabled) {
        console.log('✅ Firestore network is enabled and ready');
      } else {
        console.log('📦 Firestore is in offline mode - will use cache');
      }
      
    } catch (error: any) {
      console.warn('⚠️ Firebase connectivity issue:', error.message);
      console.log('📦 Application will gracefully handle offline scenarios');
    }
  }, 2000);
}

// Export connection utilities
export const isFirebaseConnected = (): boolean => {
  return navigator.onLine && isNetworkEnabled;
};

export const retryFirebaseConnection = async (): Promise<boolean> => {
  if (!navigator.onLine) {
    console.log('� Cannot retry - device is offline');
    return false;
  }
  
  try {
    if (!isNetworkEnabled) {
      await enableNetwork(db);
      isNetworkEnabled = true;
      console.log('✅ Firebase connection restored');
      return true;
    }
    return true;
  } catch (error) {
    console.error('❌ Failed to restore Firebase connection:', error);
    return false;
  }
};

export { app, auth, db, storage };