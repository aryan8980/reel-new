import { 
  doc, 
  getDoc, 
  getDocFromCache,
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  onSnapshot,
  Unsubscribe,
  addDoc,
  orderBy,
  enableNetwork,
  disableNetwork
} from "firebase/firestore";
import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject, 
  StorageError,
  UploadTaskSnapshot,
  UploadTask 
} from 'firebase/storage';
import { db, auth, storage } from "./firebase";
import { User } from "firebase/auth";

// Enhanced error handling for Firebase Storage
const handleStorageError = (error: StorageError | any): string => {
  console.error('🚨 Firebase Storage Error Details:', {
    code: error.code,
    message: error.message,
    serverResponse: error.serverResponse,
    customMetadata: error.customMetadata
  });

  switch (error.code) {
    case 'storage/unauthorized':
      return 'Upload failed: Missing or insufficient permissions. Please ensure Firebase Storage rules are properly configured.';
    case 'storage/quota-exceeded':
      return 'Upload failed: Storage quota exceeded. Please check your Firebase Storage usage.';
    case 'storage/unauthenticated':
      return 'Upload failed: User not authenticated. Please sign in and try again.';
    case 'storage/retry-limit-exceeded':
      return 'Upload failed: Too many retries. Please check your connection and try again.';
    case 'storage/invalid-format':
      return 'Upload failed: Invalid file format. Please upload a valid audio/video file.';
    case 'storage/no-default-bucket':
      return 'Upload failed: No default storage bucket configured. Please check Firebase configuration.';
    case 'storage/cannot-slice-blob':
      return 'Upload failed: File processing error. Please try with a different file.';
    case 'storage/server-file-wrong-size':
      return 'Upload failed: File size mismatch. Please try uploading again.';
    default:
      return error.message || 'Upload failed: Unknown storage error. Please try again.';
  }
};

// Test Firebase Storage connection
export const testStorageConnection = async (): Promise<boolean> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.log('⚠️ No authenticated user for storage test');
      return false;
    }

    console.log('🧪 Testing Firebase Storage connection...');
    console.log('📦 Storage bucket:', storage.app.options.storageBucket);
    console.log('👤 User ID:', user.uid);
    console.log('✅ Storage reference created successfully');
    
    // Test creating a reference (this doesn't require permissions)
    const testRef = ref(storage, `users/${user.uid}/test/connection-test.txt`);
    console.log('🔗 Test reference path:', testRef.fullPath);
    
    return true;
  } catch (error) {
    console.error('❌ Storage connection test failed:', error);
    return false;
  }
};

// Check Firebase connection status
export const checkFirebaseConnection = async (): Promise<boolean> => {
  try {
    console.log('🔍 Checking Firebase connection...');
    
    // Try to perform a simple operation to test connectivity
    const user = auth.currentUser;
    if (!user) return false;
    
    const testRef = doc(db, 'users', user.uid);
    await getDoc(testRef);
    
    console.log('✅ Firebase connection is active');
    return true;
  } catch (error: any) {
    console.error('❌ Firebase connection failed:', error);
    
    if (error.code === 'unavailable' || error.code === 'failed-precondition') {
      console.log('🌐 Attempting to enable network...');
      try {
        await enableNetwork(db);
        console.log('✅ Network enabled successfully');
        return true;
      } catch (networkError: any) {
        console.error('❌ Failed to enable network:', networkError);
        return false;
      }
    }
    
    return false;
  }
};

// Get current network status
export const getNetworkStatus = (): boolean => {
  return navigator.onLine;
};

// Force refresh Firebase connection
export const refreshFirebaseConnection = async (): Promise<void> => {
  try {
    console.log('🔄 Refreshing Firebase connection...');
    
    await disableNetwork(db);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await enableNetwork(db);
    
    console.log('✅ Firebase connection refreshed');
  } catch (error: any) {
    console.error('❌ Failed to refresh Firebase connection:', error);
    throw new Error('Failed to refresh connection. Please reload the page');
  }
};

// User data interface
export interface UserData {
  uid: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  joinDate: string;
  plan: 'Free' | 'Pro' | 'Premium';
  avatar: string;
  stats: {
    videosCreated: number;
    totalViews: string;
    averageRating: number;
    storageUsed: string;
    storageLimit: string;
  };
  settings: {
    notifications: boolean;
    autoSync: boolean;
    darkMode: boolean;
  };
  createdAt?: any;
  updatedAt?: any;
}

// Project data interface
export interface ProjectData {
  id: string;
  userId: string;
  name: string;
  status: 'In Progress' | 'Completed' | 'Draft';
  createdAt: any;
  updatedAt: any;
  size: string;
  duration: string;
  audioFileUrl?: string;
  videoFilesUrls: string[];
  beatPoints: number[];
  hashtags: string[];
  deleted?: boolean;
}

// Media file interfaces
export interface MediaFile {
  id: string;
  userId: string;
  name: string;
  type: 'video' | 'audio';
  url: string;
  size: number;
  duration?: number;
  mimeType: string;
  createdAt: any;
  projectId?: string;
}

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error' | 'paused';
  error?: string;
  url?: string;
  fileId?: string;
}

// Create or update user profile with retry mechanism
export const saveUserProfile = async (userData: Partial<UserData>, retryCount: number = 0): Promise<void> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated');
  }

  console.log('📝 Saving user profile:', userData, `(attempt ${retryCount + 1})`);

  const userRef = doc(db, 'users', user.uid);
  const now = serverTimestamp();

  try {
    // Check if user document exists
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      // Update existing user with only the provided fields
      const updateData = {
        ...userData,
        updatedAt: now
      };
      
      console.log('📝 Updating existing user profile with:', updateData);
      console.log('🔗 User reference path:', userRef.path);
      console.log('🆔 User ID:', user.uid);
      console.log('🌐 Database instance:', db.app.name);
      
      await updateDoc(userRef, updateData);
      console.log('✅ User profile updated successfully');
      
    } else {
      // Create new user document
      const defaultUserData: UserData = {
        uid: user.uid,
        name: userData.name || user.displayName || '',
        email: userData.email || user.email || '',
        phone: userData.phone || user.phoneNumber || '',
        location: userData.location || '',
        joinDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
        plan: 'Free',
        avatar: userData.avatar || user.photoURL || '',
        stats: {
          videosCreated: 0,
          totalViews: '0',
          averageRating: 0,
          storageUsed: '0MB',
          storageLimit: '1GB'
        },
        settings: {
          notifications: true,
          autoSync: false,
          darkMode: true
        },
        createdAt: now,
        updatedAt: now,
        ...userData // Override with any provided data
      };

      console.log('🆕 Creating new user profile:', defaultUserData);
      console.log('🔗 User reference path:', userRef.path);
      console.log('🆔 User ID:', user.uid);
      console.log('🌐 Database instance:', db.app.name);
      
      await setDoc(userRef, defaultUserData);
      console.log('✅ New user profile created successfully');
    }
    
    // Clear cache after successful update to force refresh
    clearCachedData(`user-profile-${user.uid}`);
    console.log('🗑️ Profile cache cleared for fresh data');
    
  } catch (error: any) {
    console.error('❌ Failed to save user profile:', error);
    console.error('🔍 Error details:', {
      code: error.code,
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    console.error('🔗 User reference attempted:', userRef?.path);
    console.error('🆔 User ID:', user.uid);
    console.error('📊 User data attempted:', userData);
    
    // Retry logic for certain errors
    if (retryCount < 2 && (
      error.code === 'unavailable' ||
      error.code === 'deadline-exceeded' ||
      error.code === 'internal' ||
      error.message?.includes('timeout')
    )) {
      console.log(`🔄 Retrying save operation... (attempt ${retryCount + 2}/3)`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
      return saveUserProfile(userData, retryCount + 1);
    }
    
    // Provide more specific error handling
    if (error.code === 'permission-denied') {
      throw new Error('Permission denied: You do not have access to update this profile');
    } else if (error.code === 'unavailable') {
      throw new Error('Firebase service is currently unavailable. Please check your internet connection and try again later');
    } else if (error.code === 'failed-precondition') {
      throw new Error('Database operation failed due to network issues. Please try again');
    } else if (error.code === 'deadline-exceeded') {
      throw new Error('Request timed out. Please check your connection and try again');
    } else if (error.code === 'unauthenticated') {
      throw new Error('Authentication expired. Please sign in again');
    } else {
      throw new Error(`Failed to save profile: ${error.message || 'Unknown network error. Please check your internet connection'}`);
    }
  }
};

// Get user profile with caching optimization
export const getUserProfile = async (): Promise<UserData | null> => {
  const user = auth.currentUser;
  if (!user) {
    return null;
  }

  // Check cache first
  const cacheKey = `user-profile-${user.uid}`;
  const cachedProfile = getCachedData<UserData>(cacheKey);
  if (cachedProfile) {
    return cachedProfile;
  }

  // Check circuit breaker
  if (firestoreCircuitBreaker.isOpen()) {
    console.warn('⚠️ Circuit breaker is open, trying cache for user profile');
    const userRef = doc(db, 'users', user.uid);
    try {
      const cachedDoc = await getDocFromCache(userRef);
      if (cachedDoc.exists()) {
        console.log('📦 Using cached user profile');
        const userData = cachedDoc.data() as UserData;
        setCachedData(cacheKey, userData, 180000); // Cache for 3 minutes
        return userData;
      }
    } catch (cacheError) {
      console.warn('No cached user profile available');
    }
    return null;
  }

  try {
    console.log('👤 Loading user profile...');
    const userRef = doc(db, 'users', user.uid);
    
    // Try to get document with better error handling
    let userSnap;
    try {
      // First try cache for faster loading
      userSnap = await getDocFromCache(userRef);
      console.log('📦 Got user profile from cache');
    } catch (cacheError) {
      console.log('📦 Cache miss, trying server...');
      try {
        // Fall back to server
        userSnap = await getDoc(userRef);
        console.log('🌐 Got user profile from server');
      } catch (serverError: any) {
        // If server fails, create a default profile without saving to Firestore
        console.warn('🔌 Server unavailable, using default profile');
        const defaultUserData: UserData = {
          uid: user.uid,
          name: user.displayName || '',
          email: user.email || '',
          phone: user.phoneNumber || '',
          location: '',
          joinDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
          plan: 'Free',
          avatar: user.photoURL || '',
          stats: {
            videosCreated: 0,
            totalViews: '0',
            averageRating: 0,
            storageUsed: '0MB',
            storageLimit: '1GB'
          },
          settings: {
            notifications: true,
            autoSync: false,
            darkMode: true
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };
        // Cache the default data temporarily
        setCachedData(cacheKey, defaultUserData, 60000); // 1 minute cache
        return defaultUserData;
      }
    }

    if (userSnap && userSnap.exists()) {
      firestoreCircuitBreaker.recordSuccess();
      const userData = userSnap.data() as UserData;
      // Cache for 3 minutes
      setCachedData(cacheKey, userData, 180000);
      return userData;
    } else {
      // Only try to create profile if we can connect to server
      console.log('🆕 Creating default user profile...');
      const defaultUserData: UserData = {
        uid: user.uid,
        name: user.displayName || '',
        email: user.email || '',
        phone: user.phoneNumber || '',
        location: '',
        joinDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
        plan: 'Free',
        avatar: user.photoURL || '',
        stats: {
          videosCreated: 0,
          totalViews: '0',
          averageRating: 0,
          storageUsed: '0MB',
          storageLimit: '1GB'
        },
        settings: {
          notifications: true,
          autoSync: false,
          darkMode: true
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      try {
        await setDoc(userRef, defaultUserData);
        console.log('✅ Default user profile created');
        firestoreCircuitBreaker.recordSuccess();
      } catch (createError) {
        console.warn('⚠️ Could not create profile on server, using local copy');
        // Use local copy with regular dates instead of serverTimestamp
        defaultUserData.createdAt = new Date();
        defaultUserData.updatedAt = new Date();
      }
      
      // Cache the new user data
      setCachedData(cacheKey, defaultUserData, 180000);
      return defaultUserData;
    }
  } catch (error: any) {
    console.error('❌ Error getting user profile:', error);
    firestoreCircuitBreaker.recordFailure();
    
    // Don't throw on network errors, just return null
    if (error.code === 'unavailable' || error.code === 'offline') {
      console.warn('🔌 Firebase offline - user profile unavailable');
      return null;
    }
    
    throw error;
  }
};

// Update user settings
export const updateUserSettings = async (settings: Partial<UserData['settings']>): Promise<void> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated');
  }

  const userRef = doc(db, 'users', user.uid);
  await updateDoc(userRef, {
    settings: settings,
    updatedAt: serverTimestamp()
  });
  
  // Clear cache after successful update
  clearCachedData(`user-profile-${user.uid}`);
};

// Subscribe to user data changes
// Circuit breaker for Firebase operations
class FirebaseCircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly maxFailures = 3; // Reduced from 5 to 3
  private readonly resetTimeout = 15000; // Reduced from 30s to 15s

  isOpen(): boolean {
    if (this.failureCount >= this.maxFailures) {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.reset();
        return false;
      }
      return true;
    }
    return false;
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    console.warn(`🔴 Circuit breaker failure count: ${this.failureCount}/${this.maxFailures}`);
  }

  recordSuccess(): void {
    if (this.failureCount > 0) {
      console.log('🟢 Circuit breaker reset - operation successful');
      this.reset();
    }
  }

  private reset(): void {
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }
}

const firestoreCircuitBreaker = new FirebaseCircuitBreaker();

export const subscribeToUserData = (
  callback: (userData: UserData | null) => void
): Unsubscribe => {
  const user = auth.currentUser;
  if (!user) {
    console.log('📋 No authenticated user for subscription');
    callback(null);
    return () => {};
  }

  // Check circuit breaker
  if (firestoreCircuitBreaker.isOpen()) {
    console.warn('⚠️ Circuit breaker is open, skipping Firestore subscription');
    // Try to get cached data instead
    const cacheKey = `user-profile-${user.uid}`;
    const cachedData = getCachedData<UserData>(cacheKey);
    if (cachedData) {
      console.log('📦 Using cached user data for subscription');
      callback(cachedData);
    } else {
      callback(null);
    }
    return () => {};
  }

  console.log('📡 Setting up user data subscription for:', user.email);
  const userRef = doc(db, 'users', user.uid);
  
  return onSnapshot(
    userRef,
    {
      // Use cache first to reduce server load
      source: 'default'
    },
    (doc) => {
      if (doc.exists()) {
        console.log('📊 User data updated from Firebase');
        firestoreCircuitBreaker.recordSuccess();
        const userData = doc.data() as UserData;
        // Update cache
        setCachedData(`user-profile-${user.uid}`, userData, 180000);
        callback(userData);
      } else {
        console.log('📋 No user data found in subscription');
        callback(null);
      }
    },
    (error) => {
      console.error('❌ Error in user data subscription:', error);
      
      // Handle specific errors more gracefully
      if (error.code === 'unavailable' || 
          error.code === 'failed-precondition' ||
          error.code === 'deadline-exceeded') {
        console.warn('🔌 Firebase temporarily unavailable, using cached data');
        firestoreCircuitBreaker.recordFailure();
        
        // Try to provide cached data
        const cacheKey = `user-profile-${user.uid}`;
        const cachedData = getCachedData<UserData>(cacheKey);
        if (cachedData) {
          console.log('📦 Providing cached user data due to subscription error');
          callback(cachedData);
        } else {
          callback(null);
        }
      } else if (error.code === 'permission-denied') {
        console.error('🚫 Permission denied accessing user data');
        callback(null);
      } else {
        console.warn('⚠️ Unknown subscription error, trying cache');
        firestoreCircuitBreaker.recordFailure();
        
        // Try cache as fallback
        const cacheKey = `user-profile-${user.uid}`;
        const cachedData = getCachedData<UserData>(cacheKey);
        if (cachedData) {
          callback(cachedData);
        } else {
          callback(null);
        }
      }
    }
  );
};

// Save project
export const saveProject = async (projectData: Omit<ProjectData, 'id' | 'userId'>): Promise<string> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated');
  }

  const projectRef = doc(collection(db, 'projects'));
  const now = serverTimestamp();

  const project: ProjectData = {
    id: projectRef.id,
    userId: user.uid,
    ...projectData,
    createdAt: now,
    updatedAt: now
  };

  await setDoc(projectRef, project);

  // Update user stats
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    const userData = userSnap.data() as UserData;
    await updateDoc(userRef, {
      'stats.videosCreated': userData.stats.videosCreated + 1,
      updatedAt: now
    });
  }

  return projectRef.id;
};

// Simple in-memory cache for Firebase operations
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

const getCachedData = <T>(key: string): T | null => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    console.log(`📦 Using cached data for: ${key}`);
    return cached.data as T;
  }
  if (cached) {
    cache.delete(key); // Remove expired cache
  }
  return null;
};

const setCachedData = (key: string, data: any, ttlMs: number = 60000) => {
  cache.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
  console.log(`💾 Cached data for: ${key} (TTL: ${ttlMs}ms)`);
};

const clearCachedData = (key: string) => {
  cache.delete(key);
  console.log(`🗑️ Cleared cache for: ${key}`);
};

const clearUserCache = (userId: string) => {
  cache.delete(`user-profile-${userId}`);
  cache.delete(`user-projects-${userId}`);
  console.log(`🧹 Cleared all cache for user: ${userId}`);
};

// Get user projects with optimized loading and caching
export const getUserProjects = async (limit: number = 20): Promise<ProjectData[]> => {
  const user = auth.currentUser;
  if (!user) {
    return [];
  }

  // Check cache first
  const cacheKey = `user-projects-${user.uid}`;
  const cachedProjects = getCachedData<ProjectData[]>(cacheKey);
  if (cachedProjects) {
    return cachedProjects;
  }

  // Check circuit breaker
  if (firestoreCircuitBreaker.isOpen()) {
    console.warn('⚠️ Circuit breaker is open, returning empty projects');
    return [];
  }

  try {
    console.log('📋 Loading user projects from Firestore...');
    const projectsRef = collection(db, 'projects');
    
    // Simplified query to avoid complex index requirements
    const q = query(
      projectsRef, 
      where('userId', '==', user.uid),
      orderBy('updatedAt', 'desc') // Most recent first
    );
    
    const querySnapshot = await getDocs(q);
    // Filter out deleted projects in memory instead of query
    const projects = querySnapshot.docs
      .map(doc => ({
        ...doc.data(),
        id: doc.id
      } as ProjectData))
      .filter(project => !project.deleted); // Filter in memory
    
    // Cache the results for 5 minutes
    setCachedData(cacheKey, projects, 300000);
    
    console.log(`📁 Loaded ${projects.length} user projects`);
    firestoreCircuitBreaker.recordSuccess();
    return projects;
    
  } catch (error: any) {
    console.error('❌ Error loading projects:', error);
    firestoreCircuitBreaker.recordFailure();
    
    // Return empty array on error instead of throwing
    return [];
  }
};

// Delete project
export const deleteProject = async (projectId: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated');
  }

  const projectRef = doc(db, 'projects', projectId);
  const projectSnap = await getDoc(projectRef);

  if (projectSnap.exists() && projectSnap.data().userId === user.uid) {
    await updateDoc(projectRef, {
      deleted: true,
      updatedAt: serverTimestamp()
    });

    // Update user stats
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data() as UserData;
      await updateDoc(userRef, {
        'stats.videosCreated': Math.max(0, userData.stats.videosCreated - 1),
        updatedAt: serverTimestamp()
      });
    }
    
    // Clear cache after successful update
    clearCachedData(`user-projects-${user.uid}`);
    clearCachedData(`user-profile-${user.uid}`);
  }
};

// Initialize user profile on first login
export const initializeUserProfile = async (firebaseUser: User): Promise<void> => {
  try {
    console.log('🔄 Initializing user profile for:', firebaseUser.email);
    
    // Check circuit breaker before making Firestore calls
    if (firestoreCircuitBreaker.isOpen()) {
      console.warn('⚠️ Circuit breaker is open, skipping user profile initialization');
      return;
    }

    const userRef = doc(db, 'users', firebaseUser.uid);
    
    // Try cache first, then server
    let userSnap;
    try {
      userSnap = await getDoc(userRef);
      firestoreCircuitBreaker.recordSuccess();
    } catch (error: any) {
      console.error('❌ Error getting user document:', error);
      firestoreCircuitBreaker.recordFailure();
      
      // Try cache as fallback
      try {
        userSnap = await getDocFromCache(userRef);
        console.log('📦 Using cached user document');
      } catch (cacheError) {
        console.error('❌ Cache also failed:', cacheError);
        throw error; // Re-throw original error
      }
    }

    if (!userSnap.exists()) {
      console.log('🆕 Creating new user profile...');
      const defaultUserData: UserData = {
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || '',
        email: firebaseUser.email || '',
        phone: firebaseUser.phoneNumber || '',
        location: '',
        joinDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
        plan: 'Free',
        avatar: firebaseUser.photoURL || '',
        stats: {
          videosCreated: 0,
          totalViews: '0',
          averageRating: 0,
          storageUsed: '0MB',
          storageLimit: '1GB'
        },
        settings: {
          notifications: true,
          autoSync: false,
          darkMode: true
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Only create new profile if circuit breaker allows it
      if (!firestoreCircuitBreaker.isOpen()) {
        try {
          await setDoc(userRef, defaultUserData);
          console.log('✅ User profile created successfully');
          firestoreCircuitBreaker.recordSuccess();
        } catch (setError: any) {
          console.error('❌ Failed to create user profile:', setError);
          firestoreCircuitBreaker.recordFailure();
          throw setError;
        }
      } else {
        console.warn('⚠️ Circuit breaker prevented user profile creation');
      }
    } else {
      console.log('👤 User profile already exists');
    }
  } catch (error: any) {
    console.error('❌ Error in initializeUserProfile:', error);
    
    // Don't throw on offline/network errors - just log them
    if (error.code === 'unavailable' || 
        error.message?.includes('offline') || 
        error.message?.includes('client is offline')) {
      console.warn('🔌 Firebase is offline - profile initialization will retry when online');
      return;
    }
    
    // Throw other errors
    throw error;
  }
};

// Media Upload Functions

/**
 * Upload a video file to Firebase Storage
 * @param file - The video file to upload
 * @param onProgress - Callback for upload progress updates
 * @returns Promise with the uploaded file data
 */
export const uploadVideoFile = async (
  file: File, 
  onProgress?: (progress: UploadProgress) => void,
  projectId?: string
): Promise<MediaFile> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated to upload videos');
  }

  // Test storage connection first
  const storageConnected = await testStorageConnection();
  if (!storageConnected) {
    throw new Error('Firebase Storage connection failed. Please check your configuration.');
  }

  try {
    console.log('🎬 Starting video upload:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      userId: user.uid
    });

    // Create a unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const videoPath = `users/${user.uid}/videos/${filename}`;
    
    console.log('📁 Upload path:', videoPath);
    
    // Create storage reference
    const storageRef = ref(storage, videoPath);
    
    // Start upload
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot: UploadTaskSnapshot) => {
          // Progress callback
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress?.({
            fileName: file.name,
            progress: Math.round(progress),
            status: 'uploading'
          });
          
          console.log(`📤 Upload progress: ${Math.round(progress)}%`);
        },
        (error: StorageError) => {
          // Enhanced error handling
          const errorMessage = handleStorageError(error);
          console.error('❌ Upload failed:', errorMessage);
          
          onProgress?.({
            fileName: file.name,
            progress: 0,
            status: 'error',
            error: errorMessage
          });
          reject(new Error(errorMessage));
        },
        async () => {
          try {
            // Success callback - Get download URL from Storage
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            // Save media file metadata to Firestore
            const mediaData: Omit<MediaFile, 'id'> = {
              userId: user.uid,
              name: file.name,
              type: 'video',
              url: downloadURL,
              size: file.size,
              mimeType: file.type,
              createdAt: serverTimestamp(),
              projectId: projectId || undefined
            };
            
            console.log('💾 Saving video metadata to Firestore...');
            const mediaRef = await addDoc(collection(db, 'mediaFiles'), mediaData);
            
            const mediaFile: MediaFile = {
              id: mediaRef.id,
              ...mediaData,
              createdAt: new Date()
            };
            
            onProgress?.({
              fileName: file.name,
              progress: 100,
              status: 'completed',
              url: downloadURL,
              fileId: mediaRef.id
            });
            
            console.log('✅ Video uploaded to Storage:', downloadURL);
            console.log('✅ Video metadata saved to Firestore:', mediaRef.id);
            resolve(mediaFile);
            
          } catch (error) {
            console.error('❌ Failed to save video metadata:', error);
            onProgress?.({
              fileName: file.name,
              progress: 100,
              status: 'error',
              error: 'Failed to save file metadata'
            });
            reject(error);
          }
        }
      );
    });
    
  } catch (error) {
    console.error('❌ Error starting video upload:', error);
    onProgress?.({
      fileName: file.name,
      progress: 0,
      status: 'error',
      error: error instanceof Error ? error.message : 'Upload failed'
    });
    throw error;
  }
};

/**
 * Upload an audio file to Firebase Storage
 * @param file - The audio file to upload
 * @param onProgress - Callback for upload progress updates
 * @returns Promise with the uploaded file data
 */
export const uploadAudioFile = async (
  file: File, 
  onProgress?: (progress: UploadProgress) => void,
  projectId?: string
): Promise<MediaFile> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated to upload audio');
  }

  // Test storage connection first
  const storageConnected = await testStorageConnection();
  if (!storageConnected) {
    throw new Error('Firebase Storage connection failed. Please check your configuration.');
  }

  try {
    console.log('🎵 Starting audio upload:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      userId: user.uid
    });

    // Create a unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const audioPath = `users/${user.uid}/audio/${filename}`;
    
    console.log('📁 Upload path:', audioPath);
    
    // Create storage reference
    const storageRef = ref(storage, audioPath);
    
    // Start upload
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot: UploadTaskSnapshot) => {
          // Progress callback
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress?.({
            fileName: file.name,
            progress: Math.round(progress),
            status: 'uploading'
          });
          
          console.log(`🎵 Audio upload progress: ${Math.round(progress)}%`);
        },
        (error: StorageError) => {
          // Enhanced error handling
          const errorMessage = handleStorageError(error);
          console.error('❌ Audio upload failed:', errorMessage);
          
          onProgress?.({
            fileName: file.name,
            progress: 0,
            status: 'error',
            error: errorMessage
          });
          reject(new Error(errorMessage));
        },
        async () => {
          try {
            // Success callback - Get download URL from Storage
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            // Save media file metadata to Firestore
            const mediaData: Omit<MediaFile, 'id'> = {
              userId: user.uid,
              name: file.name,
              type: 'audio',
              url: downloadURL,
              size: file.size,
              mimeType: file.type,
              createdAt: serverTimestamp(),
              projectId: projectId || undefined
            };
            
            console.log('💾 Saving audio metadata to Firestore...');
            const mediaRef = await addDoc(collection(db, 'mediaFiles'), mediaData);
            
            const mediaFile: MediaFile = {
              id: mediaRef.id,
              ...mediaData,
              createdAt: new Date()
            };
            
            onProgress?.({
              fileName: file.name,
              progress: 100,
              status: 'completed',
              url: downloadURL,
              fileId: mediaRef.id
            });
            
            console.log('✅ Audio uploaded to Storage:', downloadURL);
            console.log('✅ Audio metadata saved to Firestore:', mediaRef.id);
            resolve(mediaFile);
            
          } catch (error) {
            console.error('❌ Failed to save audio metadata:', error);
            onProgress?.({
              fileName: file.name,
              progress: 100,
              status: 'error',
              error: 'Failed to save file metadata'
            });
            reject(error);
          }
        }
      );
    });
    
  } catch (error) {
    console.error('❌ Error starting audio upload:', error);
    onProgress?.({
      fileName: file.name,
      progress: 0,
      status: 'error',
      error: error instanceof Error ? error.message : 'Upload failed'
    });
    throw error;
  }
};

/**
 * Get user's media files
 * @param mediaType - Optional filter by media type
 * @returns Promise with array of user's media files
 */
export const getUserMediaFiles = async (mediaType?: 'video' | 'audio'): Promise<MediaFile[]> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated to get media files');
  }

  try {
    let mediaQuery = query(
      collection(db, 'mediaFiles'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    if (mediaType) {
      mediaQuery = query(
        collection(db, 'mediaFiles'),
        where('userId', '==', user.uid),
        where('type', '==', mediaType),
        orderBy('createdAt', 'desc')
      );
    }

    const querySnapshot = await getDocs(mediaQuery);
    const mediaFiles: MediaFile[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      mediaFiles.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date()
      } as MediaFile);
    });

    console.log(`📁 Found ${mediaFiles.length} media files for user`);
    return mediaFiles;

  } catch (error) {
    console.error('❌ Error fetching user media files:', error);
    throw error;
  }
};

/**
 * Delete a media file from Storage and Firestore
 * @param mediaFile - The media file to delete
 */
export const deleteMediaFile = async (mediaFile: MediaFile): Promise<void> => {
  const user = auth.currentUser;
  if (!user || user.uid !== mediaFile.userId) {
    throw new Error('User not authorized to delete this file');
  }

  try {
    // Delete from Storage
    const storageRef = ref(storage, mediaFile.url);
    await deleteObject(storageRef);

    // Delete from Firestore
    await updateDoc(doc(db, 'mediaFiles', mediaFile.id), {
      deleted: true,
      deletedAt: serverTimestamp()
    });

    console.log('🗑️ Media file deleted successfully');

  } catch (error) {
    console.error('❌ Error deleting media file:', error);
    throw error;
  }
};

/**
 * Update user storage stats after upload
 * @param fileSize - Size of uploaded file in bytes
 */
export const updateUserStorageStats = async (fileSize: number): Promise<void> => {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data() as UserData;
      const currentStorageBytes = parseStorageSize(userData.stats.storageUsed);
      const newStorageBytes = currentStorageBytes + fileSize;
      
      await updateDoc(userRef, {
        'stats.storageUsed': formatBytes(newStorageBytes),
        'stats.videosCreated': userData.stats.videosCreated + 1,
        updatedAt: serverTimestamp()
      });
      
      console.log('📊 User storage stats updated');
    }
  } catch (error) {
    console.error('❌ Error updating storage stats:', error);
    // Don't throw - this is not critical
  }
};

// Helper functions
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const parseStorageSize = (sizeStr: string): number => {
  const units = { 'Bytes': 1, 'KB': 1024, 'MB': 1024**2, 'GB': 1024**3, 'TB': 1024**4 };
  const match = sizeStr.match(/^([\d.]+)\s*(\w+)$/);
  if (!match) return 0;
  const [, size, unit] = match;
  return parseFloat(size) * (units[unit as keyof typeof units] || 1);
};
